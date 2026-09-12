const CACHE='lotkeys-app-v09472-platform-info-inventory-reconcile';
const LOTKEYS_CACHE_PREFIXES=['lotkeys-drive-test-','lotkeys-app-'];
const CORE=[
  './',
  './index.html',
  './install.html',
  './privacy.html',
  './terms.html',
  './manifest.webmanifest',
  './version.json',
  './icon.svg',
  './lotkeys-creator-access.json',
  './lotkeys-store-directory.json',
  './lotkeys-messaging.js',
  './lotkeys-awards.js',
  './lotkeys-info.js',
  './lotkeys-info.json',
  './assets/carfax-one-owner.png',
  './assets/carfax-low-kilometres.png',
  './assets/carfax-no-reported-accidents.png',
  './assets/lotkeys-default-logo.png',
  './assets/lotkeys-icon-192.png',
  './assets/lotkeys-apple-touch-icon.png',
  './assets/lotkeys-favicon.png',
  './assets/awards/almost-hat-trick.png',
  './assets/awards/anti-celibratory.png',
  './assets/awards/big-number-1.png',
  './assets/awards/big-runner-up.png',
  './assets/awards/bronze-medal.png',
  './assets/awards/cherrys.png',
  './assets/awards/detail-detective.png',
  './assets/awards/the-dark-knight.png',
  './assets/awards/dude-wheres-my-car.png',
  './assets/awards/faster-as-f-boy.png',
  './assets/awards/folder-freak.png',
  './assets/awards/gold-medal.png',
  './assets/awards/hat-trick.png',
  './assets/awards/ice-streak.png',
  './assets/awards/iced-iced-baby.png',
  './assets/awards/lotkeys-developer.png',
  './assets/awards/maaaaybeee.png',
  './assets/awards/mr-over-achiever.png',
  './assets/awards/mr-sales-man.png',
  './assets/awards/new-kid-on-the-lot.png',
  './assets/awards/no-newbie.png',
  './assets/awards/quarter-k-club.png',
  './assets/awards/runner-up-to-runner-up.png',
  './assets/awards/sales-100.png',
  './assets/awards/sales-1000.png',
  './assets/awards/sales-50.png',
  './assets/awards/sales-500.png',
  './assets/awards/silver-medal.png',
  './assets/awards/true-achiever.png',
  './assets/awards/woop-woop.png',
  './assets/awards/you-did-a-thing.png'
];

self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE)
    .then(cache=>cache.addAll(CORE.map(url=>new Request(new URL(url,self.registration.scope),{cache:'reload'}))))
    .then(()=>self.skipWaiting())
));

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key!==CACHE&&LOTKEYS_CACHE_PREFIXES.some(prefix=>key.startsWith(prefix))).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim())
));

function scopedCacheKey(url,{navigation=false}={}){
  const scope=new URL(self.registration.scope);
  let relative=url.pathname.startsWith(scope.pathname)?url.pathname.slice(scope.pathname.length):'';
  if(navigation){
    relative=relative||'index.html';
    const candidate=`./${relative}`;
    return new Request(new URL(CORE.includes(candidate)?candidate:'./index.html',scope));
  }
  return new Request(`${url.origin}${url.pathname}`);
}

async function fetchAndCache(request,cacheKey,cacheMode){
  const response=await fetch(request,{cache:cacheMode});
  if(response?.ok){
    const cache=await caches.open(CACHE);
    await cache.put(cacheKey,response.clone());
  }
  return response;
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  const navigation=event.request.mode==='navigate';
  const cacheKey=scopedCacheKey(url,{navigation});
  if(navigation){
    event.respondWith(
      fetchAndCache(event.request,cacheKey,'no-store')
        .catch(()=>caches.match(cacheKey,{ignoreSearch:true}).then(response=>response||caches.match('./index.html',{ignoreSearch:true})))
    );
    return;
  }
  event.respondWith(
    fetchAndCache(event.request,cacheKey,'no-cache')
      .catch(()=>caches.match(cacheKey,{ignoreSearch:true}))
  );
});
