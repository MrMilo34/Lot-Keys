const LOTKEYS_RE = /^https:\/\/(?:mrmilo34\.github\.io\/Lot-Keys(?:-TEST)?(?:\/|$)|(?:www\.)?lot-keys\.ca(?:\/|$))/i;
const FB_RE = /^https:\/\/(?:www\.)?facebook\.com\//i;
const HELPER_VERSION = '0.1.15';
const RUNTIME_VERSION_KEY = 'lotkeysHelperRuntimeVersion';

function configurePanel(){try{chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true }).catch(() => {})}catch{}}

async function reloadOpenFacebookTabsOnceForVersion(){
  try{
    const stored = await chrome.storage.local.get(RUNTIME_VERSION_KEY);
    if(String(stored?.[RUNTIME_VERSION_KEY]||'')===HELPER_VERSION) return;
    await chrome.storage.local.set({[RUNTIME_VERSION_KEY]:HELPER_VERSION});
    const tabs = await chrome.tabs.query({});
    for(const tab of tabs){
      if(!tab?.id || !FB_RE.test(String(tab.url||''))) continue;
      try{ await chrome.tabs.reload(tab.id); }catch{}
    }
  }catch{}
}

chrome.runtime.onInstalled.addListener(() => { configurePanel(); reloadOpenFacebookTabsOnceForVersion(); });
chrome.runtime.onStartup.addListener(() => { configurePanel(); });
configurePanel();
// MV3 workers may restart independently of an extension update. The stored version guard makes this
// a one-time hard refresh only when a new Helper version is installed, never on ordinary worker wakeups.
reloadOpenFacebookTabsOnceForVersion();

async function allTabs() {
  return chrome.tabs.query({});
}
async function findLotKeysTab() {
  const tabs = await allTabs();
  return tabs.filter(t => LOTKEYS_RE.test(String(t.url || '')))
    .sort((a,b) => Number(b.lastAccessed||0)-Number(a.lastAccessed||0))[0] || null;
}
async function findFacebookTab() {
  const tabs = await allTabs();
  const active = tabs.find(t => t.active && FB_RE.test(String(t.url||'')));
  return active || tabs.filter(t => FB_RE.test(String(t.url||'')))
    .sort((a,b) => Number(b.lastAccessed||0)-Number(a.lastAccessed||0))[0] || null;
}

async function executeLotKeys(func, args=[]) {
  const tab = await findLotKeysTab();
  if (!tab) throw new Error('Open LotKeys in another Chrome tab first.');
  const result = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: 'MAIN',
    func,
    args
  });
  if (!result?.length) throw new Error('LotKeys did not return any data.');
  const value = result[0].result;
  if (value?.error) throw new Error(value.error);
  return value;
}

async function lotKeysAppearanceReader() {
  try {
    const body=document.body||document.documentElement,styles=getComputedStyle(body),read=(name,fallback)=>String(styles.getPropertyValue(name)||'').trim()||fallback;
    return {
      theme:String(document.body?.dataset?.theme||'light')==='dark'?'dark':'light',
      accent:read('--accent','#2563eb'),
      accentInk:read('--accent-ink','#ffffff'),
      background:read('--bg',String(styles.backgroundColor||'').trim()||'#f3f4f6'),
      card:read('--card','#ffffff'),
      ink:read('--ink','#111827'),
      muted:read('--muted','#6b7280'),
      line:read('--line','#e5e7eb'),
      updatedAt:Date.now()
    };
  } catch(err) {
    return {error:String(err?.message||err)};
  }
}

async function refreshLotKeysAppearance() {
  const appearance=await executeLotKeys(lotKeysAppearanceReader,[]);
  if(!appearance||appearance.error)throw new Error(appearance?.error||'Could not read LotKeys appearance.');
  await chrome.storage.local.set({lotkeysAppearance:appearance});
  return appearance;
}

