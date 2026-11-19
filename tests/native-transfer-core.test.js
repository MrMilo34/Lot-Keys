'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../lotkeys-transfer-core.js');
const scope = { account: 'Blair@example.test', store: 'store-root-12345', record: 'vehicle-1', revision: '17' };
const asset = { key: 'photo-1', parent: 'photos-folder-123', name: '01 - original.jpg', type: 'image/jpeg', size: 3000000 };

test('an account, Store or edit change cannot adopt an old completion', () => {
  const done = { state: 'complete', context: scope, assets: [{ ...asset, result: { id: 'remote-file-1234' } }] };
  assert.equal(Core.completed(done, scope)['photo-1'].id, 'remote-file-1234');
  for (const changed of [{ account: 'other@example.test' }, { store: 'other-store-123' }, { revision: '18' }, { record: 'vehicle-2' }]) {
    assert.throws(() => Core.completed(done, { ...scope, ...changed }), /another account, Store or edit/);
  }
});

test('a missing or partial Drive acknowledgement never advances to bytes merely sent', () => {
  assert.equal(Core.acceptedOffset(null, 8000000), 0);
  assert.equal(Core.acceptedOffset('bytes=0-262143', 8000000), 262144);
  assert.throws(() => Core.acceptedOffset('bytes=0-9000000', 8000000), /impossible/);
  assert.throws(() => Core.acceptedOffset('bytes=32-44', 8000000), /invalid/);
});

test('a completed media transfer is insufficient until the batch finalization is confirmed', () => {
  const snapshot = { context: scope, state: 'finalizing', assets: [{ ...asset, confirmed: asset.size, result: { id: 'remote-file-1234' } }] };
  assert.equal(Core.completed(snapshot, scope), null);
  assert.equal(Core.progress(snapshot).percent, 99);
  assert.throws(() => Core.completed({ ...snapshot, state: 'complete', assets: [asset] }, scope), /not confirmed/);
});

test('invalid and duplicate destinations are rejected before staging originals', () => {
  assert.throws(() => Core.batch(scope, [asset, asset]), /Duplicate/);
  assert.throws(() => Core.batch(scope, [{ ...asset, parent: '../../escape' }]), /destination/);
  assert.throws(() => Core.batch(scope, [{ ...asset, size: -1 }]), /size/);
  assert.equal(Core.batch(scope, [asset]).assets[0].name, '01 - original.jpg');
});
