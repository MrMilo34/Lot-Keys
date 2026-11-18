'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const PhoneCore = require('../lotkeys-phone-core.js');

const source = fs.readFileSync(path.join(__dirname, '..', 'lotkeys-phone.js'), 'utf8');

function phoneWithNativeRelay(relay) {
  const values = new Map([['lotkeys-phone-native-token-v1', 'x'.repeat(40)]]);
  const sessions = new Map([['lotkeys-phone-active-session-v1', '{"role":"phone"}']]);
  const storage = map => ({ getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key) });
  const calls = { authorize: 0, restore: 0, fetch: [] };
  const events = new Map(), documentEvents = new Map(), timers = [];
  const native = { deviceName: 'Test phone', capabilities: { smsHistory: true }, relay };
  const context = {
    LotKeysPhoneCore: PhoneCore,
    LotKeysMessagingBridge: { DriveSync: {
      connected: () => true,
      restoreSessionAuthorization: async () => { calls.restore++; return true; },
      authorize: async () => { calls.authorize++; return 'browser-token'; },
      getGoogleIdentity: async () => ({ email: 'browser@example.test' })
    } },
    crypto: webcrypto, TextEncoder, TextDecoder, Headers, AbortController, URLSearchParams,
    localStorage: storage(values), sessionStorage: storage(sessions),
    location: { hash: '', pathname: '/', search: '' }, history: { replaceState() {} },
    navigator: {}, document: { readyState: 'loading', visibilityState: 'visible', addEventListener(name, fn) { documentEvents.set(name, fn); } },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    dispatchEvent() {}, addEventListener(name, fn) { events.set(name, fn); },
    setTimeout(fn, delay) { timers.push({ fn, delay }); return timers.length; }, clearTimeout(id) { if (timers[id - 1]) timers[id - 1].cancelled = true; },
    fetch: async (url, options = {}) => {
      calls.fetch.push(String(url));
      if (String(url).endsWith('/v1/presence')) { calls.lastPresence = JSON.parse(options.body); return { ok: true, json: async () => ({ ok: true }) }; }
      if (String(url).includes('/v1/status')) return { ok: true, json: async () => native };
      if (String(url).includes('/v1/threads?')) return { ok: true, json: async () => ({ threads: [] }) };
      if (String(url).endsWith('/v1/pairings')) return { ok: true, json: async () => ({ pairings: [] }) };
      throw Error('Unexpected network request: ' + url);
    }
  };
  context.window = context;
  vm.runInNewContext(source, context, { filename: 'lotkeys-phone.js' });
  return { phone: context.LotKeysPhone, calls, sessions, context, events, documentEvents, timers };
}

