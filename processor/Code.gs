/**
 * LotKeys Store Processor V0.9.4.64
 *
 * This script is installed once by an Admin Level 2 account. It is the trusted
 * writer between each user's private More request queue and the official,
 * Viewer-only Inventory. Never deploy it to execute as the visiting web user.
 */

const LOTKEYS_PROCESSOR_VERSION = '0.9.4.64';
const LOTKEYS_STORE_FOLDER_ID = '1vJRzFWTVtg9o1fRw5dUNsY2JNlIhOf-g';
const LK_FOLDER = 'application/vnd.google-apps.folder';
const LK_SHEET = 'application/vnd.google-apps.spreadsheet';
const LK_REQUEST_LIMIT = 100;

const LK_PROFILE_FIELDS = [
  'year', 'make', 'model', 'bodyStyle', 'exteriorColor', 'interiorColor',
  'vehicleCondition', 'transmission', 'fuelType', 'engineSize', 'horsepower',
  'price', 'odometer', 'odometerUnit', 'vin', 'stock', 'originalListingUrl',
  'carfaxUrl', 'carfaxOneOwner', 'carfaxLowKm', 'carfaxNoAccidents', 'description',
  'pendingDeal'
];
const LK_NUMERIC_FIELDS = {price: true, odometer: true};
const LK_BOOLEAN_FIELDS = {
  carfaxOneOwner: true,
  carfaxLowKm: true,
  carfaxNoAccidents: true,
  pendingDeal: true
};

/** Run this once after pasting the project files and enabling Drive API v3. */
function installLotKeysProcessor() {
  const state = lkLoadState_();
  lkAssertAdmin2_(state);
  repairLotKeysAccess();
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'processLotKeysRequests') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger('processLotKeysRequests').timeBased().everyMinutes(1).create();
  const result = processLotKeysRequests();
  PropertiesService.getScriptProperties().setProperties({
    lotkeysStoreFolderId: LOTKEYS_STORE_FOLDER_ID,
    lotkeysProcessorVersion: LOTKEYS_PROCESSOR_VERSION,
    lotkeysInstalledAt: new Date().toISOString()
  });
  return {
    installed: true,
    version: LOTKEYS_PROCESSOR_VERSION,
    storeFolderId: LOTKEYS_STORE_FOLDER_ID,
    firstRun: result
  };
}

/** Safe manual status check from the Apps Script editor. */
function getLotKeysProcessorStatus() {
  const state = lkLoadState_();
  lkAssertAdmin2_(state);
  const triggers = ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction() === 'processLotKeysRequests';
  });
  return {
    version: LOTKEYS_PROCESSOR_VERSION,
    storeFolderId: state.root.id,
    approvedUsers: state.users.length,
    triggerInstalled: triggers.length > 0,
    lastRunAt: PropertiesService.getScriptProperties().getProperty('lotkeysLastRunAt') || '',
    lastRunResult: lkJsonParse_(PropertiesService.getScriptProperties().getProperty('lotkeysLastRunResult'), null)
  };
}

/**
 * Applies least-privilege Drive access and provisions every approved account.
 * Regular and Trusted users are Store readers plus writers on only their own
 * Users/<name> workspace. Admin folders and user workspaces use limited access
 * when Google Drive exposes that capability.
 */
function repairLotKeysAccess() {
  const state = lkLoadState_();
  lkAssertAdmin_(state);

  const adminUsers = state.users.filter(function(user) {
    return lkActive_(user) && lkAdminLevel_(user) > 0 && lkEmail_(user);
  });
  const activeUsers = state.users.filter(lkActive_);
  const workspaceRows = [];

  activeUsers.forEach(function(user) {
    const userName = lkUserName_(user);
    const email = lkEmail_(user);
    if (!userName || !email) {
      throw new Error('Every Approved User needs a User Name and exact Google account email.');
    }
    const existingDrive = user.drive && typeof user.drive === 'object' ? user.drive : {};
    let userFolder = existingDrive.userFolderId ? lkTryGet_(existingDrive.userFolderId) : null;
    if (!userFolder) userFolder = lkFindFolder_(state.usersFolder.id, userName);
    if (!userFolder) {
      userFolder = lkCreateFolder_(state.usersFolder.id, userName, {
        lotkeysRole: 'userWorkspace',
        lotkeysUserName: userName
      });
    }
    const listings = lkEnsureFolder_(userFolder.id, 'Listings', {lotkeysRole: 'userListings', lotkeysUserName: userName});
    const listingAssets = lkEnsureFolder_(userFolder.id, 'Listing Assets', {lotkeysRole: 'userListingAssets', lotkeysUserName: userName});
    const more = lkEnsureFolder_(userFolder.id, 'More', {lotkeysRole: 'userMore', lotkeysUserName: userName});
    lkCleanupLegacyRequestArchives_(more);
    const messaging = lkEnsureFolder_(userFolder.id, 'Messaging', {lotkeysRole: 'userMessaging', lotkeysUserName: userName});
    const messageInbox = lkEnsureFolder_(messaging.id, 'Inbox', {lotkeysRole: 'messageInbox', lotkeysUserName: userName});
    const messageOutbox = lkEnsureFolder_(messaging.id, 'Outbox', {lotkeysRole: 'messageOutbox', lotkeysUserName: userName});

    user.drive = Object.assign({}, existingDrive, {
      userFolderId: userFolder.id,
      listingsFolderId: listings.id,
      listingAssetsFolderId: listingAssets.id,
      moreFolderId: more.id,
      messagingFolderId: messaging.id,
      messageInboxFolderId: messageInbox.id,
      messageOutboxFolderId: messageOutbox.id
    });
    lkSetUserPermission_(userFolder.id, email, 'writer');
    adminUsers.forEach(function(admin) {
      lkSetUserPermission_(userFolder.id, lkEmail_(admin), state.sharedDrive ? 'fileOrganizer' : 'writer');
    });
    const limited = lkTryLimitedAccess_(userFolder.id);
    workspaceRows.push({userName: userName, folderId: userFolder.id, limitedAccess: limited});
  });

  state.users.forEach(function(user) {
    const email = lkEmail_(user);
    if (!email) return;
    if (!lkActive_(user)) {
      lkRemoveDirectPermission_(state.root.id, email);
      lkRemoveDirectPermission_(state.inventoryFolder.id, email);
      lkRemoveDirectPermission_(state.adminFolder.id, email);
      const disabledDrive = user.drive && typeof user.drive === 'object' ? user.drive : {};
      if (disabledDrive.userFolderId) lkRemoveDirectPermission_(disabledDrive.userFolderId, email);
      return;
    }
    const isAdmin = lkAdminLevel_(user) > 0;
    const managerRole = state.sharedDrive ? 'fileOrganizer' : 'writer';
    lkSetUserPermission_(state.root.id, email, isAdmin ? managerRole : 'reader');
    lkSetUserPermission_(state.inventoryFolder.id, email, isAdmin ? managerRole : 'reader');
    if (isAdmin) lkSetUserPermission_(state.adminFolder.id, email, managerRole);
    else lkRemoveDirectPermission_(state.adminFolder.id, email);
  });

  const protectedStoreRoot = lkTryLimitedAccess_(state.root.id);
  const protectedInventory = lkTryLimitedAccess_(state.inventoryFolder.id);
  const protectedAdministration = lkTryLimitedAccess_(state.adminFolder.id);
  lkHardenVehiclePermissions_(state, adminUsers);
  lkRefreshPublicProfiles_(state, true);
  lkPersistUserRegistry_(state);
  return {
    repaired: true,
    approvedUsers: state.users.length,
    workspaces: workspaceRows,
    protectedStoreRoot: protectedStoreRoot,
    protectedInventory: protectedInventory,
    protectedAdministration: protectedAdministration,
    inventoryRoleForRegularUsers: 'reader'
  };
}

/** Trigger entry point. */
function processLotKeysRequests() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return {skipped: true, reason: 'Another processor run is active.'};
  const result = {processed: 0, approved: 0, indexed: 0, rejected: 0, messagesDelivered: 0, errors: 0, startedAt: new Date().toISOString()};
  try {
    const state = lkLoadState_();
    if (lkRefreshPublicProfiles_(state)) lkPersistUserRegistry_(state);
    let remaining = LK_REQUEST_LIMIT;
    const messageResult = lkProcessMessageOutboxes_(state, remaining);
    result.messagesDelivered = messageResult.delivered;
    result.errors += messageResult.errors;
    remaining = Math.max(0, remaining - messageResult.processed);
    state.users.filter(lkActive_).forEach(function(actor) {
      if (remaining <= 0) return;
      const drive = actor.drive && typeof actor.drive === 'object' ? actor.drive : {};
      let more = drive.moreFolderId ? lkTryGet_(drive.moreFolderId) : null;
      if (!more && drive.userFolderId) more = lkFindFolder_(drive.userFolderId, 'More');
      if (!more) return;
      const vehicleFolders = lkListChildren_(more.id, "mimeType = '" + LK_FOLDER + "'");
      vehicleFolders.forEach(function(moreVehicle) {
        if (remaining <= 0) return;
        const context = lkMoreContext_(moreVehicle);
        if (!context.pendingFolder) return;
        const files = lkListChildren_(context.pendingFolder.id, "mimeType != '" + LK_FOLDER + "'")
          .filter(function(file) { return /\.json$/i.test(file.name || ''); });
        files.forEach(function(file) {
          if (remaining <= 0) return;
          remaining -= 1;
          result.processed += 1;
          try {
            const request = lkReadJsonFile_(file.id);
            if (!request || String(request.status || 'pending') !== 'pending') return;
            request.driveRequestFileId = file.id;
            request.userName = lkUserName_(actor);
            request.userEmail = lkEmail_(actor);
            request.userGoogleSub = String(actor.googleSub || '');
            request.userDisplayName = String(actor.profileDisplayName || actor.userName || 'User');
            request.trustedUser = !!(actor.permissions && actor.permissions.trustedUser === true);
            request.folders = lkRequestFolders_(context);
            const disposition = lkProcessRequest_(state, actor, request, file, context);
            if (disposition === 'approved') result.approved += 1;
            else if (disposition === 'indexed') result.indexed += 1;
            else if (disposition === 'rejected') result.rejected += 1;
          } catch (error) {
            result.errors += 1;
            lkRecordRequestError_(file, error);
          }
        });
      });
    });
    if (state.userRegistryDirty) lkPersistUserRegistry_(state);
    result.finishedAt = new Date().toISOString();
    PropertiesService.getScriptProperties().setProperties({
      lotkeysLastRunAt: result.finishedAt,
      lotkeysLastRunResult: JSON.stringify(result)
    });
    return result;
  } finally {
    lock.releaseLock();
  }
}

