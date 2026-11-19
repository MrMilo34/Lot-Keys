(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./lotkeys-transfer-core.js'));
  else root.LotKeysNativeTransfers = factory(root.LotKeysTransferCore);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Core) {
  'use strict';
  const CHUNK = 512 * 1024;
  function bridge() { return globalThis.LotKeysPhone; }
  async function available(account, phone = bridge()) {
    if (!phone?.uploadCapabilities) return false;
    try { const status = await phone.uploadCapabilities(); return status.capabilities?.backgroundUploads === true && String(status.uploadAccount || '').toLowerCase() === String(account || '').toLowerCase(); }
    catch { return false; }
  }
  function base64(buffer) {
    const bytes = new Uint8Array(buffer); let result = '';
    for (let i = 0; i < bytes.length; i += 8192) result += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(result);
  }
  function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
  }
  function handoffProof(snapshot, plan, id, retained = false) {
    const reject = message => { const error = Error(message); error.nativeTransfer = true; error.code = 'NATIVE_STATUS_UNAVAILABLE'; throw error; };
    if (!snapshot || typeof snapshot.id !== 'string' || !snapshot.id || !snapshot.context || !Array.isArray(snapshot.assets) || typeof snapshot.state !== 'string') reject('Android returned an incomplete handoff receipt. Reopen LotKeys to check its retained save.');
    if (!Core.sameContext(snapshot.context, plan.context)) { const error = Error('The background upload belongs to another account, Store or edit. Its originals are retained.'); error.nativeTransfer = true; error.code = 'NATIVE_CONTEXT_MISMATCH'; throw error; }
    if (id && snapshot.id !== id) reject('Android returned another save receipt. The original job has been kept.');
    if (snapshot.assets.length !== plan.assets.length || (plan.version === 2 && snapshot.version !== 2)) reject('Android has not confirmed the complete original-file plan.');
    const seen = new Set();
    for (let i = 0; i < plan.assets.length; i++) {
      const expected = plan.assets[i], actual = snapshot.assets[i];
      if (!actual || seen.has(actual.key) || ['key', 'name', 'parent', 'size'].some(key => actual[key] !== expected[key]) || (expected.driveId && actual.driveId !== expected.driveId)) reject('Android has not confirmed every original and its saved destination.');
      seen.add(actual.key);
      if (retained && Number(actual.staged) !== expected.size && !(Number(actual.confirmed) === expected.size && /^[A-Za-z0-9_-]{8,200}$/.test(String(actual.result?.id || '')))) reject('Android has not confirmed retention of every original. Keep LotKeys open and check the save again.');
    }
    if (JSON.stringify(canonical(snapshot.finalizers)) !== JSON.stringify(canonical(plan.finalizers))) reject('Android has not confirmed the complete finishing plan.');
    if (retained && (snapshot.held || !['queued', 'uploading', 'finalizing', 'retrying', 'complete', 'needs_reconcile'].includes(snapshot.state))) {
      const error = Error(snapshot.error || 'The Android save is paused or has not committed. Its originals are retained.'); error.nativeTransfer = true; error.nativeState = snapshot.state; throw error;
    }
    return snapshot;
  }
  async function handoff(plan, sources, { phone = bridge(), onProgress = () => {}, onPrepared = async () => {}, onCommitted = async () => {}, check = async () => {}, clock = Date.now } = {}) {
    const timing = { stagingStartedAt: clock(), originalBytes: plan.assets.reduce((sum, row) => sum + row.size, 0), originalCount: plan.assets.length };
    await check();
    let snapshot = await phone.uploadCall('prepare', plan);
    handoffProof(snapshot, plan);
    // Persist the receipt BEFORE transferring bytes. A refresh resumes staging instead
    // of making a second batch while Android already owns part of the originals.
    await onPrepared(snapshot);
    const id = snapshot.id;
    const commit = async () => {
      timing.commitStartedAt = clock();
      snapshot = handoffProof(await phone.uploadCall('commit', { id }, 180000), plan, id, true);
      timing.readyAt = clock();
      timing.stagingMs = Math.max(0, timing.commitStartedAt - timing.stagingStartedAt);
      timing.commitMs = Math.max(0, timing.readyAt - timing.commitStartedAt);
      // Persist the committed receipt BEFORE presenting permission to switch apps.
      await onCommitted(snapshot, timing);
      onProgress({ phase: snapshot.state, version:plan.version, execution:snapshot.execution, ...Core.progress(snapshot) });
      return snapshot;
    };
    if (Core.terminal(snapshot.state)) { if (snapshot.state === 'complete' || snapshot.state === 'needs_reconcile') handoffProof(snapshot, plan, id, true); return snapshot; }
    if (snapshot.state !== 'staging') return commit();
    const total = plan.assets.reduce((sum, row) => sum + row.size, 0); let staged = 0;
    const chunkSize = plan.version === 2 ? Math.min(1024 * 1024, Math.max(CHUNK, Number(plan.stagingChunkBytes) || CHUNK)) : CHUNK;
    for (let item = 0; item < plan.assets.length; item++) {
      const source = sources.get(plan.assets[item].key);
      if (!(source instanceof Blob) || source.size !== plan.assets[item].size) throw Error('Keep the original file available until Android finishes preparing this save.');
      let offset = Number(snapshot.assets[item].staged) || 0;
      if (offset < 0 || offset > source.size) throw Error('Android returned an invalid original-file checkpoint.');
      staged += offset;
      while (offset < source.size) {
        await check();
        const end = Math.min(source.size, offset + chunkSize), bytes = base64(await source.slice(offset, end).arrayBuffer());
        let receipt;
        try { receipt = await phone.uploadCall('chunk', { id: snapshot.id, item, offset, base64: bytes }); }
        catch { receipt = await phone.uploadCall('chunk', { id: snapshot.id, item, offset, base64: bytes }); }
        if (receipt.staged !== end) throw Error('Android has not confirmed the original-file handoff.');
        staged += end - offset; offset = end;
        onProgress({ phase: 'staging', staged, total, version:plan.version, fileIndex:item+1, fileCount:plan.assets.length, fileName:plan.assets[item].name, percent: total ? Math.floor(staged * 100 / total) : 0 });
      }
    }
    await check(); return commit();
  }
  async function readStatus(id, phone = bridge()) {
    try {
      const value = await phone.uploadCall('status', { id });
      if (!value || !value.context || !Object.prototype.hasOwnProperty.call(value.context, 'revision') || !Array.isArray(value.assets) || typeof value.state !== 'string' || !value.state) throw Error('Android returned an incomplete save status.');
      Core.context(value.context);
      return value;
    } catch (cause) {
      if (Number(cause?.status) >= 400 && ![408, 425, 429].includes(Number(cause.status)) && Number(cause.status) < 500) { cause.nativeTransfer = true; cause.code = 'NATIVE_STATUS_REJECTED'; throw cause; }
      const error = Error('Android save status unavailable: ' + (cause?.message || 'Reconnect to check its retained originals.'));
      error.code = 'NATIVE_STATUS_UNAVAILABLE'; error.nativeTransfer = true; error.cause = cause; throw error;
    }
  }
  function presentation(value = {}) {
    const phase = String(value.phase || ''), reason = String(value.error || '').trim();
    if (phase === 'staging') return { status: 'uploading', backgroundReady: false, message: 'Preparing originals for Android · keep LotKeys open' };
    if (phase === 'queued' && value.execution === 'scheduled') return { status: 'queued', backgroundReady: true, message: 'Android retained the originals · open Background upload controls to start the transfer; Android may defer ordinary work' };
    if (phase === 'queued') return { status: 'queued', backgroundReady: true, message: value.version === 2 ? 'Ready to switch apps · Android has the files and finishing work' : 'Android has the originals · waiting for Android to start the Drive save' };
    if (phase === 'uploading') return { status: 'uploading', backgroundReady: true, message: 'Android reports uploading to Drive · originals are retained' };
    if (phase === 'finalizing') return { status: 'processing', backgroundReady: true, message: value.stage === 'directory' ? 'Files saved · Android is creating the Vehicle Info Sheet' : 'Files saved · updating Inventory preview' };
    if (phase === 'complete') return { status: 'processing', backgroundReady: true, message: 'Files saved · confirming the Vehicle Profile' };
    if (phase === 'retrying') return { status: 'paused', backgroundReady: true, message: reason || 'Android retained the originals · waiting to retry Drive' };
    if (phase === 'needs_reconcile') return { status: 'paused', backgroundReady: true, message: reason || 'Files saved · open LotKeys to finish Inventory' };
    if (phase === 'status_unavailable') return { status: 'paused', backgroundReady: false, message: reason || 'Reconnecting to check the retained Android save' };
    if (phase === 'failed' || phase === 'cancelled' || phase === 'context_mismatch' || phase.startsWith('paused_')) return { status: 'error', backgroundReady: false, message: reason || 'Android save needs attention · open the Vehicle Profile for the reason' };
    return { status: 'paused', backgroundReady: false, message: 'Checking the retained Android save' };
  }
  async function waitUntilVisible(visibility) {
    if (!visibility || visibility.visibilityState !== 'hidden') return;
    await new Promise(resolve => {
      const resumed = () => { if (visibility.visibilityState !== 'hidden') { visibility.removeEventListener('visibilitychange', resumed); resolve(); } };
      visibility.addEventListener('visibilitychange', resumed); resumed();
    });
  }
  async function wait(id, context, { phone = bridge(), check = async () => {}, onProgress = () => {}, onSnapshot = () => {}, delay = ms => new Promise(resolve => setTimeout(resolve, ms)), visibility = globalThis.document } = {}) {
    let lastProgress = { percent: 0 };
    while (true) {
      await waitUntilVisible(visibility); await check(); let snapshot;
      try { snapshot = await readStatus(id, phone); }
      catch (error) { onProgress({ phase: 'status_unavailable', error: error.message, ...lastProgress }); throw error; }
      if (!Core.sameContext(snapshot.context, context)) {
        const actual = Core.context(snapshot.context), expected = Core.context(context), labels = { account: 'Google account', store: 'Store', record: 'Vehicle', revision: 'Vehicle edit' };
        const changed = Object.keys(labels).filter(key => actual[key] !== expected[key]).map(key => labels[key]);
        const error = Error('The background upload belongs to another account, Store or edit. Mismatch: ' + changed.join(', ') + '. Its originals are retained.');
        error.nativeTransfer = true; error.code = 'NATIVE_CONTEXT_MISMATCH'; throw error;
      }
      let result;
      try { result = Core.completed(snapshot, context); }
      catch (error) { error.nativeTransfer = true; error.code = 'NATIVE_RESULT_INVALID'; throw error; }
      onSnapshot(snapshot); lastProgress = Core.progress(snapshot); onProgress({ phase: snapshot.state, stage:snapshot.stage||'', version:snapshot.version, execution:snapshot.execution, error: snapshot.error || '', ...lastProgress });
      if (result) return result;
      if (snapshot.held) { const error = Error('This save is paused for its original account, Store or edit. Resume it from that context.'); error.nativeTransfer = true; error.nativeState = 'paused_context'; throw error; }
      if (Core.terminal(snapshot.state) || snapshot.state.startsWith('paused_')) {
        const error = Error(snapshot.error || 'The Android save needs attention. Reopen Android setup to resume.');
        error.nativeTransfer = true; error.nativeState = snapshot.state; error.snapshot = snapshot; throw error;
      }
      await delay(1500);
    }
  }
  async function hold(account, store, phone = bridge()) {
    if (!account || !store || !phone?.uploadCall) return;
    return phone.uploadCall('hold', { account, store }, 5000);
  }
  return { available, handoff, readStatus, presentation, wait, hold, chunkSize: CHUNK };
});
