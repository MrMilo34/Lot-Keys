'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const Core = require('../lotkeys-transfer-core.js');
const Native = require('../lotkeys-native-transfers.js');
const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');
const source = html.slice(html.indexOf('  async function nativeVehicleTransfer('), html.indexOf('  async function syncVehicle(v,'));
function fixture() {
  const account = 'blair@example.test', store = 'store-folder-123';
  const item = id => ({ id, name: id + '.original', blob: new Blob(['original-' + id]) });
  const vehicle = { id: 'vehicle-1', updatedAt: 17, photos: Array.from({ length: 11 }, (_, i) => item('photo-' + i)), videos: [item('video')], attachments: [item('document')],
    drive: { photosFolderId: 'photos-folder-123', videosFolderId: 'videos-folder-123', documentsFolderId: 'docs-folder-123', adminSheetId: 'sheet-file-123', lastSheetUpdatedAt: '2026-10-30T12:00:00Z' } };
  let persisted = structuredClone(vehicle), plan, committed = false; const offsets = [], checkpoints = []; const settings = { currentAccountEmail: account, storeFolderId: store };
  const phone = { uploadCapabilities: async () => ({ uploadAccount: account, capabilities: { backgroundUploads: true } }), uploadCall: async (op, input) => {
    if (op === 'prepare') { plan = structuredClone(input); return { ...plan, id: 'native-batch-1', state: 'staging', assets: plan.assets.map(row => ({ ...row, staged: 0 })) }; }
    if (op === 'chunk') { assert.equal(persisted.drive.nativeTransfer.id, 'native-batch-1'); offsets[input.item] = input.offset + Buffer.from(input.base64, 'base64').length; return { staged: offsets[input.item] }; }
    if (op === 'commit') { assert.equal(offsets.length, 13); for (let i = 0; i < plan.assets.length; i++) assert.equal(offsets[i], plan.assets[i].size); committed = true; return { ...plan, id: 'native-batch-1', state: 'queued', assets: plan.assets.map(row => ({ ...row, staged: row.size })) }; }
    if (op === 'status') {
      if (!committed) throw Error('No background job yet');
      return { ...plan, state: 'complete', assets: plan.assets.map((row, i) => ({ ...row, confirmed: row.size, result: { id: 'drive-file-' + i, name: row.name } })) };
    }
    throw Error('Unexpected operation ' + op);
  } };
  const native = { ...Native, available: account => Native.available(account, phone), handoff: (p, files, options) => Native.handoff(p, files, { ...options, phone }), wait: (id, ctx, options) => Native.wait(id, ctx, { ...options, phone, delay: async () => {} }) };
  const context = { window: { LotKeysNativeTransfers: native, LotKeysTransferCore: Core, LotKeysPhone: phone }, Blob, Map, Array, String, Number, Error, Date,
    setting: async (key, fallback) => settings[key] ?? fallback, DB: { get: async () => persisted ? structuredClone(persisted) : structuredClone(vehicle), put: async (name, value) => { persisted = structuredClone(value); }, update: async (name,id,change) => { const next=change(persisted?structuredClone(persisted):structuredClone(vehicle));if(next!==undefined)persisted=structuredClone(next);return structuredClone(persisted); } }, saveVehicleSyncState: (value, checkpoint) => checkpoints.push(checkpoint),
    listFiles: async () => [], qEscape: x => x, safeName: x => x, stripPhotoOrderPrefix: x => x, findInventoryIndex: async () => ({ id: 'index-file-123' }) };
  vm.createContext(context); vm.runInContext(source, context);
  return { context, vehicle, store, settings, checkpoints, getPlan: () => plan, getPersisted: () => persisted };
}
test('the real Vehicle handoff retains all 11 photos, the video and the document before Android commits', async () => {
  const f = fixture();
  assert.equal(await f.context.nativeVehicleTransfer(f.vehicle, { rootId: f.store }, () => {}), true);
  assert.equal(f.getPlan().assets.length, 13);
  assert.equal(f.getPlan().finalizers[0].assetKey, 'photo:photo-0');
  assert.equal(f.getPersisted().drive.nativeTransfer.context.revision, '17');
  assert.ok(f.vehicle.photos.every(row => row.driveFileId)); assert.ok(f.vehicle.videos[0].driveFileId); assert.ok(f.vehicle.attachments[0].driveFileId);
  assert.equal(f.checkpoints.at(-1).stage, 'native-files-saved');
});
test('a Store transition during preflight prevents any source handoff', async () => {
  const f = fixture(); let calls = 0;
  f.context.listFiles = async () => { if (++calls === 1) f.settings.storeFolderId = 'other-store-123'; return []; };
  await assert.rejects(f.context.nativeVehicleTransfer(f.vehicle, { rootId: f.store }, () => {}), /Store or Vehicle edit changed/);
  assert.equal(f.getPlan(), undefined); assert.deepEqual(f.getPersisted(), f.vehicle);
});
test('a lagging Drive listing reuses a confirmed file ID and permission errors never create a duplicate', async () => {
  const f = fixture(); f.vehicle.photos = [f.vehicle.photos[0]]; f.vehicle.videos = []; f.vehicle.attachments = [];
  f.vehicle.photos[0].driveFileId = 'known-photo-123';
  f.context.driveGet = async () => ({ id: 'known-photo-123', name: '01 - photo-0.original', parents: [f.vehicle.drive.photosFolderId] });
  assert.equal(await f.context.nativeVehicleTransfer(f.vehicle, { rootId: f.store }, () => {}), false);
  assert.equal(f.getPlan(), undefined);
  f.context.driveGet = async () => { throw Object.assign(Error('permission denied'), { status: 403 }); };
  await assert.rejects(f.context.nativeVehicleTransfer(f.vehicle, { rootId: f.store }, () => {}), /permission denied/);
  assert.equal(f.getPlan(), undefined);
});
test('explicit repair retires a failed batch only while every unfinished original remains available', async () => {
  const f = fixture(), scope = { account: 'blair@example.test', store: f.store, record: f.vehicle.id, revision: '17' };
  f.vehicle.drive.nativeTransfer = { id: 'old-batch', context: scope };
  const phone = f.context.window.LotKeysPhone; let cancelled = false;
  phone.uploadCall = async op => {
    if (op === 'status') return { context: scope, state: 'failed', assets: [{ key: 'video:video', size: f.vehicle.videos[0].blob.size }] };
    if (op === 'cancel') { cancelled = true; return {}; }
    throw Error('Repair must not start the retired batch');
  };
  assert.equal(await f.context.nativeVehicleTransfer(f.vehicle, { rootId: f.store }, () => {}, { resumeOnly: true, force: true }), false);
  assert.equal(cancelled, true); assert.equal(f.vehicle.drive.nativeTransfer, undefined); assert.ok(f.vehicle.updatedAt > 17);
});
test('returning before Drive media listing catches up restores the whole saved edit and its photo order', async () => {
  const f = fixture();
  await f.context.nativeVehicleTransfer(f.vehicle, { rootId: f.store }, () => {});
  const returned = { ...f.vehicle, drive: structuredClone(f.vehicle.drive), photos: [], videos: [], attachments: [] };
  f.context.DB.get = async () => returned;
  assert.equal(await f.context.nativeVehicleTransfer(returned, { rootId: f.store }, () => {}, { resumeOnly: true }), true);
  assert.equal(returned.photos.length, 11); assert.equal(returned.videos.length, 1); assert.equal(returned.attachments.length, 1);
  assert.equal(returned.photos[0].id, 'photo-0'); assert.equal(returned.photos[10].id, 'photo-10');
  assert.ok(returned.photos.every(row => row.driveFileId));
});