function lkProcessRequest_(state, actor, request, file, context) {
  const type = String(request.type || '');
  if (type === 'vehicle-create') return lkProcessVehicleCreate_(state, actor, request, file, context);
  if (type === 'vehicle-owner-update') return lkProcessOwnerUpdate_(state, actor, request, file, context);
  if (type === 'vehicle-contribution') return lkProcessContribution_(state, actor, request, file, context);
  if (type === 'vehicle-state') return lkProcessVehicleState_(state, actor, request, file, context);
  return lkRejectRequest_(request, file, context, 'Unsupported request type.');
}

function lkAwardContribution_(state, actor, points, key, reason, awardedAt) {
  if (!actor || !key || !points) return false;
  const current = actor.contributions && typeof actor.contributions === 'object' ? actor.contributions : {};
  const awards = Array.isArray(current.awards) ? current.awards.slice() : [];
  if (awards.some(function(award) { return String(award && award.key || '') === String(key); })) return false;
  awards.push({key: String(key), points: Number(points), reason: String(reason || ''), awardedAt: String(awardedAt || new Date().toISOString())});
  actor.contributions = {points: Math.max(0, (Number(current.points) || 0) + Number(points)), awards: awards};
  state.userRegistryDirty = true;
  return true;
}

function lkProcessVehicleCreate_(state, actor, request, file, context) {
  const proposed = request.vehicle && typeof request.vehicle === 'object' ? request.vehicle : null;
  if (!proposed) return lkRejectRequest_(request, file, context, 'Vehicle snapshot is missing.');
  const vehicleId = String(request.vehicleId || proposed.id || '').trim();
  if (!vehicleId) return lkRejectRequest_(request, file, context, 'Vehicle Profile ID is missing.');
  if (!/^[A-Za-z0-9._:-]{1,160}$/.test(vehicleId)) return lkRejectRequest_(request, file, context, 'Vehicle Profile ID is invalid.');

  let existing = lkFindVehicle_(state, vehicleId);
  if (existing) {
    if (!lkIsCreator_(existing, actor)) {
      return lkRejectRequest_(request, file, context, 'This Vehicle Profile ID already belongs to another creator.');
    }
    request.type = 'vehicle-owner-update';
    return lkProcessOwnerUpdate_(state, actor, request, file, context, existing);
  }

  const duplicate = lkFindDuplicateVehicle_(state, proposed, vehicleId);
  if (duplicate) {
    request.existingVehicleId = duplicate.id;
    return lkRejectRequest_(request, file, context, 'A Vehicle Profile already exists for this VIN or Stock Number. Open that profile and use Contribute / Suggest Update.');
  }

  const vehicle = lkCleanVehicleSnapshot_(proposed);
  vehicle.id = vehicleId;
  vehicle.createdByUserName = lkUserName_(actor);
  vehicle.createdByEmail = lkEmail_(actor);
  vehicle.createdByGoogleSub = String(actor.googleSub || '');
  vehicle.createdAt = Number(vehicle.createdAt) || Date.now();
  vehicle.pendingDealRequests = [];
  vehicle.deletionRequests = [];
  vehicle.priceChangeRequests = [];
  vehicle.priceChangeAwards = [];
  vehicle.contributionRequests = [];
  vehicle.name = lkVehicleName_(vehicle);
  vehicle.drive = {};
  lkEnsureOfficialStructure_(state, vehicle);
  lkReconcileOwnerMedia_(vehicle, request, context, true);
  lkWriteVehicle_(state, vehicle);
  return lkApproveRequest_(request, file, context, 'Creator-owned Vehicle Profile added to Inventory.');
}

function lkProcessOwnerUpdate_(state, actor, request, file, context, loadedVehicle) {
  const vehicle = loadedVehicle || lkFindVehicle_(state, String(request.vehicleId || ''));
  if (!vehicle) return lkRejectRequest_(request, file, context, 'The official Vehicle Profile was not found.');
  if (!lkIsCreator_(vehicle, actor)) {
    return lkRejectRequest_(request, file, context, 'Only the profile creator or Administration can directly replace this Vehicle Profile.');
  }
  const proposed = request.vehicle && typeof request.vehicle === 'object' ? request.vehicle : null;
  if (!proposed) return lkRejectRequest_(request, file, context, 'Vehicle snapshot is missing.');
  const cleaned = lkCleanVehicleSnapshot_(proposed);
  LK_PROFILE_FIELDS.forEach(function(field) { vehicle[field] = cleaned[field]; });
  vehicle.pendingDeal = !!cleaned.pendingDeal;
  vehicle.pendingDealUpdatedAt = String(cleaned.pendingDealUpdatedAt || vehicle.pendingDealUpdatedAt || '');
  vehicle.pendingDealUpdatedByUserName = String(cleaned.pendingDealUpdatedByUserName || lkUserName_(actor));
  vehicle.name = lkVehicleName_(vehicle);
  lkAssertUniqueVehicle_(state, vehicle);
  lkEnsureOfficialStructure_(state, vehicle);
  lkReconcileOwnerMedia_(vehicle, request, context, false);
  lkWriteVehicle_(state, vehicle);
  return lkApproveRequest_(request, file, context, 'Creator-owned Vehicle Profile updated.');
}

function lkProcessContribution_(state, actor, request, file, context) {
  const vehicle = lkFindVehicle_(state, String(request.vehicleId || ''));
  if (!vehicle) return lkRejectRequest_(request, file, context, 'The official Vehicle Profile was not found.');
  const media = lkSanitizeRequestMedia_(request.media, context);
  const changes = lkSanitizeChanges_(request.changes, vehicle);
  const trusted = !!(actor.permissions && actor.permissions.trustedUser === true);
  request.media = media;
  request.changes = changes;
  request.trustedUser = trusted;
  request.status = 'pending';

  if (trusted && Object.keys(changes).length) {
    lkApplyChanges_(vehicle, changes);
    lkAssertUniqueVehicle_(state, vehicle);
    Object.keys(changes).forEach(function(field) {
      lkAwardContribution_(state, actor, 1, 'contribution:' + String(request.id || file.id) + ':field:' + field, 'Automatically approved ' + field + ' correction', request.createdAt);
    });
    request.autoAppliedChanges = changes;
    request.changes = {};
    request.informationAppliedAt = new Date().toISOString();
    request.informationAppliedBy = 'LotKeys Store Processor';
    lkWriteVehicle_(state, vehicle);
  }

  const hasMedia = ['photos', 'videos', 'documents'].some(function(key) {
    return request.media[key] && request.media[key].length > 0;
  });
  const hasChanges = Object.keys(request.changes || {}).length > 0;
  if (!hasMedia && !hasChanges) {
    return lkApproveRequest_(request, file, context, trusted ? 'Trusted information changes applied.' : 'No remaining approval items.');
  }

  vehicle.contributionRequests = Array.isArray(vehicle.contributionRequests) ? vehicle.contributionRequests : [];
  vehicle.contributionRequests = vehicle.contributionRequests.filter(function(row) {
    return String(row.id || '') !== String(request.id || '');
  });
  request.processorIndexedAt = new Date().toISOString();
  vehicle.contributionRequests.push(lkContributionForSheet_(request));
  lkWriteVehicle_(state, vehicle);
  lkWriteJsonFile_(file.id, request, file.name);
  return 'indexed';
}

function lkProcessVehicleState_(state, actor, request, file, context) {
  const vehicle = lkFindVehicle_(state, String(request.vehicleId || ''));
  if (!vehicle) {
    if (request.processorIndexedAt && request.indexedDeletionRequestIds && request.indexedDeletionRequestIds.length) {
      return lkApproveRequest_(request, file, context, 'The requested Vehicle Profile has been removed by Administration.');
    }
    return lkRejectRequest_(request, file, context, 'The official Vehicle Profile was not found.');
  }
  const payload = request.state && typeof request.state === 'object' ? request.state : {};
  const trusted = !!(actor.permissions && actor.permissions.trustedUser === true);
  const creator = lkIsCreator_(vehicle, actor);
  const canAuto = trusted || creator;
  let automaticChange = false;

  if (canAuto && Object.prototype.hasOwnProperty.call(payload, 'pendingDeal')) {
    vehicle.pendingDeal = !!payload.pendingDeal;
    vehicle.pendingDealUpdatedAt = new Date().toISOString();
    vehicle.pendingDealUpdatedByUserName = lkUserName_(actor);
    automaticChange = true;
  }

  const officialPriceIds = {};
  (vehicle.priceChangeRequests || []).forEach(function(row) { officialPriceIds[String(row.id || '')] = true; });
  const submittedPrices = (Array.isArray(payload.priceChangeRequests) ? payload.priceChangeRequests : []).filter(function(row) {
    return row && row.id && !officialPriceIds[String(row.id)];
  });
  if (canAuto && submittedPrices.length) {
    const newest = submittedPrices[submittedPrices.length - 1];
    const price = Number(newest.detectedPrice);
    if (Number.isFinite(price) && price >= 0) {
      vehicle.price = price;
      automaticChange = true;
    }
  } else if (creator && Object.prototype.hasOwnProperty.call(payload, 'price')) {
    const ownerPrice = payload.price === '' ? '' : Number(payload.price);
    if (ownerPrice === '' || (Number.isFinite(ownerPrice) && ownerPrice >= 0)) {
      vehicle.price = ownerPrice;
      automaticChange = true;
    }
  }

  const pendingIds = (request.indexedPendingDealRequestIds || []).concat(lkMergePendingDealRequests_(vehicle, payload.pendingDealRequests, actor, canAuto));
  const deletionIds = (request.indexedDeletionRequestIds || []).concat(lkMergeDeletionRequests_(vehicle, payload.deletionRequests, actor));
  const priceIds = (request.indexedPriceRequestIds || []).concat(canAuto ? [] : lkMergePriceRequests_(vehicle, payload.priceChangeRequests, actor));
  request.indexedPendingDealRequestIds = pendingIds;
  request.indexedDeletionRequestIds = deletionIds;
  request.indexedPriceRequestIds = priceIds;
  request.processorIndexedAt = request.processorIndexedAt || new Date().toISOString();

  if (payload.websitePriceFinding && canAuto) vehicle.websitePriceFinding = payload.websitePriceFinding;
  lkWriteVehicle_(state, vehicle);

  const refs = pendingIds.concat(deletionIds, priceIds);
  if (!refs.length) {
    return lkApproveRequest_(request, file, context, automaticChange ? 'Authorized Vehicle Profile state applied.' : 'No pending approval items.');
  }
  if (lkStateRefsResolved_(vehicle, request)) {
    lkClearResolvedStateRefs_(vehicle, request);
    lkWriteVehicle_(state, vehicle);
    return lkApproveRequest_(request, file, context, 'Administration completed the indexed request.');
  }
  lkWriteJsonFile_(file.id, request, file.name);
  return 'indexed';
}

