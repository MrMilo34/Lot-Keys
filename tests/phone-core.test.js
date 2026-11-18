'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Phone = require('../lotkeys-phone-core.js');

test('connection light distinguishes registration from a live acknowledged connection', () => {
  assert.equal(Phone.connectionStatus({ registered: true }).level, 'green');
  assert.equal(Phone.connectionStatus({ registered: true, connected: true }).level, 'blue');
  assert.equal(Phone.connectionStatus({ registered: false, connected: false }).level, 'red');
  assert.match(Phone.connectionStatus({ role: 'phone', registered: true }).label, /ready/);
});

const contacts = [{
  id: 'c1',
  name: 'LotKeys Custom Name',
  fields: [{ kind: 'phone', value: '780-555-0123', primary: true }],
  categoryIds: ['clients']
}];

test('pairing upload keeps a mixed-case multipart boundary intact across browser transports', async () => {
  const boundary = 'lotkeys_AbC12_xYz';
  const metadata = { name: 'Pairing probe.json', parents: ['appDataFolder'], mimeType: 'application/json' };
  const data = { type: 'probe', probeId: 'test-123' };
  const upload = Phone.buildMultipartJsonUpload(boundary, metadata, data);
  assert.equal(upload.contentType, `multipart/related; boundary=${boundary}`);
  assert.equal(upload.body.type, '');
  const request = new Request('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST', headers: { 'Content-Type': upload.contentType }, body: upload.body
  });
  assert.equal(request.headers.get('content-type'), upload.contentType);
  const segments = (await request.text()).split(`--${boundary}`);
  assert.equal(segments.length, 4);
  assert.deepEqual(JSON.parse(segments[1].split('\r\n\r\n')[1].trim()), metadata);
  assert.deepEqual(JSON.parse(segments[2].split('\r\n\r\n')[1].trim()), data);
  assert.equal(segments[3], '--');
});

test('custom LotKeys name wins over Android name and number', () => {
  const thread = { id: 'smsmms-1', address: '+17805550123', title: '+17805550123', phoneContactName: 'Android Name' };
  assert.equal(Phone.displayName(thread, contacts), 'LotKeys Custom Name');
  assert.equal(Phone.displayName({ ...thread, address: '+17805550999' }, contacts), 'Android Name');
});

test('conversation identity and sorting are keyed by normalized phone number', () => {
  const thread = { id: 'smsmms-2', address: '(780) 555-0123', title: 'Number', at: 10, canReply: true };
  const rows = Phone.normalizeThreads([thread], contacts, [{ phone: '+17805550123', categoryIds: ['hot'], primaryCategoryId: 'hot' }]);
  assert.equal(rows[0].phone, '+17805550123');
  assert.deepEqual(rows[0].organization.categoryIds, ['hot']);
  assert.equal(rows[0].organization.primaryCategoryId, 'hot');
});

test('opening Device history clears only the current unread alert signature', () => {
  const thread = { id: 'smsmms-8', at: 100, count: 4, preview: 'Thank you', unread: 1 };
  const messages = [
    { id: 'sms-4', at: 100, outgoing: true, text: 'No problem' },
    { id: 'sms-3', at: 90, outgoing: false, text: 'Thank you' }
  ];
  const receipt = Phone.makeThreadReadReceipt(thread, messages, 1000);
  const acknowledged = Phone.applyThreadReadReceipts([thread], { [thread.id]: receipt })[0];
  assert.equal(acknowledged.rawUnread, 1);
  assert.equal(acknowledged.unread, 0);

  const outgoingOnly = [...messages, { id: 'sms-5', at: 120, outgoing: true, text: 'Following up' }];
  assert.equal(Phone.receiptHasNewIncoming(receipt, outgoingOnly), false);

  const newer = { ...thread, at: 130, count: 6, preview: 'One more question' };
  const restored = Phone.applyThreadReadReceipts([newer], { [thread.id]: receipt })[0];
  assert.equal(restored.unread, 1);
  assert.equal(Phone.receiptHasNewIncoming(receipt, [...outgoingOnly, {
    id: 'sms-6', at: 130, outgoing: false, text: 'One more question'
  }]), true);
});

