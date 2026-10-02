const {onValueCreated}=require('firebase-functions/v2/database');
const {onSchedule}=require('firebase-functions/v2/scheduler');
const admin=require('firebase-admin');
admin.initializeApp();
const db=admin.database(),msg=admin.messaging();
const LINK=process.env.SITE_URL||'https://umsainsahmsedu.web.app/student.html';
const REGION='us-central1',INSTANCE='umsainsahmsedu-default-rtdb';

async function send(tokens,title,body,type){
 for(let i=0;i<tokens.length;i+=500){
  const chunk=tokens.slice(i,i+500);
  const res=await msg.sendEachForMulticast({tokens:chunk,notification:{title,body},data:{type:String(type||'general')},
   webpush:{notification:{dir:'rtl',lang:'ar'},fcmOptions:{link:LINK}}});
  const bad=[];
  res.responses.forEach((r,j)=>{const c=(r.error&&r.error.code)||'';if(!r.success&&/registration-token-not-registered|invalid-registration-token|invalid-argument/.test(c))bad.push(chunk[j])});
  await Promise.all(bad.map(t=>db.ref('tokens/'+t).remove()));
 }
}

// 1) أي إشعار يكتبه الليدر (تكليف جديد / تعديل جدول / إلغاء / إشعار يدوي)
exports.onNotification=onValueCreated({ref:'/notifications/{id}',instance:INSTANCE,region:REGION},async ev=>{
 const n=ev.data.val();if(!n)return;
 const all=(await db.ref('tokens').get()).val()||{};
 const list=Object.entries(all).filter(([,v])=>{
  if(Array.isArray(n.keys))return n.keys.includes(v.k);
  if(n.sec&&n.sec!=='all')return (v.secs||'').split(',').includes(n.sec);
  return true;
 }).map(([t])=>t);
 await send(list,n.title||'إشعار جديد',n.body||'',n.type);
});

// 2) تذكير قبل موعد المعمل (قبل ساعة وقبل 15 دقيقة) - يعمل كل 5 دقائق بتوقيت القاهرة
const fm=new Intl.DateTimeFormat('en-US',{timeZone:'Africa/Cairo',hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric'});
const off=ms=>{const o={};fm.formatToParts(ms).forEach(p=>o[p.type]=p.value);return Date.UTC(+o.year,+o.month-1,+o.day,+o.hour%24,+o.minute,+o.second)-Math.floor(ms/1000)*1000};
const wall=(y,m,d,h,mi)=>{const g=Date.UTC(y,m-1,d,h,mi);let t=g-off(g);t=g-off(t);return t};
exports.reminders=onSchedule({schedule:'every 5 minutes',timeZone:'Africa/Cairo',region:REGION},async()=>{
 const pub=(await db.ref('published/byName').get()).val()||{};
 const tokens=(await db.ref('tokens').get()).val()||{};
 const byKey={};Object.entries(tokens).forEach(([t,v])=>{(byKey[v.k]=byKey[v.k]||[]).push(t)});
 const now=Date.now();
 for(const [k,s] of Object.entries(pub)){
  for(const r of (s.rows||[])){
   if(!r.date||!r.start)continue;
   const [y,mo,d]=r.date.split('-').map(Number),[h,mi]=r.start.split(':').map(Number);
   const m=(wall(y,mo,d,h,mi)-now)/60000;
   for(const [lo,hi,tag,txt] of [[55,60,'60','بعد ساعة'],[10,15,'15','بعد 15 دقيقة']]){
    if(!(m>lo&&m<=hi))continue;
    const flag=db.ref(`reminded/${k}_${r.date}_${r.start.replace(':','')}_${tag}`);
    if((await flag.get()).exists())continue;
    await flag.set(true);
    const title='تذكير بموعد المعمل',body=`معمل ${r.lab} (سكشن ${r.sec||'-'}) يبدأ ${txt} — ${r.place}`;
    await db.ref('inbox/'+k).push({type:'reminder',title,body,at:Date.now()});
    await send(byKey[k]||[],title,body,'reminder');
   }
  }
 }
});