function lkLoadState_() {
  if (!LOTKEYS_STORE_FOLDER_ID || LOTKEYS_STORE_FOLDER_ID.indexOf('PASTE_') === 0) {
    throw new Error('Set LOTKEYS_STORE_FOLDER_ID at the top of Code.gs first.');
  }
  const root = lkGet_(LOTKEYS_STORE_FOLDER_ID);
  if (root.mimeType !== LK_FOLDER) throw new Error('LOTKEYS_STORE_FOLDER_ID is not a Google Drive folder.');
  const usersFolder = lkEnsureFolder_(root.id, 'Users', {lotkeysRole: 'users'});
  const adminFolder = lkEnsureFolder_(root.id, 'Administration', {lotkeysRole: 'administration'});
  const inventoryFolder = lkEnsureFolder_(root.id, 'Inventory', {lotkeysRole: 'inventory'});
  const rootAccessFile = lkFindFile_(root.id, 'Store Access.json');
  const configFile = lkFindFile_(adminFolder.id, 'LotKeys.json') || lkFindFile_(adminFolder.id, 'LotKeys Store Config.json');
  const approvedFile = lkFindFile_(adminFolder.id, 'Approved Users.json');
  const rootAccess = rootAccessFile ? lkReadJsonFile_(rootAccessFile.id) : {};
  const config = configFile ? lkReadJsonFile_(configFile.id) : {};
  const approved = approvedFile ? lkReadJsonFile_(approvedFile.id) : {};
  const rawUsers = Array.isArray(approved.users) && approved.users.length ? approved.users :
    (Array.isArray(config.users) && config.users.length ? config.users : (Array.isArray(rootAccess.accessUsers) ? rootAccess.accessUsers : []));
  const users = lkNormalizeUsers_(rawUsers);
  const registeredPublicUsers = Array.isArray(rootAccess.publicUsers) ? rootAccess.publicUsers : [];
  users.forEach(function(user) {
    const publicUser = registeredPublicUsers.find(function(row) {
      return String(row && row.userName || '').toLowerCase() === String(user.userName || '').toLowerCase();
    });
    if (publicUser) lkMergePublicProfile_(user, publicUser, true);
  });
  lkRestoreLatestPlacements_(users, rootAccess, config);
  if (!users.length) throw new Error('No Approved Users were found. Add the Admin Level 2 account in LotKeys first.');
  return {
    root: root,
    usersFolder: usersFolder,
    adminFolder: adminFolder,
    inventoryFolder: inventoryFolder,
    rootAccessFile: rootAccessFile,
    configFile: configFile,
    approvedFile: approvedFile,
    rootAccess: rootAccess,
    config: config,
    approved: approved,
    users: users,
    sharedDrive: !!root.driveId
  };
}

function lkAssertAdmin_(state) {
  const email = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
  const match = state.users.find(function(user) { return lkEmail_(user) === email; });
  if (!match || lkAdminLevel_(match) < 1 || !lkActive_(match)) {
    throw new Error('Run this project from an active LotKeys Administrator Google account.');
  }
  return match;
}

function lkAssertAdmin2_(state) {
  const user = lkAssertAdmin_(state);
  if (lkAdminLevel_(user) < 2) throw new Error('Admin Level 2 is required to install or inspect the Store Processor.');
  return user;
}

function lkPersistUserRegistry_(state) {
  const now = new Date().toISOString();
  const approved = {
    schemaVersion: 1,
    app: 'LotKeys',
    recordType: 'approvedUsers',
    users: state.users,
    processorVersion: LOTKEYS_PROCESSOR_VERSION,
    updatedAt: now
  };
  state.approvedFile = lkUpsertJson_(state.approvedFile, state.adminFolder.id, 'Approved Users.json', approved, {lotkeysRole: 'approvedUsers'});

  state.config.users = state.users;
  state.config.processor = Object.assign({}, state.config.processor || {}, {
    version: LOTKEYS_PROCESSOR_VERSION,
    installed: true,
    updatedAt: now
  });
  state.config.updatedAt = now;
  state.configFile = lkUpsertJson_(state.configFile, state.adminFolder.id, 'LotKeys.json', state.config, {lotkeysRole: 'storeConfig'});

  const publicUsers = state.users.map(lkPublicUser_);
  state.rootAccess = Object.assign({}, state.rootAccess, {
    schemaVersion: 9,
    app: 'LotKeys',
    recordType: 'storeAccess',
    storeFolderId: state.root.id,
    accessUsers: state.users.map(function(user) {
      return {
        userName: user.userName,
        email: lkEmail_(user),
        googleSub: String(user.googleSub || ''),
        profileDisplayName: String(user.profileDisplayName || user.userName || ''),
        adminLevel: lkAdminLevel_(user),
        role: lkAdminLevel_(user) > 0 ? 'admin' : 'user',
        status: user.status || 'active',
        permissions: lkPermissions_(user.permissions),
        drive: user.drive || {}
      };
    }),
    publicUsers: publicUsers,
    processor: {version: LOTKEYS_PROCESSOR_VERSION, installed: true},
    updatedAt: now
  });
  state.rootAccessFile = lkUpsertJson_(state.rootAccessFile, state.root.id, 'Store Access.json', state.rootAccess, {lotkeysRole: 'storeAccess'});
}

function lkPublicUser_(user) {
  return {
    userName: String(user.userName || ''),
    profileDisplayName: String(user.profileDisplayName || user.userName || ''),
    phoneNumber: String(user.phoneNumber || ''),
    profilePhotoFileId: String(user.profilePhotoFileId || ''),
    profileUpdatedAt: String(user.profileUpdatedAt || ''),
    tagline: String(user.tagline || ''),
    favoriteBadge: String(user.favoriteBadge || ''),
    primaryAwardId: String(user.primaryAwardId || ''),
    displayAwardIds: Array.isArray(user.displayAwardIds) ? user.displayAwardIds : [],
    lotLevel: Math.max(1, Number(user.lotLevel) || 1),
    confirmedFacebookPosts: Math.max(0, Number(user.confirmedFacebookPosts) || 0),
    unlockedBadges: Array.isArray(user.unlockedBadges) ? user.unlockedBadges : [],
    awards: Array.isArray(user.awards) ? user.awards : [],
    facebookSaleHistory: Array.isArray(user.facebookSaleHistory) ? user.facebookSaleHistory : [],
    profileTheme: String(user.profileTheme || 'system'),
    profileAccent: String(user.profileAccent || '#2563eb'),
    monthlyPlacement: user.monthlyPlacement || null,
    monthlyPlacementMonth: String(user.monthlyPlacementMonth || ''),
    celebrationSoundFileId: String(user.celebrationSoundFileId || ''),
    celebrationSoundName: String(user.celebrationSoundName || ''),
    celebrationSoundMimeType: String(user.celebrationSoundMimeType || ''),
    celebrationSoundDuration: Number(user.celebrationSoundDuration) || 0,
    celebrationSoundUpdatedAt: String(user.celebrationSoundUpdatedAt || ''),
    messaging: user.messaging && typeof user.messaging === 'object' ? user.messaging : null,
    contributions: {
      points: Number(user.contributions && user.contributions.points) || 0,
      awards: (Array.isArray(user.contributions && user.contributions.awards) ? user.contributions.awards : []).map(function(award) {
        return {key: String(award && award.key || ''), points: Number(award && award.points) || 0, reason: String(award && award.reason || ''), awardedAt: String(award && award.awardedAt || '')};
      }).filter(function(award) { return !!award.key; })
    },
    status: lkActive_(user) ? 'active' : 'disabled'
  };
}

function lkRestoreLatestPlacements_(users, rootAccess, config) {
  const histories = [];
  const add = function(rows) { if (Array.isArray(rows)) Array.prototype.push.apply(histories, rows); };
  add(rootAccess && rootAccess.topContributors && rootAccess.topContributors.history);
  add(config && config.topContributors && config.topContributors.history);
  add(config && config.monthlyContributionHistory);
  const latest = histories.filter(function(row) { return row && Array.isArray(row.standings); }).sort(function(a, b) {
    return String(b.monthKey || b.wrappedAt || '').localeCompare(String(a.monthKey || a.wrappedAt || ''));
  })[0];
  if (!latest) return users;
  const monthKey = String(latest.monthKey || '');
  users.forEach(function(user) {
    const standing = latest.standings.find(function(row) {
      return String(row && row.userName || '').toLowerCase() === String(user.userName || '').toLowerCase();
    });
    if (!standing) return;
    const placement = Number(standing.placement) || null;
    if (!user.monthlyPlacementMonth || String(user.monthlyPlacementMonth) <= monthKey) {
      user.monthlyPlacement = placement;
      user.monthlyPlacementMonth = monthKey;
    }
  });
  return users;
}

function lkMergePublicProfile_(user, profile, includeProtected) {
  if (!profile || typeof profile !== 'object') return user;
  const copy = function(key, value) { if (value !== undefined && value !== null) user[key] = value; };
  copy('profileDisplayName', profile.profileDisplayName !== undefined ? profile.profileDisplayName : profile.displayName);
  copy('phoneNumber', profile.phoneNumber);
  copy('profilePhotoFileId', profile.profilePhotoFileId);
  copy('profileUpdatedAt', profile.profileUpdatedAt !== undefined ? profile.profileUpdatedAt : profile.updatedAt);
  copy('tagline', profile.tagline);
  copy('favoriteBadge', profile.favoriteBadge);
  copy('primaryAwardId', profile.primaryAwardId);
  copy('displayAwardIds', Array.isArray(profile.displayAwardIds) ? profile.displayAwardIds : undefined);
  copy('profileTheme', profile.profileTheme !== undefined ? profile.profileTheme : profile.appearance && profile.appearance.theme);
  copy('profileAccent', profile.profileAccent !== undefined ? profile.profileAccent : profile.appearance && profile.appearance.accent);
  copy('messaging', profile.messaging && typeof profile.messaging === 'object' ? profile.messaging : undefined);
  if (includeProtected) {
    copy('lotLevel', profile.lotLevel);
    copy('confirmedFacebookPosts', profile.confirmedFacebookPosts);
    copy('unlockedBadges', Array.isArray(profile.unlockedBadges) ? profile.unlockedBadges : undefined);
    copy('awards', Array.isArray(profile.awards) ? profile.awards : undefined);
    copy('facebookSaleHistory', Array.isArray(profile.facebookSaleHistory) ? profile.facebookSaleHistory : undefined);
    copy('contributions', profile.contributions && typeof profile.contributions === 'object' ? profile.contributions : undefined);
    copy('monthlyPlacement', profile.monthlyPlacement);
    copy('monthlyPlacementMonth', profile.monthlyPlacementMonth);
    copy('celebrationSoundFileId', profile.celebrationSoundFileId);
    copy('celebrationSoundName', profile.celebrationSoundName);
    copy('celebrationSoundMimeType', profile.celebrationSoundMimeType);
    copy('celebrationSoundDuration', profile.celebrationSoundDuration);
    copy('celebrationSoundUpdatedAt', profile.celebrationSoundUpdatedAt);
  }
  return user;
}

