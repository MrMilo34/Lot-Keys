'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const PC = require('../lotkeys-phone-core.js');
const H = require('../lotkeys-hub-core.js');
const hubSource = fs.readFileSync(path.join(__dirname, '..', 'lotkeys-hub.js'), 'utf8');
const phoneSource = fs.readFileSync(path.join(__dirname, '..', 'lotkeys-phone.js'), 'utf8');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function hubHistory() {
  let clock = 10000;
  const calls = [], timers = [], previews = [], paints = [], listeners = {}, historyStarted = deferred();
  const threads = [{ id: 'a', at: 9000, count: 1, preview: 'First', unread: 1 },
    { id: 'b', at: -200000, count: 1, preview: 'Other', unread: 0 }];
  const status = { role: 'pc', deviceName: 'Phone', relayIdentity: 'test', sessionId: 'session-a', connected: true };
  const context = {
    P: { status: () => status, threads: () => threads, history: id => {
      const job = deferred(); calls.push({ id, ...job }); historyStarted.resolve(); return job.promise;
    } },
    PC, H, Date: { now: () => clock }, console,
    setTimeout: (fn, delay) => { timers.push({ fn, delay }); return timers.length; }, clearTimeout() {},
    home: () => false, deviceRows: () => threads.map(row => ({ ...row, live: true })),
    loadBadgeData: async () => {}, toast() {}, tint: () => '#123456',
    paintDeviceBubble: (id, row, page) => { paints.push({ id, page }); return true; },
    scheduleRefresh() {}, activeDeviceChatRefresh: null,
    $: () => null, document: { body: { dataset: {} } },
    M: { isDeviceBubbleOpen: () => false, collapseBubble() {}, rememberReply: async () => {},
      showMessagePreview: preview => previews.push(preview) },
    window: { addEventListener: (name, fn) => { listeners[name] = fn; } }
  };
  const cache = hubSource.slice(hubSource.indexOf('function deviceHistoryKey('), hubSource.indexOf('function currentDeviceKey('));
  const key = hubSource.slice(hubSource.indexOf('function currentDeviceKey('), hubSource.indexOf('async function sendDeviceBubbleText('));
  const bubbles = hubSource.slice(hubSource.indexOf('async function refreshDeviceBubble('), hubSource.indexOf('function bindCategoryReorder('));
  const listener = hubSource.split('\n').find(line => line.startsWith("window.addEventListener('lotkeys-phone-data'"));
  vm.runInNewContext(
    hubSource.slice(hubSource.indexOf('const DEVICE_DRAFT_PREFIX='), hubSource.indexOf('let groupState=')) + cache + key + bubbles + '\n' + listener +
    ';globalThis.api={deviceHistoryKey,deviceHistoryPage,cachedDeviceHistory,clearDeviceHistoryCache,prefetchDeviceHistory,prefetchRecentDeviceHistory,checkDeviceMessageActivity,openDeviceBubble,refreshDeviceBubble};', context);
  return { ...context.api, calls, timers, previews, paints, threads, status, context, listeners, historyStarted: historyStarted.promise,
    advance: ms => { clock += ms; } };
}

const page = id => ({ messages: [{ id, text: id, at: 9000, outgoing: false }], hasMore: true, nextBefore: { at: 8000, sort: 'sms-1' } });

test('Hub prefetch, preview and chat opening share an overlapping first-page request', async () => {
  const hub = hubHistory();
  hub.prefetchDeviceHistory('a');
  const preview = hub.deviceHistoryPage('a', { fresh: true });
  const opening = hub.deviceHistoryPage('a');
  assert.equal(hub.calls.length, 1);
  hub.calls[0].resolve(page('first'));
  assert.equal(await preview, await opening);
  assert.equal((await hub.deviceHistoryPage('a', { fresh: true })).nextBefore.at, 8000);
  assert.equal(hub.calls.length, 1);
});

