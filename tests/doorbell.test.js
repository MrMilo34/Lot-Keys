'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto, createHmac } = require('node:crypto');
const vm = require('node:vm');
const fs = require('node:fs');
const Core = require('../lotkeys-doorbell-core.js');
const now = Date.now();
const grant = { id: 'grant-1234567890123456', secret: Buffer.alloc(32, 17).toString('base64url'), deviceId: 'phone-1234567890123456', browserId: 'browser-1234567890123456', account: 'blair@example.test', expiresAt: now + 3600000, endpoint: 'https://script.google.com/macros/s/deployment_123/exec' };
const expected = { account: grant.account, browserId: grant.browserId, deviceId: grant.deviceId };
function broker() {
  const state = { LOTKEYS_ENROLLMENT_KEY: 'e'.repeat(43), LOTKEYS_FIREBASE_PROJECT_ID: 'lotkeys-test-123' }, pushes = [];
  const context = { Date, JSON, Number, Math, Object, String, Error,
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => state[key], setProperty: (key, value) => { state[key] = value; }, deleteProperty: key => { delete state[key]; }, getProperties: () => ({ ...state }) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, hasLock: () => true, releaseLock: () => {} }) },
    Utilities: { newBlob: text => ({ getBytes: () => Buffer.from(text) }), base64DecodeWebSafe: text => Buffer.from(text, 'base64url'), base64EncodeWebSafe: bytes => Buffer.from(bytes).toString('base64url'), computeHmacSha256Signature: (message, key) => createHmac('sha256', key).update(message).digest() },
    ScriptApp: { getOAuthToken: () => 'server-only-token' },
    UrlFetchApp: { fetch: (url, options) => { pushes.push({ url, ...options }); return { getResponseCode: () => 200 }; } },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) }
  };
  vm.createContext(context); vm.runInContext(fs.readFileSync(require.resolve('../wake-sender/Code.js'), 'utf8'), context);
  return { state, pushes, post: input => context.doPost({ postData: { contents: JSON.stringify(input) } }) };
}
test('wake capabilities are bound to account, browser, phone, endpoint and expiry', () => {
  assert.equal(Core.validGrant(grant, expected, now), true);
  for (const change of [{ account: 'other@example.test' }, { deviceId: 'other-1234567890123456' }, { browserId: 'other-1234567890123456' }]) assert.equal(Core.validGrant(grant, { ...expected, ...change }, now), false);
  for (const change of [{ expiresAt: now - 1 }, { endpoint: 'https://attacker.test/wake' }, { secret: 'short' }]) assert.equal(Core.validGrant({ ...grant, ...change }, expected, now), false);
});
test('only a valid, fresh, enrolled PC request becomes a content-free FCM doorbell; replays and revocation fail', async () => {
  const server = broker();
  assert.equal(server.post({ action: 'register', enrollmentKey: 'wrong', grant: { ...grant, token: 'fcm-device-token' } }).ok, false);
  assert.equal(server.post({ action: 'register', enrollmentKey: 'e'.repeat(43), grant: { ...grant, token: 'fcm-device-token' } }).ok, true);
  const envelope = await Core.envelope(grant, 'session-1234567890123456', { crypto: webcrypto });
  assert.equal(server.post({ ...envelope, signature: 'invalid' }).ok, false);
  assert.equal(server.post(envelope).ok, true); assert.equal(server.pushes.length, 1);
  assert.equal(server.post(envelope).ok, false);
  const sent = JSON.parse(server.pushes[0].payload).message;
  assert.equal(sent.android.priority, 'HIGH'); assert.equal(sent.android.ttl, '60s');
  assert.equal(sent.data.sessionId, envelope.sessionId);
  for (const forbidden of ['secret', 'account', 'message', 'body', 'enrollmentKey', 'token']) assert.equal(forbidden in sent.data, false);
  assert.equal(server.post({ action: 'revoke', enrollmentKey: 'e'.repeat(43), id: grant.id }).ok, true);
  const next = await Core.envelope(grant, 'session-1234567890123456', { crypto: webcrypto, time: Date.now() + 11000 });
  assert.equal(server.post(next).ok, false);
});
test('expired and cross-device requests never reach the push provider', async () => {
  const server = broker(); server.post({ action: 'register', enrollmentKey: 'e'.repeat(43), grant: { ...grant, token: 'fcm-device-token' } });
  for (const changes of [{ deviceId: 'other-1234567890123456' }, { issuedAt: now - 120000 }]) {
    const envelope = await Core.envelope({ ...grant, ...changes }, 'session-1234567890123456', { crypto: webcrypto, time: changes.issuedAt || now });
    assert.equal(server.post(envelope).ok, false);
  }
  assert.equal(server.pushes.length, 0);
});
