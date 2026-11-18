'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../lotkeys-transfer-core.js');
const Native = require('../lotkeys-native-transfers.js');

function fixture(change = value => value) {
  const context = { account: 'pilot@example.test', store: 'store-folder-123', record: 'vehicle-1', revision: '12' };
  const blob = new Blob(['original']);
  const plan = Core.batch(context, [{ key: 'photo-1', name: 'original.jpg', parent: 'photos-folder-123', type: 'image/jpeg', size: blob.size }], [{ type: 'vehicle-directory', pdfId: 'directory-pdf-123', fingerprint: 'saved-edit' }]);
  plan.version = 2;
  let staged = 0;
  const phone = { uploadCall: async (op, input) => {
    if (op === 'prepare') return { ...structuredClone(plan), id: 'batch-1', state: 'staging', assets: plan.assets.map(row => ({ ...row, staged: 0 })) };
    if (op === 'chunk') { staged = input.offset + Buffer.from(input.base64, 'base64').length; return { staged }; }
    if (op === 'commit') return change({ ...structuredClone(plan), id: 'batch-1', state: 'queued', assets: plan.assets.map(row => ({ ...row, staged })) });
  } };
  return { plan, phone, sources: new Map([['photo-1', blob]]) };
}

for (const [label, change] of [
  ['empty JSON', () => ({})],
  ['staging instead of a committed job', value => ({ ...value, state: 'staging' })],
  ['missing original', value => ({ ...value, assets: [] })],
  ['incomplete retained bytes', value => { value.assets[0].staged--; return value; }],
  ['another job ID', value => ({ ...value, id: 'another-job' })],
  ['changed finishing plan', value => ({ ...value, finalizers: [] })],
  ['another edit', value => ({ ...value, context: { ...value.context, revision: '13' } })],
  ['held work', value => ({ ...value, held: true })]
]) test(`handoff never announces readiness for ${label}`, async () => {
  const f = fixture(change), progress = [];
  await assert.rejects(Native.handoff(f.plan, f.sources, { phone: f.phone, onProgress: value => progress.push(value) }));
  assert.equal(progress.some(value => value.phase === 'queued'), false);
});

test('committed proof and timing are saved before the readiness message', async () => {
  const f = fixture(), events = []; let time = 1000, metrics;
  await Native.handoff(f.plan, f.sources, {
    phone: f.phone, clock: () => { time += 100; return time; },
    onPrepared: async () => events.push('receipt'),
    onCommitted: async (value, timing) => { assert.equal(value.assets[0].staged, f.plan.assets[0].size); metrics = timing; events.push('persisted'); },
    onProgress: value => { if (value.phase === 'queued') events.push('ready'); }
  });
  assert.deepEqual(events, ['receipt', 'persisted', 'ready']);
  assert.equal(metrics.originalBytes, f.plan.assets[0].size);
  assert.ok(metrics.readyAt >= metrics.commitStartedAt && metrics.commitStartedAt >= metrics.stagingStartedAt);
});

test('a failed local receipt write keeps readiness unconfirmed without cancelling the Android job', async () => {
  const f = fixture(), progress = [];
  await assert.rejects(Native.handoff(f.plan, f.sources, { phone: f.phone, onCommitted: async () => { throw Error('local write interrupted'); }, onProgress: value => progress.push(value) }), /local write/);
  assert.equal(progress.some(value => value.phase === 'queued'), false);
});

test('a fast completed job may prove originals through confirmed Drive results after native cleanup', async () => {
  const f = fixture(value => ({ ...value, state: 'complete', assets: value.assets.map(row => ({ ...row, staged: 0, confirmed: row.size, result: { id: 'original-file-123' } })) }));
  const result = await Native.handoff(f.plan, f.sources, { phone: f.phone });
  assert.equal(result.state, 'complete');
});
