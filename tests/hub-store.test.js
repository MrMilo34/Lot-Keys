'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Hub = require('../lotkeys-hub-core.js');

const storeSource = fs.readFileSync(path.resolve(__dirname, '../lotkeys-hub-store.js'), 'utf8');

function memoryIndexedDb() {
  const records = new Map();
  const database = {
    createObjectStore() {},
    transaction() {
      const transaction = {};
      const request = operation => {
        const result = {};
        queueMicrotask(() => {
          try {
            result.result = operation();
            result.onsuccess?.({ target: result });
            transaction.oncomplete?.({ target: transaction });
          } catch (error) {
            result.error = error;
            transaction.error = error;
            result.onerror?.({ target: result });
            transaction.onerror?.({ target: transaction });
          }
        });
        return result;
      };
      transaction.objectStore = () => ({
        getAll: () => request(() => [...records.values()].map(row => structuredClone(row))),
        get: key => request(() => records.has(key) ? structuredClone(records.get(key)) : undefined),
        put: row => request(() => {
          records.set(row.k, structuredClone(row));
          return row.k;
        })
      });
      return transaction;
    }
  };
  return {
    records,
    indexedDB: {
      open() {
        const request = {};
        queueMicrotask(() => {
          request.result = database;
          request.onupgradeneeded?.({ target: request });
          request.onsuccess?.({ target: request });
        });
        return request;
      }
    }
  };
}

function loadStore() {
  let account = { email: 'alpha@example.test', sub: 'alpha' };
  const memory = memoryIndexedDb();
  const events = [];
  const window = {
    LotKeysHubCore: Hub,
    LotKeysMessagingBridge: {
      getSetting: async key => key === 'currentAccountEmail' ? account.email : key === 'currentAccountSub' ? account.sub : '',
      DriveSync: { connected: () => false, authorize: async () => { throw Error('offline'); } },
      mediaBusy: () => false
    },
    dispatchEvent: event => events.push(event.type),
    addEventListener() {}
  };
  class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }
  const context = vm.createContext({
    window,
    document: { hidden: false, body: { classList: { contains: () => false } } },
    indexedDB: memory.indexedDB,
    CustomEvent,
    Blob,
    Headers,
    URL,
    fetch,
    structuredClone,
    console,
    setTimeout: () => 0,
    clearTimeout() {},
    setInterval: () => 0
  });
  vm.runInContext(storeSource, context, { filename: 'lotkeys-hub-store.js' });
  return {
    store: window.LotKeysHubStore,
    events,
    switchAccount(email, sub) { account = { email, sub }; }
  };
}

test('standalone reminders are isolated by signed-in account', async () => {
  const harness = loadStore();
  await harness.store.save('reminder', { id: 'REM-A', title: 'Alpha task' });
  assert.deepEqual((await harness.store.list('reminder')).map(row => row.id), ['REM-A']);

  harness.switchAccount('beta@example.test', 'beta');
  assert.deepEqual(await harness.store.list('reminder'), []);
  await harness.store.save('reminder', { id: 'REM-B', title: 'Beta task' });
  assert.deepEqual((await harness.store.list('reminder')).map(row => row.id), ['REM-B']);

  harness.switchAccount('alpha@example.test', 'alpha');
  assert.deepEqual((await harness.store.list('reminder')).map(row => row.id), ['REM-A']);
  assert.ok(harness.events.includes('lotkeys-hub-identity'));
});

test('phone sorting retains app-level block state while categories change', async () => {
  const { store } = loadStore();
  const blockedAt = '2026-09-26T12:00:00.000Z';
  await store.upsertPhoneSorting('780-555-0123', {
    categoryIds: ['customers'],
    primaryCategoryId: 'customers',
    blocked: true,
    blockedAt
  });
  await store.upsertPhoneSorting('+1 780 555 0123', {
    categoryIds: ['follow-up'],
    primaryCategoryId: 'follow-up'
  });
  let [row] = await store.phoneSorting();
  assert.equal(row.phone, '+17805550123');
  assert.equal(row.blocked, true);
  assert.equal(row.blockedAt, blockedAt);
  assert.deepEqual(Array.from(row.categoryIds), ['follow-up']);

  await store.upsertPhoneSorting(row.phone, { blocked: false, blockedAt: '' });
  [row] = await store.phoneSorting();
  assert.equal(row.blocked, false);
  assert.equal(row.blockedAt, '');
  assert.deepEqual(Array.from(row.categoryIds), ['follow-up']);
});

test('phone sorting accepts numeric SMS short codes without treating them as callable numbers', async () => {
  const { store } = loadStore();
  await store.upsertPhoneSorting('66000', {
    blocked: true,
    blockedAt: '2026-09-26T18:00:00.000Z'
  });
  const [row] = await store.phoneSorting();
  assert.equal(row.phone, '66000');
  assert.equal(row.blocked, true);
});

test('deleting a standalone reminder preserves its linked Contact note', async () => {
  const { store } = loadStore();
  await store.save('contact', {
    id: 'CUST-1',
    name: 'Taylor',
    lotkeysId: 'taylor@example.test',
    fields: [],
    notes: [{ id: 'NOTE-1', label: 'Note', text: 'Call tomorrow', reminderId: 'REM-1' }]
  });
  await store.save('reminder', {
    id: 'REM-1',
    title: 'Call tomorrow',
    contactId: 'CUST-1',
    noteId: 'NOTE-1'
  });

  assert.equal(await store.removeReminder('REM-1'), true, 'local deletion completes before deferred Drive sync');
  assert.equal(await store.get('reminder', 'REM-1'), null);
  const contact = await store.get('contact', 'CUST-1');
  assert.equal(contact.notes.length, 1);
  assert.equal(contact.notes[0].text, 'Call tomorrow');
  assert.equal('reminderId' in contact.notes[0], false);
});

test('legacy reminder migration is idempotent and never retires the source while offline', async () => {
  const { store } = loadStore();
  await store.save('appointment', {
    id: 'LEGACY-1',
    kind: 'Reminder',
    title: 'Follow up',
    notes: 'Ask about the trade',
    start: '2026-09-25T20:30:00.000Z',
    end: '2026-09-25T21:00:00.000Z',
    status: 'Open'
  });

  const first = await store.migrateLegacyReminders();
  assert.deepEqual({ ...first }, { found: 1, created: 1, retired: 0, deferred: 1 });
  assert.equal((await store.list('appointment')).filter(row => row.kind === 'Reminder').length, 1);
  assert.deepEqual((await store.list('reminder')).map(row => row.id), ['LEGACY-1']);

  const second = await store.migrateLegacyReminders();
  assert.deepEqual({ ...second }, { found: 1, created: 0, retired: 0, deferred: 1 });
  assert.deepEqual((await store.list('reminder')).map(row => row.id), ['LEGACY-1']);
});