function lkRefreshPublicProfiles_(state, forcePhotoAccess) {
  let changed = false;
  const activeEmails = state.users.filter(lkActive_).map(lkEmail_).filter(Boolean);
  state.users.forEach(function(user) {
    const drive = user.drive && typeof user.drive === 'object' ? user.drive : {};
    let userFolder = drive.userFolderId ? lkTryGet_(drive.userFolderId) : null;
    if (!userFolder) userFolder = lkFindFolder_(state.usersFolder.id, lkUserName_(user));
    if (!userFolder) return;
    const file = lkFindFile_(userFolder.id, 'PublicProfile.json');
    const thumbnail = lkFindFile_(userFolder.id, 'Profile Thumbnail.jpg');
    if (!file && !thumbnail) return;
    try {
      const profile = file ? lkReadJsonFile_(file.id) : {};
      const publishedAt = Date.parse(profile.profileUpdatedAt || profile.updatedAt || '') || 0;
      const thumbnailAt = Date.parse(thumbnail && thumbnail.modifiedTime || '') || 0;
      if (thumbnail && !String(profile.profilePhotoFileId || '') && (!Object.prototype.hasOwnProperty.call(profile, 'profilePhotoFileId') || thumbnailAt >= publishedAt)) {
        profile.profilePhotoFileId = thumbnail.id;
        profile.profileUpdatedAt = thumbnail.modifiedTime || profile.updatedAt || new Date().toISOString();
      }
      const before = JSON.stringify(lkPublicUser_(user));
      const previousPhotoId = String(user.profilePhotoFileId || '');
      const previousUpdatedAt = String(user.profileUpdatedAt || '');
      lkMergePublicProfile_(user, profile, false);
      const photoId = String(user.profilePhotoFileId || '');
      if (photoId && (forcePhotoAccess || photoId !== previousPhotoId || String(user.profileUpdatedAt || '') !== previousUpdatedAt)) {
        activeEmails.forEach(function(email) {
          try { lkSetUserPermission_(photoId, email, 'reader'); }
          catch (permissionError) { console.warn('Profile photo sharing deferred for ' + email + ': ' + String(permissionError && permissionError.message || permissionError)); }
        });
      }
      if (before !== JSON.stringify(lkPublicUser_(user))) changed = true;
    } catch (error) {
      console.warn('Public profile refresh deferred for ' + lkUserName_(user) + ': ' + String(error && error.message || error));
    }
  });
  return changed;
}

function lkHardenVehiclePermissions_(state, admins) {
  const profiles = lkListChildren_(state.inventoryFolder.id, "mimeType = '" + LK_FOLDER + "'");
  const nonAdmins = state.users.filter(function(user) { return lkAdminLevel_(user) === 0 && lkEmail_(user); });
  profiles.forEach(function(profile) {
    nonAdmins.forEach(function(user) { lkSetUserPermission_(profile.id, lkEmail_(user), 'reader'); });
    admins.forEach(function(user) { lkSetUserPermission_(profile.id, lkEmail_(user), state.sharedDrive ? 'fileOrganizer' : 'writer'); });
  });
}

function lkMessagingWorkspace_(state, user) {
  const drive = user.drive && typeof user.drive === 'object' ? user.drive : {};
  let userFolder = drive.userFolderId ? lkTryGet_(drive.userFolderId) : null;
  if (!userFolder) userFolder = lkFindFolder_(state.usersFolder.id, lkUserName_(user));
  if (!userFolder) return null;
  const root = lkEnsureFolder_(userFolder.id, 'Messaging', {lotkeysRole: 'userMessaging', lotkeysUserName: lkUserName_(user)});
  const inbox = lkEnsureFolder_(root.id, 'Inbox', {lotkeysRole: 'messageInbox', lotkeysUserName: lkUserName_(user)});
  const outbox = lkEnsureFolder_(root.id, 'Outbox', {lotkeysRole: 'messageOutbox', lotkeysUserName: lkUserName_(user)});
  user.drive = Object.assign({}, drive, {
    userFolderId: userFolder.id,
    messagingFolderId: root.id,
    messageInboxFolderId: inbox.id,
    messageOutboxFolderId: outbox.id
  });
  return {root: root, inbox: inbox, outbox: outbox};
}

function lkProcessMessageOutboxes_(state, limit) {
  const result = {processed: 0, delivered: 0, errors: 0};
  const active = state.users.filter(lkActive_);
  const mailboxes = {};
  active.forEach(function(user) {
    const address = String(user.messaging && user.messaging.address || '');
    const workspace = lkMessagingWorkspace_(state, user);
    if (!address || !workspace) return;
    const delivered = {};
    const inboxFiles = lkListChildren_(workspace.inbox.id, "mimeType != '" + LK_FOLDER + "'").filter(function(file) {
      return lkMessageMetadata_(file).lotkeysRole === 'messageEnvelope';
    });
    inboxFiles.forEach(function(file) {
      const metadata = lkMessageMetadata_(file);
      const fromAddress = String(metadata.verifiedFromAddress || metadata.fromAddress || '');
      const messageId = String(metadata.messageId || metadata.relaySourceFileId || file.id || '');
      const key = fromAddress && messageId ? fromAddress + '|' + messageId : '';
      if (!key) return;
      if (delivered[key]) lkTrash_(file.id);
      else delivered[key] = file.id;
    });
    mailboxes[address] = {user: user, workspace: workspace, delivered: delivered};
  });
  active.forEach(function(actor) {
    if (result.processed >= limit) return;
    const senderAddress = String(actor.messaging && actor.messaging.address || '');
    const senderBox = senderAddress && mailboxes[senderAddress] ? mailboxes[senderAddress].workspace : null;
    if (!senderBox) return;
    const files = lkOutboxEnvelopeFiles_(senderBox.outbox.id);
    files.forEach(function(file) {
      if (result.processed >= limit) return;
      try {
        const metadata = lkMessageMetadata_(file);
        const metadataTo = String(metadata.toAddress || '');
        const metadataFrom = String(metadata.fromAddress || '');
        const metadataMessageId = String(metadata.messageId || file.id || '');
        const knownRecipient = metadataTo ? mailboxes[metadataTo] : null;
        const knownDeliveryKey = senderAddress + '|' + metadataMessageId;
        // Delivered source envelopes intentionally remain in their sender-owned
        // Outbox/live lane. Skip them from Drive metadata alone so the fallback
        // processor does not repeatedly download and parse an old backlog.
        if (knownRecipient && metadataFrom === senderAddress && knownRecipient.delivered[knownDeliveryKey]) return;
        const envelope = lkReadJsonFile_(file.id);
        const toAddress = String(envelope && envelope.toAddress || metadata.toAddress || '');
        const claimedFrom = String(envelope && envelope.fromAddress || metadata.fromAddress || '');
        if (!toAddress || !senderAddress || claimedFrom !== senderAddress) {
          console.warn('Ignored an invalid message envelope owned by ' + (lkUserName_(actor) || senderAddress));
          return;
        }
        const recipient = mailboxes[toAddress];
        if (!recipient) return;
        const messageId = metadataMessageId;
        const deliveryKey = senderAddress + '|' + messageId;
        if (recipient.delivered[deliveryKey]) return;
        result.processed += 1;
        const appProperties = Object.assign({}, file.appProperties || {}, {
          lotkeysRole: 'messageEnvelope',
          toAddress: toAddress,
          fromAddress: senderAddress,
          verifiedFromAddress: senderAddress,
          relaySourceFileId: file.id,
          messageId: messageId
        });
        Drive.Files.copy({
          name: file.name,
          parents: [recipient.workspace.inbox.id],
          appProperties: appProperties,
          properties: Object.assign({}, file.properties || {}, {lotkeysRole: 'messageEnvelope', verifiedFromAddress: senderAddress, relaySourceFileId: file.id, messageId: messageId})
        }, file.id, {supportsAllDrives: true, fields: 'id,name,parents,appProperties,properties'});
        recipient.delivered[deliveryKey] = file.id;
        result.delivered += 1;
      } catch (error) {
        result.errors += 1;
        console.warn('Message delivery deferred: ' + String(error && error.message || error));
      }
    });
  });
  return result;
}

function lkMessageMetadata_(file) {
  return Object.assign({}, file && file.properties || {}, file && file.appProperties || {});
}

function lkOutboxEnvelopeFiles_(outboxId) {
  const children = lkListChildren_(outboxId, '');
  let files = children.filter(function(file) {
    return file.mimeType !== LK_FOLDER && lkMessageMetadata_(file).lotkeysRole === 'messageEnvelope';
  });
  children.filter(function(file) {
    return file.mimeType === LK_FOLDER && lkMessageMetadata_(file).lotkeysRole === 'messageLiveLane';
  }).forEach(function(lane) {
    files = files.concat(lkListChildren_(lane.id, "mimeType != '" + LK_FOLDER + "'").filter(function(file) {
      return lkMessageMetadata_(file).lotkeysRole === 'messageEnvelope';
    }));
  });
  return files;
}

function lkFindVehicle_(state, vehicleId) {
  vehicleId = String(vehicleId || '');
  if (!vehicleId) return null;
  const index = lkReadInventoryIndex_(state);
  const entry = index.vehicles.find(function(row) { return String(row.id || '') === vehicleId; });
  let profile = entry && entry.drive && entry.drive.profileFolderId ? lkTryGet_(entry.drive.profileFolderId) : null;
  const profiles = lkListChildren_(state.inventoryFolder.id, "mimeType = '" + LK_FOLDER + "'");
  if (!profile) {
    profile = profiles.find(function(folder) {
      const publicProperties = folder.properties || {};
      const privateProperties = folder.appProperties || {};
      return String(publicProperties.lotkeysVehicleId || privateProperties.lotkeysVehicleId || '') === vehicleId;
    }) || null;
  }
  if (profile) return lkReadVehicle_(profile, entry || {});

  // Older LotKeys website builds stored the Vehicle Profile ID in appProperties
  // or only inside the administrative sheet. Fall back to the sheet once, then
  // repair both metadata styles and the Inventory Index so future requests use
  // the fast path above.
  for (let i = 0; i < profiles.length; i += 1) {
    const candidate = lkReadVehicle_(profiles[i], {});
    if (String(candidate.id || '') !== vehicleId) continue;
    const metadata = {lotkeysRole: 'vehicleProfile', lotkeysVehicleId: vehicleId};
    try { lkUpdateMetadata_(profiles[i].id, {properties: metadata, appProperties: metadata}); } catch (error) {
      console.warn('Vehicle Profile metadata repair deferred: ' + String(error && error.message || error));
    }
    lkWriteInventoryEntry_(state, candidate);
    return candidate;
  }
  return null;
}