test('background-ready progress is reported only after all originals are committed and the durable receipt is retained',async()=>{
  const f=fixture(),progress=[];await f.context.nativeVehicleTransfer(f.vehicle,{rootId:f.store},p=>progress.push(p));
  assert.ok(progress.filter(p=>/Preparing originals/.test(p.message)).every(p=>p.backgroundReady===false));
  const ready=progress.findIndex(p=>/Android has the originals/.test(p.message));assert.ok(ready>=0);
  assert.ok(progress.slice(ready).every(p=>p.backgroundReady===true));assert.equal(f.getPersisted().drive.nativeTransfer.handoffComplete,true);
});

test('explicit repair recovers the exact .40 sheet overwrite and reuses Android originals without restaging',async()=>{
  const f=fixture();f.vehicle.price=49990;f.vehicle.stock='SC1774';
  await f.context.nativeVehicleTransfer(f.vehicle,{rootId:f.store},()=>{});
  const originalPlan=structuredClone(f.getPlan()),sheetAt=Date.parse(originalPlan.finalizers[0].sheetUpdated);
  const broken={...f.getPersisted(),updatedAt:sheetAt,syncStatus:'synced',syncError:'The account, Store or Vehicle edit changed. Its background save is paused.',photos:[],videos:[],attachments:[],localRecoverySnapshot:{price:49990,stock:'SC1774',savedAt:sheetAt-1000}};
  await f.context.DB.put('vehicles',broken);
  const retry=structuredClone(broken);retry.syncError='';retry.localRecoverySnapshot={price:49990,stock:'SC1774',savedAt:Date.now()};
  const calls=[];let resumed=false;
  f.context.window.LotKeysPhone.uploadCall=async(op,input)=>{
    calls.push(op);
    if(op==='prepare'){assert.deepEqual(input,originalPlan);resumed=true;return {...originalPlan,id:'native-batch-1',state:'queued',held:false};}
    if(op==='commit')return {...originalPlan,id:'native-batch-1',state:'queued',assets:originalPlan.assets.map(row=>({...row,staged:row.size}))};
    if(op==='status')return {...originalPlan,id:'native-batch-1',state:resumed?'complete':'paused_context',held:!resumed,assets:originalPlan.assets.map((row,i)=>({...row,result:resumed?{id:'retained-file-'+i,name:row.name}:undefined}))};
    throw Error('Recovery must reuse the retained job: '+op);
  };
  assert.equal(await f.context.nativeVehicleTransfer(retry,{rootId:f.store},()=>{},{resumeOnly:true,force:true}),true);
  assert.equal(calls.includes('cancel'),false);assert.equal(calls.includes('chunk'),false);
  assert.equal(retry.updatedAt,17);assert.equal(retry.price,49990);assert.equal(retry.photos.length,11);assert.equal(retry.videos.length,1);assert.equal(retry.attachments.length,1);
  assert.ok(retry.photos.every(photo=>photo.driveFileId.startsWith('retained-file-')));
});

