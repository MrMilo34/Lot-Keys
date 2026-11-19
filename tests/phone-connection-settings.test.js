'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const Phone = require('../lotkeys-phone-core.js');
const source = fs.readFileSync(require.resolve('../lotkeys-hub.js'), 'utf8');
function fixture(connected = false, role = 'pc') {
  const state = { role, native: role === 'phone', relayReady: true, registered: true, connected, rememberedPair: { deviceId: 'registered-phone' }, coverage: { label: 'SMS/MMS only' }, capabilities: {} };
  state.connection = Phone.connectionStatus(state);
  const actions = new Map(), listeners = new Map(), nodes = new Map(), cards = [{ className: '' }], toasts = [], calls = { retry: 0, pairing: 0, add: 0 }; let html;
  const dialog = { isConnected: true, close() { this.isConnected = false; } };
  const context = {
    P: { status: () => state, retryPhoneConnection: async () => { calls.retry++; return false; } },
    S: { pending: async () => 0 }, e: x => String(x ?? ''), modal: (title, body) => { html = body; return dialog; },
    window: { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) }, $$: () => cards,
    $: selector => { if(!nodes.has(selector))nodes.set(selector,{ selector });return nodes.get(selector); }, action: (button, fn) => actions.set(button.selector, fn), toast: text => toasts.push(text),
    addComputer: async () => { calls.add++; }, pairPhone: async () => { calls.pairing++; }, pairingFailure: error => { throw error; }
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('function phonePrimaryLabel('), source.indexOf('\nfunction paintStatus(')), context);
  vm.runInContext(source.slice(source.indexOf('function bindConnectionStatus('), source.indexOf('async function phoneStatusDetails(')), context);
  vm.runInContext(source.slice(source.indexOf('async function phoneStatusDetails('), source.indexOf('\nfunction paintRows(')), context);
  return { context, state, listeners, cards, nodes, actions, calls, toasts, dialog, html: () => html };
}
test('status-light settings show green registration and a retry action that reuses trust', async () => {
  const f = fixture(); await f.context.phoneStatusDetails();
  assert.match(f.html(), /hub-status phone green/);
  assert.match(f.html(), /Phone registered/);
  assert.match(f.html(), /Retry phone connection/);
  await f.actions.get('#hub-phone-action')();
  assert.equal(f.calls.retry, 1); assert.equal(f.calls.pairing, 0);
  assert.equal(f.dialog.isConnected, false);
  assert.match(f.toasts.at(-1), /Calling your registered phone/);
  assert.doesNotMatch(f.toasts.at(-1), /Phone connected/);
});
test('an acknowledged live connection shows blue and opens the existing device settings', async () => {
  const f = fixture(true); await f.context.phoneStatusDetails();
  assert.match(f.html(), /hub-status phone blue/);
  assert.match(f.html(), /Phone connected/);
  assert.match(f.html(), /Connected devices/);
  assert.doesNotMatch(f.html(), /Retry phone connection/);
});

test('the phone offers Add a PC and an open status dialog follows live blue/disconnected changes', async () => {
  const f=fixture(false,'phone');await f.context.phoneStatusDetails();
  assert.match(f.html(),/Add a PC/);await f.actions.get('#hub-phone-action')();assert.equal(f.calls.add,1);
  f.state.connected=true;f.state.connection=Phone.connectionStatus(f.state);f.listeners.get('lotkeys-phone-status')();
  assert.equal(f.cards[0].className,'hub-status phone blue');assert.equal(f.nodes.get('[data-live-phone-label]').textContent,'Computer connected');
  f.state.connected=false;f.state.connection=Phone.connectionStatus(f.state);f.listeners.get('lotkeys-phone-status')();
  assert.equal(f.cards[0].className,'hub-status phone green');
  f.dialog._cleanup();assert.equal(f.listeners.has('lotkeys-phone-status'),false);
});
test('Add a PC checks Android for an existing code and never starts a second PC-side pairing', async()=>{
  const f=fixture(false,'phone'),offers=[];let checked=0;
  f.context.addPcDialog=null;f.context.P.preparePhonePairing=async()=>{checked++;};
  f.context.P.pendingPairings=()=>[{sessionId:'pending-pc',code:'4512',pcName:'My PC'}];
  f.context.showPairRequest=offer=>offers.push(offer);f.context.report=error=>{throw error;};
  vm.runInContext(source.slice(source.indexOf('async function addComputer('),source.indexOf('async function preparePhoneForPairing(')),f.context);
  await f.context.addComputer();assert.equal(checked,1);assert.equal(offers[0].code,'4512');assert.equal(f.calls.pairing,0);
});
test('a live phone makes the header light blue even while separate Store authorization needs attention',async()=>{
  const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),dot={},label={setAttribute(){}},state={connected:true,role:'phone',native:true,relayReady:true,relayError:'Previous network check failed'};
  const c={window:{LotKeysPhone:{status:()=>state}},$:selector=>selector==='#sync-readiness'?dot:label,paintLiveUploadHeader:()=>false,getReadinessState:async()=>({level:'warn',title:'Reconnect to Store'}),paintProtocolState(){},driveConnectInProgress:false,inventoryRefreshBusy:false,listingsRefreshBusy:false,activeSyncProgress:()=>null};
  dot.setAttribute=()=>{};vm.createContext(c);
  vm.runInContext(html.slice(html.indexOf('  function phoneHeaderPaired('),html.indexOf('  function paintLiveUploadHeader(')),c);
  vm.runInContext(html.slice(html.indexOf('  async function updateReadinessIndicator('),html.indexOf("  window.addEventListener('lotkeys-phone-status'")),c);
  await c.updateReadinessIndicator();assert.match(dot.className,/phone-paired/);assert.equal(dot.title,'Reconnect to Store');assert.equal(label.textContent,'Please Sync');
  state.connected=false;await c.updateReadinessIndicator();assert.doesNotMatch(dot.className,/phone-paired/);
});
