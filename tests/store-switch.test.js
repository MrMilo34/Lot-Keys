'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function sourceBetween(start, end) {
  const begin = html.indexOf(start), finish = html.indexOf(end, begin);
  assert.ok(begin >= 0 && finish > begin, `Could not extract ${start}`);
  return html.slice(begin, finish);
}

const connectionSettings = sourceBetween('  const STORE_CONNECTION_SETTING_KEYS=[', '  function newStoreCode()');
const createStore = sourceBetween('  function newStoreCode()', '  async function connectByStoreCode(');
const disconnectStore = sourceBetween('  async function disconnectActiveStore(', '  function showStoreConnectionMenu()');

test('a signed-in account creates an isolated root and receives the new Store owner role', async () => {
  const settings = new Map([
    ['currentAccountEmail', 'blair@example.com'], ['userName', 'Blair'],
    ['personalTheme', 'dark'], ['lotkeysProgressV1', {level: 9}],
    ['storeUsers', [{userName: 'Old Store User', adminLevel: 2}]],
    ['monthlyContributionHistory', [{points: 99}]],
  ]);
  let created = 0, verified = 0;
  const context = vm.createContext({
    crypto: webcrypto,
    DB: {del: async (_, key) => settings.delete(key)},
    setting: async (key, fallback) => settings.has(key) ? settings.get(key) : fallback,
    setSetting: async (key, value) => settings.set(key, value),
    authorize: async () => true,
    getGoogleIdentity: async () => ({email: 'blair@example.com', sub: 'google-123'}),
    createFolder: async (name, parent, properties) => {
      created++;
      assert.equal(parent, 'root');
      assert.equal(properties.lotkeysRole, 'storeRoot');
      return {id: 'new-root', name, webViewLink: 'https://drive.google.com/drive/folders/new-root'};
    },
    ensureStoreStructure: async () => {
      assert.deepEqual(settings.get('storeUsers'), undefined);
      assert.deepEqual(settings.get('monthlyContributionHistory'), undefined);
      settings.set('currentUserAdminLevel', 2);
      return {rootId: 'new-root', userId: 'new-user'};
    },
    syncStoreConfig: async structure => {assert.equal(structure.rootId, 'new-root'); verified++},
    findChildByAppProperty: async () => ({id: 'new-access'}),
    findChildByName: async () => null,
    rememberSavedStore: async entry => {assert.equal(entry.folderId, 'new-root'); settings.set('savedStores', [entry])},
  });
  vm.runInContext(`${connectionSettings}\n${createStore}`, context);
  const result = await context.createNewStore('Blair Auto');
  assert.equal(result.rootId, 'new-root');
  assert.equal(created, 1);
  assert.equal(verified, 1);
  assert.match(settings.get('storeCode'), /^LK-[A-F0-9]{16}$/);
  assert.equal(settings.get('storeBootstrapPendingRootId'), '');
  assert.equal(settings.get('personalTheme'), 'dark');
  assert.deepEqual(settings.get('lotkeysProgressV1'), {level: 9});
  await assert.rejects(context.createNewStore('Another Store'), /Disconnect from the current Store/);
  assert.equal(created, 1);
});