function lkFindDuplicateVehicle_(state, candidate, excludeId) {
  const index = lkReadInventoryIndex_(state);
  const vin = lkVin_(candidate.vin);
  const stock = lkStock_(candidate.stock);
  return index.vehicles.find(function(row) {
    if (String(row.id || '') === String(excludeId || '')) return false;
    if (vin && lkVin_(row.vin) === vin) return true;
    return !!(stock && lkStock_(row.stock) === stock);
  }) || null;
}

function lkAssertUniqueVehicle_(state, vehicle) {
  const duplicate = lkFindDuplicateVehicle_(state, vehicle, vehicle.id);
  if (duplicate) throw new Error('VIN or Stock Number conflicts with Vehicle Profile ' + String(duplicate.name || duplicate.id) + '.');
}

function lkReadVehicle_(profile, fallback) {
  const sheetFile = lkListChildren_(profile.id, "mimeType = '" + LK_SHEET + "'").find(function(file) {
    return file.name === 'Vehicle Data - Administrative';
  }) || lkListChildren_(profile.id, "mimeType = '" + LK_SHEET + "'")[0];
  const map = sheetFile ? lkReadSheetMap_(sheetFile.id) : {};
  const value = function(label, key, defaultValue) {
    if (Object.prototype.hasOwnProperty.call(map, label)) return map[label];
    if (Object.prototype.hasOwnProperty.call(fallback || {}, key)) return fallback[key];
    return defaultValue;
  };
  const vehicle = {
    id: String(value('Profile ID', 'id', (profile.properties && profile.properties.lotkeysVehicleId) || 'DRV-' + profile.id)),
    name: String(value('Profile Name', 'name', profile.name || '')),
    year: String(value('Year', 'year', '')),
    make: String(value('Make', 'make', '')),
    model: String(value('Model', 'model', '')),
    bodyStyle: String(value('Body Style', 'bodyStyle', '')),
    exteriorColor: String(value('Exterior Color', 'exteriorColor', '')),
    interiorColor: String(value('Interior Color', 'interiorColor', '')),
    vehicleCondition: String(value('Vehicle Condition', 'vehicleCondition', '')),
    transmission: String(value('Transmission', 'transmission', '')),
    fuelType: String(value('Fuel Type', 'fuelType', '')),
    engineSize: String(value('Engine Size', 'engineSize', '')),
    horsepower: String(value('Horsepower', 'horsepower', '')),
    price: lkNumberOrBlank_(value('Price', 'price', '')),
    odometer: lkNumberOrBlank_(value('Odometer', 'odometer', '')),
    odometerUnit: String(value('Odometer Unit', 'odometerUnit', 'KM')),
    vin: String(value('VIN #', 'vin', '')),
    stock: String(value('STK #', 'stock', '')),
    originalListingUrl: String(value('Original Vehicle Listing URL', 'originalListingUrl', '')),
    carfaxUrl: String(value('CARFAX URL', 'carfaxUrl', '')),
    carfaxOneOwner: lkBool_(value('CARFAX - One Owner', 'carfaxOneOwner', false)),
    carfaxLowKm: lkBool_(value('CARFAX - Low Odometer', 'carfaxLowKm', false)),
    carfaxNoAccidents: lkBool_(value('CARFAX - No Accidents', 'carfaxNoAccidents', false)),
    description: String(value('Description', 'description', '')),
    createdByUserName: String(value('Created By User', 'createdByUserName', '')),
    createdByEmail: String(value('Created By Email', 'createdByEmail', '')).toLowerCase(),
    createdByGoogleSub: String(value('Created By Google Sub', 'createdByGoogleSub', '')),
    createdAt: Date.parse(value('Created At', 'createdAt', '')) || Number(value('Created At', 'createdAt', 0)) || 0,
    pendingDeal: lkBool_(value('Pending Deal', 'pendingDeal', false)),
    pendingDealRequests: lkJsonArray_(value('Pending Deal Requests JSON', 'pendingDealRequests', [])),
    pendingDealUpdatedAt: String(value('Pending Deal Updated At', 'pendingDealUpdatedAt', '')),
    pendingDealUpdatedByUserName: String(value('Pending Deal Updated By', 'pendingDealUpdatedByUserName', '')),
    deletionRequests: lkJsonArray_(value('Deletion Requests JSON', 'deletionRequests', [])),
    priceChangeRequests: lkJsonArray_(value('Price Change Requests JSON', 'priceChangeRequests', [])),
    priceChangeAwards: lkJsonArray_(value('Price Change Awards JSON', 'priceChangeAwards', [])),
    contributionRequests: lkJsonArray_(value('Contribution Requests JSON', 'contributionRequests', [])),
    websitePriceFinding: lkJsonParse_(value('Website Price Finding JSON', 'websitePriceFinding', null), null),
    updatedAt: Date.parse(value('Updated', 'updatedAt', '')) || Number(value('Updated', 'updatedAt', 0)) || Date.now(),
    drive: {profileFolderId: profile.id, adminSheetId: sheetFile ? sheetFile.id : ''}
  };
  vehicle.drive.photosFolderId = lkFolderIdFromUrl_(value('Photos Folder', '', ''));
  vehicle.drive.videosFolderId = lkFolderIdFromUrl_(value('Videos Folder', '', ''));
  vehicle.drive.documentsFolderId = lkFolderIdFromUrl_(value('Documents Folder', '', ''));
  vehicle.drive.sharedFolderId = lkFolderIdFromUrl_(value('Shared Folder', '', ''));
  vehicle.drive.directoryPdfUrl = String(value('Vehicle Info Directory', '', ''));
  return vehicle;
}

function lkEnsureOfficialStructure_(state, vehicle) {
  let profile = vehicle.drive && vehicle.drive.profileFolderId ? lkTryGet_(vehicle.drive.profileFolderId) : null;
  if (!profile) profile = lkCreateFolder_(state.inventoryFolder.id, lkVehicleName_(vehicle), {lotkeysRole: 'vehicleProfile', lotkeysVehicleId: String(vehicle.id)});
  else lkUpdateMetadata_(profile.id, {name: lkVehicleName_(vehicle), properties: {lotkeysRole: 'vehicleProfile', lotkeysVehicleId: String(vehicle.id)}});
  const shared = lkEnsureFolder_(profile.id, 'Shared', {lotkeysRole: 'vehicleShared', lotkeysVehicleId: String(vehicle.id)});
  const photos = lkEnsureFolder_(shared.id, 'Photos', {lotkeysRole: 'vehiclePhotos', lotkeysVehicleId: String(vehicle.id)});
  const videos = lkEnsureFolder_(shared.id, 'Videos', {lotkeysRole: 'vehicleVideos', lotkeysVehicleId: String(vehicle.id)});
  const documents = lkEnsureFolder_(shared.id, 'Documents', {lotkeysRole: 'vehicleDocuments', lotkeysVehicleId: String(vehicle.id)});
  lkSetAnyoneReader_(shared.id);
  vehicle.drive = Object.assign({}, vehicle.drive || {}, {
    profileFolderId: profile.id,
    sharedFolderId: shared.id,
    photosFolderId: photos.id,
    videosFolderId: videos.id,
    documentsFolderId: documents.id
  });
  let sheet = vehicle.drive.adminSheetId ? lkTryGet_(vehicle.drive.adminSheetId) : null;
  if (!sheet) sheet = lkFindFile_(profile.id, 'Vehicle Data - Administrative', LK_SHEET);
  if (!sheet) sheet = lkCreateFile_({name: 'Vehicle Data - Administrative', mimeType: LK_SHEET, parents: [profile.id], properties: {lotkeysVehicleSheet: String(vehicle.id)}});
  vehicle.drive.adminSheetId = sheet.id;
  return vehicle;
}

function lkWriteVehicle_(state, vehicle) {
  lkEnsureOfficialStructure_(state, vehicle);
  vehicle.name = lkVehicleName_(vehicle);
  vehicle.updatedAt = Date.now();
  lkUpdateMetadata_(vehicle.drive.profileFolderId, {name: vehicle.name, properties: {lotkeysRole: 'vehicleProfile', lotkeysVehicleId: String(vehicle.id)}});
  try { lkGenerateDirectoryPdf_(state, vehicle); } catch (error) { console.warn('Vehicle Info Directory PDF deferred: ' + String(error && error.message || error)); }
  lkWriteVehicleSheet_(vehicle.drive.adminSheetId, vehicle);
  lkWriteInventoryEntry_(state, vehicle);
  return vehicle;
}

function lkGenerateDirectoryPdf_(state, vehicle) {
  let documentId = '';
  try {
    const document = DocumentApp.create('LotKeys Temp - ' + String(vehicle.id));
    documentId = document.getId();
    const body = document.getBody();
    body.clear();
    body.appendParagraph(String(state.config.storeName || state.rootAccess.storeName || 'LotKeys Store')).setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph(vehicle.name || lkVehicleName_(vehicle)).setHeading(DocumentApp.ParagraphHeading.HEADING1);
    const facts = [];
    if (vehicle.stock) facts.push('Stock # ' + vehicle.stock);
    if (vehicle.odometer !== '' && vehicle.odometer !== undefined) facts.push(String(vehicle.odometer) + ' ' + String(vehicle.odometerUnit || 'KM'));
    if (vehicle.price !== '' && vehicle.price !== undefined) facts.push('$' + Number(vehicle.price).toLocaleString('en-CA'));
    if (facts.length) body.appendParagraph(facts.join('  •  '));
    if (vehicle.description) body.appendParagraph(String(vehicle.description));
    const addLink = function(label, url) {
      if (!url) return;
      const paragraph = body.appendParagraph('');
      paragraph.appendText(label).setBold(true).setLinkUrl(String(url));
    };
    addLink('VIEW PHOTOS', 'https://drive.google.com/drive/folders/' + vehicle.drive.photosFolderId);
    addLink('VIEW VIDEOS', 'https://drive.google.com/drive/folders/' + vehicle.drive.videosFolderId);
    addLink('VIEW INSPECTIONS & DOCUMENTS', 'https://drive.google.com/drive/folders/' + vehicle.drive.documentsFolderId);
    addLink('VIEW ORIGINAL VEHICLE LISTING', vehicle.originalListingUrl || '');
    addLink('VIEW CARFAX REPORT', vehicle.carfaxUrl || '');
    const directions = state.config.directory && state.config.directory.directionsUrl ? state.config.directory.directionsUrl : '';
    addLink('GET DIRECTIONS', directions);
    document.saveAndClose();
    const pdf = DriveApp.getFileById(documentId).getBlob().getAs(MimeType.PDF).setName('Vehicle Info Directory.pdf');
    let existing = lkFindFile_(vehicle.drive.sharedFolderId, 'Vehicle Info Directory.pdf');
    if (existing) {
      existing = Drive.Files.update({name: 'Vehicle Info Directory.pdf'}, existing.id, pdf, {supportsAllDrives: true, fields: 'id,name,webViewLink'});
    } else {
      existing = lkCreateFile_({name: 'Vehicle Info Directory.pdf', mimeType: 'application/pdf', parents: [vehicle.drive.sharedFolderId], properties: {lotkeysRole: 'vehicleInfoDirectoryPdf', lotkeysVehicleId: String(vehicle.id)}}, pdf);
    }
    vehicle.drive.directoryPdfId = existing.id;
    vehicle.drive.directoryPdfUrl = existing.webViewLink || 'https://drive.google.com/file/d/' + existing.id + '/view';
    return existing;
  } finally {
    if (documentId) lkTrash_(documentId);
  }
}