test('opening the notification reuses its phone history without another relay trip', async () => {
  const hub = hubHistory();
  const notification = hub.checkDeviceMessageActivity();
  await hub.historyStarted;
  assert.equal(hub.calls.length, 1);
  hub.calls[0].resolve(page('incoming'));
  await notification;
  assert.equal(hub.previews.length, 1);
  await hub.previews[0].onOpen();
  assert.equal(hub.calls.length, 1);
  assert.equal(hub.paints[0].page.messages[0].id, 'incoming');
});

test('an unrelated thread update preserves a recently loaded conversation', async () => {
  const hub = hubHistory();
  const warm = hub.deviceHistoryPage('a');
  hub.calls[0].resolve(page('a')); await warm;
  hub.threads[1].count++;
  hub.listeners['lotkeys-phone-data']({ detail: { reason: 'threads' } });
  const reopening = hub.deviceHistoryPage('a');
  assert.equal(hub.calls.length, 1, 'the data listener must not discard every cached chat');
  assert.equal((await reopening).messages[0].id, 'a');
  await Promise.resolve();
});

test('changed history paints the previous page immediately and separately fetches every new arrival', async () => {
  const hub = hubHistory();
  const warm = hub.deviceHistoryPage('a');
  hub.calls[0].resolve(page('old')); await warm;
  hub.threads[0].count += 12; hub.threads[0].at++;
  const fresh = hub.deviceHistoryPage('a', { fresh: true });
  assert.equal((await hub.deviceHistoryPage('a')).messages[0].id, 'old');
  assert.equal(hub.calls.length, 2);
  const arrivals = Array.from({ length: 12 }, (_, i) => ({ id: 'new-' + i, at: 10000 + i, text: 'New' }));
  hub.calls[1].resolve({ ...page('old'), messages: [...arrivals, ...page('old').messages] });
  assert.equal((await fresh).messages.length, 13);
  assert.equal(hub.cachedDeviceHistory('a').page.messages.length, 6);
});

test('a delayed old response cannot overwrite newer cached history', async () => {
  const hub = hubHistory();
  const old = hub.deviceHistoryPage('a', { fresh: true });
  hub.threads[0].count++;
  const fresh = hub.deviceHistoryPage('a', { fresh: true });
  hub.calls[1].resolve(page('new')); await fresh;
  hub.calls[0].resolve(page('old')); await old;
  assert.equal(hub.cachedDeviceHistory('a').page.messages[0].id, 'new');
});

test('aged history is refreshed and unread-only changes reuse the same recent page', async () => {
  const hub = hubHistory();
  const warm = hub.deviceHistoryPage('a');
  hub.calls[0].resolve(page('old')); await warm;
  hub.threads[0].unread = 0;
  await hub.deviceHistoryPage('a', { fresh: true });
  assert.equal(hub.calls.length, 1);
  hub.advance(5000);
  const fresh = hub.deviceHistoryPage('a', { fresh: true });
  assert.equal(hub.calls.length, 2);
  hub.calls[1].resolve(page('new')); await fresh;
});

test('disconnect and account clearing prevent a late request from repopulating memory', async () => {
  const hub = hubHistory();
  const pending = hub.deviceHistoryPage('a');
  hub.clearDeviceHistoryCache();
  hub.calls[0].resolve(page('private')); await pending;
  assert.equal(hub.cachedDeviceHistory('a'), null);
  hub.status.sessionId = 'session-b';
  const next = hub.deviceHistoryPage('a');
  assert.equal(hub.calls.length, 2);
  hub.calls[1].resolve(page('other-phone')); await next;
});

test('history cache remains limited to ten conversations and expires after five minutes', async () => {
  const hub = hubHistory();
  for (let i = 0; i < 11; i++) {
    const job = hub.deviceHistoryPage(String(i));
    hub.calls.at(-1).resolve(page(String(i))); await job;
  }
  assert.equal(hub.cachedDeviceHistory('0'), null);
  assert.ok(hub.cachedDeviceHistory('10'));
  hub.advance(300001);
  assert.equal(hub.cachedDeviceHistory('10'), null);
});