function pcWithRememberedTrust({ savedSession = false } = {}) {
  const browserId = 'trusted-browser-1234567890';
  const values = new Map([
    ['lotkeys-phone-browser-id-v1', browserId],
    ['lotkeys-phone-remembered-pair-v1', JSON.stringify({
      version: 1, browserId, phoneName: 'Test phone', trustMode: '36h',
      deviceId: 'trusted-phone-1234567890',
      trustExpiresAt: Date.now() + 60 * 60 * 1000, connectedAt: Date.now(), disconnected: false
    })]
  ]);
  const sessions = new Map();
  const storage = map => ({ getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key) });
  const timers = [];
  const events = new Map();
  if (savedSession) sessions.set('lotkeys-phone-active-session-v1', JSON.stringify({ version: 1, role: 'pc', sessionId: 'saved-session-1234567890', browserId, deviceId: 'trusted-phone-1234567890', key: Buffer.alloc(32, 7).toString('base64url'), savedAt: Date.now(), lastSeenAt: Date.now(), trustMode: '36h', trustExpiresAt: Date.now() + 3600000 }));
  const uploads = [];
  const response = (body, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    text: async () => JSON.stringify(body)
  });
  const context = {
    LotKeysPhoneCore: PhoneCore,
    LotKeysMessagingBridge: { DriveSync: {
      connected: () => true,
      restoreSessionAuthorization: async () => true,
      authorize: async () => 'pc-browser-token'
    } },
    crypto: webcrypto, TextEncoder, TextDecoder, Headers, AbortController, URL, URLSearchParams, Blob,
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
    atob: value => Buffer.from(value, 'base64').toString('binary'),
    localStorage: storage(values), sessionStorage: storage(sessions),
    location: { hash: '', pathname: '/', search: '' }, history: { replaceState() {} },
    navigator: { platform: 'Test PC', userAgent: 'Chrome/1' },
    document: { readyState: 'loading', visibilityState: 'hidden', addEventListener() {} },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    dispatchEvent() {}, addEventListener(name, fn) { events.set(name, fn); },
    setTimeout(fn, delay) { timers.push({ fn, delay }); return timers.length; },
    clearTimeout(id) { if (timers[id - 1]) timers[id - 1].cancelled = true; },
    fetch: async (url, options = {}) => {
      if (String(url).includes('/upload/drive/v3/files')) {
        uploads.push({ url: String(url), options });
        return response({ id: 'automatic-offer-file' });
      }
      if (String(url).includes('/drive/v3/files')) return response({ files: [] });
      throw Error('Unexpected network request: ' + url);
    }
  };
  context.window = context;
  vm.runInNewContext(source, context, { filename: 'lotkeys-phone.js' });
  return { phone: context.LotKeysPhone, timers, uploads, events, values, context };
}

test('the phone refuses browser-only pairing even with a browser Drive grant', async () => {
  const { phone, calls, sessions } = phoneWithNativeRelay({ authorized: false, account: 'phone@example.test', trusts: [] });
  await phone.init();
  assert.equal(phone.status().native, true);
  assert.equal(phone.status().relayReady, false);
  assert.equal(phone.status().connected, false);
  assert.equal(sessions.has('lotkeys-phone-active-session-v1'), false, 'legacy browser-owned phone session is removed');
  await assert.rejects(phone.preparePhonePairing(), /Android PC relay needs Google authorization/);
  assert.equal(calls.authorize, 0, 'browser Drive authorization must not substitute for Android relay');
  assert.equal(calls.restore, 1, 'Hub records can still restore their browser grant');
  assert.equal(calls.fetch.some(url => url.includes('googleapis.com')), false);
});

test('only the visible phone browser renews active presence; hiding it releases presence and local polling', async () => {
  const f = phoneWithNativeRelay({ authorized: true, account: 'phone@example.test', trusts: [] });
  await f.phone.init();
  assert.ok(f.calls.fetch.some(url => url.endsWith('/v1/status?foreground=1')));
  assert.ok(f.timers.some(timer => timer.delay === 3000 && !timer.cancelled));
  f.context.document.visibilityState = 'hidden'; f.documentEvents.get('visibilitychange')();
  assert.equal(f.calls.lastPresence.foreground, false);
  assert.equal(f.timers.filter(timer => timer.delay === 3000 && !timer.cancelled).length, 0);
  f.context.document.visibilityState = 'visible'; f.documentEvents.get('visibilitychange')();
  assert.ok(f.timers.some(timer => timer.delay === 100 && !timer.cancelled));
});

test('leaving the phone page releases foreground presence even when visibilitychange was missed', async () => {
  const f = phoneWithNativeRelay({ authorized: true, account: 'phone@example.test', trusts: [] });
  await f.phone.init(); f.events.get('pagehide')();
  assert.equal(f.calls.lastPresence.foreground, false);
  assert.equal(f.timers.filter(timer => timer.delay === 3000 && !timer.cancelled).length, 0);
});

test('a native relay error survives a successful local SMS refresh', async () => {
  const { phone } = phoneWithNativeRelay({ authorized: true, account: 'phone@example.test', connected: false,
    lastError: 'Android relay cannot reach Drive', trusts: [] });
  await phone.init();
  await phone.refreshThreads();
  assert.equal(phone.status().relayReady, true);
  assert.equal(phone.status().relayError, 'Android relay cannot reach Drive');
  assert.equal(phone.status().connected, false);
  await assert.rejects(phone.preparePhonePairing(), /Android PC relay reported: Android relay cannot reach Drive/);
});

