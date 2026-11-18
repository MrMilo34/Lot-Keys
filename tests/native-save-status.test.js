'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Native=require('../lotkeys-native-transfers.js'),Core=require('../lotkeys-transfer-core.js');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),phone=fs.readFileSync(require.resolve('../lotkeys-phone.js'),'utf8');
const context={account:'blair@example.test',store:'store-folder-123',record:'jeep-DT3526A',revision:'17'};
function snapshot(extra={}){return{context,assets:[],state:'queued',...extra};}
function nativeCallFixture(response){
  const ctx={state:{nativeToken:'private-test-token'},NATIVE_ORIGIN:'http://127.0.0.1:39539',AbortController,Headers,Error,TypeError,setTimeout,clearTimeout,
    fetch:async()=>response,loopbackPermissionState:async()=>''};vm.createContext(ctx);
  const start=phone.indexOf('  async function nativeCall('),end=phone.indexOf('  async function nativeTick(',start);vm.runInContext(phone.slice(start,end),ctx);return ctx;
}
test('a cut-off Android JSON body is a recoverable response error, never an empty successful job',async()=>{
  const ctx=nativeCallFixture({ok:true,json:async()=>{throw new SyntaxError('Unexpected end of JSON');}});
  await assert.rejects(ctx.nativeCall('/v1/transfers/status'),error=>error.code==='NATIVE_RESPONSE_INVALID'&&!/another account/.test(error.message));
});
test('a well-formed Android response remains unchanged',async()=>{
  const expected=snapshot();const ctx=nativeCallFixture({ok:true,json:async()=>expected});assert.equal(await ctx.nativeCall('/v1/transfers/status'),expected);
});
test('an explicit phone authorization rejection retains its HTTP status and actual explanation',async()=>{
  const ctx=nativeCallFixture({ok:false,status:403,json:async()=>({error:'Link this browser in Android setup'})});
  await assert.rejects(ctx.nativeCall('/v1/transfers/status'),error=>error.status===403&&/Link this browser/.test(error.message));
});
test('missing Android job identity does not masquerade as a different account or edit',async()=>{
  await assert.rejects(Native.wait('batch',context,{phone:{uploadCall:async()=>({})}}),error=>error.code==='NATIVE_STATUS_UNAVAILABLE'&&!/another account/.test(error.message));
});
test('a dropped status connection preserves its error as recoverable without re-preparing or cancelling the job',async()=>{
  const calls=[],progress=[];await assert.rejects(Native.wait('batch',context,{phone:{uploadCall:async op=>{calls.push(op);throw Error('Browser disconnected');}},onProgress:value=>progress.push(value)}),error=>error.code==='NATIVE_STATUS_UNAVAILABLE'&&error.nativeTransfer);
  assert.deepEqual(calls,['status']);assert.equal(progress.at(-1).phase,'status_unavailable');
});
test('a missing native job is not converted into an endless transient retry or discarded automatically',async()=>{
  const cause=Object.assign(new Error('Native job no longer exists'),{status:404});
  await assert.rejects(Native.wait('batch',context,{phone:{uploadCall:async op=>{assert.equal(op,'status');throw cause;}}}),error=>error.code==='NATIVE_STATUS_REJECTED'&&error.status===404&&error.nativeTransfer);
});
test('a real different edit still fails the context guard without adopting completion',async()=>{
  await assert.rejects(Native.wait('batch',context,{phone:{uploadCall:async()=>snapshot({context:{...context,revision:'18'},state:'complete'})}}),error=>error.code==='NATIVE_CONTEXT_MISMATCH'&&/Mismatch: Vehicle edit/.test(error.message));
  assert.throws(()=>Core.completed(snapshot({context:{...context,account:'other@example.test'},state:'complete'}),context),/another account/);
});
test('hidden browser observation stops status reads and checks the retained job once visible again',async()=>{
  let listener,calls=0;const visibility={visibilityState:'hidden',addEventListener:(type,fn)=>{listener=fn;},removeEventListener:(type,fn)=>{assert.equal(fn,listener);}};
  const waiting=Native.wait('batch',context,{visibility,phone:{uploadCall:async()=>{calls++;return snapshot({state:'complete'});}}});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,0);visibility.visibilityState='visible';listener();await waiting;assert.equal(calls,1);
});
test('native status errors qualify for the existing bounded automatic resume path',()=>{
  const ctx={document:{visibilityState:'visible'}};vm.createContext(ctx);const start=html.indexOf('  function recoverableSyncInterruption('),end=html.indexOf('  async function syncVehicleNow(',start);vm.runInContext(html.slice(start,end),ctx);
  assert.equal(ctx.recoverableSyncInterruption({code:'NATIVE_STATUS_UNAVAILABLE',message:'Android job could not be checked'}),true);
  assert.equal(ctx.recoverableSyncInterruption({code:'NATIVE_CONTEXT_MISMATCH'}),false);
});
test('a saved failure cannot keep advertising that it is safe to switch apps',()=>{
  const ctx={liveMediaProgress:new Map()};vm.createContext(ctx);const start=html.indexOf('  function mediaStateForVehicle('),end=html.indexOf('  function liveProgressIsActive(',start);vm.runInContext(html.slice(start,end),ctx);
  const result=ctx.mediaStateForVehicle({id:'jeep',syncError:'The background upload belongs to another account, Store or edit.',mediaUpload:{status:'error',percent:50,backgroundReady:true,message:'Android is saving to Drive · you can switch apps'}});
  assert.equal(result.message,'The background upload belongs to another account, Store or edit.');assert.equal(result.backgroundReady,false);
});
test('queued, active and failed saves have distinct guidance, and failures show the native reason',()=>{
  const queued=Native.presentation({phase:'queued'});assert.equal(queued.status,'queued');assert.match(queued.message,/waiting for Android/);assert.doesNotMatch(queued.message,/switch apps|is uploading|save continues/i);
  assert.match(Native.presentation({phase:'uploading'}).message,/reports uploading/);assert.doesNotMatch(Native.presentation({phase:'uploading'}).message,/you can switch apps/);
  for(const phase of ['failed','paused_auth','context_mismatch']){const result=Native.presentation({phase,error:'Restore Drive access'});assert.equal(result.status,'error');assert.equal(result.backgroundReady,false);assert.equal(result.message,'Restore Drive access');}
});
test('unconfirmed file results cannot be adopted or misclassified as an account change',async()=>{
  await assert.rejects(Native.wait('batch',context,{phone:{uploadCall:async()=>snapshot({state:'complete',assets:[{key:'photo',result:{}}]})}}),error=>error.code==='NATIVE_RESULT_INVALID'&&/not confirmed/.test(error.message));
});
for(const transient of [true,false])test('the real save handler '+(transient?'retries a lost status reply':'keeps a genuine context mismatch stopped')+' without losing the receipt or retaining switch-app advice',async()=>{
  const vehicle={id:'jeep',updatedAt:17,drive:{nativeTransfer:{id:'retained-batch',context}},syncStatus:'pending'};let saved=structuredClone(vehicle);const resumed=[];
  const failure=new Error(transient?'Android save status unavailable: incomplete reply':'The background upload belongs to another account, Store or edit.');failure.code=transient?'NATIVE_STATUS_UNAVAILABLE':'NATIVE_CONTEXT_MISMATCH';failure.nativeTransfer=true;
  const ctx={Date,document:{visibilityState:'visible'},liveMediaProgress:new Map(),vehicleSyncRetryCounts:new Map(),modal:{open:true},
    DB:{get:async()=>structuredClone(saved),put:async(_,row)=>{saved=structuredClone(row);}},
    DriveSync:{connected:()=>true,ready:async()=>true,syncVehicle:async(v,{onProgress})=>{onProgress({status:'uploading',percent:50,backgroundReady:true,message:'Android is saving to Drive · you can switch apps'});throw failure;}},
    currentUserRecord:async()=>({}),normalizedAdminLevel:()=>1,setVehicleMediaProgress:(v,state)=>{v.mediaUpload=state;},persistLiveMediaProgress:()=>{},updateReadinessIndicator:async()=>{},scheduleVehicleResume:id=>resumed.push(id)};
  vm.createContext(ctx);let start=html.indexOf('  function mediaStateForVehicle(');vm.runInContext(html.slice(start,html.indexOf('  function liveProgressIsActive(',start)),ctx);
  start=html.indexOf('  function recoverableSyncInterruption(');vm.runInContext(html.slice(start,html.indexOf('  function vehicleNeedsAutomaticResume(',start)),ctx);
  const result=await ctx.syncVehicleNow(vehicle,{quiet:true});assert.equal(result.drive.nativeTransfer.id,'retained-batch');assert.equal(saved.drive.nativeTransfer.id,'retained-batch');
  assert.doesNotMatch(result.mediaUpload.message,/you can switch apps/);assert.equal(result.syncStatus,transient?'pending':'error');assert.equal(result.mediaUpload.status,transient?'paused':'error');assert.deepEqual(resumed,transient?['jeep']:[]);
});