function recentPage(id, count = 40) {
  return { messages: Array.from({ length: count }, (_, i) => ({
    id: id + '-' + i, sort: 'sms-' + String(i).padStart(20, '0'), at: 1000 + i,
    text: 'Message ' + i, attachments: [{ id: 'part-' + i, type: 'image/jpeg', _file: 'temporary-bytes' }]
  })).reverse(), hasMore: true, nextBefore: { at: 1000, sort: 'sms-00000000000000000000' } };
}

test('connected Hub warms six messages for ten most recent chats without opening Hub home', async () => {
  const hub = hubHistory();
  hub.threads.splice(0, hub.threads.length, ...Array.from({ length: 12 }, (_, i) => ({ id: String(i), at: 20000 - i, count: 40 })));
  for (let i = 0; i < 10; i++) {
    const job = hub.prefetchRecentDeviceHistory();
    assert.equal(hub.calls.length, i + 1, 'only one warm request at a time');
    assert.equal(hub.calls[i].id, String(i));
    hub.calls[i].resolve(recentPage(String(i))); await job;
  }
  await hub.prefetchRecentDeviceHistory();
  assert.equal(hub.calls.length, 10, 'unchanged thread updates do not refetch ten pages');
  for (let i = 0; i < 10; i++) {
    const cached = hub.cachedDeviceHistory(String(i));
    assert.equal(cached.page.messages.length, 6);
    assert.equal(cached.page.messages[0].text, 'Message 34');
    assert.equal(cached.page.messages.at(-1).text, 'Message 39');
    assert.equal(cached.page.messages[0].attachments[0]._file, undefined);
    assert.equal(cached.page.hasMore, true);
    assert.equal(cached.page.nextBefore.at, 1034, 'older loading starts before the retained six, not the discarded forty');
    await hub.deviceHistoryPage(String(i));
  }
  assert.equal(hub.calls.length, 10, 'all ten cached chats open without another phone request');
  assert.equal(hub.cachedDeviceHistory('10'), null);
  const old = hub.deviceHistoryPage('11'); hub.calls.at(-1).resolve(recentPage('old')); await old;
  assert.ok(hub.cachedDeviceHistory('9'), 'opening an older chat does not evict a pinned recent chat');
  assert.equal(hub.cachedDeviceHistory('11'), null);
});

test('foreground reads precede the next background chat and an incoming thread joins the recent ten', async () => {
  const hub = hubHistory();
  const foreground = hub.deviceHistoryPage('a');
  await hub.prefetchRecentDeviceHistory();
  assert.equal(hub.calls.length, 1, 'background warming yields to an outstanding foreground page');
  hub.calls[0].resolve(recentPage('a')); await foreground;
  const warm = hub.prefetchRecentDeviceHistory(); hub.calls[1].resolve(recentPage('b')); await warm;
  hub.threads.unshift({ id: 'new', at: 30000, count: 6 });
  const incoming = hub.prefetchRecentDeviceHistory();
  assert.equal(hub.calls.at(-1).id, 'new'); hub.calls.at(-1).resolve(recentPage('new', 6)); await incoming;
  assert.equal(hub.cachedDeviceHistory('new').page.messages.length, 6);
});

test('one failed warm chat cannot starve other chats and retries after its own backoff', async () => {
  const hub = hubHistory();
  const failed = hub.prefetchRecentDeviceHistory(); hub.calls[0].reject(Error('Unavailable thread')); await failed;
  const next = hub.prefetchRecentDeviceHistory();
  assert.equal(hub.calls[1].id, 'b'); hub.calls[1].resolve(recentPage('b')); await next;
  await hub.prefetchRecentDeviceHistory(); assert.equal(hub.calls.length, 2);
  hub.advance(30000);
  const retry = hub.prefetchRecentDeviceHistory(); assert.equal(hub.calls[2].id, 'a');
  hub.calls[2].resolve(recentPage('a')); await retry;
});

