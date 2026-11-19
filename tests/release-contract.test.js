'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('release metadata is consistently V0.9.5.50 partial TEST reliability preview with Android V0.9.5.46', () => {
  const version = JSON.parse(read('version.json'));
  assert.equal(version.version, '0.9.5.50');
  assert.equal(version.build, '095050');
  assert.equal(version.channel, 'regular');
  assert.equal(version.release, 'reliability-preview');
  assert.equal(version.releaseScope, 'partial-reliability-regular-preview');
  assert.equal(version.deploymentStatus, 'regular-preview');
  assert.equal(version.regularUserNativeHandoff, false);
  assert.equal(version.androidConnectorVersion, '0.9.5.46');
  assert.equal(version.serviceWorkerCache, 'lotkeys-app-v095050-reliability-preview');
  assert.match(read('index.html'), /V0\.9\.5\.50/);
  assert.match(read('manifest.webmanifest'), /build=095050/);
  assert.match(read('sw.js'), /lotkeys-app-v095050-reliability-preview/);
  assert.match(read('android/ci-reference/build-lotkeys-android.yml'), /LotKeys-Android-V0\.9\.5\.46/);
  assert.match(read('android/app/build.gradle'), /versionCode 95046/);
  assert.match(read('android/app/src/main/java/ca/lotkeys/connector/MainActivity.java'), /Phone Connection · V0\.9\.5\.46 TEST/);
});

