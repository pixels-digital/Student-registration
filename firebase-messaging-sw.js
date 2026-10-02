importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
firebase.initializeApp({apiKey:"AIzaSyAP1msrZV3LO2OV5bGAV9bUAiS40WGqft0",authDomain:"umsainsahmsedu.firebaseapp.com",projectId:"umsainsahmsedu",storageBucket:"umsainsahmsedu.firebasestorage.app",messagingSenderId:"59345980641",appId:"1:59345980641:web:135c5cb4bb372f1024bba0"});
firebase.messaging();

// ---- PWA: تخزين مؤقت ليعمل الموقع بدون إنترنت
const VER='lab-v1',CORE=['student.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
const RT=['cdn.jsdelivr.net','cdnjs.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com','www.gstatic.com'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VER).then(c=>Promise.all(CORE.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==VER).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
 if(r.mode==='navigate'){
  e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(VER).then(c=>c.put(r,cp));return res}).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||(u.pathname.endsWith('admin.html')?Response.error():caches.match('student.html')))));
  return;
 }
 if((u.origin===location.origin||RT.includes(u.hostname))&&!u.pathname.includes('firebase-messaging-sw')){
  e.respondWith(caches.open(VER).then(c=>c.match(r).then(hit=>{
   const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque'))c.put(r,res.clone());return res}).catch(()=>hit);
   return hit||net;
  })));
 }
});
