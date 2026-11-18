'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../lotkeys-transfer-core.js');
const Native = require('../lotkeys-native-transfers.js');
const context = { account: 'test@example.test', store: 'store-folder-123', record: 'vehicle-1', revision: '1' };
function fixture(size = 700000) {
  const blob = new Blob([new Uint8Array(size).fill(33)]), asset = { key: 'photo-1', name: 'original.jpg', parent: 'photo-folder-123', size, type: 'image/jpeg' };
  return { plan: Core.batch(context, [asset]), sources: new Map([[asset.key, blob]]) };
}
test('staging retries identical bytes after a lost reply and commits only after all originals are confirmed', async () => {
  const { plan, sources } = fixture(); let offset = 0, lost = true, savedReceipt = false, commits = 0; const accepted = [];
  const phone = { uploadCall: async (op, input) => {
    if (op === 'prepare') return { ...plan, id: 'batch-1', state: 'staging', assets: plan.assets.map(row => ({ ...row, staged: 0 })) };
    if (op === 'chunk') {
      assert.equal(savedReceipt, true); const bytes = Buffer.from(input.base64, 'base64'); accepted.push([input.offset, bytes.length]);
      if (input.offset === offset) offset += bytes.length;
      if (lost) { lost = false; throw Error('reply lost'); }
      return { staged: offset };
    }
    if (op === 'commit') { assert.equal(offset, plan.assets[0].size); commits++; return { ...plan, id: 'batch-1', state: 'queued', assets: plan.assets.map(row => ({ ...row, staged: row.size })) }; }
  } };
  await Native.handoff(plan, sources, { phone, onPrepared: async () => { savedReceipt = true; } });
  assert.deepEqual(accepted.slice(0, 2), [[0, Native.chunkSize], [0, Native.chunkSize]]);
  assert.equal(commits, 1);
});
test('an edit or Store change during staging prevents commit', async () => {
  const { plan, sources } = fixture(); let commits = 0, checks = 0;
  const phone = { uploadCall: async op => {
    if (op === 'prepare') return { ...plan, id: 'batch-1', state: 'staging', assets: plan.assets.map(row => ({ ...row, staged: 0 })) };
    if (op === 'commit') commits++;
  } };
  await assert.rejects(Native.handoff(plan, sources, { phone, check: async () => { if (++checks > 1) throw Error('Store changed'); } }), /Store changed/);
  assert.equal(commits, 0);
});
test('returning after a browser close adopts completion only for its original context', async () => {
  const { plan } = fixture(); const done = { ...plan, state: 'complete', assets: plan.assets.map(row => ({ ...row, result: { id: 'drive-file-123' } })) };
  const phone = { uploadCall: async () => done };
  assert.equal((await Native.wait('batch-1', context, { phone }))['photo-1'].id, 'drive-file-123');
  await assert.rejects(Native.wait('batch-1', { ...context, account: 'other@example.test' }, { phone }), /another account/);
});
test('existing Android copies resume from the retained offset, and paused authorization never reports success', async () => {
  const { plan, sources } = fixture(); const offsets = [];
  const phone = { uploadCall: async (op, input) => {
    if (op === 'prepare') return { ...plan, id: 'batch-1', state: 'staging', assets: plan.assets.map(row => ({ ...row, staged: Native.chunkSize })) };
    if (op === 'chunk') { offsets.push(input.offset); return { staged: plan.assets[0].size }; }
    return { ...plan, id: 'batch-1', state: 'paused_auth', error: 'Restore Drive access', assets: plan.assets.map(row => ({ ...row, staged: row.size })) };
  } };
  await assert.rejects(Native.handoff(plan, sources, { phone }), /Restore Drive access/); assert.deepEqual(offsets, [Native.chunkSize]);
  await assert.rejects(Native.wait('batch-1', context, { phone }), /Restore Drive access/);
});
test('a resumed held batch requeues its retained originals without staging another copy', async () => {
  const { plan } = fixture(); let commits = 0;
  const phone = { uploadCall: async op => {
    if (op === 'prepare') return { ...plan, id: 'batch-1', state: 'queued' };
    if (op === 'commit') { commits++; return { ...plan, id: 'batch-1', state: 'queued', assets: plan.assets.map(row => ({ ...row, staged: row.size })) }; }
    throw Error('Retained originals must not be staged again');
  } };
  await Native.handoff(plan, new Map(), { phone }); assert.equal(commits, 1);
  await assert.rejects(Native.wait('batch-1', context, { phone: { uploadCall: async () => ({ ...plan, state: 'queued', held: true }) } }), /paused/);
});


test('ordinary Android scheduling is shown as deferrable while retained files stay safe', () => {
  const value = Native.presentation({ phase: 'queued', version: 2, execution: 'scheduled' });
  assert.equal(value.backgroundReady, true);
  assert.match(value.message, /retained.*controls.*defer/);
  assert.doesNotMatch(value.message, /Ready to switch/);
  assert.match(Native.presentation({ phase: 'queued', version: 2, execution: 'user_initiated' }).message, /Ready to switch/);
  assert.equal(Native.presentation({ phase: 'staging', execution: 'user_initiated' }).backgroundReady, false);
});

test('retained queue execution mode reaches progress after commit and status refresh', async () => {
  const { plan } = fixture(); const events = [];
  const snapshot = { ...plan, id: 'batch-1', state: 'queued', execution: 'scheduled', assets: plan.assets.map(row => ({ ...row, staged: row.size })) };
  await Native.handoff(plan, new Map(), { phone: { uploadCall: async () => snapshot }, onProgress: value => events.push(value) });
  assert.equal(events.at(-1).execution, 'scheduled');
  let n = 0;
  await Native.wait('batch-1', context, { phone: { uploadCall: async () => ++n === 1 ? snapshot : { ...snapshot, state: 'complete', assets: snapshot.assets.map(row => ({ ...row, result: { id: 'result-drive-123' } })) } }, delay: async () => {}, onProgress: value => events.push(value) });
  assert.equal(events.at(-2).execution, 'scheduled');
});
