'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return {promise, resolve}; }
function fixture(status = 'synced') {
  const vehicle = {id:'vehicle', name:'2024 QX60', price:49990, updatedAt:17, syncStatus:status,
    drive:{profileFolderId:'profile', photosFolderId:'photos', videosFolderId:'videos', documentsFolderId:'documents'},
    photos:[{id:'original', name:'original.jpg', blob:new Blob(['retained original'])}], videos:[], attachments:[]};
  let row = structuredClone(vehicle); const calls = {writes:0, scans:0};
  const ctx = {console, Blob, Map, Set, Date, Promise, structuredClone, setTimeout, clearTimeout,
    DB:{get:async()=>structuredClone(row), put:async(_, value)=>{calls.writes++;row=structuredClone(value);},
      update:async(_,id,change)=>{const next=change(structuredClone(row));if(next!==undefined){calls.writes++;row=structuredClone(next);}return structuredClone(row);}},
    setting:async(key,fallback)=>fallback,
    driveGet:async()=>({id:'profile'}), scanVehicleProfile:async()=>{calls.scans++;return{id:'vehicle',name:'2024 QX60',price:49990,updatedAt:99,syncStatus:'synced',drive:structuredClone(vehicle.drive)};},
    listFiles:async()=>[], qEscape:value=>value, stripPhotoOrderPrefix:value=>value,
    protectPopulatedLocalVehicle:()=>false, fetchFileBlob:async()=>new Blob(['remote photo']),
    vehicleCoreIdentityScore:()=>5,snapshotHasVehicleData:()=>false};
  const helper = html.indexOf('  function vehicleHydrationPending(');
  const start = helper >= 0 ? helper : html.indexOf('  async function hydrateVehicleAssets(');
  vm.createContext(ctx); vm.runInContext(html.slice(start,html.indexOf('  async function findListingsIndex(',start)),ctx);
  return {ctx,vehicle,calls,get:()=>structuredClone(row),set:value=>{row=structuredClone(value);}};
}
for (const status of ['syncing','pending','error']) test('opening a '+status+' Vehicle preserves its local revision, originals and save state',async()=>{
  const f=fixture(status);if(status==='error'){f.vehicle.syncError='The account, Store or Vehicle edit changed. Its background save is paused.';f.set(f.vehicle);}
  const result=await f.ctx.hydrateVehicleAssets(f.vehicle);
  assert.equal(result.syncStatus,status);assert.equal(result.updatedAt,17);assert.equal(result.photos.length,1);
  assert.equal(await result.photos[0].blob.text(),'retained original');assert.equal(f.calls.scans,0);
  assert.equal(f.get().syncStatus,status);
});
test('a retained native receipt prevents hydration from treating an incomplete Drive gallery as authoritative',async()=>{
  const f=fixture();f.vehicle.drive.nativeTransfer={id:'batch',context:{revision:'17'}};f.set(f.vehicle);
  const result=await f.ctx.hydrateVehicleAssets(f.vehicle);
  assert.equal(result.updatedAt,17);assert.equal(result.photos.length,1);assert.equal(f.calls.scans,0);
});
test('a profile edit made while the Drive sheet is loading wins over the late hydration',async()=>{
  const f=fixture(),waiting=deferred(),started=deferred();
  f.ctx.scanVehicleProfile=()=>{started.resolve();return waiting.promise;};
  const pending=f.ctx.hydrateVehicleAssets(f.vehicle);await started.promise;
  const newer={...f.get(),name:'Newer local edit',price:48990,updatedAt:200,syncStatus:'pending'};f.set(newer);
  waiting.resolve({id:'vehicle',name:'Old remote title',price:49990,updatedAt:99,syncStatus:'synced',drive:f.vehicle.drive});
  const result=await pending;assert.equal(result.name,newer.name);assert.equal(f.get().price,48990);
  assert.equal(f.get().syncStatus,'pending');assert.equal(f.get().photos.length,1);
});
test('a slow thumbnail cannot overwrite an edit after the metadata is already displayed',async()=>{
  const f=fixture(),photo=deferred();f.vehicle.photos=[];f.set(f.vehicle);
  f.ctx.listFiles=async query=>query.includes("'photos'")?[{id:'remote-photo',name:'01 - cover.jpg',mimeType:'image/jpeg'}]:[];
  f.ctx.fetchFileBlob=()=>photo.promise;
  await f.ctx.hydrateVehicleAssets(f.vehicle,{photoBlobWaitMs:0});
  const newer={...f.get(),name:'Edited during photo download',updatedAt:200,syncStatus:'pending',photos:[{id:'new-photo',blob:new Blob(['new'])}]};f.set(newer);
  photo.resolve(new Blob(['old thumbnail']));await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.get().name,newer.name);assert.equal(f.get().photos[0].id,'new-photo');assert.equal(f.get().syncStatus,'pending');
});
test('healthy completed Profiles still hydrate their Drive metadata and gallery',async()=>{
  const f=fixture();f.ctx.listFiles=async query=>query.includes("'photos'")?[{id:'remote-photo',name:'cover.jpg',mimeType:'image/jpeg'}]:[];
  const result=await f.ctx.hydrateVehicleAssets(f.vehicle);
  assert.equal(result.updatedAt,99);assert.equal(result.syncStatus,'synced');assert.equal(result.photos[0].driveFileId,'remote-photo');
  assert.equal(await f.get().photos[0].blob.text(),'remote photo');
});
test('an incomplete save or retained error cannot display as Synced merely because the old flag says synced',()=>{
  const ctx={mediaStateForVehicle:v=>v.mediaUpload,liveProgressIsActive:media=>['processing','uploading','queued'].includes(media?.status)};
  const start=html.indexOf('  function vehicleDriveSyncPresentation('),end=html.indexOf('  function mediaStateForVehicle(',start);
  vm.createContext(ctx);vm.runInContext(html.slice(start,end),ctx);
  assert.equal(ctx.vehicleDriveSyncPresentation({syncStatus:'synced',syncError:'Background save is paused'}).label,'Needs attention');
  assert.equal(ctx.vehicleDriveSyncPresentation({syncStatus:'synced',drive:{nativeTransfer:{id:'retained'}}}).label,'Saving to Drive…');
  assert.equal(ctx.vehicleDriveSyncPresentation({syncStatus:'synced'}).label,'Synced ✓');
});
test('the upload error handler cannot write its stale browser object over a newer Vehicle edit',async()=>{
  const vehicle={id:'vehicle',updatedAt:17,price:49990},newer={...vehicle,updatedAt:200,price:48000,syncStatus:'pending'};let writes=0;
  const ctx={Date,DB:{get:async()=>structuredClone(newer),put:async()=>{writes++;}},
    DriveSync:{connected:()=>true,ready:async()=>true,syncVehicle:async()=>{const error=new Error('The account, Store or Vehicle edit changed. Its background save is paused.');error.nativeTransfer=true;throw error;}},
    currentUserRecord:async()=>({adminLevel:1}),normalizedAdminLevel:()=>1,setVehicleMediaProgress:()=>{}};
  vm.createContext(ctx);const start=html.indexOf('  async function syncVehicleNow(');
  vm.runInContext(html.slice(start,html.indexOf('  function vehicleNeedsAutomaticResume(',start)),ctx);
  const result=await ctx.syncVehicleNow(vehicle,{quiet:true});assert.equal(result.price,48000);assert.equal(result.updatedAt,200);assert.equal(writes,0);
});

