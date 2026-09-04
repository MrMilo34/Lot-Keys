const CACHE='lotkeys-drive-test-v09415-listing-sync-hotfix1';
const HOTFIX='0.9.4.15.1';
const CORE=[
  './manifest.webmanifest','./icon.svg',
  './assets/carfax-one-owner.png','./assets/carfax-low-kilometres.png','./assets/carfax-no-reported-accidents.png',
  './assets/lotkeys-default-logo.png','./assets/lotkeys-icon-192.png','./assets/lotkeys-apple-touch-icon.png','./assets/lotkeys-favicon.png'
];

const HOTFIX_SCRIPT=`<script id="lotkeys-listing-sync-hotfix-094151">
(()=>{
  if(window.__LOTKEYS_LISTING_SYNC_HOTFIX)return;
  let repairTimer=0;
  const apply=()=>{
    try{
      if(typeof DriveSync==='undefined'||typeof DriveSync.refreshUserListingsFromDrive!=='function')return false;
      if(!DriveSync.__lotkeysOriginalSyncListing&&typeof DriveSync.syncListing==='function'){
        DriveSync.__lotkeysOriginalSyncListing=DriveSync.syncListing.bind(DriveSync);
      }
      // The Listings Index is an accelerator only. The Drive Listings folder is authoritative.
      DriveSync.quickRefreshUserListingsFromDrive=({quiet=true}={})=>DriveSync.refreshUserListingsFromDrive({quiet,forceFull:false});
      if(DriveSync.__lotkeysOriginalSyncListing&&!DriveSync.__lotkeysListingSyncWrapped){
        DriveSync.__lotkeysListingSyncWrapped=true;
        DriveSync.syncListing=async(...args)=>{
          const out=await DriveSync.__lotkeysOriginalSyncListing(...args);
          try{await DriveSync.refreshUserListingsFromDrive({quiet:true,forceFull:false});}
          catch(err){console.warn('LotKeys post-save Listings repair deferred',err);}
          return out;
        };
      }
      window.__LOTKEYS_LISTING_SYNC_HOTFIX=HOTFIX_VERSION;
      console.info('LotKeys listing sync hotfix '+HOTFIX_VERSION+' active');
      return true;
    }catch(err){console.warn('LotKeys listing sync hotfix could not apply yet',err);return false;}
  };
  const HOTFIX_VERSION='0.9.4.15.1';
  const repairPending=async(attempt=0)=>{
    clearTimeout(repairTimer);
    try{
      if(!apply())throw new Error('DriveSync not ready');
      if(!DriveSync.connected()||!(await DriveSync.ready())){
        if(attempt<10)repairTimer=setTimeout(()=>repairPending(attempt+1),1200);
        return;
      }
      if(window.__LOTKEYS_LISTING_REPAIR_RUNNING)return;
      window.__LOTKEYS_LISTING_REPAIR_RUNNING=true;
      const cfg=await DriveSync.config();
      const mine=String(cfg?.userName||'').trim().toLowerCase();
      const rows=await DB.all('listings');
      const pending=(rows||[]).filter(l=>{
        const owner=String(l?.ownerUserName||mine||'').trim().toLowerCase();
        if(mine&&owner&&owner!==mine)return false;
        const st=String(l?.syncStatus||'').toLowerCase();
        return !l?.driveFileId||['local','pending','syncing','error'].includes(st);
      });
      for(const l of pending){
        try{
          if(!l.ownerUserName&&cfg?.userName)l.ownerUserName=cfg.userName;
          l.syncStatus='syncing';l.syncError='';await DB.put('listings',l);
          const fn=DriveSync.__lotkeysOriginalSyncListing||DriveSync.syncListing;
          await fn(l);
        }catch(err){
          l.syncStatus='error';l.syncError=err?.message||String(err);await DB.put('listings',l).catch(()=>{});
          console.warn('LotKeys deferred Listing retry',l?.id,err);
        }
      }
      await DriveSync.refreshUserListingsFromDrive({quiet:true,forceFull:false}).catch(err=>console.warn('LotKeys Listings folder repair deferred',err));
    }catch(err){
      if(attempt<10)repairTimer=setTimeout(()=>repairPending(attempt+1),1200);
    }finally{
      window.__LOTKEYS_LISTING_REPAIR_RUNNING=false;
    }
  };
  apply();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>repairPending(0),{once:true});
  else repairPending(0);
})();
</script>`;

function patchHtml(html){
  if(!html||typeof html!=='string')return html;
  let out=html;
  if(!out.includes('lotkeys-listing-sync-hotfix-094151')){
    out=out.includes('</body>')?out.replace('</body>',HOTFIX_SCRIPT+'\n</body>'):out+HOTFIX_SCRIPT;
  }
  out=out.replaceAll('<strong>LotKeys Drive Test · V0.9.4.15</strong>','<strong>LotKeys Drive Test · V0.9.4.15.1</strong>');
  out=out.replaceAll('LOTKEYS V0.9.4.15</div><h2>What’s new','LOTKEYS V0.9.4.15.1</div><h2>What’s new');
  out=out.replaceAll("./sw.js?v=09415","./sw.js?v=094151");
  return out;
}

async function patchPageResponse(response){
  const html=patchHtml(await response.text());
  const headers=new Headers(response.headers);
  headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
  headers.set('cache-control','no-store');headers.set('x-lotkeys-hotfix',HOTFIX);
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

async function seedCache(){
  const cache=await caches.open(CACHE);
  await Promise.allSettled(CORE.map(async path=>{
    const r=await fetch(path,{cache:'reload'});if(r.ok)await cache.put(path,r.clone());
  }));
  try{
    const r=await fetch('./index.html',{cache:'reload'});
    if(r.ok){const patched=await patchPageResponse(r);await cache.put('./index.html',patched.clone());}
  }catch(err){console.warn('LotKeys hotfix offline page seed deferred',err);}
}

self.addEventListener('install',e=>e.waitUntil(seedCache().then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('lotkeys-drive-test-')).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;
  const isPage=e.request.mode==='navigate'||u.pathname.endsWith('/')||u.pathname.endsWith('/index.html');
  if(isPage){
    e.respondWith((async()=>{
      try{
        const net=await fetch(e.request,{cache:'no-store'});
        if(!net.ok)throw new Error('Page fetch '+net.status);
        const patched=await patchPageResponse(net);
        const cache=await caches.open(CACHE);await cache.put('./index.html',patched.clone());
        return patched;
      }catch(err){
        const cached=await caches.match('./index.html');
        if(cached)return cached;
        throw err;
      }
    })());
    return;
  }
  e.respondWith(fetch(e.request,{cache:'no-cache'}).then(async r=>{
    if(r&&r.ok){const cache=await caches.open(CACHE);cache.put(e.request,r.clone()).catch(()=>{});}
    return r;
  }).catch(()=>caches.match(e.request)));
});