function lkWriteVehicleSheet_(sheetId, vehicle) {
  const d = vehicle.drive || {};
  const url = function(id) { return id ? 'https://drive.google.com/drive/folders/' + id : ''; };
  const rows = [
    ['Field', 'Value'],
    ['Profile Name', vehicle.name || ''], ['Year', vehicle.year || ''], ['Make', vehicle.make || ''], ['Model', vehicle.model || ''],
    ['Body Style', vehicle.bodyStyle || ''], ['Exterior Color', vehicle.exteriorColor || ''], ['Interior Color', vehicle.interiorColor || ''],
    ['Vehicle Condition', vehicle.vehicleCondition || ''], ['Transmission', vehicle.transmission || ''], ['Fuel Type', vehicle.fuelType || ''],
    ['Engine Size', vehicle.engineSize || ''], ['Horsepower', vehicle.horsepower || ''], ['Price', vehicle.price === undefined ? '' : vehicle.price],
    ['Odometer', vehicle.odometer === undefined ? '' : vehicle.odometer], ['Odometer Unit', vehicle.odometerUnit || ''],
    ['VIN #', vehicle.vin || ''], ['STK #', vehicle.stock || ''],
    ['Photos Folder', url(d.photosFolderId)], ['Videos Folder', url(d.videosFolderId)], ['Documents Folder', url(d.documentsFolderId)],
    ['More Photos Folder', ''], ['More Videos Folder', ''], ['More Documents Folder', ''], ['Shared Folder', url(d.sharedFolderId)],
    ['Vehicle Info Directory', d.directoryPdfUrl || ''], ['Original Vehicle Listing URL', vehicle.originalListingUrl || ''], ['CARFAX URL', vehicle.carfaxUrl || ''],
    ['CARFAX - One Owner', vehicle.carfaxOneOwner ? 'TRUE' : 'FALSE'], ['CARFAX - Low Odometer', vehicle.carfaxLowKm ? 'TRUE' : 'FALSE'],
    ['CARFAX - No Accidents', vehicle.carfaxNoAccidents ? 'TRUE' : 'FALSE'], ['Description', vehicle.description || ''], ['Profile ID', vehicle.id],
    ['Created By User', vehicle.createdByUserName || ''], ['Created By Email', vehicle.createdByEmail || ''],
    ['Created By Google Sub', vehicle.createdByGoogleSub || ''], ['Created At', vehicle.createdAt ? new Date(vehicle.createdAt).toISOString() : ''],
    ['Pending Deal', vehicle.pendingDeal ? 'TRUE' : 'FALSE'], ['Pending Deal Requests JSON', JSON.stringify(vehicle.pendingDealRequests || [])],
    ['Pending Deal Updated At', vehicle.pendingDealUpdatedAt || ''], ['Pending Deal Updated By', vehicle.pendingDealUpdatedByUserName || ''],
    ['Deletion Requests JSON', JSON.stringify(vehicle.deletionRequests || [])], ['Price Change Requests JSON', JSON.stringify(vehicle.priceChangeRequests || [])],
    ['Price Change Awards JSON', JSON.stringify(vehicle.priceChangeAwards || [])], ['Contribution Requests JSON', JSON.stringify(vehicle.contributionRequests || [])],
    ['Website Price Finding JSON', JSON.stringify(vehicle.websitePriceFinding || null)], ['Cover Photo File ID', lkCoverPhotoId_(vehicle)],
    ['Updated', new Date().toISOString()]
  ];
  const spreadsheet = SpreadsheetApp.openById(sheetId);
  const sheet = spreadsheet.getSheets()[0];
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
}

function lkWriteInventoryEntry_(state, vehicle) {
  const index = lkReadInventoryIndex_(state);
  index.vehicles = index.vehicles.filter(function(row) { return String(row.id || '') !== String(vehicle.id || ''); });
  const d = vehicle.drive || {};
  const entry = {};
  LK_PROFILE_FIELDS.forEach(function(field) { entry[field] = vehicle[field]; });
  Object.assign(entry, {
    id: vehicle.id,
    name: vehicle.name,
    createdByUserName: vehicle.createdByUserName || '',
    createdByEmail: vehicle.createdByEmail || '',
    createdByGoogleSub: vehicle.createdByGoogleSub || '',
    createdAt: vehicle.createdAt || 0,
    pendingDeal: !!vehicle.pendingDeal,
    pendingDealRequests: vehicle.pendingDealRequests || [],
    pendingDealUpdatedAt: vehicle.pendingDealUpdatedAt || '',
    pendingDealUpdatedByUserName: vehicle.pendingDealUpdatedByUserName || '',
    deletionRequests: vehicle.deletionRequests || [],
    priceChangeRequests: vehicle.priceChangeRequests || [],
    priceChangeAwards: vehicle.priceChangeAwards || [],
    contributionRequests: vehicle.contributionRequests || [],
    websitePriceFinding: vehicle.websitePriceFinding || null,
    recoveryNeeded: false,
    syncError: '',
    updatedAt: Date.now(),
    drive: {
      profileFolderId: d.profileFolderId || '',
      adminSheetId: d.adminSheetId || '',
      sharedFolderId: d.sharedFolderId || '',
      photosFolderId: d.photosFolderId || '',
      videosFolderId: d.videosFolderId || '',
      documentsFolderId: d.documentsFolderId || '',
      morePhotosFolderId: '', moreVideosFolderId: '', moreDocumentsFolderId: '',
      directoryPdfId: d.directoryPdfId || '',
      directoryPdfUrl: d.directoryPdfUrl || '',
      coverPhotoFileId: lkCoverPhotoId_(vehicle)
    }
  });
  index.vehicles.push(entry);
  index.schemaVersion = 4;
  index.app = 'LotKeys';
  index.processorVersion = LOTKEYS_PROCESSOR_VERSION;
  index.updatedAt = new Date().toISOString();
  state.inventoryIndexFile = lkUpsertJson_(state.inventoryIndexFile, state.root.id, 'Inventory Index.json', index, {lotkeysRole: 'inventoryIndex'});
}

function lkReadInventoryIndex_(state) {
  if (!state.inventoryIndexFile) {
    state.inventoryIndexFile = lkFindFile_(state.root.id, 'Inventory Index.json') || lkFindFile_(state.inventoryFolder.id, 'Inventory Index.json');
  }
  const data = state.inventoryIndexFile ? lkReadJsonFile_(state.inventoryIndexFile.id) : {};
  return {schemaVersion: Number(data.schemaVersion) || 4, app: 'LotKeys', vehicles: Array.isArray(data.vehicles) ? data.vehicles : []};
}

function lkReconcileOwnerMedia_(vehicle, request, context, creating) {
  const media = request.media && typeof request.media === 'object' ? request.media : {};
  const specs = [
    {key: 'photos', kind: 'photo', target: vehicle.drive.photosFolderId},
    {key: 'videos', kind: 'video', target: vehicle.drive.videosFolderId},
    {key: 'documents', kind: 'document', target: vehicle.drive.documentsFolderId}
  ];
  specs.forEach(function(spec) {
    const items = (Array.isArray(media[spec.key]) ? media[spec.key] : []).slice(0, 250);
    const keep = {};
    items.forEach(function(item, index) {
      const sourceId = String(item && item.driveFileId || '');
      if (!sourceId) return;
      const source = lkGet_(sourceId);
      let official = source.parents && source.parents.indexOf(spec.target) >= 0;
      if (official && !creating) {
        keep[source.id] = true;
        if (spec.kind === 'photo') lkUpdateMetadata_(source.id, {name: lkOrderedPhotoName_(item.name || source.name, index)});
        return;
      }
      const expected = context[spec.key + 'Folder'];
      if (!expected || !source.parents || source.parents.indexOf(expected.id) < 0) {
        throw new Error('A submitted ' + spec.kind + ' is outside this user’s More folder.');
      }
      const copied = lkCopyFile_(source.id, spec.target, spec.kind === 'photo' ? lkOrderedPhotoName_(item.name || source.name, index) : lkSafeName_(item.name || source.name), {
        lotkeysAssetId: String(item.id || source.id),
        lotkeysVehicleId: String(vehicle.id),
        lotkeysAssetKind: spec.kind,
        lotkeysSourceMoreFileId: source.id
      });
      keep[copied.id] = true;
      item.officialDriveFileId = copied.id;
    });
    if (!creating) {
      lkListChildren_(spec.target, "mimeType != '" + LK_FOLDER + "'").forEach(function(existing) {
        if (!keep[existing.id]) lkTrash_(existing.id);
      });
    }
  });
}

function lkSanitizeRequestMedia_(media, context) {
  media = media && typeof media === 'object' ? media : {};
  const out = {photos: [], videos: [], documents: []};
  ['photos', 'videos', 'documents'].forEach(function(key) {
    const expected = context[key + 'Folder'];
    (Array.isArray(media[key]) ? media[key] : []).slice(0, 250).forEach(function(item) {
      const fileId = String(item && item.driveFileId || '');
      if (!fileId) return;
      const file = lkGet_(fileId);
      if (!expected || !file.parents || file.parents.indexOf(expected.id) < 0) {
        throw new Error('Submitted media is outside the requesting user’s More folder.');
      }
      out[key].push({
        id: String(item.id || file.id),
        name: String(item.name || file.name || 'Contribution'),
        type: String(item.type || file.mimeType || ''),
        driveFileId: file.id,
        webViewLink: file.webViewLink || '',
        parentFolderId: expected.id,
        status: 'pending',
        contributedByUserName: String(item.contributedByUserName || ''),
        contributionId: String(item.contributionId || '')
      });
    });
  });
  return out;
}