test('late photo batches notify the open screen after the initial UI wait expires',async()=>{
  const f=fixture(),photo=deferred(),updates=[];
  f.ctx.listFiles=async q=>q.includes("'photos'")?Array.from({length:6},(_,i)=>({id:'remote-'+i,name:String(i)+'.jpg',mimeType:'image/jpeg'})):[];
  f.ctx.fetchFileBlob=()=>photo.promise;
  const initial=await f.ctx.hydrateVehicleAssets(f.vehicle,{photoBlobWaitMs:0,onUpdate:v=>updates.push(v)});
  assert.equal(initial.photos.length,6);assert.equal(initial.mediaHydration.status,'loading');
  photo.resolve(new Blob(['photo']));await new Promise(resolve=>setImmediate(resolve));
  assert.ok(updates.some(v=>v.mediaHydration.loadedCount===3));assert.equal(updates.at(-1).mediaHydration.loadedCount,6);
  assert.equal(updates.at(-1).mediaHydration.status,'ready');
});
test('a failed Documents folder does not discard a readable photo gallery or cached documents',async()=>{
  const f=fixture();f.vehicle.attachments=[{id:'inspection',driveFileId:'inspection-file'}];f.set(f.vehicle);
  f.ctx.listFiles=async q=>{if(q.includes("'documents'"))throw Error('403');return q.includes("'photos'")?[{id:'remote-photo',name:'photo.jpg',mimeType:'image/jpeg'}]:[]};
  const result=await f.ctx.hydrateVehicleAssets(f.vehicle);assert.equal(result.photos.length,1);assert.ok(result.photos[0].blob);
  assert.equal(result.attachments[0].id,'inspection');assert.equal(result.mediaHydration.status,'error');
});
test('only three photo downloads run together on a slow connection',async()=>{
  const f=fixture(),waiting=deferred();let active=0,max=0;
  f.ctx.listFiles=async q=>q.includes("'photos'")?Array.from({length:12},(_,i)=>({id:'remote-'+i,name:String(i)+'.jpg',mimeType:'image/jpeg'})):[];
  f.ctx.fetchFileBlob=async()=>{active++;max=Math.max(max,active);await waiting.promise;active--;return new Blob(['photo'])};
  await f.ctx.hydrateVehicleAssets(f.vehicle,{photoBlobWaitMs:0});assert.equal(max,3);waiting.resolve();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(max,3);assert.equal(f.get().mediaHydration.loadedCount,12);
});
test('a Store or Google account change discards late gallery writes and callbacks',async()=>{
  for(const changed of ['storeFolderId','currentAccountEmail']){
    const f=fixture(),photo=deferred(),updates=[];let switched=false;
    f.ctx.setting=async(key,fallback)=>switched&&key===changed?'different':fallback;
    f.ctx.listFiles=async q=>q.includes("'photos'")?[{id:'remote-photo',name:'photo.jpg',mimeType:'image/jpeg'}]:[];
    f.ctx.fetchFileBlob=()=>photo.promise;
    await f.ctx.hydrateVehicleAssets(f.vehicle,{photoBlobWaitMs:0,onUpdate:v=>updates.push(v)});
    const writes=f.calls.writes,count=updates.length;switched=true;photo.resolve(new Blob(['photo']));await new Promise(resolve=>setImmediate(resolve));
    assert.equal(f.calls.writes,writes);assert.equal(updates.length,count);
  }
});
test('the full metadata request still repaints after the old 15-second cutoff',async()=>{
  const loaded=deferred(),rows=[],modal={open:true,dataset:{openToken:'same'}};
  const ctx={console,modal,vehicleHydrationJobs:new Map(),DB:{get:async()=>({id:'vehicle',drive:{profileFolderId:'profile'}})},DriveSync:{connected:()=>true,ready:async()=>true,hydrateVehicleAssets:async(v,options)=>{await loaded.promise;options.onUpdate({...v,photos:[{id:'late'}]});return v;}}};
  vm.createContext(ctx);const start=html.indexOf('  function queueVehicleHydration(');vm.runInContext(html.slice(start,html.indexOf('  async function showVehicle(',start)),ctx);
  const job=ctx.queueVehicleHydration('vehicle',{openToken:'same',onUpdate:row=>rows.push(row)});loaded.resolve();await job;
  assert.ok(rows.some(v=>v.photos?.[0]?.id==='late'));
  modal.dataset.openToken='another';rows.length=0;await ctx.queueVehicleHydration('vehicle',{openToken:'same',onUpdate:row=>rows.push(row)});assert.equal(rows.length,0);
});