test('unknown numbers can be sorted without a contact folder', () => {
  const rows = Phone.normalizeThreads([
    { id: 'smsmms-3', address: '7805550999', title: '7805550999', at: 5, canReply: true }
  ], [], [{ phone: '+17805550999', categoryIds: ['family'] }]);
  assert.equal(rows[0].contact, null);
  assert.deepEqual(rows[0].organization.categoryIds, ['family']);
});

test('trust windows and coverage states follow the locked rules', () => {
  const now = 1000;
  assert.equal(Phone.trustExpiry('36h', now), now + 36 * 60 * 60 * 1000);
  assert.equal(Phone.trustExpiry('7d', now), now + 7 * 24 * 60 * 60 * 1000);
  assert.equal(Phone.trustValid({ browserId: 'abc', mode: '36h', expiresAt: 2000 }, 'abc', 1500), true);
  assert.equal(Phone.trustValid({ browserId: 'abc', mode: 'ask', expiresAt: 9999 }, 'abc', 1500), false);
  assert.equal(Phone.coverage({ connected: true, sms: true, rcs: false }).level, 'amber');
  assert.equal(Phone.coverage({ connected: false, native: false }).level, 'red');
});

test('remembered pairing reconnects only while phone trust remains valid', () => {
  const now = 1000;
  const row = { browserId: 'browser-1', trustMode: '36h', trustExpiresAt: 2000 };
  assert.equal(Phone.rememberedPairValid(row, 'browser-1', now), true);
  assert.equal(Phone.rememberedPairValid(row, 'browser-1', 2001), false);
  assert.equal(Phone.rememberedPairValid({ ...row, trustMode: 'ask' }, 'browser-1', now), false);
  assert.equal(Phone.rememberedPairValid({ ...row, trustMode: 'until-disconnect', disconnected: false }, 'browser-1', now), true);
  assert.equal(Phone.rememberedPairValid({ ...row, trustMode: 'until-disconnect', disconnected: true }, 'browser-1', now), false);
});

test('automatic reconnect needs saved trust and rate-limits repeated offers', () => {
  const base = {
    nativeToken: false,
    session: false,
    pairing: false,
    remembered: true,
    driveConnected: true,
    lastAttemptAt: 1000,
    now: 12000,
    minimumInterval: 10000
  };
  assert.equal(Phone.automaticReconnectReady(base), true);
  assert.equal(Phone.automaticReconnectReady({ ...base, now: 9000 }), false);
  assert.equal(Phone.automaticReconnectReady({ ...base, session: true }), false);
  assert.equal(Phone.automaticReconnectReady({ ...base, pairing: true }), false);
  assert.equal(Phone.automaticReconnectReady({ ...base, remembered: false }), false);
  assert.equal(Phone.automaticReconnectReady({ ...base, driveConnected: false }), false);
});

test('stored encrypted sessions are bounded to one role and eight days', () => {
  const now = Date.now();
  const row = {
    version: 1,
    role: 'pc',
    sessionId: 'abcdefghijklmnop',
    key: 'A'.repeat(43),
    browserId: 'abcdefghijklmnop',
    savedAt: now
  };
  assert.equal(Phone.validateStoredSession(row, 'pc', now), true);
  assert.equal(Phone.validateStoredSession(row, 'phone', now), false);
  assert.equal(Phone.validateStoredSession({ ...row, key: 'too-short' }, 'pc', now), false);
  assert.equal(Phone.validateStoredSession({ ...row, savedAt: now - 9 * 24 * 60 * 60 * 1000 }, 'pc', now), false);
});

test('pair offers require a four-digit unexpired code and P-256 public key', () => {
  const now = Date.now();
  const offer = {
    version: 1,
    type: 'offer',
    sessionId: 'abcdefghijklmnop',
    code: '4821',
    browserId: 'abcdefghijklmnop',
    publicKey: { kty: 'EC', crv: 'P-256' },
    expiresAt: now + 60000
  };
  assert.equal(Phone.validatePairOffer(offer, now), true);
  assert.equal(Phone.validatePairOffer({ ...offer, code: '123456' }, now), false);
  assert.equal(Phone.validatePairOffer({ ...offer, expiresAt: now - 1 }, now), false);
});
