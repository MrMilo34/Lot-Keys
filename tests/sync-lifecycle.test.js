'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function uploadFixture({hide=false,freeze=false}={}){
  const sessions=new Map(),sent=[],state={accepted:0,created:0,aborts:0,queries:0,froze:false},ctx={Blob,console,setTimeout,clearTimeout,Date,document:{visibilityState:'visible'},navigator:{onLine:true},activeUploadRequests:new Set(),LONG_UPLOAD_AUTH_VALIDITY_MS:900000,authorize:async()=> 'token',recoverAuthorizationAfter401:async()=> 'new-token',uploadChunkSize:()=>2,requestUploadWakeLock:async()=>null,getResumableSession:key=>sessions.get(key),saveResumableSession:(key,row)=>sessions.set(key,{...row}),clearResumableSession:key=>sessions.delete(key),createResumableSession:async()=>{state.created++;return'https://upload.example/session'},queryResumableOffset:async()=>{state.queries++;return{valid:true,complete:false,offset:state.accepted}},acceptedOffsetFromRange:(range,fallback)=>range?Number(range.match(/\d+$/)[0])+1:fallback,multipartCreate:async()=>assert.fail('unexpected duplicate create')};
  ctx.XMLHttpRequest=class{
    constructor(){this.upload={};this.headers={};this.readyState=0}
    open(){this.readyState=1}setRequestHeader(k,v){this.headers[k]=v}getResponseHeader(){return 'bytes=0-'+(state.accepted-1)}
    abort(){state.aborts++;this.aborted=true;this.readyState=0;this.onabort?.()}
    send(blob){const m=this.headers['Content-Range'].match(/bytes (\d+)-(\d+)\/(\d+)/),start=Number(m[1]),end=Number(m[2])+1,total=Number(m[3]);this.readyState=2;sent.push([start,end]);if(hide)ctx.document.visibilityState='hidden';if(freeze&&start===2&&!state.froze){state.froze=true;ctx.document.visibilityState='hidden';ctx.pauseActiveUploads();return}queueMicrotask(()=>{if(this.aborted)return;this.upload.onprogress?.({lengthComputable:true,loaded:blob.size});state.accepted=end;this.status=end===total?200:308;this.response=end===total?{id:'saved-file'}:null;this.readyState=4;this.onload()})}
  };
  vm.createContext(ctx);vm.runInContext(html.slice(html.indexOf('  function resumeStalledUploads('),html.indexOf('  async function setting(',html.indexOf('  function resumeStalledUploads('))),ctx);
  vm.runInContext(html.slice(html.indexOf('  async function resumableCreate('),html.indexOf('  async function ensureManagementUpdatesFolder(')),ctx);
  return {ctx,sessions,sent,state};
}
test('ordinary app switching lets the real resumable upload finish instead of aborting it',async()=>{
  const f=uploadFixture({hide:true}),out=await f.ctx.resumableCreate(new Blob(['abcdef'],{type:'image/jpeg'}),{name:'Photo'},()=>{},'asset');assert.equal(out.id,'saved-file');assert.equal(f.state.aborts,0);assert.deepEqual(f.sent,[[0,2],[2,4],[4,6]]);assert.equal(f.sessions.size,0);
});
test('an actual freeze keeps the acknowledged offset and resumes without a duplicate upload session',async()=>{
  const f=uploadFixture({freeze:true}),blob=new Blob(['abcdef'],{type:'image/jpeg'});await assert.rejects(f.ctx.resumableCreate(blob,{name:'Photo'},()=>{},'asset'),/checkpoint/);assert.equal(f.sessions.get('asset').offset,2);assert.equal(f.state.aborts,1);f.ctx.document.visibilityState='visible';const out=await f.ctx.resumableCreate(blob,{name:'Photo'},()=>{},'asset');assert.equal(out.id,'saved-file');assert.equal(f.state.created,1);assert.equal(f.state.queries,1);assert.deepEqual(f.sent,[[0,2],[2,4],[2,4],[4,6]]);
});
test('offline uploads keep their local media and do not start network sessions',async()=>{
  const f=uploadFixture();f.ctx.navigator.onLine=false;await assert.rejects(f.ctx.resumableCreate(new Blob(['photo']),{},()=>{},'asset'),/checkpoint/);assert.equal(f.state.created,0);assert.equal(f.sent.length,0);
});
test('foreground recovery aborts only stalled unfinished requests, preserving active and completed work',()=>{
  const f=uploadFixture(),aborted=[],now=Date.now();for(const [id,at,readyState] of [['stale',now-60000,2],['active',now-2000,2],['complete',now-60000,4]])f.ctx.activeUploadRequests.add({readyState,lotkeysLastProgressAt:at,abort:()=>aborted.push(id)});assert.equal(f.ctx.resumeStalledUploads(),1);assert.deepEqual(aborted,['stale']);
});
test('the real lifecycle listeners distinguish app switching from freezing and navigation',async()=>{
  const callbacks=new Map(),calls=[],ctx={document:{visibilityState:'hidden',addEventListener:(type,fn)=>callbacks.set(type,fn)},window:{addEventListener:(type,fn)=>callbacks.set(type,fn)},DriveSync:{pauseActiveUploads:()=>calls.push('pause'),resumeStalledUploads:()=>calls.push('recover')},resumeForegroundWork:async()=>calls.push('resume'),console};
  const lines=html.split('\n').filter(line=>line.includes("addEventListener('visibilitychange'")&&line.includes('resumeForegroundWork')||line.includes("addEventListener('freeze'")||line.includes("addEventListener('resume'")&&line.includes('resumeForegroundWork')||line.includes("addEventListener('pagehide'")&&line.includes('pauseActiveUploads'));
  vm.createContext(ctx);vm.runInContext(lines.join('\n'),ctx);callbacks.get('visibilitychange')();assert.deepEqual(calls,[]);callbacks.get('freeze')();assert.deepEqual(calls,['pause']);ctx.document.visibilityState='visible';callbacks.get('visibilitychange')();await Promise.resolve();assert.deepEqual(calls,['pause','recover','resume']);callbacks.get('pagehide')();assert.equal(calls.at(-1),'pause');
});
function inventoryFixture({unchanged=false}={}){
  const timers=[],writes=[],rows=new Map(),events=[],counts={reads:0,covers:0};let resolveCover;
  const cover=new Promise(resolve=>resolveCover=resolve),entry={id:'vehicle',name:'RAV4',price:19888,updatedAt:10,drive:{profileFolderId:'profile',coverPhotoFileId:'cover'}},local={...entry,syncStatus:'synced',photos:[{id:'photo',driveFileId:'cover',blob:new Blob(['cached'])}]};if(unchanged)rows.set('vehicle',local);
  const ctx={console,Date,Map,Set,window:{dispatchEvent:e=>events.push(e)},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},setTimeout:fn=>{timers.push(fn);return timers.length},activeUploadRequests:new Set(),structure:async()=>({inventoryId:'inventory'}),listInventoryProfileFolders:async()=>[{id:'profile'}],readInventoryIndex:async()=>{counts.reads++;return{file:{id:'index'},entries:[entry]}},incompleteDriveVehicle:()=>false,clearVehicleSyncState:()=>{},clearOwnerRequestDraft:()=>{},clearVehicleUiProgressState:()=>{},protectPopulatedLocalVehicle:()=>false,contributionResolutionRows:x=>x,pendingContributionRequests:x=>x,indexEntry:v=>({id:v.id,name:v.name,price:v.price,updatedAt:v.updatedAt,drive:v.drive}),DB:{all:async()=>[...rows.values()],get:async(type,id)=>rows.get(id),put:async(type,v)=>{writes.push(v.id);rows.set(v.id,v)},update:async(type,id,change)=>{const next=change(rows.get(id));if(next!==undefined){writes.push(id);rows.set(id,next);}return rows.get(id);},del:async(type,id)=>rows.delete(id)},fetchFileBlob:async()=>{counts.covers++;return cover},reconcileListingVehicleProfiles:async()=>{},inventoryIndexSignature:()=> 'index-signature',inventoryFolderSignature:()=> 'folder-signature',setSetting:async()=>{}};
  vm.createContext(ctx);vm.runInContext(html.slice(html.indexOf('  const inventoryCoverJobs='),html.indexOf('  async function quickRefreshInventoryFromDrive(')),ctx);return {ctx,timers,writes,rows,events,counts,resolveCover,entry};
}
test('Inventory refresh reuses the fetched index and returns metadata before a slow cover download',async()=>{
  const f=inventoryFixture(),out=await f.ctx.refreshInventoryFromDrive({indexHint:{file:{id:'index'},entries:[f.entry]}});assert.equal(out,1);assert.equal(f.counts.reads,0);assert.equal(f.counts.covers,0);assert.equal(f.rows.get('vehicle').price,19888);f.timers.shift()();assert.equal(f.counts.covers,1);f.resolveCover(new Blob(['new-cover']));await new Promise(r=>setImmediate(r));assert.equal(f.events[0].type,'lotkeys:vehicle-cover');assert.ok(f.rows.get('vehicle').photos[0].blob);
});
test('unchanged Inventory rows do not rewrite their cached photo blobs',async()=>{
  const f=inventoryFixture({unchanged:true});await f.ctx.refreshInventoryFromDrive({indexHint:{file:{id:'index'},entries:[f.entry]}});assert.equal(f.writes.length,0);assert.equal(f.timers.length,0);assert.equal(f.counts.covers,0);
});
test('a late thumbnail download cannot replace a newer locally edited Vehicle Profile',async()=>{
  const f=inventoryFixture();await f.ctx.refreshInventoryFromDrive({indexHint:{file:{id:'index'},entries:[f.entry]}});f.timers.shift()();f.rows.get('vehicle').syncStatus='pending';f.rows.get('vehicle').price=17999;f.resolveCover(new Blob(['late-cover']));await new Promise(r=>setImmediate(r));assert.equal(f.rows.get('vehicle').price,17999);assert.equal(f.rows.get('vehicle').photos[0].blob,undefined);assert.equal(f.events.length,0);
});
test('Inventory refresh preserves an unfinished native job even with an old synced flag',async()=>{
  const f=inventoryFixture({unchanged:true}),local=f.rows.get('vehicle');
  local.drive.nativeTransfer={id:'retained-native-job'};local.syncError='A retained save needs attention';
  f.entry.updatedAt=200;f.entry.drive.coverPhotoFileId='';
  await f.ctx.refreshInventoryFromDrive({indexHint:{file:{id:'index'},entries:[f.entry]}});
  assert.equal(f.writes.length,0);assert.equal(local.drive.nativeTransfer.id,'retained-native-job');
  assert.ok(f.rows.get('vehicle').photos[0].blob);assert.equal(f.rows.get('vehicle').updatedAt,10);
});
test('a pending save arriving after Inventory metadata was read wins the atomic refresh write',async()=>{
  const f=inventoryFixture({unchanged:true}),update=f.ctx.DB.update;f.entry.price=17000;
  f.ctx.DB.update=async(type,id,change)=>{
    f.rows.set(id,{...f.rows.get(id),price:18500,updatedAt:300,syncStatus:'pending',drive:{...f.rows.get(id).drive,nativeTransfer:{id:'new-job'}}});
    return update(type,id,change);
  };
  await f.ctx.refreshInventoryFromDrive({indexHint:{file:{id:'index'},entries:[f.entry]}});
  assert.equal(f.rows.get('vehicle').price,18500);assert.equal(f.rows.get('vehicle').syncStatus,'pending');
  assert.equal(f.rows.get('vehicle').drive.nativeTransfer.id,'new-job');assert.equal(f.writes.length,0);
});
test('foreground resume starts saved vehicle uploads before preference backups and directory scans',async()=>{
  const calls=[],ctx={document:{visibilityState:'visible'},navigator:{onLine:true},storeTransitionBusy:false,foregroundResumeBusy:false,DriveSync:{resumeStalledUploads:()=>calls.push('recover-stalled'),syncPersonalPreferences:async()=>calls.push('preferences'),refreshStoreDirectory:async()=>calls.push('directory')},resumePendingVehicleSyncs:async()=>calls.push('vehicles'),resumePendingContributionSubmissions:async()=>calls.push('contributions'),resumePendingListingSyncs:async()=>calls.push('listings'),refreshInventoryIfDue:async()=>calls.push('inventory-refresh'),refreshListingsIfDue:async()=>calls.push('listing-refresh'),storeProfileThumbCache:{clear:()=>{}},route:'home',modal:{open:false},console};vm.createContext(ctx);vm.runInContext(html.slice(html.indexOf('  async function resumeForegroundWork('),html.indexOf('  let baseReadySignaled=')),ctx);await ctx.resumeForegroundWork();assert.ok(calls.indexOf('vehicles')<calls.indexOf('preferences'));assert.ok(calls.indexOf('inventory-refresh')<calls.indexOf('directory'));assert.equal(ctx.foregroundResumeBusy,false);
});
for(const status of ['pending','approved','rejected'])test('Inventory refresh keeps submitted work honest while its receipt is '+status,async()=>{
  const f=inventoryFixture({unchanged:true}),local=f.rows.get('vehicle');local.syncStatus='queued';local.price=25000;local.lastWorkspaceRequestId='request';local.lastWorkspaceRequestFileId='receipt';
  f.ctx.fetchFileBlob=async()=>new Blob([JSON.stringify({id:'request',vehicleId:'vehicle',status,processorError:'A duplicate stock number needs review.'})]);
  await f.ctx.refreshInventoryFromDrive({indexHint:{file:{id:'index'},entries:[f.entry]}});
  const saved=f.rows.get('vehicle');
  if(status==='pending'){assert.equal(saved.syncStatus,'queued');assert.equal(saved.price,25000);assert.equal(f.writes.length,0);}
  if(status==='approved'){assert.equal(saved.syncStatus,'synced');assert.equal(saved.price,19888);}
  if(status==='rejected'){assert.equal(saved.syncStatus,'error');assert.equal(saved.price,25000);assert.match(saved.syncError,/duplicate stock/);}
});
