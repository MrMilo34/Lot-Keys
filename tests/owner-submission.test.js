'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
function source(start,end){const a=html.indexOf(start);assert.ok(a>=0);return html.slice(a,html.indexOf(end,a));}
function deferred(){let resolve;const promise=new Promise(done=>resolve=done);return{promise,resolve};}
function fixture(){
  const values=new Map([['userName','Rob'],['currentAccountEmail','rob@example.test'],['currentAccountSub','rob-sub'],['storeFolderId','store']]);
  const vehicle={id:'vehicle',name:'Vehicle',updatedAt:17,photos:[{id:'one',blob:new Blob(['one'])},{id:'two',blob:new Blob(['two'])}],attachments:[],videos:[]};
  let row=structuredClone(vehicle),draft=null,clearCount=0;const uploads=[],checkpoints=[],published=[],ctx={console,Date,Promise,Map,Set,Blob,Error,String,structuredClone,
    setting:async(key,fallback)=>values.has(key)?values.get(key):fallback,
    DB:{get:async()=>structuredClone(row),put:async(_,v)=>{row=structuredClone(v)}},getOwnerRequestDraft:()=>structuredClone(draft),saveOwnerRequestDraft:(_,request)=>{draft=structuredClone(request);checkpoints.push(structuredClone(request))},clearOwnerRequestDraft:()=>{draft=null;clearCount++},
    ensureVehicleMoreWorkspace:async()=>({pendingFolderId:'pending'}),vehicleRequestSnapshot:v=>({id:v.id,photos:v.photos.map(({blob,...p})=>p)}),
    uploadVehicleContributionItems:async(v,r,kind,items,progress,onCheckpoint)=>{const out=[];for(const item of items){uploads.push(item.id);const saved={id:item.id,driveFileId:'more-'+item.id};out.push(saved);await onCheckpoint(saved);}return out},
    writeVehicleWorkspaceRequest:async(v,r,{onCheckpoint})=>{r.driveRequestFileId=r.driveRequestFileId||'reserved';await onCheckpoint(r);published.push(structuredClone(r));return r;}};
  vm.createContext(ctx);vm.runInContext(source('async function queueOwnedVehicleProfile(','async function queueVehicleState('),ctx);
  return {ctx,vehicle,values,uploads,checkpoints,published,get:()=>structuredClone(row),set:value=>{row=structuredClone(value)},getDraft:()=>structuredClone(draft),clearCount:()=>clearCount};
}
test('an interrupted lane saves every accepted photo and resumes the same submission without reuploading it',async()=>{
  const f=fixture(),upload=f.ctx.uploadVehicleContributionItems;let fail=true;
  f.ctx.uploadVehicleContributionItems=async(v,r,kind,items,p,checkpoint)=>{if(kind==='photo'&&fail){fail=false;await upload(v,r,kind,items.slice(0,1),p,checkpoint);throw Object.assign(Error('offline'),{name:'NetworkError'});}return upload(v,r,kind,items,p,checkpoint)};
  await assert.rejects(f.ctx.queueOwnedVehicleProfile(f.vehicle),/offline/);const id=f.getDraft().id;assert.equal(f.getDraft().media.photos.length,1);assert.equal(f.clearCount(),0);
  const result=await f.ctx.queueOwnedVehicleProfile(f.vehicle);assert.equal(result.id,id);assert.deepEqual(f.uploads,['one','two']);assert.equal(result.media.photos.length,2);assert.equal(f.get().syncStatus,'queued');assert.equal(f.clearCount(),1);
});
test('an interrupted final submission retains both all photo IDs and its reserved request file ID',async()=>{
  const f=fixture(),write=f.ctx.writeVehicleWorkspaceRequest;let fail=true;
  f.ctx.writeVehicleWorkspaceRequest=async(v,r,options)=>{const saved=await write(v,r,options);if(fail){fail=false;throw Object.assign(Error('request timed out'),{name:'TimeoutError'});}return saved;};
  await assert.rejects(f.ctx.queueOwnedVehicleProfile(f.vehicle),/timed out/);assert.equal(f.getDraft().driveRequestFileId,'reserved');assert.equal(f.getDraft().media.photos.length,2);
  await f.ctx.queueOwnedVehicleProfile(f.vehicle);assert.deepEqual(f.uploads,['one','two']);assert.equal(f.published[0].id,f.published[1].id);assert.equal(f.published[1].driveRequestFileId,'reserved');
});
test('resuming an edited draft cannot publish photos the user removed',async()=>{
  const f=fixture(),write=f.ctx.writeVehicleWorkspaceRequest;f.ctx.writeVehicleWorkspaceRequest=async()=>{throw Error('offline')};await assert.rejects(f.ctx.queueOwnedVehicleProfile(f.vehicle));
  f.vehicle.photos=f.vehicle.photos.slice(1);f.ctx.writeVehicleWorkspaceRequest=write;const saved=await f.ctx.queueOwnedVehicleProfile(f.vehicle);assert.deepEqual(Array.from(saved.media.photos,p=>p.id),['two']);
});
test('a Store change during upload stops before publication or replacing the saved Vehicle',async()=>{
  const f=fixture(),upload=f.ctx.uploadVehicleContributionItems;
  f.ctx.uploadVehicleContributionItems=async(...args)=>{f.values.set('storeFolderId','other');return upload(...args)};
  await assert.rejects(f.ctx.queueOwnedVehicleProfile(f.vehicle),/account, Store or Vehicle edit changed/);assert.equal(f.published.length,0);assert.equal(f.get().updatedAt,17);assert.equal(f.clearCount(),0);
});
test('a failed photo lane waits for the video lane before returning an error and allowing retry',async()=>{
  const f=fixture(),video=deferred();f.vehicle.videos=[{id:'video',blob:new Blob(['video'])}];let settled=false,started=false;
  f.ctx.uploadVehicleContributionItems=async(v,r,kind)=>{if(kind==='photo')throw Error('photo interrupted');if(kind==='video'){started=true;await video.promise;}return[]};
  const job=f.ctx.queueOwnedVehicleProfile(f.vehicle).finally(()=>settled=true);const caught=assert.rejects(job,/photo interrupted/);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(started,true);assert.equal(settled,false);video.resolve();await caught;
});
function writerFixture(){
  const files=new Map(),bodies=new Map(),calls=[],checkpoints=[];let failCreate=false;
  const ctx={console,Date,Error,SyntaxError,String,JSON,encodeURIComponent,qEscape:x=>x,
    apiFetch:async(url,opts={})=>{calls.push({url,method:opts.method||'GET',timeoutMs:opts.timeoutMs});const u=new URL(url),id=u.pathname.split('/').at(-1);if(id==='generateIds')return{ids:['reserved']};
      if(u.pathname.endsWith('/files')&&opts.method!=='POST')return{files:[...files.values()].map(f=>({id:f.id}))};
      if(opts.method==='POST'){const file=JSON.parse(opts.body);files.set(file.id,file);if(failCreate){failCreate=false;throw Object.assign(Error('accepted but response lost'),{name:'TimeoutError'});}return file;}
      if(opts.method==='PATCH'){bodies.set(id,JSON.parse(opts.body));return{id};}
      if(!files.has(id))throw Object.assign(Error('not found'),{status:404});
      if(u.searchParams.get('alt')==='media'){if(!bodies.has(id))throw new SyntaxError('empty new request');return structuredClone(bodies.get(id));}return structuredClone(files.get(id));}};
  vm.createContext(ctx);vm.runInContext(source('async function saveOwnerWorkspaceRequest(','async function writeVehicleWorkspaceRequest('),ctx);
  return {ctx,files,bodies,calls,checkpoints,request:{id:'request',vehicleId:'vehicle',type:'vehicle-create',status:'pending'},checkpoint:async r=>checkpoints.push(structuredClone(r)),failCreate:()=>failCreate=true};
}
test('an uncertain create response reuses the ID saved before creation instead of creating a duplicate request',async()=>{
  const f=writerFixture();f.failCreate();await assert.rejects(f.ctx.saveOwnerWorkspaceRequest(f.request,'pending',f.checkpoint),/response lost/);
  assert.equal(f.checkpoints[0].driveRequestFileId,'reserved');assert.equal(f.files.size,1);
  const saved=await f.ctx.saveOwnerWorkspaceRequest(f.request,'pending',f.checkpoint);assert.equal(saved.id,'request');assert.equal(f.files.size,1);assert.equal(f.calls.filter(c=>c.method==='POST').length,1);assert.ok(f.calls.every(c=>c.timeoutMs===60000));
});
test('a terminal processor receipt cannot be rewritten as pending by a retried browser submission',async()=>{
  const f=writerFixture();await f.ctx.saveOwnerWorkspaceRequest(f.request,'pending',f.checkpoint);f.bodies.set('reserved',{...f.request,status:'approved'});const before=f.calls.filter(c=>c.method==='PATCH').length;
  const saved=await f.ctx.saveOwnerWorkspaceRequest(f.request,'pending',f.checkpoint);assert.equal(saved.status,'approved');assert.equal(f.calls.filter(c=>c.method==='PATCH').length,before);
});
test('a mismatched reserved file is never overwritten',async()=>{
  const f=writerFixture();f.request.driveRequestFileId='foreign';f.files.set('foreign',{id:'foreign',parents:['another-folder'],properties:{lotkeysRequestId:'another-request'}});
  await assert.rejects(f.ctx.saveOwnerWorkspaceRequest(f.request,'pending',f.checkpoint),/does not belong/);assert.equal(f.calls.filter(c=>c.method==='PATCH').length,0);
});
test('a hanging final API request aborts at its deadline and remains retryable',async()=>{
  const ctx={Headers,AbortController,setTimeout,clearTimeout,authorize:async()=> 'token',fetch:async(url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Object.assign(Error('request timed out'),{name:'AbortError'}))))};
  vm.createContext(ctx);vm.runInContext(source('  async function apiFetch(','  async function fetchFileBlob('),ctx);
  await assert.rejects(ctx.apiFetch('https://example.test',{timeoutMs:5}),{name:'AbortError'});
});

test('a newer edit gets a new request ID while reusing already accepted photo bytes',async()=>{
  const f=fixture(),write=f.ctx.writeVehicleWorkspaceRequest;f.ctx.writeVehicleWorkspaceRequest=async()=>{throw Error('offline')};await assert.rejects(f.ctx.queueOwnedVehicleProfile(f.vehicle));const old=f.getDraft().id;
  await new Promise(resolve=>setTimeout(resolve,2));f.vehicle.updatedAt=200;f.vehicle.price=48000;f.set(f.vehicle);f.ctx.writeVehicleWorkspaceRequest=write;
  const saved=await f.ctx.queueOwnedVehicleProfile(f.vehicle);assert.notEqual(saved.id,old);assert.deepEqual(f.uploads,['one','two']);assert.equal(saved.context.revision,'200');
});