async function lotKeysListingsReader() {
  const openStore = (name) => new Promise((resolve,reject) => {
    const req = indexedDB.open('autolister-v1');
    req.onerror = () => reject(req.error || new Error('Could not open LotKeys local database.'));
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(name)) { db.close(); resolve([]); return; }
      const tx = db.transaction(name,'readonly');
      const get = tx.objectStore(name).getAll();
      get.onsuccess = () => { const rows=get.result||[]; db.close(); resolve(rows); };
      get.onerror = () => { db.close(); reject(get.error||new Error('Could not read '+name)); };
    };
  });
  try {
    let listings, vehicles, locations;
    if (typeof DB !== 'undefined' && DB?.all) {
      [listings, vehicles, locations] = await Promise.all([DB.all('listings'), DB.all('vehicles'), DB.all('locations')]);
    } else {
      [listings, vehicles, locations] = await Promise.all([openStore('listings'), openStore('vehicles'), openStore('locations')]);
    }
    const vehicleMap = new Map((vehicles||[]).map(v => [String(v.id||''),v]));
    const locationMap = new Map((locations||[]).map(x => [String(x.id||''),x]));
    const photoOrderFor = (l,v) => {
      const lp = Array.isArray(l?.listingAssets) ? l.listingAssets : [];
      const vp = Array.isArray(v?.photos) ? v.photos : [];
      const ids = [...vp,...lp].map(p=>String(p?.id||'')).filter(Boolean);
      const saved = Array.isArray(l?.photoOrder) ? l.photoOrder.map(x=>String(x||'')).filter(Boolean).slice(0,20) : [];
      // The Listing's saved selected IDs are authoritative. Do not discard a selected ID merely because
      // that Vehicle photo has not been hydrated into this browser tab yet.
      if (l?.photoOrderCustomized===true) return saved;
      if (saved.length) return saved;
      // Legacy Listings that predate explicit selection keep their historical all-photo fallback.
      return ids.slice(0,20);
    };
    return (listings||[])
      .filter(l => !['Sold','Archived'].includes(String(l?.status||'')))
      .map(l => {
        const v = vehicleMap.get(String(l.vehicleId||'')) || {};
        const loc = l.locationSnapshot || locationMap.get(String(l.locationId||'')) || {};
        const photoIds = photoOrderFor(l,v);
        return {
          id: String(l.id||''),
          title: String(l.marketplaceTitle || [l.year||v.year,l.make||v.make,l.model||v.model].filter(Boolean).join(' ') || 'Untitled Listing'),
          year: String(l.year||v.year||''),
          make: String(l.make||v.make||''),
          model: String(l.model||v.model||''),
          bodyStyle: String(l.bodyStyle||v.bodyStyle||''),
          odometer: l.odometer!==''&&l.odometer!=null ? Number(l.odometer) : (v.odometer!==''&&v.odometer!=null ? Number(v.odometer) : ''),
          odometerUnit: String(l.odometerUnit||v.odometerUnit||'KM'),
          price: l.price!==''&&l.price!=null ? Number(l.price) : (v.price!==''&&v.price!=null ? Number(v.price) : ''),
          description: String(l.description||''),
          location: String(loc.postalCode||loc.name||loc.address||''),
          locationName: String(loc.name||''),
          locationPostalCode: String(loc.postalCode||''),
          locationAddress: String(loc.address||''),
          exteriorColor: String(l.exteriorColor||v.exteriorColor||''),
          interiorColor: String(l.interiorColor||v.interiorColor||''),
          vehicleCondition: String(l.vehicleCondition||v.vehicleCondition||''),
          fuelType: String(l.fuelType||v.fuelType||''),
          status: String(l.status||'Draft'),
          facebookUrl: String(l.facebookUrl||''),
          photoCount: Math.min(20,photoIds.length),
          photoIds: photoIds.slice(0,20),
          updatedAt: Number(l.updatedAt||0)
        };
      })
      .sort((a,b)=>b.updatedAt-a.updatedAt);
  } catch (err) {
    return {error: String(err?.message||err)};
  }
}

