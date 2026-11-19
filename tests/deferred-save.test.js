'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Deferred=require('../lotkeys-deferred-save.js'),Core=require('../lotkeys-transfer-core.js'),Native=require('../lotkeys-native-transfers.js');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
const scope={account:'blair@example.test',store:'store-folder-123',record:'vehicle',revision:'17'};
function vehicle(){return{id:'vehicle',name:'2021 Jeep',year:'2021',make:'Jeep',model:'Grand Cherokee',stock:'DT3526A',updatedAt:17,carfaxOneOwner:true,photos:[{id:'p1',name:'original.jpg',blob:new Blob(['original'])}],videos:[],attachments:[],drive:{profileFolderId:'profile-folder-123',sharedFolderId:'shared-folder-123',adminSheetId:'sheet-file-123',photosFolderId:'photos-folder-123',videosFolderId:'videos-folder-123',documentsFolderId:'docs-folder-123'}};}
test('all media and the PDF get stable IDs before the foundation sheet is written',()=>{
  const v=vehicle(),analysis=Deferred.analyze(v),assets=Deferred.assign(v,analysis,['photo-reserved-123','pdf-reserved-123']);assert.equal(v.photos[0].driveFileId,'photo-reserved-123');assert.equal(v.drive.directoryPdfId,'pdf-reserved-123');assert.equal(assets[0].driveId,'photo-reserved-123');assert.equal(v.drive.nativeFinalizationPending,true);
});
test('the retained plan includes the complete PDF work, unchanged links/badges, media order and revision',()=>{
  const v=vehicle(),assets=Deferred.assign(v,Deferred.analyze(v),['photo-reserved-123','pdf-reserved-123']),op=Deferred.directory(v,{storeName:'Legacy Wetaskiwin'},'template-file-123','fp','https://mrmilo34.github.io/Lot-Keys-TEST/assets/'),plan=Deferred.plan(v,scope,assets,op,'index-file-123','2026-11-07T12:00:00Z');
  assert.equal(plan.version,2);assert.equal(plan.finalizers[0].type,'vehicle-directory');assert.equal(plan.finalizers[1].type,'vehicle-cover');assert.equal(plan.finalizers[1].assetKey,'photo:p1');assert.equal(plan.inventory[0].id,'p1');assert.equal(op.values['{{STOCK_NUMBER}}'],'DT3526A');assert.equal(op.badges[0].enabled,true);assert.equal(op.badges[2].height,41);assert.ok(op.links.some(row=>row[1].includes('photos-folder-123')));
});
for(const [name,files] of [['removal',[{id:'extra-drive-123',name:'other.jpg'}]],['rename',[{id:'existing-file-123',name:'02 - wrong.jpg',appProperties:{lotkeysAssetId:'p1'}}]]])test('an existing '+name+' uses established reconciliation instead of native deletion',()=>{assert.equal(Deferred.analyze(vehicle(),{photos:files}).eligible,false);});
test('missing source bytes and incomplete reserved IDs cannot be accepted',()=>{
  const v=vehicle();delete v.photos[0].blob;assert.throws(()=>Deferred.analyze(v),/original/);const ready=vehicle();assert.throws(()=>Deferred.assign(ready,Deferred.analyze(ready),['one-id-only']),/reserve/);
});
test('v2 staging uses bounded 1 MiB packets, verifies every byte, and only then allows switching',async()=>{
  const bytes=new Blob([new Uint8Array(1500000)]),asset={key:'photo:p',parent:'photos-folder-123',name:'photo.jpg',size:bytes.size},plan={...Core.batch(scope,[asset]),version:2,stagingChunkBytes:1048576};let staged=0;const chunks=[],progress=[];
  await Native.handoff(plan,new Map([[asset.key,bytes]]),{phone:{uploadCall:async(op,input)=>{if(op==='prepare')return{...plan,id:'batch',state:'staging',assets:[{...asset,staged:0}]};if(op==='chunk'){const size=Buffer.from(input.base64,'base64').length;chunks.push(size);assert.equal(input.offset,staged);staged+=size;return{staged};}assert.equal(op,'commit');assert.equal(staged,bytes.size);return{...plan,id:'batch',state:'queued',assets:plan.assets.map(row=>({...row,staged:row.size}))};}},onProgress:value=>progress.push(value)});
  assert.deepEqual(chunks,[1048576,451424]);assert.equal(progress.at(-1).version,2);assert.match(Native.presentation(progress.at(-1)).message,/Ready to switch apps/);assert.equal(Native.presentation(progress[0]).backgroundReady,false);
});
test('a restarted v2 job retains the larger packet bound and finishing plan without staging again',async()=>{
  const plan={...Core.batch(scope,[]),version:2,finalizers:[{type:'vehicle-directory',pdfId:'pdf-reserved-123'}]},calls=[];await Native.handoff(plan,new Map(),{phone:{uploadCall:async op=>{calls.push(op);return{...plan,id:'batch',state:'queued'};}}});assert.deepEqual(calls,['prepare','commit']);
});
test('a refresh cannot replace a native pending row or undo a completed native finalization',()=>{
  const pending={id:'v',updatedAt:17,drive:{nativeFinalizationPending:true}},complete={id:'v',updatedAt:17,drive:{nativeFinalizationPending:false,lastDirectoryFingerprint:'done'}};
  assert.deepEqual(Deferred.mergeIndex([{id:'v',updatedAt:100,drive:{}}],[pending]),[pending]);assert.deepEqual(Deferred.mergeIndex([pending],[complete]),[complete]);
  assert.deepEqual(Deferred.mergeIndex([],[complete],{retainedIds:['v']}),[complete]);assert.deepEqual(Deferred.mergeIndex([pending],[pending],{removeId:'v'}),[]);
});
test('a current explicit edit can supersede its old pending index row without dropping other jobs',()=>{
  const next={id:'v',updatedAt:200,drive:{nativeFinalizationPending:true}},other={id:'other',drive:{nativeFinalizationPending:true}};const merged=Deferred.mergeIndex([next],[{id:'v',updatedAt:17,drive:{nativeFinalizationPending:true}},other],{recordId:'v'});assert.deepEqual(merged,[next,other]);
});
function preparationFixture(capable=true){
  const v=vehicle();v.drive={};const original=structuredClone(v),events=[],saved=[];let pendingChildren=0,release;const allChildren=new Promise(resolve=>{release=resolve;});
  const ctx={window:{LotKeysDeferredSave:Deferred,LotKeysTransferCore:Core,LotKeysPhone:{uploadCapabilities:async()=>({uploadAccount:scope.account,capabilities:{deferredVehicleFinalization:capable}})}},Blob,URL,Date,Map,Promise,location:{href:'https://mrmilo34.github.io/Lot-Keys-TEST/'},FOLDER_MIME:'folder',DB:{get:async()=>original},setting:async key=>({currentAccountEmail:scope.account,storeFolderId:scope.store,directoryTemplateFileId:'template-file-123'}[key]),findChildByAppProperty:async()=>null,createFolder:async()=>({id:'profile-folder-123'}),createSpreadsheet:async()=>({id:'sheet-file-123'}),
    ensureFolder:async(_,name)=>{events.push('folder:'+name);if(name!=='Shared'){pendingChildren++;if(pendingChildren===3)release();await allChildren;}return{id:name.toLowerCase()+'-folder-123'};},saveVehicleSyncState:(row)=>saved.push(structuredClone(row)),listFiles:async()=>[],qEscape:value=>value,apiFetch:async()=>({ids:['photo-reserved-123','pdf-reserved-123']}),directoryFingerprint:()=> 'fp',sheetFingerprint:()=> 'sf',writeVehicleSheet:async(_,row)=>{events.push('sheet');assert.equal(row.photos[0].driveFileId,'photo-reserved-123');row.drive.lastSheetUpdatedAt='2026-11-07T12:00:00Z';},updateInventoryIndex:async()=>events.push('index'),findInventoryIndex:async()=>({id:'index-file-123'})};
  vm.createContext(ctx);const start=html.indexOf('  async function prepareDeferredVehicleSave(');vm.runInContext(html.slice(start,html.indexOf('  async function finishDeferredVehicleSave(',start)),ctx);return{v,ctx,events,saved};
}
test('the actual foundation overlaps child folders and saves essential data and a durable work plan without rendering a PDF',async()=>{
  const f=preparationFixture();assert.equal(await f.ctx.prepareDeferredVehicleSave(f.v,{rootId:scope.store,inventoryId:'inventory-folder-123'},{},()=>{}),true);assert.deepEqual(f.events,['folder:Shared','folder:Photos','folder:Videos','folder:Documents','sheet','index']);assert.equal(f.saved.at(-1).drive.nativeTransfer.plan.version,2);assert.equal(f.saved.at(-1).drive.nativeTransfer.id,'');
});
test('the old connector leaves the complete working browser path available',async()=>{const f=preparationFixture(false);assert.equal(await f.ctx.prepareDeferredVehicleSave(f.v,{rootId:scope.store},{},()=>{}),false);assert.deepEqual(f.events,[]);});
test('the foundation rejects a real Store switch before creating folders',async()=>{const f=preparationFixture();f.ctx.setting=async key=>({currentAccountEmail:scope.account,storeFolderId:'different-store-123',directoryTemplateFileId:'template-file-123'}[key]);await assert.rejects(f.ctx.prepareDeferredVehicleSave(f.v,{rootId:scope.store},{},()=>{}),/Store or Vehicle edit changed/);assert.deepEqual(f.events,[]);});
test('photo destinations retain the established repeated-prefix and original-name rules',()=>{
  const v=vehicle();v.photos[0].name=' 01 - 02 - original:name.jpg ';const a=Deferred.analyze(v,{photos:[{id:'existing-photo-123',name:'01 - original-name.jpg',appProperties:{lotkeysAssetId:'p1'}}]});assert.equal(a.eligible,true);Deferred.assign(v,a,['pdf-reserved-123']);assert.equal(v.photos[0].name,'original:name.jpg');assert.equal(v.photos[0].driveName,'01 - original-name.jpg');
});
function completionFixture(done={id:'pdf-reserved-123',fingerprint:'fp',publicShareReady:true}){
  const v=vehicle(),assets=Deferred.assign(v,Deferred.analyze(v),['photo-reserved-123','pdf-reserved-123']);v.drive.nativeTransfer={id:'native-job',context:scope,plan:Deferred.plan(v,scope,assets,Deferred.directory(v,{},'template-file-123','fp','https://mrmilo34.github.io/Lot-Keys-TEST/assets/'),'index-file-123','date')};
  let stored=structuredClone(v);const snapshot={state:'complete',finalizerResults:{directory:done}},events=[];
  const ctx={window:{LotKeysTransferCore:Core,LotKeysNativeTransfers:{readStatus:async()=>snapshot,wait:async(id,scope,opts)=>{opts.onSnapshot(snapshot);return{'photo:p1':{id:'photo-reserved-123',name:'01 - original.jpg'}};},hold:async()=>{}},LotKeysPhone:{uploadCall:async()=>{throw Error('No new staging on resume');}}},Map,Date,Number,String,Error,Array,setting:async key=>({currentAccountEmail:scope.account,storeFolderId:scope.store}[key]),DB:{get:async()=>structuredClone(stored),update:async(_,id,updater)=>{const next=updater(structuredClone(stored));if(next)stored=structuredClone(next);return structuredClone(stored);}},saveVehicleSyncState:()=>{},clearVehicleSyncState:()=>events.push('cleared'),assetFingerprint:rows=>rows.map(row=>row.driveFileId).join('|'),queueInventoryCover:()=>events.push('cover')};
  vm.createContext(ctx);for(const [start,end]of [['  async function nativeVehicleTransfer(','  async function syncVehicle('],['  async function finishDeferredVehicleSave(','  function assetFingerprint(']])vm.runInContext(html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start))),ctx);
  return{v,ctx,events,stored:()=>stored,change:fn=>fn(stored)};
}
test('the browser consumes matching Android finishing proof and finishes locally without creating another PDF',async()=>{
  const f=completionFixture();await f.ctx.nativeVehicleTransfer(f.v,{rootId:scope.store},()=>{},{resumeOnly:true});assert.equal(f.v.drive.nativeFinalizationPending,false);assert.equal(f.v.drive.publicShareReady,true);await f.ctx.finishDeferredVehicleSave(f.v,()=>{});assert.equal(f.stored().syncStatus,'synced');assert.equal(f.stored().drive.coverPhotoFileId,'photo-reserved-123');assert.equal(f.stored().drive.nativeTransfer,undefined);assert.deepEqual(f.events,['cleared']);
});
for(const [name,proof]of [['missing',undefined],['wrong file',{id:'other-pdf-123',fingerprint:'fp'}],['wrong revision',{id:'pdf-reserved-123',fingerprint:'old'}]])test('a '+name+' native PDF proof cannot mark finishing complete',async()=>{
  const f=completionFixture(null);if(proof)f.ctx.window.LotKeysNativeTransfers.wait=async(_,scope,opts)=>{opts.onSnapshot({state:'complete',finalizerResults:{directory:proof}});return{};};await f.ctx.nativeVehicleTransfer(f.v,{rootId:scope.store},()=>{},{resumeOnly:true});assert.equal(f.v.drive.nativeFinalizationPending,true);await assert.rejects(f.ctx.finishDeferredVehicleSave(f.v,()=>{}),/not confirmed/);assert.equal(f.stored().drive.nativeFinalizationPending,true);
});
for(const [name,change]of [['newer edit',row=>row.updatedAt=18],['different receipt',row=>row.drive.nativeTransfer.id='newer-job']])test('local completion preserves a '+name+' that arrived during confirmation',async()=>{
  const f=completionFixture();await f.ctx.nativeVehicleTransfer(f.v,{rootId:scope.store},()=>{},{resumeOnly:true});f.change(change);await assert.rejects(f.ctx.finishDeferredVehicleSave(f.v,()=>{}),/newer edit has been kept/);assert.notEqual(f.stored().syncStatus,'synced');assert.ok(f.stored().drive.nativeTransfer);assert.deepEqual(f.events,[]);
});
test('the actual healthy protocol-2 sync skips browser rendering and reconciliation after Android completion',async()=>{
  const f=completionFixture();f.ctx.restoreVehicleSyncState=()=>{};f.ctx.buildVehicleProfileName=()=>f.v.name;f.ctx.structure=async()=>({rootId:scope.store});f.ctx.config=async()=>({});f.ctx.setting=async key=>({currentUserAdminLevel:2,currentAccountEmail:scope.account,storeFolderId:scope.store}[key]);f.ctx.prepareDeferredVehicleSave=async()=>true;
  const start=html.indexOf('  async function syncVehicle(');vm.runInContext(html.slice(start,html.indexOf('  async function syncVehicleState(',start)),f.ctx);await f.ctx.syncVehicle(f.v);assert.equal(f.stored().syncStatus,'synced');
});
test('protocol-2 finishing cannot collide with a retained old job or another core-sheet save of the same edit',()=>{
 const v=vehicle(),assets=Deferred.assign(v,Deferred.analyze(v),['photo-reserved-123','pdf-reserved-123']),op=Deferred.directory(v,{},'template-file-123','fp','https://mrmilo34.github.io/Lot-Keys-TEST/assets/'),a=Deferred.plan(v,scope,assets,op,'index-file-123','first'),b=Deferred.plan(v,scope,assets,op,'index-file-123','second');assert.notEqual(a.key,Core.key(scope));assert.notEqual(a.key,b.key);assert.deepEqual(a.context,b.context);
});
test('recovered existing folders are inspected for their existing PDF before reserving destinations',async()=>{
 const f=preparationFixture();f.ctx.findChildByAppProperty=async()=>({id:'profile-folder-123',name:f.v.name});f.ctx.listFiles=async query=>query.includes('shared-folder-123')?[{id:'existing-pdf-123',name:'Vehicle Info Directory.pdf'}]:[];f.ctx.apiFetch=async()=>({ids:['photo-reserved-123']});await f.ctx.prepareDeferredVehicleSave(f.v,{rootId:scope.store,inventoryId:'inventory-folder-123'},{},()=>{});assert.equal(f.v.drive.directoryPdfId,'existing-pdf-123');
});
test('existing Profile folders keep the current Vehicle name during the foundation step',async()=>{
 const f=preparationFixture();f.v.drive.profileFolderId='profile-folder-123';f.ctx.driveGet=async()=>({id:'profile-folder-123',name:'Old name'});f.ctx.patchMetadata=async(id,body)=>{f.events.push('rename:'+body.name);return{id,...body};};await f.ctx.prepareDeferredVehicleSave(f.v,{rootId:scope.store,inventoryId:'inventory-folder-123'},{},()=>{});assert.equal(f.events[0],'rename:2021 Jeep');
});
test('a protocol-2 newer remote edit or PDF conflict cannot fall through to browser overwrites',async()=>{
 const f=completionFixture();f.ctx.window.LotKeysNativeTransfers.wait=async()=>{throw Object.assign(Error('The Info Sheet was changed elsewhere. Its newer PDF has been preserved.'),{nativeState:'needs_reconcile',snapshot:{}});};await assert.rejects(f.ctx.nativeVehicleTransfer(f.v,{rootId:scope.store},()=>{},{resumeOnly:true}),/newer PDF has been preserved/);assert.equal(f.stored().drive.nativeFinalizationPending,true);assert.ok(f.stored().drive.nativeTransfer);assert.equal(f.v.drive.nativeTransfer.reconcile,undefined);
});