test('late gallery metadata preserves Listing photo choices when a cached cover gains its canonical asset ID',()=>{
  const ctx={Map};vm.createContext(ctx);const start=html.indexOf('  function adoptListingVehicleGallery(');vm.runInContext(html.slice(start,html.indexOf('  async function hydrateVehicleForListingUi(',start)),ctx);
  const listing={marketplaceTitle:'My edited title',description:'My typed copy',photoOrder:['DRV-cover','listing-photo'],photoPickerOrder:['listing-photo','DRV-cover'],photoOrderCustomized:true};
  const current={id:'vehicle',photos:[{id:'DRV-cover',driveFileId:'cover-file'}]},fresh={photos:[{id:'canonical-cover',driveFileId:'cover-file'},{id:'other',driveFileId:'other-file'}]};
  const result=ctx.adoptListingVehicleGallery(listing,current,fresh);
  assert.deepEqual(listing.photoOrder,['canonical-cover','listing-photo']);assert.deepEqual(listing.photoPickerOrder,['listing-photo','canonical-cover']);assert.equal(listing.marketplaceTitle,'My edited title');assert.equal(listing.description,'My typed copy');assert.equal(result.photos.length,2);
});

test('reopening a Profile subscribes to live batches from its existing gallery job',async()=>{
  const started=deferred(),done=deferred(),modal={open:true,dataset:{openToken:'first'}},updates=[];let send;
  const ctx={console,modal,vehicleHydrationJobs:new Map(),Set,DB:{get:async()=>({id:'vehicle',drive:{profileFolderId:'profile'}})},DriveSync:{connected:()=>true,ready:async()=>true,hydrateVehicleAssets:async(v,options)=>{send=options.onUpdate;started.resolve();await done.promise;return v;}}};
  vm.createContext(ctx);const start=html.indexOf('  function queueVehicleHydration(');vm.runInContext(html.slice(start,html.indexOf('  async function showVehicle(',start)),ctx);
  const first=ctx.queueVehicleHydration('vehicle',{openToken:'first',onUpdate:()=>assert.fail('Closed screen must ignore late photos')});await started.promise;
  modal.dataset.openToken='second';const second=ctx.queueVehicleHydration('vehicle',{openToken:'second',onUpdate:v=>updates.push(v)});assert.equal(first,second);
  send({id:'vehicle',photos:[{id:'batch'}]});assert.equal(updates[0].photos[0].id,'batch');done.resolve();await first;
});