async function lotKeysPhotoReader(listingId, photoIndex, mode, requestedPhotoId) {
  const toDataURL = blob => new Promise((resolve,reject)=>{
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result||''));
    fr.onerror = () => reject(fr.error||new Error('Could not read photo.'));
    fr.readAsDataURL(blob);
  });
  const openDb = () => new Promise((resolve,reject)=>{
    const req=indexedDB.open('autolister-v1');
    req.onerror=()=>reject(req.error||new Error('Could not open LotKeys database.'));
    req.onsuccess=()=>resolve(req.result);
  });
  const getRow = async (store,id) => {
    const db=await openDb();
    try {
      if(!db.objectStoreNames.contains(store)) return null;
      return await new Promise((resolve,reject)=>{
        const req=db.transaction(store,'readonly').objectStore(store).get(id);
        req.onsuccess=()=>resolve(req.result||null); req.onerror=()=>reject(req.error);
      });
    } finally { db.close(); }
  };
  try {
    let l=null,v=null,photos=[];
    if (typeof DB !== 'undefined' && DB?.get) {
      l = await DB.get('listings', listingId);
      if (!l) throw new Error('Listing was not found in LotKeys.');
      v = l.vehicleId ? await DB.get('vehicles',l.vehicleId) : null;
      if (v && typeof DriveSync !== 'undefined' && DriveSync?.ready && await DriveSync.ready()) {
        try { v = await DriveSync.hydrateVehicleAssets(v); } catch(e) { console.warn('LotKeys Assistant photo hydrate',e); }
      }
      if (typeof hydrateListingAssets === 'function') {
        try { await hydrateListingAssets(l); } catch(e) { console.warn('LotKeys Assistant listing hydrate',e); }
      }
      if (typeof orderedListingPhotos === 'function') photos = orderedListingPhotos(l,v);
    }
    if (!l) {
      l=await getRow('listings',listingId);
      if(!l) throw new Error('Listing was not found in LotKeys.');
      v=l.vehicleId?await getRow('vehicles',l.vehicleId):null;
    }
    if (!photos.length) {
      const vp=Array.isArray(v?.photos)?v.photos:[],lp=Array.isArray(l?.listingAssets)?l.listingAssets:[];
      const all=[...vp,...lp],byId=new Map(all.map(p=>[String(p?.id||''),p]));
      const allIds=all.map(p=>String(p?.id||'')).filter(Boolean);
      let order=Array.isArray(l?.photoOrder)?l.photoOrder.map(String).filter(id=>byId.has(id)):allIds;
      order=order.slice(0,20);
      photos=order.map(id=>byId.get(id)).filter(Boolean);
    }
    const wantedId=String(requestedPhotoId||'');
    let p=null;
    if(wantedId){
      const allNow=[...(Array.isArray(v?.photos)?v.photos:[]),...(Array.isArray(l?.listingAssets)?l.listingAssets:[])];
      p=allNow.find(x=>String(x?.id||'')===wantedId)||photos.find(x=>String(x?.id||'')===wantedId)||null;
    }
    if(!p)p=photos[Number(photoIndex)||0];
    if(!p) throw new Error('Selected LotKeys photo '+(Number(photoIndex)+1)+' was not found.');
    let blob=p.blob||null;
    if(!blob && p.driveFileId && typeof DriveSync !== 'undefined' && DriveSync?.fetchFileBlob) {
      try { blob=await DriveSync.fetchFileBlob(p.driveFileId); } catch(e) { console.warn(e); }
    }
    if(!blob) throw new Error('Photo is not cached yet. Open the Listing Posting Assistant in LotKeys once, then retry.');
    if(String(mode||'')==='thumb'){
      try{
        const bmp=await createImageBitmap(blob),max=180,scale=Math.min(1,max/Math.max(bmp.width||1,bmp.height||1)),w=Math.max(1,Math.round((bmp.width||1)*scale)),h=Math.max(1,Math.round((bmp.height||1)*scale)),canvas=document.createElement('canvas');
        canvas.width=w;canvas.height=h;canvas.getContext('2d',{alpha:false}).drawImage(bmp,0,0,w,h);bmp.close?.();
        return {dataUrl:canvas.toDataURL('image/jpeg',0.78),name:String(p.name||`LotKeys-photo-${Number(photoIndex)+1}.jpg`),type:'image/jpeg',size:Number(blob.size||p.size||0),thumbnail:true};
      }catch(e){console.warn('LotKeys Assistant thumbnail fallback',e)}
    }
    return {dataUrl:await toDataURL(blob),name:String(p.name||`LotKeys-photo-${Number(photoIndex)+1}.jpg`),type:String(blob.type||p.type||'image/jpeg'),size:Number(blob.size||p.size||0)};
  } catch(err) { return {error:String(err?.message||err)}; }
}