test('a real changed price never qualifies as repair of the old sheet overwrite',async()=>{
  const f=fixture();f.vehicle.price=49990;await f.context.nativeVehicleTransfer(f.vehicle,{rootId:f.store},()=>{});
  const original=f.getPersisted(),sheetAt=Date.parse(original.drive.nativeTransfer.plan.finalizers[0].sheetUpdated);
  const changed={...original,updatedAt:sheetAt,price:48000,syncError:'The account, Store or Vehicle edit changed. Its background save is paused.',localRecoverySnapshot:{price:49990,savedAt:sheetAt-1000}};
  await f.context.DB.put('vehicles',changed);let cancelled=false;
  f.context.window.LotKeysPhone.uploadCall=async op=>{assert.equal(op,'cancel');cancelled=true;return{};};
  assert.equal(await f.context.nativeVehicleTransfer(changed,{rootId:f.store},()=>{},{resumeOnly:true,force:true}),false);
  assert.equal(cancelled,true);assert.equal(changed.price,48000);assert.equal(changed.updatedAt,sheetAt);
});
test('an emptied gallery without sufficient recovery evidence keeps the native job instead of treating missing originals as deletions',async()=>{
  const f=fixture();await f.context.nativeVehicleTransfer(f.vehicle,{rootId:f.store},()=>{});
  const current={...f.getPersisted(),updatedAt:200,price:48000,photos:[],videos:[],attachments:[]};await f.context.DB.put('vehicles',current);
  f.context.window.LotKeysPhone.uploadCall=async()=>{throw Error('The retained job must not be cancelled or replaced');};
  await assert.rejects(f.context.nativeVehicleTransfer(current,{rootId:f.store},()=>{},{resumeOnly:true,force:true}),error=>error.nativeTransfer&&/save has been kept/.test(error.message));
  assert.equal(f.getPersisted().drive.nativeTransfer.id,'native-batch-1');assert.equal(f.getPersisted().price,48000);assert.equal(f.getPersisted().updatedAt,200);
});
test('a newer edit made while Android prepares its receipt cannot be replaced by the old browser object',async()=>{
  const f=fixture(),phone=f.context.window.LotKeysPhone,call=phone.uploadCall;
  phone.uploadCall=async(op,input)=>{
    const result=await call(op,input);
    if(op==='prepare')await f.context.DB.put('vehicles',{...f.vehicle,price:48000,updatedAt:200,syncStatus:'pending'});
    return result;
  };
  f.context.window.LotKeysNativeTransfers.hold=async()=>{};
  await assert.rejects(f.context.nativeVehicleTransfer(f.vehicle,{rootId:f.store},()=>{}),/edit changed/);
  assert.equal(f.getPersisted().price,48000);assert.equal(f.getPersisted().updatedAt,200);
});
test('a newer edit made while retiring a mismatched native receipt survives the late cancellation',async()=>{
  const f=fixture();f.vehicle.drive.nativeTransfer={id:'older-job',context:{account:'blair@example.test',store:f.store,record:f.vehicle.id,revision:'16'}};
  f.context.window.LotKeysNativeTransfers.hold=async()=>{};
  f.context.window.LotKeysPhone.uploadCall=async op=>{
    assert.equal(op,'cancel');await f.context.DB.put('vehicles',{...f.vehicle,price:48000,updatedAt:200,syncStatus:'pending'});return{};
  };
  await assert.rejects(f.context.nativeVehicleTransfer(f.vehicle,{rootId:f.store},()=>{},{resumeOnly:true,force:true}),/edit changed/);
  assert.equal(f.getPersisted().price,48000);assert.equal(f.getPersisted().updatedAt,200);
});