function lkSanitizeChanges_(changes, vehicle) {
  changes = changes && typeof changes === 'object' ? changes : {};
  const out = {};
  LK_PROFILE_FIELDS.forEach(function(field) {
    if (!Object.prototype.hasOwnProperty.call(changes, field)) return;
    let next = changes[field] && typeof changes[field] === 'object' ? changes[field].to : changes[field];
    next = lkTypedField_(field, next);
    if (String(vehicle[field] === undefined ? '' : vehicle[field]) === String(next === undefined ? '' : next)) return;
    out[field] = {from: vehicle[field] === undefined ? '' : vehicle[field], to: next};
  });
  return out;
}

function lkApplyChanges_(vehicle, changes) {
  Object.keys(changes || {}).forEach(function(field) {
    if (LK_PROFILE_FIELDS.indexOf(field) < 0) return;
    vehicle[field] = lkTypedField_(field, changes[field] && typeof changes[field] === 'object' ? changes[field].to : changes[field]);
  });
  vehicle.name = lkVehicleName_(vehicle);
}

function lkMergePendingDealRequests_(vehicle, rows, actor, canAuto) {
  if (canAuto) return [];
  vehicle.pendingDealRequests = Array.isArray(vehicle.pendingDealRequests) ? vehicle.pendingDealRequests : [];
  const known = {};
  vehicle.pendingDealRequests.forEach(function(row) { known[String(row.id || '')] = true; });
  const ids = [];
  (Array.isArray(rows) ? rows : []).slice(0, 200).forEach(function(row) {
    if (!row || !row.id || known[String(row.id)]) return;
    const clean = {
      id: String(row.id), status: 'open', requestedValue: !!row.requestedValue,
      requestedAt: String(row.requestedAt || new Date().toISOString()),
      requestedByUserName: lkUserName_(actor),
      requestedByDisplayName: String(actor.profileDisplayName || actor.userName || ''),
      source: String(row.source || 'Vehicle Profile').slice(0, 120)
    };
    vehicle.pendingDealRequests.push(clean); known[clean.id] = true; ids.push(clean.id);
  });
  return ids;
}

function lkMergeDeletionRequests_(vehicle, rows, actor) {
  vehicle.deletionRequests = Array.isArray(vehicle.deletionRequests) ? vehicle.deletionRequests : [];
  const known = {};
  vehicle.deletionRequests.forEach(function(row) { known[String(row.id || '')] = true; });
  const ids = [];
  (Array.isArray(rows) ? rows : []).slice(0, 200).forEach(function(row) {
    if (!row || !row.id || known[String(row.id)]) return;
    const reason = ['duplicate', 'missing', 'wrong', 'other'].indexOf(String(row.reason || '')) >= 0 ? String(row.reason) : 'other';
    const clean = {
      id: String(row.id), status: 'open', reportedAt: String(row.reportedAt || new Date().toISOString()),
      reportedByUserName: lkUserName_(actor), reportedByDisplayName: String(actor.profileDisplayName || actor.userName || ''),
      reason: reason, reasonLabel: String(row.reasonLabel || 'Other').slice(0, 80), reasonText: String(row.reasonText || '').slice(0, 500)
    };
    vehicle.deletionRequests.push(clean); known[clean.id] = true; ids.push(clean.id);
  });
  return ids;
}

function lkMergePriceRequests_(vehicle, rows, actor) {
  vehicle.priceChangeRequests = Array.isArray(vehicle.priceChangeRequests) ? vehicle.priceChangeRequests : [];
  const known = {};
  vehicle.priceChangeRequests.forEach(function(row) { known[String(row.id || '')] = true; });
  const ids = [];
  (Array.isArray(rows) ? rows : []).slice(0, 200).forEach(function(row) {
    if (!row || !row.id || known[String(row.id)]) return;
    const price = Number(row.detectedPrice);
    if (!Number.isFinite(price) || price < 0) return;
    const clean = lkCleanPriceRequest_(row, actor, vehicle);
    clean.status = 'open';
    vehicle.priceChangeRequests.push(clean); known[clean.id] = true; ids.push(clean.id);
  });
  return ids;
}

function lkCleanPriceRequest_(row, actor, vehicle) {
  return {
    id: String(row.id), key: String(row.key || ''), status: String(row.status || 'open'),
    eligibleForPoints: row.eligibleForPoints !== false, detectedPrice: Number(row.detectedPrice),
    sourceUrl: String(vehicle.originalListingUrl || ''), reportedByUserName: lkUserName_(actor),
    submittedAt: String(row.submittedAt || new Date().toISOString()), resolvedAt: String(row.resolvedAt || '')
  };
}

function lkStateRefsResolved_(vehicle, request) {
  const checks = [
    ['indexedPendingDealRequestIds', vehicle.pendingDealRequests || []],
    ['indexedDeletionRequestIds', vehicle.deletionRequests || []],
    ['indexedPriceRequestIds', vehicle.priceChangeRequests || []]
  ];
  const ids = [];
  checks.forEach(function(pair) {
    (request[pair[0]] || []).forEach(function(id) { ids.push({id: String(id), rows: pair[1]}); });
  });
  return ids.length > 0 && ids.every(function(ref) {
    const row = ref.rows.find(function(item) { return String(item.id || '') === ref.id; });
    return !!row && ((row.status && row.status !== 'open' && row.status !== 'pending') || !!row.resolvedAt);
  });
}

function lkClearResolvedStateRefs_(vehicle, request) {
  const pendingIds = new Set((request.indexedPendingDealRequestIds || []).map(String));
  const deletionIds = new Set((request.indexedDeletionRequestIds || []).map(String));
  const priceIds = new Set((request.indexedPriceRequestIds || []).map(String));
  vehicle.pendingDealRequests = (vehicle.pendingDealRequests || []).filter(function(row) {
    return !pendingIds.has(String(row.id || ''));
  });
  vehicle.deletionRequests = (vehicle.deletionRequests || []).filter(function(row) {
    return !deletionIds.has(String(row.id || ''));
  });
  vehicle.priceChangeRequests = (vehicle.priceChangeRequests || []).filter(function(row) {
    return !priceIds.has(String(row.id || ''));
  });
}

function lkMoreContext_(moreVehicle) {
  const media = lkFindFolder_(moreVehicle.id, 'Client Media');
  const requests = lkFindFolder_(moreVehicle.id, 'Requests');
  return {
    moreVehicle: moreVehicle,
    mediaFolder: media,
    photosFolder: media ? lkFindFolder_(media.id, 'Photos') : null,
    videosFolder: media ? lkFindFolder_(media.id, 'Videos') : null,
    documentsFolder: media ? lkFindFolder_(media.id, 'Documents') : null,
    requestsFolder: requests,
    pendingFolder: requests ? lkFindFolder_(requests.id, 'Pending') : null
  };
}

function lkRequestFolders_(context) {
  const url = function(folder) { return folder ? 'https://drive.google.com/drive/folders/' + folder.id : ''; };
  return {
    moreVehicleFolderId: context.moreVehicle.id,
    moreVehicleFolderUrl: url(context.moreVehicle),
    moreMediaFolderId: context.mediaFolder ? context.mediaFolder.id : '',
    moreMediaFolderUrl: url(context.mediaFolder),
    photosFolderId: context.photosFolder ? context.photosFolder.id : '', photosFolderUrl: url(context.photosFolder),
    videosFolderId: context.videosFolder ? context.videosFolder.id : '', videosFolderUrl: url(context.videosFolder),
    documentsFolderId: context.documentsFolder ? context.documentsFolder.id : '', documentsFolderUrl: url(context.documentsFolder),
    pendingFolderId: context.pendingFolder ? context.pendingFolder.id : ''
  };
}

function lkCleanupLegacyRequestArchives_(moreFolder) {
  if (!moreFolder) return;
  lkListChildren_(moreFolder.id, "mimeType = '" + LK_FOLDER + "'").forEach(function(moreVehicle) {
    const requests = lkFindFolder_(moreVehicle.id, 'Requests');
    if (!requests) return;
    ['Approved', 'Rejected'].forEach(function(name) {
      const legacy = lkFindFolder_(requests.id, name);
      if (!legacy) return;
      lkListChildren_(legacy.id, "mimeType != '" + LK_FOLDER + "'").forEach(function(file) {
        if (/\.json$/i.test(String(file.name || ''))) lkTrash_(file.id);
      });
      if (!lkListChildren_(legacy.id).length) lkTrash_(legacy.id);
    });
  });
}

function lkApproveRequest_(request, file, context, note) {
  request.status = 'approved'; request.resolvedAt = new Date().toISOString(); request.processorNote = note || '';
  lkTrash_(file.id);
  return 'approved';
}

function lkRejectRequest_(request, file, context, reason) {
  request.status = 'rejected'; request.resolvedAt = new Date().toISOString(); request.processorError = String(reason || 'Request rejected.');
  lkTrash_(file.id);
  return 'rejected';
}

function lkRecordRequestError_(file, error) {
  try {
    const request = lkReadJsonFile_(file.id) || {};
    request.lastProcessorAttemptAt = new Date().toISOString();
    request.lastProcessorError = String(error && error.message || error || 'Unknown processor error').slice(0, 1000);
    lkWriteJsonFile_(file.id, request, file.name);
  } catch (ignored) {
    console.error(ignored);
  }
  console.error(error && error.stack || error);
}

function lkCleanVehicleSnapshot_(source) {
  const out = {};
  LK_PROFILE_FIELDS.forEach(function(field) { out[field] = lkTypedField_(field, source[field]); });
  out.pendingDeal = !!source.pendingDeal;
  out.pendingDealUpdatedAt = String(source.pendingDealUpdatedAt || '');
  out.pendingDealUpdatedByUserName = String(source.pendingDealUpdatedByUserName || '');
  out.createdAt = Number(source.createdAt) || Date.now();
  return out;
}