test('a trusted PC starts fresh background pairing without a reconnect tap', async () => {
  const { phone, timers, uploads } = pcWithRememberedTrust();
  await phone.init();
  const recovery = timers.find(timer => timer.delay === 500);
  assert.ok(recovery, 'automatic recovery timer should be scheduled');
  await recovery.fn();
  const status = phone.status();
  assert.equal(status.pairing?.automatic, true, JSON.stringify(status));
  assert.equal(status.rememberedPair?.trustMode, '36h');
  assert.equal(uploads.length, 1);
  const body = await uploads[0].options.body.text();
  assert.match(body, /"reconnect":true/);
  assert.match(body, /"browserId":"trusted-browser-1234567890"/);
  assert.match(body, /"targetDeviceId":"trusted-phone-1234567890"/);
});

test('a registered phone stays green while the open PC retries without a new approval or duplicate offers', async () => {
  const f = pcWithRememberedTrust(); await f.phone.init();
  assert.equal(f.phone.status().registered, true);
  assert.equal(f.phone.status().connection.level, 'green');
  const tick = f.timers.find(timer => timer.delay === 15000 && !timer.cancelled);
  assert.ok(tick); await tick.fn();
  assert.equal(f.phone.status().pairing.automatic, true);
  assert.equal(f.uploads.length, 1);
  const retry = f.timers.filter(timer => timer.delay === 15000 && !timer.cancelled).at(-1);
  await retry.fn();
  assert.equal(f.uploads.length, 1, 'reuse the valid offer while retrying');
  assert.equal(f.phone.status().connected, false);
  assert.equal(f.phone.status().connection.level, 'green', 'sending an offer is not a connection acknowledgement');
});

test('manual retry and an automatic attempt share one fresh session offer', async () => {
  const f = pcWithRememberedTrust(); await f.phone.init();
  await Promise.all([f.phone.retryPhoneConnection(), f.phone.retryPhoneConnection()]);
  assert.equal(f.uploads.length, 1);
  assert.equal(f.phone.status().pairing.automatic, true);
});

test('leaving the PC page stops retries and returning resumes them, including an open hidden tab', async () => {
  const f = pcWithRememberedTrust(); await f.phone.init();
  const tick = f.timers.find(timer => timer.delay === 15000 && !timer.cancelled);
  f.events.get('pagehide')();
  assert.equal(tick.cancelled, true);
  await tick.fn(); assert.equal(f.uploads.length, 0);
  f.events.get('pageshow')();
  const resumed = f.timers.filter(timer => timer.delay === 100 && !timer.cancelled).at(-1);
  assert.ok(resumed); await resumed.fn();
  assert.equal(f.uploads.length, 1, 'hidden but open PC pages still reconnect');
});

test('expired registration stops the PC loop and manual retry never invents a new trusted phone', async () => {
  const f = pcWithRememberedTrust(); await f.phone.init();
  const tick = f.timers.find(timer => timer.delay === 15000 && !timer.cancelled);
  const key = 'lotkeys-phone-remembered-pair-v1', row = JSON.parse(f.values.get(key)); row.trustExpiresAt = Date.now() - 1; f.values.set(key, JSON.stringify(row));
  await tick.fn();
  assert.equal(f.uploads.length, 0); assert.equal(f.phone.status().registered, false);
  assert.equal(f.phone.status().connection.level, 'red');
  await assert.rejects(f.phone.retryPhoneConnection(), /approve this computer first/);
});

test('a restored recent session remains green until this page receives a fresh acknowledgement', async () => {
  const f = pcWithRememberedTrust({ savedSession: true }); await f.phone.init();
  assert.equal(f.phone.status().sessionRestorable, true);
  assert.equal(f.phone.status().registered, true);
  assert.equal(f.phone.status().connected, false);
  assert.equal(f.phone.status().connection.level, 'green');
});