test('warm cache skips blocked, hidden, locked and disconnected reads', async () => {
  const hub = hubHistory();
  hub.context.deviceRows = () => [{ id: 'a', live: true, blocked: true }, { id: 'b', live: true, at: 2 }];
  hub.context.document.visibilityState = 'hidden'; await hub.prefetchRecentDeviceHistory();
  hub.context.document.visibilityState = 'visible'; hub.context.document.body.dataset.lotkeysLocked = 'true'; await hub.prefetchRecentDeviceHistory();
  hub.context.document.body.dataset.lotkeysLocked = 'false'; hub.status.connected = false; await hub.prefetchRecentDeviceHistory();
  assert.equal(hub.calls.length, 0);
  hub.status.connected = true;
  const warm = hub.prefetchRecentDeviceHistory(); assert.equal(hub.calls[0].id, 'b');
  hub.calls[0].resolve(recentPage('b')); await warm;
});

test('warm requests cannot refill after disconnect and an expiry cycle refreshes retained chats', async () => {
  const hub = hubHistory();
  const old = hub.prefetchRecentDeviceHistory(); hub.clearDeviceHistoryCache(); hub.status.connected = false;
  hub.calls[0].resolve(recentPage('old')); await old;
  assert.equal(hub.cachedDeviceHistory('a'), null);
  hub.status.connected = true;
  const first = hub.prefetchRecentDeviceHistory(); hub.calls[1].resolve(recentPage('fresh')); await first;
  hub.advance(240000);
  const renewed = hub.prefetchRecentDeviceHistory(); assert.equal(hub.calls[2].id, 'a');
  hub.calls[2].resolve(recentPage('renewed')); await renewed;
  assert.equal(hub.cachedDeviceHistory('a').page.messages[0].id, 'renewed-34');
});

test('cache trimming uses the native tie-break order and gives a correct six-message cursor', async () => {
  const hub = hubHistory(), data = recentPage('same', 12);
  data.messages.forEach((message, i) => { message.at = 5000; message.id = 'sms-' + (11 - i); });
  const opening = hub.deviceHistoryPage('a'); hub.calls[0].resolve(data);
  assert.equal((await opening).messages.length, 12, 'the active fetch still receives its full page');
  const cached = hub.cachedDeviceHistory('a').page;
  assert.equal(cached.messages[0].id, 'sms-6');
  assert.equal(cached.nextBefore.sort, 'sms-00000000000000000006');
});

function phoneHistory() {
  const calls = [];
  const state = { nativeStatus: {}, nativeToken: 'native-link', nativeRevision: 1,
    relayIdentity: 'account', session: null, threads: [{ id: 'a', at: 1, count: 1, preview: 'Old' }] };
  let online = true;
  const context = { state, P: PC, URLSearchParams, text: value => String(value ?? '').trim(), console,
    connected: () => online, nativeCall: query => {
      const job = deferred(); calls.push({ query, ...job }); return job.promise;
    }, request: (op, payload) => {
      const job = deferred(); calls.push({ op, payload, ...job }); return job.promise;
    }, refreshThreads: async () => {}, sessionError() {}, disconnect: async () => {}, clearTimeout() {} };
  const history = phoneSource.slice(phoneSource.indexOf('  function history('), phoneSource.indexOf('  async function send('));
  const handle = phoneSource.slice(phoneSource.indexOf('  function handlePcPayload('), phoneSource.indexOf('  function request('));
  assert.ok(history.includes('historyRequests'), 'exercise the actual phone request function');
  vm.runInNewContext('const historyRequests=new Map(),pendingRpc=new Map();let historyRevision=0;' +
    history + handle + ';globalThis.api={history,handlePcPayload};', context);
  return { ...context.api, state, calls, offline: () => { online = false; } };
}

