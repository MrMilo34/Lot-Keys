/*
 LotKeys v0.9.4.16 — durable cross-device Listing reconciliation.
 Loaded by the v0.9.4.16 service worker on top of the current full LotKeys source.
*/
(()=>{
  'use strict';
  if(window.__LOTKEYS_09416_ACTIVE)return;
  window.__LOTKEYS_09416_ACTIVE=true;

  const VERSION='0.9.4.16';
  const FOLDER_MIME='application/vnd.google-apps.folder';
  const ROLE_LISTINGS='userListings';
  const ROLE_LISTING='marketplaceListing';
  let reconcileBusy=false;
  let periodicTimer=0;
  let lastReconcileAt=0;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const getSetting=async(id,def='')=>(await DB.get('settings',id))?.value ?? def;
  const setSetting=(id,value)=>DB.put('settings',{id,value});
  const qEscape=s=>String(s??'').replace(/'/g,"\\'");
  const ownerKey=s=>String(s||'').trim().toLowerCase();

  async function apiFetch(url,opts={}){
    const token=await DriveSync.authorize(false);
    const headers=new Headers(opts.headers||{});headers.set('Authorization',`Bearer ${token}`);
    const res=await fetch(url,{...opts,headers});
    if(!res.ok){let detail='';try{detail=(await res.json())?.error?.message||''}catch{detail=await res.text().catch(()=> '')}const e=new Error(detail||`Google Drive request failed (${res.status})`);e.status=res.status;throw e}
    if(res.status===204)return null;
    const type=res.headers.get('content-type')||'';return type.includes('application/json')?res.json():res.text();
  }

  async function listFiles(q,fields='files(id,name,mimeType,parents,appProperties,createdTime,modifiedTime,trashed)'){
    const u=new URL('https://www.googleapis.com/drive/v3/files');
    u.searchParams.set('q',q);u.searchParams.set('fields',fields);u.searchParams.set('pageSize','1000');u.searchParams.set('supportsAllDrives','true');u.searchParams.set('includeItemsFromAllDrives','true');
    return (await apiFetch(u.toString())).files||[];
  }

  async function driveGet(id,fields='id,name,mimeType,parents,appProperties,createdTime,modifiedTime,trashed'){
    return apiFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?supportsAllDrives=true&fields=${encodeURIComponent(fields)}`);
  }

  async function patchMeta(id,meta,params=''){
    return apiFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?supportsAllDrives=true${params}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(meta||{})});
  }

  async function readJson(fileId){
    const token=await DriveSync.authorize(false);
    const res=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,{headers:{Authorization:`Bearer ${token}`}});
    if(!res.ok){const e=new Error(`Could not read Listing file (${res.status})`);e.status=res.status;throw e}
    return res.json();
  }

  function listingTime(data,file={}){
    return Number(data?.updatedAt)||Date.parse(data?.syncedAt||'')||Date.parse(file?.modifiedTime||'')||Number(data?.createdAt)||0;
  }

  async function findListingFolders(structure){
    if(!structure?.userId)return[];
    const folders=await listFiles(`'${qEscape(structure.userId)}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`);
    return folders.filter(f=>f.name==='Listings'||f.appProperties?.lotkeysRole===ROLE_LISTINGS||f.appProperties?.lotkeysRole==='userListingsLegacy');
  }

  function chooseCanonicalFolder(folders,structure){
    if(!folders.length)return null;
    const scored=[...folders].sort((a,b)=>{
      const ar=a.appProperties?.lotkeysRole===ROLE_LISTINGS?0:1,br=b.appProperties?.lotkeysRole===ROLE_LISTINGS?0:1;
      if(ar!==br)return ar-br;
      const ac=Date.parse(a.createdTime||0)||0,bc=Date.parse(b.createdTime||0)||0;
      if(ac!==bc)return ac-bc;
      if(a.id===structure?.listingsId)return-1;if(b.id===structure?.listingsId)return 1;return String(a.id).localeCompare(String(b.id));
    });
    return scored[0];
  }

  async function listListingJson(folderId){
    return (await listFiles(`'${qEscape(folderId)}' in parents and trashed = false`,'files(id,name,mimeType,parents,appProperties,createdTime,modifiedTime,trashed)'))
      .filter(f=>f.appProperties?.lotkeysRole===ROLE_LISTING||(/\.json$/i.test(f.name||'')&&f.name!=='Listings Index.json'));
  }

  async function mergeDuplicateListingFolders(structure,userName){
    const folders=await findListingFolders(structure);
    if(!folders.length)return structure;
    const canonical=chooseCanonicalFolder(folders,structure);if(!canonical)return structure;
    await patchMeta(canonical.id,{name:'Listings',appProperties:{...(canonical.appProperties||{}),lotkeysRole:ROLE_LISTINGS,lotkeysUserName:userName||structure.userName||''}}).catch(()=>{});

    const all=[];
    for(const folder of folders){
      const files=await listListingJson(folder.id);
      for(const f of files){let data=null;try{data=await readJson(f.id)}catch{};all.push({folder,file:f,data});}
    }
    const bestByListing=new Map();
    for(const item of all){
      const id=String(item.data?.listingId||item.file.appProperties?.lotkeysListingId||'').trim();if(!id)continue;
      const prev=bestByListing.get(id);if(!prev||listingTime(item.data,item.file)>=listingTime(prev.data,prev.file))bestByListing.set(id,item);
    }

    for(const item of all){
      const id=String(item.data?.listingId||item.file.appProperties?.lotkeysListingId||'').trim();
      const best=id?bestByListing.get(id):null;
      if(best&&best.file.id!==item.file.id){
        // Keep historical duplicate files out of the canonical scan without deleting immediately.
        await patchMeta(item.file.id,{appProperties:{...(item.file.appProperties||{}),lotkeysRole:'marketplaceListingLegacy'}}).catch(()=>{});
        continue;
      }
      if(item.folder.id!==canonical.id){
        await patchMeta(item.file.id,{},`&addParents=${encodeURIComponent(canonical.id)}&removeParents=${encodeURIComponent(item.folder.id)}`).catch(err=>console.warn('LotKeys could not move legacy Listing',item.file.id,err));
      }
      if(id)await patchMeta(item.file.id,{appProperties:{...(item.file.appProperties||{}),lotkeysListingId:id,lotkeysRole:ROLE_LISTING,lotkeysUserName:userName||structure.userName||''}}).catch(()=>{});
    }

    for(const f of folders){if(f.id!==canonical.id){await patchMeta(f.id,{appProperties:{...(f.appProperties||{}),lotkeysRole:'userListingsLegacy',lotkeysUserName:userName||structure.userName||''}}).catch(()=>{});}}

    const next={...structure,listingsId:canonical.id,userName:userName||structure.userName||'',updatedAt:new Date().toISOString()};
    await setSetting('driveStoreStructure',next);await setSetting('listingsIndexFileId','');await setSetting('lastListingsIndexSignature','');
    return next;
  }

  async function remoteFileHealthy(fileId,canonicalId){
    if(!fileId)return false;
    try{const f=await driveGet(fileId);return !f.trashed&&(!canonicalId||(f.parents||[]).includes(canonicalId));}catch{return false}
  }

  async function pushLocalListings(structure,userName){
    const rows=(await DB.all('listings'))||[];const mine=ownerKey(userName);
    let pushed=0;
    for(const l of rows){
      const owner=ownerKey(l?.ownerUserName||userName);if(mine&&owner&&owner!==mine)continue;
      const state=String(l?.syncStatus||'').toLowerCase();
      let needs=!l?.driveFileId||['local','pending','syncing','error'].includes(state);
      if(!needs&&l.driveFileId){needs=!(await remoteFileHealthy(l.driveFileId,structure?.listingsId));if(needs)l.driveFileId='';}
      if(!needs)continue;
      try{
        if(!l.ownerUserName&&userName)l.ownerUserName=userName;
        l.syncStatus='syncing';l.syncError='';await DB.put('listings',l);
        await (DriveSync.__lk09416OriginalSyncListing||DriveSync.syncListing)(l);pushed++;
      }catch(err){
        if(err?.status===404&&l.driveFileId){l.driveFileId='';try{await (DriveSync.__lk09416OriginalSyncListing||DriveSync.syncListing)(l);pushed++;continue}catch(err2){err=err2}}
        l.syncStatus='error';l.syncError=err?.message||String(err);await DB.put('listings',l).catch(()=>{});console.warn('LotKeys Listing recovery deferred',l.id,err);
      }
    }
    return pushed;
  }

  async function reconcile(reason='background',{force=false}={}){
    if(reconcileBusy)return 0;
    if(!force&&Date.now()-lastReconcileAt<8000)return 0;
    reconcileBusy=true;lastReconcileAt=Date.now();
    try{
      if(typeof DriveSync==='undefined'||typeof DB==='undefined')return 0;
      if(!DriveSync.connected()||!(await DriveSync.ready()))return 0;
      const cfg=await DriveSync.config();const userName=String(cfg?.userName||'').trim();
      let structure=await getSetting('driveStoreStructure',null);
      if(!structure?.userId||!structure?.listingsId){structure=await DriveSync.ensureStoreStructure();}
      structure=await mergeDuplicateListingFolders(structure,userName);
      const pushed=await pushLocalListings(structure,userName);
      await DriveSync.refreshUserListingsFromDrive({quiet:true,forceFull:true});
      await setSetting('lotkeys09416LastListingReconcile',{at:Date.now(),reason,pushed,listingsId:structure?.listingsId||''});
      return pushed;
    }catch(err){console.warn('LotKeys v0.9.4.16 Listing reconciliation deferred',reason,err);return 0}
    finally{reconcileBusy=false}
  }

  function installWrappers(){
    if(typeof DriveSync==='undefined')return false;
    if(!DriveSync.__lk09416OriginalSyncListing&&typeof DriveSync.syncListing==='function')DriveSync.__lk09416OriginalSyncListing=DriveSync.syncListing.bind(DriveSync);
    if(!DriveSync.__lk09416OriginalQuick&&typeof DriveSync.quickRefreshUserListingsFromDrive==='function')DriveSync.__lk09416OriginalQuick=DriveSync.quickRefreshUserListingsFromDrive.bind(DriveSync);
    if(!DriveSync.__lk09416Wrapped&&DriveSync.__lk09416OriginalSyncListing){
      DriveSync.__lk09416Wrapped=true;
      DriveSync.syncListing=async function(l){
        const out=await DriveSync.__lk09416OriginalSyncListing(l);
        setTimeout(()=>reconcile('post-listing-save',{force:true}),0);
        return out;
      };
      DriveSync.quickRefreshUserListingsFromDrive=async function({quiet=true}={}){
        await reconcile(quiet?'auto-refresh':'manual-refresh',{force:!quiet});
        return DriveSync.refreshUserListingsFromDrive({quiet,forceFull:!quiet});
      };
    }
    return true;
  }

  function paintVersion(){
    document.querySelectorAll('#local-test-note strong').forEach(n=>{if(/LotKeys Drive Test/i.test(n.textContent||''))n.textContent='LotKeys Drive Test · V0.9.4.16'});
    document.querySelectorAll('.eyebrow').forEach(n=>{if(/^LOTKEYS V0\.9\.4\./i.test(n.textContent||''))n.textContent='LOTKEYS V0.9.4.16'});
  }

  function schedule(){
    clearInterval(periodicTimer);periodicTimer=setInterval(()=>{if(!document.hidden)reconcile('periodic')},30000);
  }

  async function boot(attempt=0){
    if(!installWrappers()){if(attempt<40)setTimeout(()=>boot(attempt+1),500);return}
    paintVersion();
    const obs=new MutationObserver(()=>paintVersion());obs.observe(document.documentElement,{subtree:true,childList:true});
    addEventListener('focus',()=>reconcile('focus',{force:true}));addEventListener('online',()=>reconcile('online',{force:true}));addEventListener('pageshow',()=>reconcile('pageshow',{force:true}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)reconcile('visible',{force:true})});
    schedule();
    // Drive authorization can restore after page startup, so continue retrying instead of giving up after a few seconds.
    for(let i=0;i<20;i++){const n=await reconcile(i?'startup-retry':'startup',{force:true});if(DriveSync.connected()&&await DriveSync.ready())break;await sleep(1500)}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>boot(),{once:true});else boot();
})();