test('disconnect parks unfinished Store work and restores it only to the same Store', async () => {
  const settings = new Map([
    ['storeFolderId', 'old-root'], ['storeName', 'INFINITI'], ['storeCode', 'INF-SE034'],
    ['storeUsers', [{userName: 'Blair', adminLevel: 0}]],
    ['currentUserAdminLevel', 0], ['currentAccountEmail', 'blair@example.com'],
    ['personalTheme', 'dark'], ['savedStores', []],
    ['listingDeletionTombstonesV1', {deleted: 123}],
  ]);
  const collections = new Map([
    ['vehicles', [{id: 'v1', syncStatus: 'synced'}, {id: 'v2', syncStatus: 'error', mediaUpload: {status: 'uploading'}}]],
    ['listings', [{id: 'l1', syncStatus: 'synced'}, {id: 'l2', syncStatus: 'pending'}]],
    ['analytics', [{id: 'a1', points: 99}]], ['requestQueue', [{id: 'q1'}]],
    ['locations', [{id: 'personal-location'}]],
  ]);
  const session = new Map(), alerts = [], removed = [];
  const context = vm.createContext({
    DB: {
      get: async (name, key) => name === 'settings' ?
        (settings.has(key) ? {id: key, value: settings.get(key)} : null) :
        (collections.get(name) || []).find(item => item.id === key),
      put: async (name, row) => {
        if (name === 'settings') { settings.set(row.id, row.value); return; }
        const rows = collections.get(name) || [], index = rows.findIndex(item => item.id === row.id);
        if (index >= 0) rows[index] = row; else rows.push(row);
        collections.set(name, rows);
      },
      del: async (name, key) => name === 'settings' && settings.delete(key),
      all: async name => collections.get(name) || [],
      clear: async name => collections.set(name, []),
    },
    setting: async (key, fallback) => settings.has(key) ? settings.get(key) : fallback,
    setSetting: async (key, value) => settings.set(key, value),
    vehicleSyncJobs: new Map(), listingSyncJobs: new Map(), contributionSyncJobs: new Map(),
    vehicleStateSyncJobs: new Map(), vehicleHydrationJobs: new Map(), listingCoverHydrationJobs: new Map(),
    inventoryRefreshBusy: false, listingsRefreshBusy: false, garageBackgroundRefreshBusy: false,
    foregroundResumeBusy: false, onlineBootBusy: false, priceAlertCheckBusy: false,
    listingVehicleRecoveryBusy: false,
    vehicleResumeTimers: new Map(), vehicleSyncRetryCounts: new Map(),
    contributionResumeTimers: new Map(), contributionRetryCounts: new Map(),
    LIVE_MEDIA_PROGRESS_STORAGE: 'live-media',
    localStorage: {removeItem: key => removed.push(key)},
    sessionStorage: {
      getItem: key => session.get(key) || null,
      setItem: (key, value) => session.set(key, value),
      removeItem: key => session.delete(key),
    },
    ACTIVE_FORM_DRAFT_KEY: 'draft',
    liveMediaProgress: new Map(), liveListingProgress: new Map(), liveProgressPersistAt: new Map(),
    storeProfileThumbCache: new Map(), clearGuideSpotlight: () => {},
    rememberActiveRoute: () => {}, render: async () => {}, toast: () => {},
    alert: message => alerts.push(message), confirm: () => true,
  });
  vm.runInContext(`${connectionSettings}\nconst PENDING_STORE_DISCONNECT_KEY='pending-disconnect';let storeTransitionBusy=false;\n${disconnectStore}`, context);
  context.DriveSync = {
    suspendStoreWork: vm.runInContext('suspendStoreWork', context),
    restoreStoreWork: vm.runInContext('restoreStoreWork', context),
    clearCurrentStoreSettings: vm.runInContext('clearCurrentStoreSettings', context),
    rememberSavedStore: async entry => settings.set('savedStores', [entry]),
  };
  assert.equal(await context.disconnectActiveStore({confirmed: true}), true);
  const snapshotKey = 'lotkeysPendingStoreWorkV1:blair%40example.com:old-root';
  const snapshot = settings.get(snapshotKey);
  assert.deepEqual(Array.from(snapshot.vehicles, v => v.id), ['v2']);
  assert.deepEqual(Array.from(snapshot.listings, l => l.id), ['l2']);
  assert.equal(snapshot.vehicles[0].mediaUpload.status, 'paused');
  assert.equal(snapshot.requestQueue.length, 1);
  assert.equal(snapshot.analytics[0].points, 99);
  assert.equal(snapshot.listingDeletionTombstones.deleted, 123);
  assert.equal(settings.has('storeFolderId'), false);
  assert.equal(settings.get('currentAccountEmail'), 'blair@example.com');
  assert.equal(settings.get('personalTheme'), 'dark');
  assert.equal(settings.get('savedStores')[0].code, 'INF-SE034');
  assert.equal(session.has('pending-disconnect'), false);
  assert.deepEqual(collections.get('locations'), [{id: 'personal-location'}]);
  assert.deepEqual(collections.get('vehicles'), []);
  assert.deepEqual(collections.get('listings'), []);
  assert.ok(removed.includes('live-media'));
  assert.deepEqual(alerts, []);

  settings.set('storeFolderId', 'new-root');
  assert.equal((await context.DriveSync.restoreStoreWork()).count, 0);
  assert.deepEqual(collections.get('requestQueue'), []);
  settings.set('storeFolderId', 'old-root');
  assert.equal((await context.DriveSync.restoreStoreWork()).count, 3);
  assert.deepEqual(collections.get('vehicles').map(v => v.id), ['v2']);
  assert.deepEqual(collections.get('listings').map(l => l.id), ['l2']);
  assert.equal(settings.has(snapshotKey), false);

  // A reload after Store settings were cleared must finish the cache cleanup.
  settings.delete('storeFolderId');
  session.set('pending-disconnect', 'old-root');
  assert.equal(await context.disconnectActiveStore({confirmed: true, fromReload: true}), true);
  assert.deepEqual(collections.get('vehicles'), []);
  assert.equal(session.has('pending-disconnect'), false);
});