test('phone reads coalesce across callers while cursors retain independent history pages', async () => {
  const phone = phoneHistory();
  const first = phone.history('a');
  assert.equal(phone.history('a'), first);
  const older = phone.history('a', { at: 1, sort: 'sms-10' });
  const equalCursor = phone.history('a', { at: 1, sort: 'sms-10' });
  assert.equal(older, equalCursor);
  assert.notEqual(older, first);
  assert.equal(phone.calls.length, 2);
  assert.match(phone.calls[1].query, /beforeSort=sms-10/);
  phone.calls[0].resolve(page('first')); phone.calls[1].resolve(page('older'));
  await Promise.all([first, older]);
  const afterCompletion = phone.history('a');
  assert.equal(phone.calls.length, 3, 'only overlapping requests are cached by the phone transport');
  phone.calls[2].resolve(page('fresh')); await afterCompletion;
});

test('phone data changes start a new read instead of joining a stale native request', async () => {
  const phone = phoneHistory();
  const old = phone.history('a');
  phone.state.nativeRevision++;
  const current = phone.history('a');
  assert.notEqual(old, current);
  phone.state.threads[0].count++;
  const changedThread = phone.history('a');
  assert.equal(phone.calls.length, 3);
  phone.calls.forEach((call, i) => call.resolve(page(String(i))));
  await Promise.all([old, current, changedThread]);
});

test('relay invalidation and replaced sessions cannot share an old history request', async () => {
  const phone = phoneHistory();
  phone.state.nativeStatus = null; phone.state.session = { sessionId: 'first' };
  const old = phone.history('a');
  phone.handlePcPayload({ kind: 'event', event: 'invalidate' }, phone.state.session);
  const changed = phone.history('a');
  phone.state.session = { sessionId: 'replacement' };
  const replacement = phone.history('a');
  assert.notEqual(old, changed); assert.notEqual(changed, replacement);
  assert.equal(phone.calls.length, 3);
  phone.calls.forEach(call => call.resolve(page('phone')));
  await Promise.all([old, changed, replacement]);
});

test('failed history releases its slot for retry and disconnect refuses even a pending read', async () => {
  const phone = phoneHistory();
  const failed = phone.history('a');
  phone.calls[0].reject(Error('Temporary relay failure'));
  await assert.rejects(failed, /Temporary relay failure/);
  const retry = phone.history('a');
  assert.equal(phone.calls.length, 2);
  phone.state.nativeStatus = null; phone.offline();
  await assert.rejects(phone.history('a'), /disconnected/);
  phone.calls[1].resolve(page('retry')); await retry;
});

function beginActualConversation(hub, metadata) {
  const start = hubSource.lastIndexOf('async function openDeviceConversation(threadId){');
  const end = hubSource.indexOf('let messages=', start);
  assert.ok(start > 0 && end > start);
  const prefix = hubSource.slice(start, end);
  const context = { ...hub.context, ...hub, activeDeviceMediaCleanup: null,
    loadLocal: () => metadata.promise, S: { identity: async () => 'owner' } };
  vm.runInNewContext(prefix + 'return row;}\nglobalThis.begin=openDeviceConversation;', context);
  return context.begin('a');
}

test('actual full-chat opening starts phone history before waiting for Hub metadata', async () => {
  const hub = hubHistory(), metadata = deferred();
  const opening = beginActualConversation(hub, metadata);
  assert.equal(hub.calls.length, 1, 'phone history must already be fetching while metadata is unresolved');
  hub.calls[0].resolve(page('phone'));
  metadata.resolve(); await opening;
  await hub.historyStarted;
});

test('actual full-chat opening rejects a phone swap while Hub metadata loads', async () => {
  const hub = hubHistory(), metadata = deferred();
  const opening = beginActualConversation(hub, metadata);
  hub.status.sessionId = 'different-phone-session';
  metadata.resolve();
  await assert.rejects(opening, /phone connection changed/);
  hub.calls[0].resolve(page('old-phone'));
  await hub.historyStarted;
});
