const CACHE='lotkeys-drive-test-v094491';
const LOTKEYS_GOOGLE_CLIENT_ID='61170708521-468omogqcjqfv4msjjl7pqihcjfocl5i.apps.googleusercontent.com';
const CORE=['./','./index.html','./manifest.webmanifest','./icon.svg','./lotkeys-creator-access.json','./assets/carfax-one-owner.png','./assets/carfax-low-kilometres.png','./assets/carfax-no-reported-accidents.png','./assets/lotkeys-default-logo.png','./assets/lotkeys-icon-192.png','./assets/lotkeys-apple-touch-icon.png','./assets/lotkeys-favicon.png','./assets/awards/almost-hat-trick.png','./assets/awards/big-number-1.png','./assets/awards/big-runner-up.png','./assets/awards/detail-detective.png','./assets/awards/faster-as-f-boy.png','./assets/awards/folder-freak.png','./assets/awards/hat-trick.png','./assets/awards/ice-streak.png','./assets/awards/iced-iced-baby.png','./assets/awards/mr-over-achiever.png','./assets/awards/no-newbie.png','./assets/awards/runner-up-to-runner-up.png','./assets/awards/true-achiever.png','./assets/awards/you-did-a-thing.png','./lotkeys-messaging-v09449.js','./lotkeys-awards-v09449.js'];
const GOOGLE_CLIENT_SETTING="clientId: (await setting('googleClientId','')).trim(),";
const GOOGLE_CLIENT_BOOTSTRAP=`clientId: ((await setting('googleClientId','')).trim() || '${LOTKEYS_GOOGLE_CLIENT_ID}'),`;

async function patchLotKeysHtml(response){
  if(!response) return response;
  const html=await response.text();
  const patched=html.includes(GOOGLE_CLIENT_SETTING)?html.split(GOOGLE_CLIENT_SETTING).join(GOOGLE_CLIENT_BOOTSTRAP):html;
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  return new Response(patched,{status:response.status,statusText:response.statusText,headers});
}

async function seedCache(){
  const cache=await caches.open(CACHE);
  await cache.addAll(CORE);
  for(const key of ['./','./index.html']){
    const response=await cache.match(key);
    if(response) await cache.put(key,await patchLotKeysHtml(response));
  }
}

self.addEventListener('install',e=>e.waitUntil(seedCache().then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin) return;
  const isAppPage=e.request.mode==='navigate'&&(u.pathname.endsWith('/')||u.pathname.endsWith('/index.html'));
  if(isAppPage){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(async r=>{const patched=await patchLotKeysHtml(r);const copy=patched.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));return patched;}).catch(()=>caches.match('./index.html').then(r=>r||caches.match('./'))));
    return;
  }
  e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request)));
});
