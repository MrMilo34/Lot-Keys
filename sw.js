const CACHE='lotkeys-drive-test-v09416';
const RELEASE='0.9.4.16';
const CORE=[
  './manifest.webmanifest','./icon.svg','./lotkeys-v09416.js',
  './assets/carfax-one-owner.png','./assets/carfax-low-kilometres.png','./assets/carfax-no-reported-accidents.png',
  './assets/lotkeys-default-logo.png','./assets/lotkeys-icon-192.png','./assets/lotkeys-apple-touch-icon.png','./assets/lotkeys-favicon.png'
];
const RELEASE_SCRIPT='<script id="lotkeys-release-09416" src="./lotkeys-v09416.js?v=09416"></script>';

function patchHtml(html){
  if(!html||typeof html!=='string')return html;
  let out=html;
  out=out.replace(/LotKeys Drive Test · V0\.9\.4\.(?:15\.1|15|14|12)/g,'LotKeys Drive Test · V0.9.4.16');
  out=out.replace(/LOTKEYS V0\.9\.4\.(?:15\.1|15|14|12)/g,'LOTKEYS V0.9.4.16');
  out=out.replace(/\.\/sw\.js\?v=[0-9]+/g,'./sw.js?v=09416');
  if(!out.includes('lotkeys-release-09416'))out=out.includes('</body>')?out.replace('</body>',RELEASE_SCRIPT+'\n</body>'):out+RELEASE_SCRIPT;
  return out;
}

async function patchPageResponse(response){
  const html=patchHtml(await response.text());
  const headers=new Headers(response.headers);
  headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
  headers.set('cache-control','no-store');headers.set('x-lotkeys-release',RELEASE);
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

async function seed(){
  const cache=await caches.open(CACHE);
  await Promise.allSettled(CORE.map(async path=>{const r=await fetch(path,{cache:'reload'});if(r.ok)await cache.put(path,r.clone())}));
  try{const r=await fetch('./index.html',{cache:'reload'});if(r.ok)await cache.put('./index.html',(await patchPageResponse(r)).clone())}catch(err){console.warn('LotKeys v0.9.4.16 page seed deferred',err)}
}

self.addEventListener('install',e=>e.waitUntil(seed().then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('lotkeys-drive-test-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);if(u.origin!==location.origin)return;
  const isPage=e.request.mode==='navigate'||u.pathname.endsWith('/')||u.pathname.endsWith('/index.html');
  if(isPage){
    e.respondWith((async()=>{
      try{
        const net=await fetch(e.request,{cache:'no-store'});if(!net.ok)throw new Error('Page fetch '+net.status);
        const patched=await patchPageResponse(net),cache=await caches.open(CACHE);await cache.put('./index.html',patched.clone());return patched;
      }catch(err){const cached=await caches.match('./index.html');if(cached)return cached;throw err}
    })());return;
  }
  e.respondWith(fetch(e.request,{cache:'no-cache'}).then(async r=>{if(r?.ok){const c=await caches.open(CACHE);c.put(e.request,r.clone()).catch(()=>{})}return r}).catch(()=>caches.match(e.request)));
});