test('a background refresh checkpoints the disconnect and reloads before clearing local Store data', async () => {
  const session = new Map(), cleared = [], settings = new Map([['storeFolderId', 'old-root'], ['storeName', 'INFINITI']]);
  let reloaded = 0;
  const context = vm.createContext({
    setting: async (key, fallback) => settings.get(key) || fallback,
    vehicleSyncJobs: new Map(), listingSyncJobs: new Map(), contributionSyncJobs: new Map(),
    vehicleStateSyncJobs: new Map(), vehicleHydrationJobs: new Map(), listingCoverHydrationJobs: new Map(),
    inventoryRefreshBusy: true, listingsRefreshBusy: false, garageBackgroundRefreshBusy: false,
    foregroundResumeBusy: false, onlineBootBusy: false, priceAlertCheckBusy: false,
    listingVehicleRecoveryBusy: false,
    sessionStorage: {setItem: (key, value) => session.set(key, value)},
    location: {reload: () => reloaded++},
    DriveSync: {pauseActiveUploads: () => {}},
    rememberActiveRoute: () => {},
    DB: {clear: async name => cleared.push(name)},
    alert: () => assert.fail('A refresh should not block disconnect'),
  });
  vm.runInContext("const PENDING_STORE_DISCONNECT_KEY='pending-disconnect';let storeTransitionBusy=false;\n" + disconnectStore, context);
  assert.equal(await context.disconnectActiveStore({confirmed: true}), false);
  assert.equal(session.get('pending-disconnect'), 'old-root');
  assert.equal(reloaded, 1);
  assert.deepEqual(cleared, []);
  assert.match(html, /pendingDisconnectRoot===currentRoot\)await disconnectActiveStore\(\{confirmed:true,fromReload:true\}\)/);
});

test('an existing Store cannot be claimed as a new owner', () => {
  assert.match(html, /storeBootstrapPendingRootId[^\n]+root\.id&&root\.appProperties\?\.lotkeysRole==='storeRoot'&&root\.owners\?\.some/);
  assert.match(html, /previous\.storeFolderId\?\.value&&previous\.storeFolderId\.value!==found\.root\.id/);
});

test('focus and Garage respect the five-minute Inventory refresh interval', () => {
  const resume = sourceBetween('  async function resumeForegroundWork()', '  let baseReadySignaled=false;');
  assert.match(resume, /await refreshInventoryIfDue\(\)/);
  assert.doesNotMatch(resume, /await refreshInventory\(\{quiet:true\}\)/);
  const garage = sourceBetween('  async function refreshGarageDataInBackground(', '  async function showLocationForm(');
  assert.match(garage, /Date\.now\(\)-garageBackgroundRefreshAt<INVENTORY_AUTO_REFRESH_MS/);
  assert.match(garage, /lastInventoryRefreshAt/);
  assert.match(html, /else if\(inventoryRefreshBusy\|\|listingsRefreshBusy\)text='Refreshing…'/);
});
