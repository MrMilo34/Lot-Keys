'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const FOLDER='application/vnd.google-apps.folder';
const setupSource=html.slice(html.indexOf('  const storeStructureJobs='),html.indexOf('  async function ensurePersonalListingStorage('));
function fixture({missing=true,level=2,rootWritable=true,approved=true,status='active',completed=false}={}){
  const files=new Map(),created=[],writes=[],blob=new Blob(['original photo']);let sequence=0,migrationCalls=0;
  const add=(id,name,parent,props={})=>{const f={id,name,mimeType:FOLDER,parents:[parent],appProperties:props,capabilities:{canAddChildren:true}};files.set(id,f);return f};
  add('root','Legacy Wetaskiwin','drive');files.get('root').capabilities.canAddChildren=rootWritable;
  add('users','Users','root',{lotkeysRole:'users'});add('admin','Administration','root',{lotkeysRole:'administration'});add('inventory','Inventory','root',{lotkeysRole:'inventory'});
  const oldDrive={userFolderId:'old-user',listingsFolderId:'old-listings',listingAssetsFolderId:'old-assets',moreFolderId:'old-more'};
  if(!missing){add('old-user','Blair','users',{lotkeysUserName:'Blair'});add('old-listings','Listings','old-user',{lotkeysRole:'userListings'});add('old-assets','Listing Assets','old-user',{lotkeysRole:'userListingAssets'});add('old-more','More','old-user',{lotkeysRole:'userMore'})}
  const listings=[{id:'saved',ownerUserName:'Blair',syncStatus:'synced',description:'My edited description',price:55990,facebookUrl:'https://facebook.com/example',driveFileId:'deleted-json',photoOrder:['asset'],listingAssets:[{id:'asset',driveFileId:'deleted-photo',blob}]},{id:'foreign',ownerUserName:'Someone else',syncStatus:'synced'},{id:'deleted',ownerUserName:'Blair',syncStatus:'synced'}];
  const registry=approved?[{userName:'Blair',email:'blair@example.test',googleSub:'subject',adminLevel:level,status,drive:oldDrive}]:[];
  const values=new Map([['storeFolderId','root'],['currentAccountEmail','blair@example.test'],['userName','Blair'],['storeUsers',registry],['storeName','Legacy Wetaskiwin'],['personalProfileDriveFolderId','personal'],['directoryTemplateFileId','template'],['currentUserAdminLevel',level],['driveStoreStructure',{rootId:'root',inventoryId:'inventory',usersId:'users',adminId:'admin',userId:'old-user',userName:'Blair',moreId:'old-more',listingsId:completed?'personal-listings':'old-listings',listingAssetsId:completed?'personal-assets':'old-assets',workspaceWritable:true,listingStorageVersion:completed?1:0,personalListingRootId:'personal',personalStoreListingsId:'personal-store',personalListingStoreName:'Legacy Wetaskiwin',listingMigrationIds:{source:'copy'}}]]);
  const context={Blob,console:{warn:()=>{}},FOLDER_MIME:FOLDER,window:{},prepareDeferredVehicleSave:async()=>false,
    setting:async(k,d)=>values.has(k)?values.get(k):d,setSetting:async(k,v)=>{values.set(k,v)},config:async()=>({storeFolderId:values.get('storeFolderId'),userName:'Blair'}),authorize:async()=>true,getGoogleIdentity:async()=>({email:'blair@example.test',sub:'subject'}),
    driveGet:async id=>{if(!files.has(id))throw Object.assign(new Error('File not found: '+id),{status:404});return files.get(id)},
    findChildByAppProperty:async(parent,key,value)=>[...files.values()].find(f=>f.parents.includes(parent)&&f.appProperties[key]===value)||null,
    findChildByName:async(parent,name)=>[...files.values()].find(f=>f.parents.includes(parent)&&f.name===name)||null,
    ensureFolder:async(parent,name,key,value,tags={})=>{const existing=[...files.values()].find(f=>f.parents.includes(parent)&&f.name===name);if(existing)return existing;const f=add('new-'+ ++sequence,name,parent,{...tags,[key]:value});created.push(f);return f},
    normalizeStoreUsers:x=>x,normalizeUserAccount:x=>({...x}),workspaceIdsForAccount:a=>a.drive||{},lotKeysUserKey:a=>a.email,isStoreParentPermissionError:e=>e.status===403,
    storeWriteAccessError:()=>new Error('Store write access required'),storeWorkspaceAccessError:()=>Object.assign(new Error('Workspace access required'),{code:'STORE_WORKSPACE_ACCESS_REQUIRED'}),
    readStoreAccess:async()=>null,loadStoreConfig:async()=>false,
    getListingDeleteTombstones:async()=>({deleted:{}}),
    DB:{all:async name=>name==='listings'?listings:[],put:async(name,v)=>{writes.push([name,v]);return v}},
    syncStoreConfig:async s=>{context.persisted=s},ensureDirectoryTemplate:async()=>({id:'template'}),syncPersonalProfile:async()=>{},syncStoreProfileThumbnail:async()=>{},syncStoreCelebrationSound:async()=>{},
    safeName:x=>x,ensurePersonalListingStorage:async()=>{migrationCalls++;throw Error('Personal listing storage is unavailable')}
  };
  vm.createContext(context);vm.runInContext(setupSource,context);
  return {context,values,files,listings,created,writes,blob,migrationCalls:()=>migrationCalls};
}
test('the pre-update cache and deleted approved workspace are repaired without personal listing migration',async()=>{
  const f=fixture(),s=await f.context.structure();
  assert.equal(s.rootId,'root');assert.equal(s.inventoryId,'inventory');assert.equal(s.workspaceStructureVersion,1);
  assert.notEqual(s.userId,'old-user');assert.deepEqual(f.created.map(x=>x.name),['Blair','Listings','Listing Assets','More']);
  assert.equal(f.migrationCalls(),0);assert.equal(f.context.persisted.userId,s.userId);
  const drive=f.values.get('storeUsers')[0].drive;assert.equal(drive.userFolderId,s.userId);assert.equal(drive.listingAssetsFolderId,s.legacyListingAssetsId);
  assert.equal(f.values.get('storeUsers')[0].adminLevel,2);assert.equal(s.workspaceRecovery.previousDrive.listingAssetsFolderId,'old-assets');
});
test('workspace recovery retains pending local records and photo blobs, excluding another user and tombstones',async()=>{
  const f=fixture();await f.context.structure();const [saved,foreign,deleted]=f.listings;
  assert.equal(saved.syncStatus,'pending');assert.equal(saved.description,'My edited description');assert.equal(saved.price,55990);assert.equal(saved.facebookUrl,'https://facebook.com/example');
  assert.equal(saved.listingAssets[0].blob,f.blob);assert.deepEqual(saved.photoOrder,['asset']);assert.equal(saved.driveFileId,'deleted-json');
  assert.equal(foreign.syncStatus,'synced');assert.equal(deleted.syncStatus,'synced');
});
test('replacement folders already present in Drive are reused and the old registry IDs are refreshed',async()=>{
  const f=fixture();for(const [id,name,parent] of [['replacement-user','Blair','users'],['replacement-listings','Listings','replacement-user'],['replacement-assets','Listing Assets','replacement-user'],['replacement-more','More','replacement-user']])f.files.set(id,{id,name,mimeType:FOLDER,parents:[parent],appProperties:{},capabilities:{canAddChildren:true}});
  const s=await f.context.structure();assert.equal(s.userId,'replacement-user');assert.equal(s.moreId,'replacement-more');assert.equal(s.legacyListingAssetsId,'replacement-assets');assert.equal(f.created.length,0);assert.equal(f.listings[0].syncStatus,'pending');
});
test('a second device keeps its local listings after another device has already updated the registry',async()=>{
  const f=fixture({missing:false});f.values.get('storeUsers')[0].drive={userFolderId:'old-user',listingsFolderId:'old-listings',listingAssetsFolderId:'old-assets',moreFolderId:'old-more'};
  f.values.get('driveStoreStructure').userId='deleted-user';f.values.get('driveStoreStructure').listingsId='deleted-listings';f.values.get('driveStoreStructure').listingAssetsId='deleted-assets';
  const s=await f.context.structure();assert.equal(f.created.length,0);assert.equal(f.listings[0].syncStatus,'pending');assert.equal(s.workspaceRecovery.previousDrive.listingAssetsFolderId,'deleted-assets');
});
test('an unavailable personal migration affects Listings only and leaves usable Inventory setup cached',async()=>{
  const f=fixture();const s=await f.context.structure();await assert.rejects(f.context.structure({requireListings:true}),/Personal listing storage/);
  assert.equal(f.migrationCalls(),1);assert.equal(await f.context.structure(),s);assert.equal(f.migrationCalls(),1);
});
test('a completed personal migration keeps its account folder and IDs during Store structure refresh',async()=>{
  const f=fixture({missing:false,completed:true}),s=await f.context.ensureStoreStructure();
  assert.equal(s.listingsId,'personal-listings');assert.equal(s.listingAssetsId,'personal-assets');assert.equal(s.personalStoreListingsId,'personal-store');
  assert.equal(s.legacyListingsId,'old-listings');assert.equal(s.listingStorageVersion,1);assert.equal(f.created.length,0);assert.equal(f.listings[0].syncStatus,'synced');
  assert.equal(await f.context.structure({requireListings:true}),s);assert.equal(f.migrationCalls(),0);
});
test('another account workspace cannot supply cached personal listing IDs',async()=>{
  const f=fixture({missing:false,completed:true});f.values.get('driveStoreStructure').workspaceEmail='other@example.test';
  const s=await f.context.ensureStoreStructure();assert.equal(s.listingStorageVersion,0);assert.equal(s.listingsId,'old-listings');assert.equal(s.personalStoreListingsId,undefined);
});
test('overlapping setup calls share the repair and do not create duplicate folders',async()=>{
  const f=fixture(),[a,b,c]=await Promise.all([f.context.ensureStoreStructure(),f.context.ensureStoreStructure(),f.context.ensureStoreStructure()]);
  assert.equal(a,b);assert.equal(b,c);assert.equal(f.created.length,4);
});
test('missing workspaces do not give normal users or unapproved accounts administration access',async()=>{
  const normal=fixture({level:0,rootWritable:false});await assert.rejects(normal.context.structure(),/Workspace access/);assert.equal(normal.created.length,0);
  const stranger=fixture({approved:false});await assert.rejects(stranger.context.structure(),/Approved Users/);assert.equal(stranger.created.length,0);
  const blocked=fixture({status:'disabled'});await assert.rejects(blocked.context.structure(),/removed/);assert.equal(blocked.created.length,0);
});
test('permission failures, moved folders and trashed folders do not trigger replacement folders',async()=>{
  const denied=fixture({missing:false}),get=denied.context.driveGet;denied.context.driveGet=async id=>{if(id==='old-assets')throw Object.assign(Error('permission denied'),{status:403});return get(id)};
  await assert.rejects(denied.context.structure(),/Workspace access/);assert.equal(denied.created.length,0);
  const moved=fixture({missing:false});moved.files.get('old-assets').parents=['foreign-workspace'];await assert.rejects(moved.context.structure(),/outside this Store/);assert.equal(moved.created.length,0);
  const trashed=fixture({missing:false});trashed.files.get('old-assets').trashed=true;await assert.rejects(trashed.context.structure(),/Drive Trash/);assert.equal(trashed.created.length,0);
});
test('a Store transition during setup stops before local listing writes or publishing repaired IDs',async()=>{
  const f=fixture(),ensure=f.context.ensureFolder;f.context.ensureFolder=async(...args)=>{const result=await ensure(...args);f.values.set('storeFolderId','other-store');return result};
  await assert.rejects(f.context.structure(),/Store changed/);assert.equal(f.writes.length,0);assert.equal(f.context.persisted,undefined);
});
test('the actual vehicle sync completes through the former 2% failure with 11 photos and a video',async()=>{
  const f=fixture(),progress=[],lanes=[];
  Object.assign(f.context,{restoreVehicleSyncState:()=>{},buildVehicleProfileName:v=>v.name,createFolder:async(name,parent)=>f.context.ensureFolder(parent,name),patchMetadata:async(id)=>({id}),saveVehicleSyncState:()=>{},setAnyoneReader:async()=>{},createSpreadsheet:async()=>({id:'sheet'}),sheetFingerprint:v=>JSON.stringify(v.photos?.map(x=>x.driveFileId)),writeVehicleSheet:async()=>{},updateInventoryIndex:async()=>{},directoryFingerprint:()=> 'directory',generateVehicleInfoDirectory:async()=>{},assetFingerprint:items=>JSON.stringify(items?.map(x=>x.driveFileId)),clearVehicleSyncState:()=>{},syncAssets:async(items,folder,id,kind,report)=>{lanes.push([kind,items.length]);report({percent:100,status:'complete'});return items.map((a,i)=>({...a,driveFileId:kind+'-'+i}))}});
  vm.runInContext(html.slice(html.indexOf('  async function nativeVehicleTransfer('),html.indexOf('  async function syncVehicleState(')),f.context);
  const v={id:'vehicle',name:'2023 Hyundai Elantra',photos:Array.from({length:11},(_,i)=>({id:'photo-'+i,blob:f.blob})),videos:[{id:'video',blob:new Blob(['video'])}],attachments:[]};
  const result=await f.context.syncVehicle(v,{onProgress:x=>progress.push(x)});
  assert.equal(result.syncStatus,'synced');assert.equal(result.syncError,'');assert.equal(progress.at(-1).percent,100);assert.ok(progress.some(x=>x.percent===7));assert.ok(progress.some(x=>x.percent===32));
  assert.deepEqual(lanes,[['document',0],['photo',11],['video',1]]);assert.equal(f.migrationCalls(),0);assert.equal(result.photos.length,11);
});
test('an interrupted photo lane waits for the video lane before allowing a Vehicle sync retry',async()=>{
  const f=fixture();let releaseVideo,videoFinished=false,settled=false;const video=new Promise(resolve=>releaseVideo=resolve);
  Object.assign(f.context,{restoreVehicleSyncState:()=>{},buildVehicleProfileName:v=>v.name,createFolder:async(name,parent)=>f.context.ensureFolder(parent,name),patchMetadata:async(id)=>({id}),saveVehicleSyncState:()=>{},setAnyoneReader:async()=>{},createSpreadsheet:async()=>({id:'sheet'}),sheetFingerprint:()=> 'sheet',writeVehicleSheet:async()=>{},updateInventoryIndex:async()=>{},directoryFingerprint:()=> 'directory',generateVehicleInfoDirectory:async()=>{},assetFingerprint:items=>JSON.stringify(items?.map(x=>x.driveFileId)),clearVehicleSyncState:()=>{},syncAssets:async(items,folder,id,kind)=>{if(kind==='photo')throw Object.assign(Error('photo interrupted'),{code:'MEDIA_UPLOAD_INTERRUPTED'});if(kind==='video'){await video;videoFinished=true}return items}});
  vm.runInContext(html.slice(html.indexOf('  async function nativeVehicleTransfer('),html.indexOf('  async function syncVehicleState(')),f.context);
  const v={id:'vehicle',name:'2018 Toyota RAV4',photos:[{id:'photo',blob:f.blob}],videos:[{id:'video',blob:new Blob(['video'])}],attachments:[]},pending=f.context.syncVehicle(v).then(()=>{settled=true},error=>{settled=true;assert.equal(error.code,'MEDIA_UPLOAD_INTERRUPTED')});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);assert.equal(videoFinished,false);releaseVideo();await pending;assert.equal(videoFinished,true);assert.equal(settled,true);assert.notEqual(v.syncStatus,'synced');
});
test('a missing listing JSON is recreated in personal storage while a permission failure is preserved',async()=>{
  const source=html.slice(html.indexOf('  async function syncListing(l,'),html.indexOf('  async function deleteListing('));
  let saved;const context={console,window:{LotKeysListingStorage:{remap:x=>x}},listingDeleteTombstoned:async()=>false,structure:async options=>{assert.equal(options.requireListings,true);return {listingsId:'personal-listings',userName:'Blair'}},DB:{get:async()=>null,put:async()=>{}},config:async()=>({userName:'Blair'}),syncListingAssets:async()=>{},safeName:x=>x,findChildByAppProperty:async()=>null,driveGet:async()=>{throw Object.assign(Error('File not found'),{status:404})},upsertJson:async x=>{saved=x;return {id:'replacement'}},updateListingsIndex:async()=>{}};
  vm.createContext(context);vm.runInContext(source,context);const l={id:'listing',driveFileId:'missing',description:'Keep my edits',facebookUrl:'https://facebook.com/example',listingAssets:[]};await context.syncListing(l);
  assert.equal(saved.fileId,'');assert.equal(saved.parentId,'personal-listings');assert.equal(saved.data.marketplaceDescription,'Keep my edits');assert.equal(l.driveFileId,'replacement');
  context.driveGet=async()=>{throw Object.assign(Error('Denied'),{status:403})};saved=undefined;await assert.rejects(context.syncListing({...l,driveFileId:'protected'}),/Denied/);assert.equal(saved,undefined);
});
test('missing original listing photos are reported instead of claiming successful media recovery',async()=>{
  const source=html.slice(html.indexOf('  async function syncListingAssets('),html.indexOf('  async function syncListing(l,'));
  const context={console,listingPhotoAssetKey:()=> 'key',safeName:x=>x,ensureFolder:async()=>({id:'photos'}),listFiles:async()=>[],qEscape:x=>x};vm.createContext(context);vm.runInContext(source,context);
  await assert.rejects(context.syncListingAssets({listingAssets:[{id:'asset',driveFileId:'deleted-photo'}]}, {listingAssetsId:'personal-assets'},null),/no original copy/);
});
