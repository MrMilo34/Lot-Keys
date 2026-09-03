const CACHE='lotkeys-drive-test-v0935';
const CORE=['./','./index.html','./manifest.webmanifest','./icon.svg','./assets/carfax-one-owner.png','./assets/carfax-low-kilometres.png','./assets/carfax-no-reported-accidents.png', './assets/lotkeys-default-logo.png','./assets/lotkeys-icon-192.png','./assets/lotkeys-apple-touch-icon.png','./assets/lotkeys-favicon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin) return;
  const isPage=e.request.mode==='navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('/index.html');
  if(isPage){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));return r;}).catch(()=>caches.match('./index.html').then(r=>r||caches.match('./'))));
    return;
  }
  e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request)));
});
