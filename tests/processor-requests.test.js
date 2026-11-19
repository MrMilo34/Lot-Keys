'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../processor/Code.gs'),'utf8');
function terminalFixture({writeFails=false}={}){
  const calls=[],saved=new Map(),ctx={Date,Error,lkWriteJsonFile_:(id,data)=>{calls.push('persist');if(writeFails)throw Error('403 write denied');saved.set(id,structuredClone(data));},lkTrash_:()=>{calls.push('trash-denied');return false;}};
  vm.createContext(ctx);const a=source.indexOf('function lkApproveRequest_');vm.runInContext(source.slice(a,source.indexOf('function lkRecordRequestError_',a)),ctx);return{ctx,calls,saved};
}
for(const status of ['approved','rejected'])test(status+' request stays terminal when Google denies trashing a user-owned file',()=>{
  const f=terminalFixture(),request={id:'request',type:'vehicle-create',status:'pending'},file={id:'file',name:'request.json'};
  const result=status==='approved'?f.ctx.lkApproveRequest_(request,file,{},'Published'):f.ctx.lkRejectRequest_(request,file,{},'Duplicate');
  assert.equal(result,status);assert.equal(f.saved.get('file').status,status);assert.ok(f.saved.get('file').resolvedAt);assert.deepEqual(f.calls,['persist','trash-denied']);
});
test('a receipt write failure stops before cleanup and stays recoverable',()=>{
  const f=terminalFixture({writeFails:true});assert.throws(()=>f.ctx.lkApproveRequest_({status:'pending'},{id:'file',name:'request.json'},{},'Published'),/write denied/);assert.deepEqual(f.calls,['persist']);assert.equal(f.saved.size,0);
});
test('the trigger skips a persisted terminal request on every later run',()=>{
  const f=terminalFixture();f.ctx.lkApproveRequest_({id:'request',status:'pending'},{id:'file',name:'request.json'},{},'Published');
  let applied=0;const props={setProperties:()=>{}};
  const ctx={Date,Math,JSON,String,console,LK_REQUEST_LIMIT:100,LK_FOLDER:'folder',LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},PropertiesService:{getScriptProperties:()=>props},
    lkLoadState_:()=>({users:[{drive:{moreFolderId:'more'}}]}),lkActive_:()=>true,lkRefreshPublicProfiles_:()=>false,lkProcessMessageOutboxes_:()=>({delivered:0,errors:0,processed:0}),
    lkTryGet_:id=>({id}),lkListChildren_:id=>id==='more'?[{id:'vehicle'}]:[{id:'file',name:'request.json'}],lkMoreContext_:()=>({pendingFolder:{id:'pending'}}),lkReadJsonFile_:id=>f.saved.get(id),lkProcessRequest_:()=>{applied++;}};
  vm.createContext(ctx);const a=source.indexOf('function processLotKeysRequests()');vm.runInContext(source.slice(a,source.indexOf('function lkProcessRequest_',a)),ctx);
  for(let i=0;i<3;i++)assert.equal(ctx.processLotKeysRequests().errors,0);assert.equal(applied,0);
});
test('completed receipts do not starve pending saves and older requests run before newer ones',()=>{
  const terminal=Array.from({length:100},(_,i)=>({id:'terminal-'+i,name:'receipt.json',createdTime:'2026-01-01T00:00:00Z'}));
  const files=[...terminal,{id:'new',name:'request.json',createdTime:'2026-11-10T20:16:00Z'},{id:'old',name:'request.json',createdTime:'2026-11-10T20:01:00Z'}],applied=[];
  const ctx={Date,Math,JSON,String,console,LK_REQUEST_LIMIT:100,LK_FOLDER:'folder',LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},PropertiesService:{getScriptProperties:()=>({setProperties:()=>{}})},
    lkLoadState_:()=>({users:[{drive:{moreFolderId:'more'}}]}),lkActive_:()=>true,lkRefreshPublicProfiles_:()=>false,lkProcessMessageOutboxes_:()=>({delivered:0,errors:0,processed:0}),
    lkTryGet_:id=>({id}),lkListChildren_:id=>id==='more'?[{id:'vehicle'}]:files,lkMoreContext_:()=>({pendingFolder:{id:'pending'}}),lkReadJsonFile_:id=>({id,status:id.startsWith('terminal')?'approved':'pending'}),
    lkUserName_:()=> 'Rob',lkEmail_:()=> 'rob@example.test',lkRequestFolders_:()=>({}),lkProcessRequest_:(state,actor,request)=>{applied.push(request.id);return 'approved'},lkRecordRequestError_:()=>assert.fail('No request error expected')};
  vm.createContext(ctx);const a=source.indexOf('function processLotKeysRequests()');vm.runInContext(source.slice(a,source.indexOf('function lkProcessRequest_',a)),ctx);
  const result=ctx.processLotKeysRequests();assert.equal(result.processed,2);assert.equal(result.approved,2);assert.deepEqual(applied,['old','new']);
});
test('a regular creator submission publishes all selected photos and facts before its approved receipt',()=>{
  const ctx={console,Date,JSON,String,Number,Math};vm.createContext(ctx);vm.runInContext(source,ctx);
  const actor={userName:'Creator',email:'creator@example.test',googleSub:'creator-sub',adminLevel:0},files=new Map(),copies=[],saved=[];
  const media=Array.from({length:12},(_,i)=>({id:'photo-'+i,driveFileId:'more-'+i,name:'photo-'+i+'.jpg'}));
  for(const item of media)files.set(item.driveFileId,{id:item.driveFileId,name:item.name,parents:['more-photos']});
  Object.assign(ctx,{
    lkFindVehicle_:()=>null,lkFindDuplicateVehicle_:()=>null,
    lkEnsureOfficialStructure_:(state,vehicle)=>{vehicle.drive={photosFolderId:'official-photos',videosFolderId:'official-videos',documentsFolderId:'official-documents'}},
    lkGet_:id=>files.get(id),lkCopyFile_:(id,parent,name,properties)=>{const file={id:'official-'+copies.length,name,parents:[parent],properties};files.set(file.id,file);copies.push(file);return file},
    lkListChildren_:parent=>[...files.values()].filter(file=>file.parents.includes(parent)),
    lkWriteVehicle_:(state,vehicle)=>saved.push({vehicle:structuredClone(vehicle),cover:ctx.lkCoverPhotoId_(vehicle)}),
    lkWriteJsonFile_:(id,request)=>{assert.equal(copies.length,12);assert.equal(saved.length,1);saved.push({receipt:structuredClone(request)})},lkTrash_:()=>false});
  const request={id:'request',type:'vehicle-create',vehicleId:'vehicle',vehicle:{year:'2025',make:'Infiniti',model:'QX50 Pure',stock:'SC1763',price:49999},media:{photos:media,videos:[],documents:[]}};
  assert.equal(ctx.lkProcessRequest_({},actor,request,{id:'request-file',name:'request.json'},{photosFolder:{id:'more-photos'}}),'approved');
  assert.equal(saved[0].vehicle.stock,'SC1763');assert.equal(saved[0].vehicle.price,49999);assert.equal(saved[0].vehicle.createdByUserName,'Creator');assert.equal(copies.length,12);assert.equal(saved[0].cover,'official-0');
  assert.equal(saved[1].receipt.status,'approved');assert.ok(saved[1].receipt.media.photos.every(photo=>photo.officialDriveFileId));assert.ok(copies.every(file=>file.parents[0]==='official-photos'));
});