test('one slow original does not hold up the rest of the gallery',async()=>{
  const f=fixture(),slow=deferred(),updates=[];
  f.ctx.listFiles=async q=>q.includes("'photos'")?Array.from({length:12},(_,i)=>({id:'remote-'+i,name:String(i).padStart(2,'0')+'.jpg',mimeType:'image/jpeg'})):[];
  f.ctx.fetchFileBlob=async id=>id==='remote-2'?slow.promise:new Blob(['photo']);
  await f.ctx.hydrateVehicleAssets(f.vehicle,{photoBlobWaitMs:0,onUpdate:v=>updates.push(v)});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.get().mediaHydration.loadedCount,11);assert.equal(f.get().mediaHydration.status,'loading');slow.resolve(new Blob(['late']));await new Promise(resolve=>setImmediate(resolve));assert.equal(updates.at(-1).mediaHydration.loadedCount,12);assert.equal(updates.at(-1).mediaHydration.status,'ready');
});

test('a failed background cache write reports an error to the open screen',async()=>{
  const f=fixture(),updates=[],update=f.ctx.DB.update;let writes=0;
  f.ctx.listFiles=async q=>q.includes("'photos'")?[{id:'remote',name:'photo.jpg',mimeType:'image/jpeg'}]:[];
  f.ctx.DB.update=async(...args)=>{if(writes++)throw Error('storage full');return update(...args)};
  await f.ctx.hydrateVehicleAssets(f.vehicle,{onUpdate:v=>updates.push(v)});assert.equal(updates.at(-1).mediaHydration.status,'error');assert.match(updates.at(-1).mediaHydration.error,/storage/);
});
