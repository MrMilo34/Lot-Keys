const CACHE='lotkeys-drive-test-v09450-account-safe1';
const CORE=[
  './',
  './index.html',
  './install.html',
  './privacy.html',
  './terms.html',
  './manifest.webmanifest',
  './icon.svg',
  './lotkeys-creator-access.json',
  './lotkeys-store-directory.json',
  './lotkeys-messaging-v09450.js',
  './lotkeys-awards-v09450.js',
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
  './assets/awards/cash-celebration.png',
  './assets/awards/cherrys.png',
  './assets/awards/detail-detective.png',
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
  caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim())
));

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  const navigation=event.request.mode==='navigate';
  if(navigation){
    event.respondWith(
      fetch(event.request,{cache:'no-store'})
        .then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response})
        .catch(()=>caches.match(event.request).then(response=>response||caches.match('./index.html')))
    );
    return;
  }
  event.respondWith(
    fetch(event.request,{cache:'no-cache'})
      .then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response})
      .catch(()=>caches.match(event.request))
  );
});