function lkTypedField_(field, value) {
  if (LK_BOOLEAN_FIELDS[field]) return lkBool_(value);
  if (LK_NUMERIC_FIELDS[field]) {
    if (value === '' || value === null || value === undefined) return '';
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : '';
  }
  const text = String(value === null || value === undefined ? '' : value).slice(0, field === 'description' ? 10000 : 2000);
  if ((field === 'originalListingUrl' || field === 'carfaxUrl') && text && !/^https?:\/\//i.test(text)) return '';
  return text;
}

function lkContributionForSheet_(request) {
  return {
    id: String(request.id || ''), type: 'vehicle-contribution', vehicleId: String(request.vehicleId || ''),
    userName: String(request.userName || ''), userEmail: String(request.userEmail || ''),
    userGoogleSub: String(request.userGoogleSub || ''), userDisplayName: String(request.userDisplayName || ''),
    createdAt: String(request.createdAt || ''), status: 'pending', trustedUser: !!request.trustedUser,
    requiresMediaApproval: true, changes: request.changes || {}, autoAppliedChanges: request.autoAppliedChanges || {},
    informationAppliedAt: request.informationAppliedAt || '', media: request.media || {}, folders: request.folders || {},
    driveRequestFileId: request.driveRequestFileId || '', processorIndexedAt: request.processorIndexedAt || ''
  };
}

function lkIsCreator_(vehicle, actor) {
  const sub = String(actor.googleSub || '');
  const email = lkEmail_(actor);
  const name = lkUserName_(actor).toLowerCase();
  const creatorSub = String(vehicle.createdByGoogleSub || '');
  const creatorEmail = String(vehicle.createdByEmail || '').trim().toLowerCase();
  if (creatorSub && sub) return creatorSub === sub;
  if (creatorEmail && email) return creatorEmail === email;
  if (creatorSub || creatorEmail) return false;
  return !!(vehicle.createdByUserName && name && String(vehicle.createdByUserName).trim().toLowerCase() === name);
}

function lkVehicleName_(vehicle) {
  const title = [vehicle.year, vehicle.make, vehicle.model].map(String).map(function(value) { return value.trim(); }).filter(Boolean).join(' ');
  const stock = String(vehicle.stock || '').trim();
  return (title + (stock ? ' - ' + stock : '')).trim() || String(vehicle.id || 'Vehicle Profile');
}

function lkCoverPhotoId_(vehicle) {
  const folderId = vehicle.drive && vehicle.drive.photosFolderId;
  if (!folderId) return '';
  const files = lkListChildren_(folderId, "mimeType != '" + LK_FOLDER + "'").sort(function(a, b) {
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
  return files.length ? files[0].id : '';
}

function lkReadSheetMap_(sheetId) {
  const values = SpreadsheetApp.openById(sheetId).getSheets()[0].getDataRange().getValues();
  const out = {};
  values.slice(1).forEach(function(row) { out[String(row[0] || '').trim()] = row.length > 1 ? row[1] : ''; });
  return out;
}

function lkNormalizeUsers_(rows) {
  const byKey = {};
  (Array.isArray(rows) ? rows : []).forEach(function(row) {
    if (!row || typeof row !== 'object') return;
    const user = Object.assign({}, row);
    user.userName = lkUserName_(user);
    user.email = lkEmail_(user);
    user.adminLevel = lkAdminLevel_(user);
    user.role = user.adminLevel > 0 ? 'admin' : 'user';
    user.status = String(user.status || 'active');
    user.permissions = lkPermissions_(user.permissions);
    const key = String(user.googleSub || user.email || user.userName).toLowerCase();
    if (key) byKey[key] = Object.assign({}, byKey[key] || {}, user);
  });
  return Object.keys(byKey).map(function(key) { return byKey[key]; });
}

function lkPermissions_(permissions) {
  return Object.assign({
    createVehicleProfiles: true, markVehicleForDeletion: true, useListings: true,
    showOnLeaderboard: true, useDescriptionBuilder: true, useChromeExtension: true,
    trustedUser: false
  }, permissions || {});
}

function lkAdminLevel_(user) {
  const raw = user && user.adminLevel !== undefined ? Number(user.adminLevel) : (user && user.role === 'admin' ? 2 : 0);
  return Math.max(0, Math.min(2, Number.isFinite(raw) ? raw : 0));
}
function lkActive_(user) { return ['disabled', 'banned', 'blacklisted', 'removed'].indexOf(String(user.status || '').toLowerCase()) < 0; }
function lkEmail_(user) { return String(user && user.email || '').trim().toLowerCase(); }
function lkUserName_(user) { return String(user && user.userName || '').trim(); }
function lkVin_(value) { return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function lkStock_(value) { return String(value || '').trim().toUpperCase().replace(/\s+/g, ''); }
function lkBool_(value) { return value === true || String(value || '').trim().toUpperCase() === 'TRUE'; }
function lkNumberOrBlank_(value) { return value === '' || value === null || value === undefined ? '' : Number(value); }
function lkJsonArray_(value) { const parsed = Array.isArray(value) ? value : lkJsonParse_(value, []); return Array.isArray(parsed) ? parsed : []; }
function lkJsonParse_(value, fallback) { try { return typeof value === 'string' ? JSON.parse(value) : (value === undefined ? fallback : value); } catch (error) { return fallback; } }
function lkFolderIdFromUrl_(value) { const match = String(value || '').match(/\/folders\/([a-zA-Z0-9_-]+)/); return match ? match[1] : ''; }
function lkSafeName_(value) { return String(value || 'file').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 180) || 'file'; }
function lkOrderedPhotoName_(value, index) { return String(index + 1).padStart(2, '0') + ' - ' + lkSafeName_(String(value || 'photo').replace(/^\s*(?:(?:\d{1,3})\s*-\s*)+/, '')); }

function lkQ_(value) { return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

function lkGet_(fileId) {
  return Drive.Files.get(fileId, {supportsAllDrives: true, fields: 'id,name,mimeType,driveId,parents,appProperties,properties,webViewLink,trashed,inheritedPermissionsDisabled,capabilities,permissionIds'});
}
function lkTryGet_(fileId) { try { const file = lkGet_(fileId); return file.trashed ? null : file; } catch (error) { return null; } }

function lkListChildren_(parentId, extraQuery) {
  const out = [];
  let pageToken;
  do {
    const query = "'" + lkQ_(parentId) + "' in parents and trashed = false" + (extraQuery ? ' and ' + extraQuery : '');
    const response = Drive.Files.list({
      q: query, pageSize: 1000, pageToken: pageToken,
      supportsAllDrives: true, includeItemsFromAllDrives: true,
      fields: 'nextPageToken,files(id,name,mimeType,driveId,parents,appProperties,properties,webViewLink,trashed,modifiedTime)'
    });
    Array.prototype.push.apply(out, response.files || []);
    pageToken = response.nextPageToken;
  } while (pageToken);
  return out;
}

function lkFindFolder_(parentId, name) {
  return lkListChildren_(parentId, "mimeType = '" + LK_FOLDER + "' and name = '" + lkQ_(name) + "'")[0] || null;
}
function lkFindFile_(parentId, name, mimeType) {
  const query = "name = '" + lkQ_(name) + "'" + (mimeType ? " and mimeType = '" + lkQ_(mimeType) + "'" : '');
  return lkListChildren_(parentId, query)[0] || null;
}
function lkEnsureFolder_(parentId, name, properties) { return lkFindFolder_(parentId, name) || lkCreateFolder_(parentId, name, properties); }
function lkCreateFolder_(parentId, name, properties) { return lkCreateFile_({name: name, mimeType: LK_FOLDER, parents: [parentId], properties: properties || {}}); }

function lkCreateFile_(resource, blob) {
  return Drive.Files.create(resource, blob || null, {supportsAllDrives: true, fields: 'id,name,mimeType,driveId,parents,appProperties,properties,webViewLink,trashed'});
}
function lkUpdateMetadata_(fileId, resource) {
  return Drive.Files.update(resource, fileId, null, {supportsAllDrives: true, fields: 'id,name,mimeType,driveId,parents,appProperties,properties,webViewLink,trashed'});
}
function lkCopyFile_(sourceId, parentId, name, properties) {
  return Drive.Files.copy({name: name, parents: [parentId], properties: properties || {}}, sourceId, {supportsAllDrives: true, fields: 'id,name,mimeType,parents,properties,webViewLink'});
}
function lkTrash_(fileId) { try { Drive.Files.update({trashed: true}, fileId, null, {supportsAllDrives: true}); return true; } catch (error) { console.warn('Drive cleanup deferred for ' + fileId + ': ' + String(error && error.message || error)); return false; } }
function lkMove_(fileId, fromParent, toParent) {
  Drive.Files.update({}, fileId, null, {supportsAllDrives: true, addParents: toParent, removeParents: fromParent, fields: 'id,parents'});
}

function lkReadJsonFile_(fileId) { return JSON.parse(DriveApp.getFileById(fileId).getBlob().getDataAsString('UTF-8')); }
function lkWriteJsonFile_(fileId, data, name) {
  const blob = Utilities.newBlob(JSON.stringify(data, null, 2), 'application/json', name || 'data.json');
  return Drive.Files.update({name: name || 'data.json'}, fileId, blob, {supportsAllDrives: true, fields: 'id,name,parents,properties,webViewLink'});
}
function lkUpsertJson_(file, parentId, name, data, properties) {
  if (file && file.id) { lkWriteJsonFile_(file.id, data, name); return lkGet_(file.id); }
  return lkCreateFile_({name: name, mimeType: 'application/json', parents: [parentId], properties: properties || {}}, Utilities.newBlob(JSON.stringify(data, null, 2), 'application/json', name));
}

function lkListPermissions_(fileId) {
  const response = Drive.Permissions.list(fileId, {supportsAllDrives: true, fields: 'permissions(id,type,role,emailAddress,deleted,permissionDetails(inherited,inheritedFrom))'});
  return response.permissions || [];
}
function lkDirectUserPermission_(fileId, email) {
  return lkListPermissions_(fileId).find(function(permission) {
    const inherited = (permission.permissionDetails || []).some(function(detail) { return detail.inherited === true; });
    return !inherited && permission.type === 'user' && String(permission.emailAddress || '').toLowerCase() === email;
  }) || null;
}
function lkSetUserPermission_(fileId, email, role) {
  email = String(email || '').trim().toLowerCase();
  if (!email) return null;
  const current = lkDirectUserPermission_(fileId, email);
  if (current && (current.role === role || current.role === 'owner')) return current;
  if (current) return Drive.Permissions.update({role: role}, fileId, current.id, {supportsAllDrives: true, fields: 'id,type,role,emailAddress'});
  return Drive.Permissions.create({type: 'user', role: role, emailAddress: email}, fileId, {supportsAllDrives: true, sendNotificationEmail: false, fields: 'id,type,role,emailAddress'});
}
function lkRemoveDirectPermission_(fileId, email) {
  email = String(email || '').trim().toLowerCase();
  if (!email) return false;
  const current = lkDirectUserPermission_(fileId, email);
  if (!current || current.role === 'owner') return false;
  Drive.Permissions.remove(fileId, current.id, {supportsAllDrives: true});
  return true;
}
function lkSetAnyoneReader_(fileId) {
  try {
    const existing = lkListPermissions_(fileId).some(function(permission) { return permission.type === 'anyone' && permission.role === 'reader'; });
    if (!existing) Drive.Permissions.create({type: 'anyone', role: 'reader'}, fileId, {supportsAllDrives: true, fields: 'id'});
  } catch (error) { console.error(error); }
}
function lkTryLimitedAccess_(folderId) {
  try {
    const folder = lkGet_(folderId);
    if (folder.inheritedPermissionsDisabled) return true;
    Drive.Files.update({inheritedPermissionsDisabled: true}, folderId, null, {supportsAllDrives: true, fields: 'id,inheritedPermissionsDisabled'});
    return true;
  } catch (error) {
    console.warn('Limited access was unavailable for ' + folderId + ': ' + String(error && error.message || error));
    return false;
  }
}