async function lotKeysListingWriteback(listingId, facebookUrl, views) {
  const openDb = () => new Promise((resolve,reject)=>{const req=indexedDB.open('autolister-v1');req.onerror=()=>reject(req.error||new Error('Could not open LotKeys database.'));req.onsuccess=()=>resolve(req.result)});
  const getRow=async(store,id)=>{if(typeof DB!=='undefined'&&DB?.get)return DB.get(store,id);const db=await openDb();try{return await new Promise((resolve,reject)=>{const req=db.transaction(store,'readonly').objectStore(store).get(id);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error)})}finally{db.close()}};
  const putRow=async(store,row)=>{if(typeof DB!=='undefined'&&DB?.put)return DB.put(store,row);const db=await openDb();try{return await new Promise((resolve,reject)=>{const req=db.transaction(store,'readwrite').objectStore(store).put(row);req.onsuccess=()=>resolve(row);req.onerror=()=>reject(req.error)})}finally{db.close()}};
  const l=await getRow('listings',String(listingId||''));if(!l)throw new Error('Selected LotKeys Listing was not found.');
  let urlSaved=false,viewsSaved=false;const url=String(facebookUrl||'').trim();
  if(url){l.facebookUrl=url;l.status='Active';l.postedAt=l.postedAt||Date.now();l.updatedAt=Date.now();l.syncStatus='pending';await putRow('listings',l);urlSaved=true;try{if(typeof DriveSync!=='undefined'&&DriveSync?.ready&&await DriveSync.ready()&&DriveSync?.syncListing)await DriveSync.syncListing(l)}catch(e){console.warn('LotKeys Assistant listing sync',e)}}
  if(views!==''&&views!=null){const n=Number(String(views).replace(/[^0-9.-]/g,''));if(!Number.isFinite(n)||n<0)throw new Error('Enter a valid view count.');const d=new Date(),date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;await putRow('analytics',{id:`AN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,listingId:String(listingId||''),date,views:Math.round(n)});viewsSaved=true}
  return {ok:true,urlSaved,viewsSaved,facebookUrl:l.facebookUrl||'',views:viewsSaved?Math.round(Number(views)):null};
}

async function ensureFacebookScript(tabId) {
  try { const pong=await chrome.tabs.sendMessage(tabId,{type:'LOTKEYS_PING'}); if(pong?.ok&&pong?.version===HELPER_VERSION)return; }
  catch {}
  await chrome.scripting.executeScript({target:{tabId},files:['facebook.js']});
  await new Promise(r=>setTimeout(r,150));
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async()=>{
    if(msg?.type==='GET_TAB_STATUS') {
      const [lotkeys,facebook]=await Promise.all([findLotKeysTab(),findFacebookTab()]);
      return {ok:true,lotkeys:!!lotkeys,facebook:!!facebook,lotkeysTitle:lotkeys?.title||'',facebookTitle:facebook?.title||''};
    }
    if(msg?.type==='SYNC_LISTINGS') {
      const rows=await executeLotKeys(lotKeysListingsReader,[]);
      if(!Array.isArray(rows)) throw new Error(rows?.error||'Could not read LotKeys Listings.');
      let appearance=null;try{appearance=await refreshLotKeysAppearance()}catch{}
      await chrome.storage.local.set({lotkeysListings:rows,lotkeysListingsSyncedAt:Date.now()});
      return {ok:true,listings:rows,appearance};
    }
    if(msg?.type==='GET_LOTKEYS_APPEARANCE') {
      const appearance=await refreshLotKeysAppearance();
      return {ok:true,appearance};
    }
    if(msg?.type==='GET_PHOTO') {
      const photo=await executeLotKeys(lotKeysPhotoReader,[String(msg.listingId||''),Number(msg.photoIndex||0),'full',String(msg.photoId||'')]);
      return {ok:true,photo};
    }
    if(msg?.type==='GET_THUMB') {
      const photo=await executeLotKeys(lotKeysPhotoReader,[String(msg.listingId||''),Number(msg.photoIndex||0),'thumb',String(msg.photoId||'')]);
      return {ok:true,photo};
    }
    if(msg?.type==='GET_FACEBOOK_URL') {
      const tab=await findFacebookTab();
      return {ok:!!tab,url:String(tab?.url||''),title:String(tab?.title||'')};
    }
    if(msg?.type==='SAVE_LISTING_FOLLOWUP') {
      const out=await executeLotKeys(lotKeysListingWriteback,[String(msg.listingId||''),String(msg.facebookUrl||''),msg.views??'']);
      return out||{ok:false,error:'LotKeys did not save the update.'};
    }
    if(msg?.type==='JUMP_FIELD') {
      const tab=await findFacebookTab();if(!tab)throw new Error('Open Facebook Marketplace first.');await ensureFacebookScript(tab.id);
      return await chrome.tabs.sendMessage(tab.id,{type:'LOTKEYS_JUMP_TO_FIELD',key:String(msg.key||'')});
    }
    if(msg?.type==='RETRY_FIELD') {
      const tab=await findFacebookTab();if(!tab)throw new Error('Open Facebook Marketplace first.');await ensureFacebookScript(tab.id);
      return await chrome.tabs.sendMessage(tab.id,{type:'LOTKEYS_RETRY_FIELD',key:String(msg.key||''),listing:msg.listing||{}});
    }
    if(msg?.type==='CHECK_FACEBOOK_FIELDS') {
      const tab=await findFacebookTab();if(!tab)throw new Error('Open Facebook Marketplace first.');await ensureFacebookScript(tab.id);
      return await chrome.tabs.sendMessage(tab.id,{type:'LOTKEYS_CHECK_FIELDS',keys:Array.isArray(msg.keys)?msg.keys:[]});
    }
    if(msg?.type==='FILL_FACEBOOK') {
      const tab=await findFacebookTab();
      if(!tab) throw new Error('Open Facebook Marketplace → Vehicle for sale in Chrome first.');
      await ensureFacebookScript(tab.id);
      const result=await chrome.tabs.sendMessage(tab.id,{type:'LOTKEYS_FILL_FACEBOOK',listing:msg.listing});
      return result||{ok:false,error:'Facebook did not return a result.'};
    }
    return null;
  })().then(r=>sendResponse(r)).catch(err=>sendResponse({ok:false,error:String(err?.message||err)}));
  return true;
});