test('paired phone UI shows the trusted PC and can forget it', () => {
  const phone = read('lotkeys-phone.js');
  const hub = read('lotkeys-hub.js');
  const html = read('index.html');
  assert.match(phone, /pairedCount = \(state\.nativeToken \? trusts\(\) : \[\]\)\.filter\(row => P\.trustValid/);
  assert.match(hub, /hub-phone-indicator \$\{e\(c\.level\)\}/);
  assert.match(hub, /id="hub-connected-pcs">🖥️ \$\{phone.connected\?'Connected':phone.paired\?'Paired':'Computers'\}/);
  assert.match(hub, /data-forget-browser=.*?Forget/);
  assert.match(hub, /Android Settings → Apps → LotKeys TEST → Battery and choose Unrestricted/);
  assert.match(read('lotkeys-app.css')+html, /\.readiness-btn\.phone-paired\{background:#1689e8\}/);
  assert.match(html, /phone\?\.connected&&\(phone\.role!=='phone'\|\|phone\.native&&phone\.relayReady/);
});

test('trusted reconnection and local phone revocation survive an idle browser', () => {
  const phone = read('lotkeys-phone.js');
  const relay = read('android/app/src/main/java/ca/lotkeys/connector/DriveRelay.java');
  const setup = read('android/app/src/main/java/ca/lotkeys/connector/MainActivity.java');
  assert.match(phone, /if \(pairing\?\.automatic && reason\.startsWith\('Pairing expired'\)\) scheduleTrustedReconnect\(1000\)/);
  assert.match(phone, /heartbeatFailures >= 2 && now\(\) - state\.lastPhoneSeenAt > STALE_SESSION_RECOVERY_MS/);
  assert.match(phone, /recoverStaleSession\(sessionId\)/);
  assert.match(phone, /reconnectTrustedComputer\(\{ force: true \}\)/);
  assert.doesNotMatch(phone, /reconnectTrustedComputer\(\)[\s\S]{0,160}document\.visibilityState !== 'visible'/);
  assert.ok(relay.indexOf('pollFrames();') < relay.indexOf('pollOffers();'), 'active frames should be processed before offers');
  assert.match(relay, /Pick only the newest trusted offer/);
  assert.match(relay, /sameBrowserRecovery/);
  assert.match(relay, /targetDeviceId/);
  assert.match(phone, /targetDeviceId: automatic \? text\(rememberedPair\(\)\?\.deviceId\) : ''/);
  assert.match(relay, /if \(revoked != null\) \{ prefs\.edit\(\)\.remove\(SESSION\)\.commit\(\); workPolicy\.clearPc\(\)/);
  assert.match(setup, /Locked-Phone Battery Settings/);
});

test('V0.9.4.98 preserves the active page and labels the newest successful sync', () => {
  const html = read('index.html');
  assert.match(html, /ACTIVE_ROUTE_KEY='lotkeys-active-route-v1'/);
  assert.match(html, /APP_ROUTES\.has\(saved\)\?saved:'home'/);
  assert.match(html, /rememberActiveRoute\(r\)/);
  assert.match(html, /button\.dataset\.route===route/);
  assert.match(html, /Math\.max\(inv,lis\)/);
  assert.match(html, /compactTime=lastTime\.replace/);
  assert.match(html, /text=`Synced \$\{phoneHeader\?compactTime:lastTime\}`/);
  assert.match(html, /Last sync \$\{lastTime\}\. Open sync status\./);
  assert.doesNotMatch(html, /Math\.min\(inv,lis\)/);
});

test('V0.9.4.98 reminder controls repaint locally and hide the stable header bell', () => {
  const html = read('index.html');
  const hub = read('lotkeys-hub.js');
  const store = read('lotkeys-hub-store.js');
  assert.match(html, /header-reminder-glyph/);
  assert.match(html, /header-reminder-mark/);
  assert.match(html, /\.header-reminder-btn\[hidden\]\{display:none!important\}/);
  assert.match(html, /button\.setAttribute\('aria-hidden','true'\)/);
  assert.match(html, /button\.removeAttribute\('aria-hidden'\)/);
  assert.match(html, /urgency===2\?'!!':'!'/);
  assert.match(hub, /title\.textContent=`All reminders · \$\{rows\.length\}`/);
  assert.match(hub, /const removed=await S\.removeReminder\(id\)/);
  assert.match(hub, /Reminder deleted; Drive sync queued/);
  assert.match(hub, /id="hub-cal-reminder"[\s\S]*?d\.close\(\);return openReminders\(\{filter:'all'\}\)/);
  assert.match(store, /sync\(\{pull:false\}\)\.catch\(\(\)=>\{\}\);return true/);
});

test('V0.9.4.98 keeps optional reminder links inside Additional fields', () => {
  const hub = read('lotkeys-hub.js');
  const css = read('lotkeys-hub.css');
  const sectionStart = hub.indexOf('<section class="hub-reminder-additional-fields full"');
  const sectionEnd = hub.indexOf('</section>', sectionStart);
  assert.ok(sectionStart >= 0 && sectionEnd > sectionStart, 'Additional fields section must exist');
  const additionalFields = hub.slice(sectionStart, sectionEnd);
  assert.match(additionalFields, /id="hub-reminder-contact"/);
  assert.match(additionalFields, /id="hub-reminder-phone"/);
  assert.match(additionalFields, /id="hub-reminder-vehicle"/);
  assert.match(css, /\.hub-reminder-additional-fields\[hidden\]\{display:none!important\}/);
  assert.match(hub, /const extraOpen=!!\(chosenContact\|\|old\?\.phone\|\|chosenVehicle\|\|old\?\.vehicleLabel\)/);
});

test('regular Google browser configuration retains verified production fallbacks', () => {
  const html = read('index.html');
  const clientId = html.match(/googleClientId:'([^']+)'/)?.[1] || '';
  const apiKey = html.match(/googleApiKey:'([^']+)'/)?.[1] || '';
  const projectNumber = html.match(/googleProjectNumber:'([^']+)'/)?.[1] || '';
  const expected=JSON.parse(read('REGULAR-PROMOTION-PROVENANCE.json')).productionGoogleDefaultSha256;
  const digest=value=>require('node:crypto').createHash('sha256').update(value).digest('hex');
  assert.equal(digest(clientId),expected.googleClientId);
  assert.equal(digest(apiKey),expected.googleApiKey);
  assert.equal(digest(projectNumber),expected.googleProjectNumber);
  assert.match(html, /configuredSettingValue\(id,value,fallback/);
  assert.doesNotMatch(html, /client[_ ]?secret/i);
});

test('personal Account sync restores before writing and deletes photos only by explicit request', () => {
  const html = read('index.html');
  const messaging = read('lotkeys-messaging.js');
  assert.match(html, /getPersonalProfileRestoreStatus/);
  assert.match(html, /Restore Account\.json from Google Drive before saving/);
  assert.match(html, /remoteAt!==baseline\.baseUpdatedAt/);
  assert.match(html, /personalProfileHydratedFileId/);
  assert.match(html, /personalProfilePhotoDeleteRequested/);
  assert.match(html, /else if\(deletePhoto&&photoFileId\)/);
  assert.doesNotMatch(html, /else if\(photoFileId\)\{await trashFile\(photoFileId\)/);
  assert.match(html, /else if\(allowPhotoDelete&&thumbId\)/);
  assert.doesNotMatch(html, /else if\(thumbId\)\{await trashFile\(thumbId\)/);
  assert.match(html, /localPersonalRecoverySignals/);
  assert.match(html, /preserved the local copy and blocked automatic replacement/);
  assert.match(html, /if\(preferRemote&&!localPending\)\{const loaded=await loadPersonalProfileNow\(\)/);
  assert.match(html, /id='restore-account-settings'/);
  assert.match(html, /loadPersonalProfile\(\{forceRemote:true\}\)/);
  assert.doesNotMatch(html, /choosePersonalAccountLocation\(\);loaded=await DriveSync\.loadPersonalProfile\(\{forceRemote:true\}\)/);
  assert.match(html, /markPersonalProfileChanged\(\).*personalProfileSyncPending/s);
  assert.match(messaging, /personalProfileSyncPending/);
});

test('personal Account folders can rebuild recoverable assets without Account.json pointers', () => {
  const html = read('index.html');
  assert.match(html, /discoverPersonalAccountAssets/);
  assert.match(html, /discoverPersonalCelebrationSounds/);
  assert.match(html, /personalCelebrationAudioFile/);
  assert.match(html, /selectedCelebrationSoundId:selectedId&&soundIds\.has\(selectedId\)\?selectedId:''/);
  assert.match(html, /recoverPersonalAccountFolder\(\{folder=null,preserveLocal=true\}/);
  assert.match(html, /Celebration Sounds folder whenever this opens/);
  assert.match(html, /lotkeysOriginalName/);
  assert.match(html, /syncPersonalDescriptionTemplateFiles/);
  assert.match(html, /personalDescriptionTemplates/);
  assert.match(html, /recordType:'descriptionTemplate'/);
  assert.match(html, /deletePersonalDescriptionTemplateFile/);
  assert.match(html, /preserveLocalPreferences:localPending/);
  assert.match(html, /templateSource=preserveLocalPreferences/);
  assert.match(html, /personalCelebrationSoundClearRequested/);
  assert.match(html, /if\(photoFile\?\.trashed\)photoFile=null/);
  assert.match(html, /if\(accountFile\?\.trashed\)accountFile=null/);
  assert.match(html, /if\(!selected&&storeFileId&&!clearRequested\)return/);
  assert.match(html, /syncStoreCelebrationSound\(null,\{allowDelete:!fileId\}\)/);
});

test('phone checkpoint uses the new Android layer and encrypted same-account transport', () => {
  for (const target of [
    'lotkeys-phone-core.js',
    'lotkeys-phone.js',
    'android/app/src/main/AndroidManifest.xml',
    'android/app/src/main/java/ca/lotkeys/connector/MainActivity.java',
    'android/app/src/main/java/ca/lotkeys/connector/DriveRelay.java',
    'android/app/src/main/java/ca/lotkeys/connector/PhoneStore.java',
    'android/ci-reference/build-lotkeys-android.yml'
  ]) assert.equal(fs.existsSync(path.join(root, target)), true, target);
  const phone = read('lotkeys-phone.js');
  assert.match(phone, /appDataFolder/);
  assert.match(phone, /name: 'ECDH'/);
  assert.match(phone, /name: 'AES-GCM'/);
  assert.match(phone, /lotkeysPairOffer/);
  assert.match(phone, /String\(1000 .* % 9000\)/);
  assert.match(phone, /processed and expired|cleanupStale|deleteFile/);
  assert.doesNotMatch(phone, /device\.json|hub\.json|cloudflared|Python relay/i);
  assert.match(read('index.html'), /lotkeys-phone\.js\?v=095050/);
  assert.match(phone, /targetAddressSpace: 'loopback'/);
  assert.match(phone, /connectNative/);
  assert.match(read('lotkeys-hub.css'), /hub-signal-bars/);
  assert.match(read('sw.js'), /lotkeys-phone\.js/);
});

test('Android background relay supports secure approval, trusted reconnect and revocation', () => {
  const relay = read('android/app/src/main/java/ca/lotkeys/connector/DriveRelay.java');
  const server = read('android/app/src/main/java/ca/lotkeys/connector/LocalApiServer.java');
  const activity = read('android/app/src/main/java/ca/lotkeys/connector/MainActivity.java');
  const gradle = read('android/app/build.gradle');
  assert.match(relay, /GoogleAuthUtil\.getToken/);
  assert.match(relay, /drive\.appdata/);
  assert.match(relay, /AES\/GCM\/NoPadding/);
  assert.match(relay, /KeyAgreement\.getInstance\("ECDH"\)/);
  assert.match(relay, /"until-disconnect"/);
  assert.match(server, /\/v1\/pairings\/approve/);
  assert.match(server, /\/v1\/relay\/disconnect-all/);
  assert.match(server, /\/v1\/relay\/forget/);
  assert.match(activity, /Approve · Trust 36 Hours/);
  assert.match(activity, /same four digits/);
  assert.match(gradle, /applicationId 'ca\.lotkeys\.connector\.test'/);
  assert.match(gradle, /LOTKEYS_TEST_KEYSTORE_PATH/);
  assert.doesNotMatch(gradle, /\.keystore\.b64/);
  const workflow = read('android/ci-reference/build-lotkeys-android.yml');
  assert.match(workflow, /secrets\.LOTKEYS_TEST_KEYSTORE_B64/);
  assert.match(workflow, /Verify registered TEST certificate/);
  assert.doesNotMatch(read('CHECKSUMS.txt'), /lotkeys-test-debug\.keystore/);
});

test('Android relay preserves the selected account identity and receives its live token', () => {
  const relay = read('android/app/src/main/java/ca/lotkeys/connector/DriveRelay.java');
  const service = read('android/app/src/main/java/ca/lotkeys/connector/PhoneConnectorService.java');
  const activity = read('android/app/src/main/java/ca/lotkeys/connector/MainActivity.java');
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  assert.match(relay, /GOOGLE_ACCOUNT_TYPE/);
  assert.match(relay, /putString\(GOOGLE_ACCOUNT, account\.name\.trim\(\)\)/);
  assert.doesNotMatch(relay, /account\.name\.trim\(\)\.toLowerCase/);
  assert.match(relay, /new Account\(email, type\)/);
  assert.match(activity, /String token = DriveRelay\.authorizeAccount\(this, account\)/);
  assert.match(activity, /setAction\(PhoneConnectorService\.ACTION_ACCOUNT_AUTHORIZED\)/);
  assert.match(activity, /EXTRA_ACCESS_TOKEN, token/);
  assert.match(service, /ACTION_ACCOUNT_AUTHORIZED\.equals\(intent\.getAction\(\)\)/);
  assert.match(service, /relay\.accountAuthorized\(/);
  assert.match(activity, /Allow restricted settings/);
  assert.match(activity, /ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS/);
  assert.match(manifest, /REQUEST_IGNORE_BATTERY_OPTIMIZATIONS/);
});

test('Android layer keeps the existing messenger and adds a reviewed media handoff', () => {
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  const activity = read('android/app/src/main/java/ca/lotkeys/connector/MainActivity.java');
  const store = read('android/app/src/main/java/ca/lotkeys/connector/PhoneStore.java');
  const server = read('android/app/src/main/java/ca/lotkeys/connector/LocalApiServer.java');
  const boot = read('android/app/src/main/java/ca/lotkeys/connector/BootReceiver.java');
  const gradleProperties = read('android/gradle.properties');
  assert.match(manifest, /android\.permission\.READ_SMS/);
  assert.match(manifest, /android\.permission\.SEND_SMS/);
  assert.match(manifest, /android\.permission\.READ_CONTACTS/);
  assert.match(manifest, /foregroundServiceType="remoteMessaging"/);
  assert.doesNotMatch(manifest, /RECEIVE_SMS|RECEIVE_MMS|RECEIVE_WAP_PUSH|WRITE_SMS|READ_CALL_LOG|WRITE_CALL_LOG|BIND_ACCESSIBILITY_SERVICE|MANAGE_EXTERNAL_STORAGE/);
  assert.match(activity, /remains your default messaging app/);
  assert.match(read('android/app/src/main/java/ca/lotkeys/connector/BrowserExperience.java'), /\.fragment\([\s\S]*?"lotkeys-phone=" \+ token/);
  assert.doesNotMatch(activity, /FLAG_SECURE/, 'TEST connector must allow screenshots and screen recording');
  assert.doesNotMatch(activity, /ROLE_SMS|device\.json|hub\.json/);
  assert.match(store, /Telephony\.Threads/);
  assert.match(store, /sendTextMessage|sendMultipartTextMessage/);
  assert.match(store, /The phone recipient changed/);
  assert.match(store, /mediaHandoff/);
  assert.match(store, /Intent\.ACTION_SEND_MULTIPLE/);
  assert.match(store, /FileProvider\.getUriForFile/);
  assert.match(store, /Opened in the phone's messaging app for final review and Send/);
  assert.match(store, /mmsAttachments/);
  assert.match(store, /allowedHandoff/);
  assert.match(server, /127\.0\.0\.1/);
  assert.match(server, /Bearer /);
  assert.match(server, /allowedOrigin/);
  assert.match(server, /\/v1\/media-handoff/);
  assert.match(server, /\/v1\/attachment/);
  assert.match(boot, /ACTION_BOOT_COMPLETED\.equals\(action\)/);
  assert.match(manifest, /dataExtractionRules="@xml\/data_extraction_rules"/);
  assert.match(manifest, /androidx\.core\.content\.FileProvider/);
  assert.match(gradleProperties, /^android\.useAndroidX=true$/m);
  assert.doesNotMatch(store, /sendMultimediaMessage/);
});

test('internal LotKeys chat remains wired into Hub', () => {
  const messaging = read('lotkeys-messaging.js');
  assert.match(messaging, /if\(window\.LotKeysHub\)return window\.LotKeysHub\.open/);
  assert.match(messaging, /async function sendDirect/);
  assert.match(messaging, /async function sendParty/);
  assert.match(messaging, /function hubMount/);
  assert.match(messaging, /async function hubRows/);
  assert.match(read('index.html'), /lotkeys-messaging\.js\?v=095050/);
  assert.match(read('index.html'), /lotkeys-hub\.js\?v=095050/);
});

test('cached LotKeys renders before Chat and Phone background startup', () => {
  const html = read('index.html');
  const messaging = read('lotkeys-messaging.js');
  const phone = read('lotkeys-phone.js');
  const hub = read('lotkeys-hub.js');
  const firstRender = html.indexOf('await render();\n    signalBaseReady();');
  const onlineBoot = html.indexOf("requestAnimationFrame(()=>setTimeout(()=>finishOnlineBoot().catch(console.warn),0))");
  assert.ok(firstRender >= 0, 'base render must signal readiness');
  assert.ok(onlineBoot > firstRender, 'remote startup must begin after the cached render');
  assert.match(html, /window\.__lotKeysBaseReady=true/);
  assert.match(messaging, /lotkeys-base-ready/);
  assert.match(phone, /lotkeys-base-ready/);
  assert.match(hub, /lotkeys-base-ready/);
});

test('adaptive monitoring gives refreshes and uploads temporary network priority', () => {
  const html = read('index.html');
  const messaging = read('lotkeys-messaging.js');
  const phone = read('lotkeys-phone.js');
  const activity = read('android/app/src/main/java/ca/lotkeys/connector/MainActivity.java');
  assert.match(html, /MONITOR_MESSAGE_IDLE_MS=1500,MONITOR_MESSAGE_HEAVY_MS=10000/);
  assert.match(html, /MONITOR_PHONE_IDLE_MS=3000,MONITOR_PHONE_HEAVY_MS=30000/);
  for (const reason of ['inventory-refresh', 'listings-refresh', 'vehicle-profile-upload', 'vehicle-listing-upload']) {
    assert.match(html, new RegExp(reason));
  }
  assert.match(html, /lotkeys-workload-change/);
  assert.match(html, /monitoringState,/);
  assert.match(messaging, /const POLL_NORMAL=1500/);
  assert.match(messaging, /const POLL_HEAVY=10000/);
  assert.match(messaging, /nextPollDelay/);
  assert.match(messaging, /resumeMessageMonitoring/);
  assert.match(phone, /PHONE_POLL_IDLE_MS = 3000/);
  assert.match(phone, /PHONE_POLL_HEAVY_MS = 30000/);
  assert.match(phone, /FRAME_POLL_HEAVY_MS = 10000/);
  assert.match(phone, /scheduleNativeTick/);
  assert.match(phone, /scheduleOfferPoll/);
  assert.doesNotMatch(phone, /nativeTimer\s*=\s*setInterval/);
  assert.doesNotMatch(phone, /offerTimer\s*=\s*setInterval/);
  assert.match(activity, /This is not a second customer-message alert and it does not replace your normal messaging notifications/);
});

test('Hub connection status is compact, actionable and scrolls with Hub home', () => {
  const hub = read('lotkeys-hub.js');
  const css = read('lotkeys-hub.css');
  assert.match(hub, /class="hub-phone-indicator amber" id="hub-phone-status"/);
  assert.match(hub, /async function phoneStatusDetails/);
  assert.match(hub, /id="hub-phone-action"/);
  assert.match(hub, /id="hub-sync"/);
  assert.doesNotMatch(hub, /<div id="hub-status"><\/div>/);
  assert.match(css, /\.hub-shell\.home\{overflow:auto/);
  assert.match(css, /\.hub-phone-indicator\.green/);
  assert.match(css, /\.hub-phone-indicator\.amber/);
  assert.match(css, /\.hub-phone-indicator\.red/);
});

test('Device chat survives background refresh and preserves its unsent draft', () => {
  const messaging = read('lotkeys-messaging.js');
  const hub = read('lotkeys-hub.js');
  assert.match(messaging, /!panel\.dataset\.conversationId&&!panel\.dataset\.hub/);
  assert.match(hub, /DEVICE_DRAFT_PREFIX='lotkeys-device-draft-v1:'/);
  assert.match(hub, /draft\.value=readDeviceDraft\(draftKey\)/);
  assert.match(hub, /saveDeviceDraft\(draftKey,draft\.value\)/);
  assert.match(hub, /input\.value='';saveDeviceDraft\(draftKey,''\)/);
});

test('Device is driven by real phone availability and never simulates connectivity', () => {
  const hub = read('lotkeys-hub.js');
  assert.match(hub, /P\.refreshThreads/);
  assert.match(hub, /openDeviceConversation/);
  assert.match(hub, /Approve & Connect/);
  assert.match(hub, /Sending/);
  assert.match(hub, /Sent/);
  assert.match(hub, /Failed/);
  assert.match(hub, /data-category-all/);
  assert.match(hub, /selectedCategories/);
  assert.match(hub, /Subcategory/);
  assert.doesNotMatch(hub, /simulated|fake conversation/i);
});

test('Hub All groups LotKeys first and remembers independent collapse state', () => {
  const hub = read('lotkeys-hub.js');
  const lotkeys = hub.indexOf("section('lotkeys','LotKeys Chats'");
  const device = hub.indexOf("section('device','Device Messages'");
  assert.ok(lotkeys >= 0 && device > lotkeys);
  assert.match(hub, /GROUP_STATE_KEY='lotkeys-hub-group-state-v1'/);
  assert.match(hub, /data-toggle-group/);
  assert.match(hub, /saveGroupState/);
});

test('current Device conversation keeps the compact customer card inside the header', () => {
  const hub = read('lotkeys-hub.js');
  const start = hub.lastIndexOf('async function openDeviceConversation(threadId)');
  const current = hub.slice(start, hub.indexOf("document.addEventListener('click'", start));
  assert.doesNotMatch(current, /hub-device-avatar/);
  for (const id of ['hub-device-customer', 'hub-device-note', 'hub-device-questions', 'hub-device-appointment', 'hub-device-files', 'hub-device-organize']) {
    assert.match(current, new RegExp(id));
  }
  assert.doesNotMatch(current, /hub-device-contact/);
  assert.match(current, /<small>Notes<\/small>.*<small>Questions<\/small>.*<small>Call<\/small>.*<small>Booking<\/small>.*<small>Organize<\/small>/s);
  assert.match(current, /mediaButton\.innerHTML='<span>💾<\/span><small>Media<\/small>'.*insertBefore\(mediaButton,\$\('#hub-device-appointment'/s);
  assert.match(current, /hub-device-plus/);
  assert.match(current, /hub-device-mic/);
  assert.match(current, /P\.sendMedia/);
  assert.match(current, /questionsDialog/);
  assert.match(current, /headerCard=row\.savedContact\?interestedVehicleMarkup\(row\.savedContact,\{compact:true,header:true\}\):''/);
  assert.match(current, /<header class="hub-device-chat-head \$\{headerCard\?'has-interest':''\}">.*\$\{headerCard\}<\/header><div class="hub-device-tools hub-five-actions">/s);
  assert.match(current, /bindInterestedVehicles\(root\)/);
  assert.doesNotMatch(current, /<\/header>\$\{headerCard\}/);
  assert.doesNotMatch(current, /hub-device-foot|Text sends directly|reviewed native handoff/);
});

test('Device header customer card has responsive space-saving styles', () => {
  const css = read('lotkeys-hub.css');
  assert.match(css, /\.hub-device-chat-head\.has-interest\{grid-template-columns:auto minmax\(150px,1fr\) minmax\(280px,520px\)/);
  assert.match(css, /\.hub-interest-card\.header-card\{[^}]*margin:0[^}]*grid-template-columns:42px minmax\(0,1fr\) auto/);
  assert.match(css, /@media\(max-width:620px\).*\.hub-device-chat-head\.has-interest\{grid-template-columns:auto minmax\(84px,\.64fr\) minmax\(0,1\.36fr\)/s);
});

test('V0.9.4.98 Hub Device rows paint linked Vehicle Profile thumbnails', () => {
  const hub = read('lotkeys-hub.js');
  const start = hub.indexOf('function paintRows()');
  const current = hub.slice(start, hub.indexOf('async function open(', start));
  assert.match(hub, /interestedVehicleMarkup\(contact,\{compact:true,interactive:false\}\)/);
  assert.match(current, /M\.hubHydrate\(box\);bindInterestedVehicles\(panel\(\)\);updateBadge\(\)/);
  assert.match(hub, /function bindInterestedVehicles\(root\)\{if\(root===panel\(\)\)clearThumbs\(\);/);
  assert.match(hub, /blob instanceof Blob[\s\S]*Vehicle thumbnail[\s\S]*vehicle-placeholder\.webp/);
  assert.match(hub, /class="hub-interest-card[^`]*\$\{vehicle\?'linked':addOnly\?'add':'manual'\}/);
});

test('V0.9.4.98 repaints Hub Device rows only when monitored data changes', () => {
  const hub = read('lotkeys-hub.js');
  const phone = read('lotkeys-phone.js');
  assert.match(phone, /let lastStatusEventSignature = ''/);
  assert.match(phone, /if \(type === 'status'\) \{[\s\S]*if \(signature === lastStatusEventSignature\) return false/);
  assert.match(phone, /const changed = JSON\.stringify\(\[state\.threads, state\.threadPage\]\) !== JSON\.stringify\(\[nextThreads, nextThreadPage\]\)/);
  assert.match(phone, /if \(changed\) event\('data', \{ reason: 'threads', page \}\)/);
  assert.match(phone, /if \(previous && previous !== state\.nativeRevision\) \{\s*await refreshThreads\(0\)/);
  assert.doesNotMatch(phone, /payload\.event === 'invalidate'[\s\S]{0,180}state\.threads = \[\]/);
  assert.match(hub, /window\.addEventListener\('lotkeys-phone-status',\(\)=>\{if\(home\(\)\)paintStatus\(\);\}\)/);
  assert.doesNotMatch(hub, /lotkeys-phone-status[^\n]*paintRows/);
});

test('V0.9.4.99 category and Listing reordering share the responsive physical-drag contract', () => {
  const hub = read('lotkeys-hub.js');
  const css = read('lotkeys-hub.css');
  const index = read('index.html');
  const touchStart = hub.indexOf('async function editCategories()');
  const touch = hub.slice(touchStart, hub.indexOf('function readGroupState()', touchStart));
  assert.match(hub, /action\(\$\('#hub-organize',p\),editCategories\)/);
  assert.match(hub, /function bindCategoryReorder\(container,onMove\)/);
  assert.match(hub, /document\.addEventListener\('pointermove',move,\{capture:true,passive:false\}\)/);
  assert.match(touch, /class="hub-category-handle"[^>]*>☰<\/button>/);
  assert.match(touch, /rows=H\.reorderCategories\(rows,from,to\)/);
  assert.doesNotMatch(touch, /draggable="true"/);
  assert.match(css, /\.hub-category-handle\{position:absolute;left:10px;bottom:9px/);
  assert.match(css, /\.hub-category-drag-ghost\{position:fixed!important/);
  assert.match(index, /gridEl\.classList\.add\('vehicle-master-photo-grid'\)/);
  assert.match(index, /markListingPhotoOrderDirty\(\{preserveScroll:false\}\)/);
  assert.match(index, /selectedPos===0\?'1 · Cover':String\(selectedPos\+1\)/);
  assert.match(index, /'Not selected'/);
  assert.match(index, /Maximum \$\{LISTING_PHOTO_LIMIT\} selected/);
});

test('V0.9.5.01 keeps numbered category badges independent from Important Hub alerts', () => {
  const core = read('lotkeys-hub-core.js');
  const hub = read('lotkeys-hub.js');
  const css = read('lotkeys-hub.css');
  assert.match(core, /important: !!item\?\.important/);
  assert.match(core, /item\.important && importantCount < 3/);
  assert.match(hub, /data-cat-important/);
  assert.match(hub, /aria-pressed="\$\{category\.important\?'true':'false'\}"/);
  assert.match(hub, /Choose up to three Important categories\. Unstar one first\./);
  assert.match(hub, /important:false/);
  assert.match(hub, /function categoryUnreadCounts\(options\)/);
  assert.match(hub, /async function loadBadgeData\(\)/);
  assert.match(hub, /if\(!visible\)\{await loadBadgeData\(\);updateBadge\(\);return;\}/);
  assert.match(core, /row\?\.live === true \? Math\.max\(0, Number\(row\.unread\) \|\| 0\) : 0/);
  assert.match(core, /categoryClosure\(organization, categories\)/);
  assert.match(hub, /class="hub-category-alert"/);
  assert.match(hub, /categoryUnreadCounts\(\{importantOnly:true\}\)/);
  assert.match(hub, /count>99\?'99\+':count/);
  assert.match(hub, /className='hub-important-alerts'/);
  assert.match(hub, /className='hub-important-alert-dot'/);
  assert.match(hub, /class="hub-chip hub-organize-button"[^>]*>🗂️ Organize<\/button>/);
  assert.match(css, /\.hub-category-alert\{[^}]*min-width:18px[^}]*background:#111827[^}]*color:#fff/);
  assert.match(css, /body\[data-theme="dark"\] \.hub-category-alert\{background:#fff;color:#111/);
  assert.match(css, /\.hub-organize-button\{background:#111!important;color:#fff!important/);
  assert.match(css, /body\[data-theme="dark"\] \.hub-organize-button\{background:#fff!important;color:#111!important/);
  assert.match(css, /\.hub-important-alerts\{[^}]*flex-direction:column/);
});

test('V0.9.5.02 clears acknowledged alerts and restores them for newer incoming messages', () => {
  const phone = read('lotkeys-phone.js');
  const phoneCore = read('lotkeys-phone-core.js');
  const hub = read('lotkeys-hub.js');
  const androidStore = read('android/app/src/main/java/ca/lotkeys/connector/PhoneStore.java');
  assert.match(phone, /const READ_RECEIPTS_KEY = 'lotkeys-phone-read-receipts-v1'/);
  assert.match(phone, /const READ_RECEIPT_MAX_AGE = 180 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(phone, /async function reconcileThreadReadReceipts\(rows\)/);
  assert.match(phone, /P\.receiptHasNewIncoming\(receipt, messages\)/);
  assert.match(phone, /receipt\.alertSignature = signature/);
  assert.match(phone, /function acknowledgeUnread\(threadId, messages = \[\]\)/);
  assert.match(phone, /return P\.applyThreadReadReceipts\(rawRows, receiptsFor\(rawRows\)\)/);
  assert.match(phoneCore, /function threadAlertSignature\(thread\)/);
  assert.match(phoneCore, /function latestIncomingMarker\(messages\)/);
  assert.match(phoneCore, /acknowledged \? 0 : rawUnread/);
  assert.match(hub, /P\.acknowledgeUnread\?\.\(threadId,page\.messages\|\|\[\]\)/);
  assert.doesNotMatch(androidStore, /resolver\.(?:update|delete)\([^;]*Telephony\.(?:Sms|Mms)/s);
});

test('V0.9.5.04 retains Hub organization and adds inline short-code blocking', () => {
  const hub = read('lotkeys-hub.js');
  const core = read('lotkeys-hub-core.js');
  const store = read('lotkeys-hub-store.js');
  const css = read('lotkeys-hub.css');
  const privacy = read('privacy.html');
  assert.match(hub, /scope==='device'\?\[\['all','All'\],\['unread','Unread'\],\['blocked','📵 Blocked'\]\]/);
  assert.doesNotMatch(hub, /\['contacts','Saved contacts'\]/);
  assert.match(hub, /data-category-all="true">All Device<\/button><button[^>]*data-category-unsorted="true">Unsorted<\/button>/);
  assert.match(hub, /data-category-unsorted/);
  assert.match(core, /filter === 'blocked'/);
  assert.match(core, /else if \(blocked\) return false/);
  assert.match(core, /if \(row\?\.blocked === true\) continue/);
  assert.match(store, /blocked=item\?\.blocked===true/);
  assert.match(store, /x\.blocked\?\[\{\.\.\.x,categoryIds:\[\],primaryCategoryId:''\}\]:\[\]/);
  assert.match(hub, /id="hub-contact-block"[^>]*>📵 Block Number<\/button>/);
  assert.match(hub, /id="hub-contact-number-block"/);
  assert.match(hub, /H\.validMessageAddress\(phone\)/);
  assert.match(store, /H\.validMessageAddress\(item\.phone\)/);
  assert.match(css, /\.hub-contact-phone-inline\{grid-column:1\/-1;display:grid/);
  assert.doesNotMatch(hub, /hub-contact-block-row/);
  assert.match(hub, /Blocked contacts & numbers/);
  assert.match(hub, /Interested Vehicle<\/button><button[^>]*>💾 Media<\/button><button[^>]*>💬 Chat<\/button>/);
  assert.match(css, /\.hub-contact-shortcuts\{display:grid;grid-template-columns:/);
  assert.match(hub, /\+ Interested Vehicle/);
  assert.match(hub, /Search Vehicle Profiles or type any vehicle/);
  assert.match(hub, /Save as a custom Interested Vehicle/);
  assert.match(hub, /openDeviceConversationWithInterestedVehicle/);
  assert.match(privacy, /Android's messaging app remains responsible for phone-level blocking and notifications/);
});

test('V0.9.5.07 retains browser-route recovery and fixes the pairing upload boundary', () => {
  const html = read('index.html');
  const phone = read('lotkeys-phone.js');
  const hub = read('lotkeys-hub.js');
  assert.match(html, /const DRIVE_APPDATA_SCOPE = 'https:\/\/www\.googleapis\.com\/auth\/drive\.appdata'/);
  assert.match(html, /const DRIVE_SCOPE = `openid email \$\{DRIVE_WRITE_SCOPE\} \$\{DRIVE_APPDATA_SCOPE\}`/);
  assert.match(html, /!grantedScopes\.has\(DRIVE_WRITE_SCOPE\)\|\|!grantedScopes\.has\(DRIVE_APPDATA_SCOPE\)/);
  assert.match(html, /clearSessionAuthorization\(\);return finish\(reject,new Error\('LotKeys needs Store Drive access plus its private phone-pairing permission\./);
  assert.match(html, /async function renewAuthorization\(forcePrompt=true,options=\{\}\)/);
  assert.match(html, /async function renewPairingAuthorization\(\)\{return renewAuthorization\(true,\{chooseAccount:true\}\)\}/);
  assert.match(html, /chooseAccount\?'select_account':'consent'/);
  assert.match(html, /c\.accountEmail&&!chooseAccount/);
  assert.match(html, /async function apiClientRequest\(url,opts=\{\},token=''\)/);
  assert.match(html, /gapi\.client\.init\(c\.apiKey\?\{apiKey:c\.apiKey\}:\{\}\)/);
  assert.match(html, /openidconnect\.googleapis\.com\/v1\/userinfo/);
  assert.match(phone, /function friendlyPairingDriveError\(error\)/);
  assert.match(phone, /granted scopes do not give access\|requested spaces\|appdatafolder/);
  assert.match(phone, /function relayXhr\(url, options, headers\)/);
  assert.match(phone, /https:\/\/content\.googleapis\.com\//);
  assert.match(phone, /Drive\.apiClientRequest\(url, options, token\)/);
  assert.match(phone, /google-api-client/);
  assert.match(phone, /async function repairPairingAccess\(\)/);
  assert.match(phone, /Drive\.renewPairingAuthorization\(\)/);
  assert.match(phone, /lotkeysRole: 'lotkeysPairProbe'/);
  assert.match(phone, /P\.buildMultipartJsonUpload\(boundary, metadata, data\)/);
  assert.match(phone, /'Content-Type': contentType/);
  assert.doesNotMatch(phone, /'Content-Type': body\.type/);
  assert.match(phone, /PAIRING_DRIVE_NETWORK/);
  assert.match(phone, /converted\.cause = error/);
  assert.match(hub, /Choose Google account/);
  assert.match(hub, /Try Google routes again/);
  assert.match(hub, /Technical detail/);
});

test('contacts share Interested Vehicle, buying details, appointment chips and reminder-linked notes', () => {
  const hub = read('lotkeys-hub.js');
  const core = read('lotkeys-hub-core.js');
  assert.match(hub, /primaryVehicleId/);
  assert.match(hub, /Interested Vehicle/);
  assert.match(hub, /data-contact-vehicle/);
  assert.match(hub, /hub-buying-summary/);
  assert.match(hub, /hub-next-appointment/);
  assert.match(hub, /data-calendar-day/);
  assert.match(hub, /id="hub-note-topic-search"/);
  assert.match(hub, /id="hub-note-reminder"/);
  assert.match(hub, /note\.reminderId=reminder\.id/);
  assert.match(hub, /S\.save\('reminder',reminder\)/);
  assert.match(hub, /id="hub-cal-reminder"/);
  for (const field of ['totalBudget', 'biweeklyPayment', 'downPayment', 'tradeStatus', 'expectedTradeValue', 'interestedVehicleText']) {
    assert.match(core, new RegExp(field));
  }
  assert.match(core, /DTSTART;VALUE=DATE/);
  const start = hub.lastIndexOf('async function showContact');
  const current = hub.slice(start, hub.indexOf('async function ensureDeviceContact', start));
  assert.match(current, /modal\(contact\.name,`\$\{vehicleCard\}<div class="hub-status hub-contact-summary"/);
  assert.match(hub, /id="hub-note-value-field"/);
  assert.match(hub, /valueField\.hidden=choiceOnly/);
  assert.match(hub, /choiceOnly=selectedKey==='purchaseMethod'/);
  assert.match(hub, /aria-label="Cash or financing"/);
});

test('standalone reminders have one private local-first record and shared list, bell and Calendar UI', () => {
  const html = read('index.html');
  const hub = read('lotkeys-hub.js');
  const store = read('lotkeys-hub-store.js');
  const core = read('lotkeys-hub-core.js');
  const css = read('lotkeys-hub.css');

  assert.match(html, /id="sync-readiness"[^>]*><\/button>\s*<button class="header-reminder-btn" id="header-reminders"[\s\S]*?id="quick-add"/);
  assert.match(html, /id="c-reminder">🔔 Reminder<\/button>/);
  assert.match(html, /LotKeysHub\?\.openReminders/);
  assert.match(html, /setInterval\(scheduleHeaderReminderBell,60000\)/);

  assert.match(store, /\['contact','appointment','reminder','categories','phoneSorting'\]/);
  assert.match(store, /folder\(hub,'Reminders','reminders'\)/);
  assert.match(store, /row\.type==='reminder'\?r\.reminders/);
  assert.match(store, /children\(r\.reminders\)/);
  assert.match(store, /\['contact','appointment','reminder'\]\.includes\(t\.type\)/);
  assert.match(store, /async function removeReminder/);
  assert.match(store, /async function migrateLegacyReminders/);
  assert.match(store, /await save\('reminder',H\.legacyAppointmentToReminder\(appointment\)\)/);
  assert.match(store, /reminderRow\.dirty\|\|reminderRow\.data\.deleted/);
  assert.match(store, /await save\('appointment',\{\.\.\.appointment,deleted:true,migratedToReminder:true\}\)/);

  assert.match(hub, /appointments=\[\],reminders=\[\]/);
  assert.match(hub, /S\.list\('reminder'\)/);
  assert.match(hub, /id="hub-reminders"[\s\S]*?id="hub-calendar"/);
  const hubBell = hub.match(/<button class="hub-fab hub-reminder-fab"[^>]*>/)?.[0];
  assert.ok(hubBell, 'the Hub reminder shortcut stays in the action stack');
  assert.doesNotMatch(hubBell, /\bhidden\b|\bdisabled\b/);
  assert.match(hubBell, /data-empty="true"/);
  assert.match(hub, /action\(\$\('#hub-reminders',p\),\(\)=>openReminders\(\)\)/);
  assert.match(hub, /button\.dataset\.empty=state\.visible\?'false':'true'/);
  assert.match(hub, /async function openReminders/);
  for (const filter of ['all', 'open', 'completed', 'daily']) assert.match(hub, new RegExp(`option value="${filter}"`));
  for (const id of ['hub-reminder-title', 'hub-reminder-notes', 'hub-reminder-time', 'hub-reminder-date', 'hub-reminder-additional', 'hub-reminder-daily']) assert.match(hub, new RegExp(`id="${id}"`));
  assert.match(hub, /S\.save\('reminder',reminder\)/);
  assert.doesNotMatch(hub, /S\.save\('appointment',[\s\S]{0,500}kind:'Reminder'/);
  assert.match(hub, /H\.remindersForDay\(reminders/);
  assert.match(hub, /reminderCalendarCard/);
  assert.match(hub, /newReminder:options=>editReminder/);
  assert.match(hub, /reminderBellState:publicReminderBellState/);
  assert.match(hub, /if\(home\(\)\)[^{]*\{[^}]*paintReminderFab\(\)/);

  assert.match(core, /const REMINDER_TIME_ZONE = 'America\/Edmonton'/);
  assert.match(core, /function reminderBellState/);
  assert.match(core, /function remindersForDay/);
  assert.match(core, /function legacyAppointmentToReminder/);
  assert.match(css, /\.hub-reminder-row/);
  assert.match(css, /\.hub-reminder-calendar/);
  assert.match(css, /\.hub-shell\.home \.hub-reminder-fab\[data-empty="true"\]/);
  assert.match(css, /\.hub-reminder-glyph\{[^}]*font-size:26px/);
  assert.match(css, /@media\(max-width:620px\)\{[^\n]*\.hub-reminder-glyph\{font-size:24px/);
});

test('appointment form follows the agreed order and display rules', () => {
  const hub = read('lotkeys-hub.js');
  const start = hub.lastIndexOf('async function editAppointment');
  const current = hub.slice(start, hub.indexOf('const structuredNoteKeys', start));
  const ids = ['hub-appt-contact', 'hub-appt-vehicle', 'hub-appt-status', 'hub-appt-date', 'hub-appt-time', 'hub-appt-end-time', 'hub-appt-kind', 'hub-appt-notes', 'hub-appt-location'];
  let previous = -1;
  for (const id of ids) {
    const position = current.indexOf(id);
    assert.ok(position > previous, `${id} must follow the requested field order`);
    previous = position;
  }
  for (const status of ['Tentative', 'Booked', 'Confirmed', 'Double Confirm']) assert.match(current, new RegExp(status));
  for (const kind of ['Consultation', 'Test Drive', 'Follow-up Appointment', 'Vehicle Delivery', 'Other']) assert.match(current, new RegExp(kind));
  assert.match(current, /MM\/DD\/YYYY/);
  assert.match(current, /A typed name can be linked/);
  assert.match(current, /Optional while Tentative/);
  assert.match(current, /6\. End Time/);
  assert.match(current, /old\?`<input type="text"[^`]*hub-appt-date[^`]*`:`<input type="date"[^`]*hub-appt-date/);
  assert.match(current, /old\?`<select id="hub-appt-time"[^`]*`:`<input type="time" id="hub-appt-time"/);
  assert.match(current, /Tap to open the calendar picker/);
  assert.match(current, /Tap to open the clock picker/);
  assert.match(current, /dateInput\.type==='date'\?dateInput\.value:H\.parseDisplayDate/);
  assert.match(hub, /No end time/);
  assert.match(current, /End Time must be later than the start time/);
  assert.doesNotMatch(current, /hub-appt-duration|Appointment Duration/);
});

test('customer rows and Calendar cards use compact schedule placement', () => {
  const hub = read('lotkeys-hub.js');
  const css = read('lotkeys-hub.css');
  const rowStart = hub.lastIndexOf('function deviceRow');
  const row = hub.slice(rowStart, hub.indexOf('function appointmentCard', rowStart));
  assert.match(row, /hub-device-identity-row.*inlinePhone/s);
  assert.match(row, /hub-device-schedule-row.*hub-tags.*appointmentChipMarkup\(contact\)/s);
  assert.match(row, /H\.deviceIdentity\(row\.title,row\.address,transport\)/);
  assert.match(row, /<article class="hub-device-row[^`]*\$\{target\} tabindex="0"/s);
  assert.doesNotMatch(row, /hub-device-detail-open" \$\{target\}/);
  assert.doesNotMatch(row, /<footer>/);
  assert.match(hub, /function appointmentTimeRange/);
  assert.match(hub, /suffix=hour>=12\?'PM':'AM'/);
  const cardStart = hub.lastIndexOf('function appointmentCard');
  const card = hub.slice(cardStart, hub.indexOf('function appointmentTimeOptions', cardStart));
  assert.match(card, /hub-appointment-entry.*hub-calendar-time-range.*hub-appointment customer-card/s);
  assert.match(card, /H\.appointmentIdentity\(appointment,contact\)/);
  assert.doesNotMatch(card, /durationMinutes| min<\/small>/);
  assert.match(css, /\.hub-device-card-top\{[^}]*grid-template-areas:"identity timestamp" "schedule schedule"/);
  assert.match(css, /\.hub-device-schedule-row\{[^}]*grid-template-columns:max-content minmax\(0,1fr\)/);
  assert.match(hub, /event\.target\.closest\?\.\('\[data-calendar-day\]'\)\?null:openDeviceConversation/);
  assert.match(css, /\.hub-appointment-entry>\.hub-appointment\.customer-card\{grid-template-columns:64px minmax\(0,1fr\)/);
});

test('smart-note choices stay local, recent and explicitly approved', () => {
  const hub = read('lotkeys-hub.js');
  const core = read('lotkeys-hub-core.js');
  assert.match(hub, /SMART_MESSAGE_LIMIT=5/);
  assert.match(hub, /setTimeout\(\(\)=>options\.hidden=true,5000\)/);
  assert.match(hub, /saveSuggestedField/);
  assert.match(hub, /Nothing is saved until you choose it/);
  assert.match(hub, /recentNodes=.*slice\(-SMART_MESSAGE_LIMIT\)/);
  assert.match(core, /Vehicle names are deliberately excluded/);
  assert.doesNotMatch(core.slice(core.indexOf('function suggestNotes'), core.indexOf('function recommendQuestions')), /add\('interestedVehicle'|vehicle(?:Year|Make|Model)/i);
});

test('both chat composers expose tap and hold media/voice controls', () => {
  const hub = read('lotkeys-hub.js');
  const messaging = read('lotkeys-messaging.js');
  assert.match(hub, /holdTimer=setTimeout\(\(\)=>\{if\(!start\)return;active=true;menu=gestureMenu\(button,items,onChoose\).*\},500\)/);
  assert.match(hub, /activeGestureTimer=setTimeout\(.*5000\)/);
  assert.match(hub, /button\.setPointerCapture\?\.\(pointerId\)/);
  assert.match(hub, /event\.preventDefault\(\);event\.stopPropagation\(\)/);
  assert.match(hub, /candidate\.score>\.45/);
  assert.match(hub, /hub-gesture-anchor/);
  for (const item of ['Camera', 'Images', 'Documents', 'Voice memo', 'Talk to text']) assert.match(hub, new RegExp(item));
  assert.match(hub, /navigator\.vibrate/);
  assert.match(hub, /SpeechRecognition|webkitSpeechRecognition/);
  assert.match(hub, /MediaRecorder/);
  assert.match(hub, /setupInternalComposer/);
  assert.match(messaging, /async function sendFile/);
  assert.match(messaging, /data-lkmsg-save-media/);
  assert.match(messaging, /async function mediaFile/);
});

test('Device MMS photos preview transiently, restore saved copies and split Media into sections', () => {
  const hub = read('lotkeys-hub.js');
  const core = read('lotkeys-hub-core.js');
  const css = read('lotkeys-hub.css');
  assert.match(hub, /mediaButton\.id='hub-device-files'/);
  assert.match(hub, /<span>💾<\/span><small>Media<\/small>/);
  assert.match(hub, /deviceMediaPreviews=new Map\(\)/);
  assert.match(hub, /P\.attachment\(part\.id\)/);
  assert.match(hub, /View photo/);
  assert.match(hub, /Loads from phone · not saved/);
  assert.match(hub, /URL\.revokeObjectURL\(preview\.url\)/);
  assert.match(hub, /activeDeviceMediaCleanup===clearDeviceMediaPreviews&&!root\.hidden/);
  assert.match(hub, /savedDeviceMedia\.get\(deviceMediaSourceKey\(message,part\)\)/);
  assert.match(hub, /S\.blob\(mediaContactId,retained\.id\)/);
  assert.match(hub, /preview=\{file,url,saved:!!retained\}/);
  assert.match(hub, /Saved in this contact’s private Media folder/);
  assert.match(hub, /deviceMediaObserver\.observe\(root,\{attributes:true/);
  assert.match(hub, /H\.splitAttachments\(c\.attachments\|\|\[\]\)/);
  assert.match(hub, /section\('Photos','🖼️',grouped\.photos/);
  assert.match(hub, /section\('Documents','📄',grouped\.documents/);
  assert.match(core, /function isPhotoAttachment/);
  assert.match(css, /\.hub-device-tools\.hub-six-actions\{grid-template-columns:repeat\(6/);
  assert.match(css, /\.hub-phone-photo-preview img/);
  assert.doesNotMatch(hub, /localStorage\.setItem\([^\n]*deviceMediaPreviews/);
});

test('PC chat actions dock at the side, Organize stays high contrast, and Enter sends', () => {
  const hub = read('lotkeys-hub.js');
  const messaging = read('lotkeys-messaging.js');
  const css = read('lotkeys-hub.css');
  const start = hub.lastIndexOf('async function openDeviceConversation(threadId)');
  const current = hub.slice(start, hub.indexOf('const openDeviceConversationWithMedia', start));
  assert.match(current, /<small>Notes<\/small>.*<small>Questions<\/small>.*<small>Call<\/small>.*<small>Booking<\/small>.*<small>Organize<\/small>/s);
  assert.match(current, /insertBefore\(mediaButton,\$\('#hub-device-appointment'/);
  assert.match(hub, /class="hub-btn hub-organize-button" id="hub-device-organize"/);
  assert.match(hub, /class="hub-btn hub-organize-button" id="hub-contact-organize"/);
  assert.match(hub, /class="hub-btn hub-organize-button" data-internal="organize"/);
  assert.match(css, /@media\(min-width:980px\)\{\.hub-device-tools\.hub-five-actions,\.hub-internal-tools\.hub-five-actions\{position:fixed;top:50%;right:12px/);
  assert.match(css, /\.hub-device-history\{padding-right:110px\}/);
  for (const source of [hub, messaging]) {
    assert.match(source, /const pcEnterSends=event=>event\.key==='Enter'&&!event\.shiftKey&&!event\.isComposing&&!event\.repeat/);
    assert.match(source, /\(min-width: 760px\) and \(pointer: fine\)/);
  }
  assert.match(current, /draft\.addEventListener\('keydown',event=>\{if\(!pcEnterSends\(event\)\)return;event\.preventDefault\(\);\$\('#hub-device-compose',root\)\.requestSubmit\(\)/);
  assert.match(hub, /if\(pcEnterSends\(event\)&&files\.length\)\{event\.preventDefault\(\);event\.stopImmediatePropagation\(\);send\.click\(\)/);
  assert.match(messaging, /input\.addEventListener\('keydown',e=>\{if\(pcEnterSends\(e\)\)\{e\.preventDefault\(\);send\(\)\}\}\)/);
});

test('live MMS photos open inline and older Device chunks load at the scroll boundary', () => {
  const hub = read('lotkeys-hub.js');
  const start = hub.lastIndexOf('async function openDeviceConversation(threadId)');
  const current = hub.slice(start, hub.indexOf('const openDeviceConversationWithMedia', start));
  assert.match(current, /newlyArrived=live\?H\.unseenDeviceMessages\(messages,bufferedOlder,pageMessages\):\[\]/);
  assert.match(current, /if\(live\)for\(const message of newlyArrived\)for\(const part of message\.attachments\|\|\[\]\)if\(H\.isPhotoAttachment\(part\)\)livePhotoKeys\.add/);
  assert.match(current, /!!retained\|\|livePhotoKeys\.delete\(key\)\|\|!!part\._file/);
  assert.match(current, /historyScrollArmed=false,lastHistoryScrollTop=mediaHistory\.scrollTop/);
  assert.match(current, /mediaHistory\.addEventListener\('scroll'/);
  assert.match(current, /mediaHistory\.scrollTop>120/);
  assert.match(current, /Loading older messages…/);
  assert.match(current, /requestAnimationFrame\(\(\)=>requestAnimationFrame\(resolve\)\)/);
  assert.match(current, /setAttribute\('aria-busy','true'\)/);
  assert.match(current, /bindOlderTrigger\(box\)/);
  assert.match(current, /setTimeout\(maybeLoadOlder,0\)/);
  assert.doesNotMatch(current, /action\(\$\('#hub-device-older',box\),\(\)=>loadPage\(true\)\)/);
});

test('Lock Screen and Device composer omit the reported clutter', () => {
  const html = read('index.html');
  const css = read('lotkeys-hub.css');
  assert.match(html, /<p>Enter your Lock Screen Password<\/p>/);
  assert.doesNotMatch(html, /Enter your Lock Screen password or 4-digit PIN/);
  assert.doesNotMatch(css, /\.hub-device-foot/);
});

test('Add to Hub contains exactly the five primary actions', () => {
  const hub = read('lotkeys-hub.js');
  const start = hub.lastIndexOf('function plusMenu');
  const current = hub.slice(start, hub.indexOf('function setupInternalComposer', start));
  assert.deepEqual([...current.matchAll(/data-add="([^"]+)"/g)].map(match => match[1]), ['chat', 'contact', 'note', 'file', 'reminder']);
  for (const label of ['Start new', 'LotKeys Chat / Group', 'Create new', 'Customer / Contact Note', 'Photo / Document', 'a Reminder']) assert.match(current, new RegExp(label));
  assert.doesNotMatch(current, /data-add="appointment"|data-add="category"/);
});

test('PC notification sounds never add a second Android alert', () => {
  const html = read('index.html');
  const messaging = read('lotkeys-messaging.js');
  assert.match(html, /PC Notification Sound/);
  assert.match(html, /Android phone stays silent/);
  assert.match(html, /lotkeysNotificationCustomSound/);
  assert.match(messaging, /if\(!preview&&isPhoneNotificationDevice\(\)\)return false/);
  assert.match(messaging, /notificationSounds/);
  assert.match(messaging, /playNotificationSound\(\)\.catch/);
});

test('an open Device chat refreshes when the phone reports new messages', () => {
  const hub = read('lotkeys-hub.js');
  assert.match(hub, /activeDeviceChatRefresh=null/);
  assert.match(hub, /activeDeviceChatRefresh=\(\)=>loadPage\(false,\{live:true\}\)/);
  assert.match(hub, /lotkeys-phone-data',event=>\{scheduleRefresh\(\);.*if\(event\.detail\?\.reason!=='read'\)activeDeviceChatRefresh\?\.\(\)/);
  assert.match(hub, /liveRefreshPending/);
  assert.match(hub, /liveChatIsCurrent/);
  assert.match(hub, /H\.mergeDeviceMessages\(messages,liveIncoming\)/);
  assert.match(hub, /else if\(!live\|\|!loadedOlder\)\{const visibleIds=.*bufferedOlder=split\.buffered\.filter\(.*remoteHasMore=!!page\.hasMore;nextBefore=page\.nextBefore\|\|null;\}/);
});

test('Device history warms ten recent chats and reveals six messages before buffered chunks', () => {
  const hub = read('lotkeys-hub.js');
  const core = read('lotkeys-hub-core.js');
  assert.match(hub, /DEVICE_INITIAL_MESSAGE_COUNT=6/);
  assert.match(hub, /DEVICE_OLDER_MESSAGE_CHUNK=20/);
  assert.match(hub, /DEVICE_HISTORY_CACHE_MS=5\*60\*1000/);
  assert.match(hub, /DEVICE_HISTORY_CACHE_MAX=10/);
  assert.match(hub, /prefetchRecentDeviceHistory/);
  assert.match(hub, /deviceHistoryCache=new Map\(\),deviceHistoryRequests=new Map\(\)/);
  assert.match(hub, /setTimeout\(\(\)=>\{if\(deviceHistoryCache\.get\(key\)===entry\)deviceHistoryCache\.delete\(key\);\},DEVICE_HISTORY_CACHE_MS\)/);
  assert.match(hub, /while\(deviceHistoryCache\.size>DEVICE_HISTORY_CACHE_MAX\)forgetDeviceHistory/);
  assert.match(hub, /lotkeys-phone-disconnected',\(\)=>\{clearDeviceHistoryCache\(\)/);
  assert.match(hub, /pagehide',\(\)=>\{.*clearDeviceHistoryCache\(\)/);
  assert.match(hub, /H\.splitDeviceHistory\(pageMessages,older\?DEVICE_OLDER_MESSAGE_CHUNK:DEVICE_INITIAL_MESSAGE_COUNT\)/);
  assert.match(hub, /H\.revealDeviceHistory\(bufferedOlder,DEVICE_OLDER_MESSAGE_CHUNK\)/);
  assert.match(hub, /hasMore=bufferedOlder\.length>0\|\|remoteHasMore/);
  assert.doesNotMatch(hub, /localStorage\.setItem\([^\n]*deviceHistory/);
  assert.match(core, /function splitDeviceHistory\(rows, visibleCount = 6\)/);
  assert.match(core, /function revealDeviceHistory\(buffered, chunkSize = 20\)/);
  assert.match(core, /function unseenDeviceMessages\(current, buffered, incoming\)/);
});

test('Hub logo and floating actions use the corrected responsive layout', () => {
  const css = read('lotkeys-hub.css');
  assert.match(css, /\.hub-brand img\{border-radius:22%;clip-path:inset\(0 round 22%\)\}/);
  assert.match(css, /\.hub-actions\{right:12px;bottom:12px\}/);
  assert.match(css, /@media\(min-width:980px\).*\.hub-actions\{top:50%;bottom:auto/s);
});
