/* Durable native transfer protocol. No Google credentials or file bytes are persisted here. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LotKeysTransferCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const FILE_ID = /^[A-Za-z0-9_-]{8,200}$/;
  const terminal = new Set(['complete', 'cancelled', 'failed', 'needs_reconcile']);
  function context(value) {
    const account = String(value?.account || '').trim().toLowerCase();
    const store = String(value?.store || '').trim();
    const record = String(value?.record || '').trim();
    if (!account || !FILE_ID.test(store) || !record || record.length > 200) throw Error('Missing account, Store or record for background upload.');
    return { account, store, record, revision: String(value?.revision || '0') };
  }
  function key(value) {
    const c = context(value);
    return JSON.stringify([c.account, c.store, c.record, c.revision]);
  }
  function sameContext(left, right) {
    try { return key(left) === key(right); } catch { return false; }
  }
  function acceptedOffset(range, total) {
    if (!range) return 0;
    const match = /^bytes\s*=\s*0-(\d+)$/i.exec(String(range).trim());
    if (!match) throw Error('Drive returned an invalid confirmed byte range.');
    const value = Number(match[1]) + 1;
    if (!Number.isSafeInteger(value) || value < 1 || value > total) throw Error('Drive confirmed an impossible upload range.');
    return value;
  }
  function validateAsset(asset) {
    if (!asset || !String(asset.key || '') || String(asset.key).length > 200 || !FILE_ID.test(String(asset.parent || ''))) throw Error('Invalid upload destination.');
    if (!Number.isSafeInteger(asset.size) || asset.size < 0) throw Error('Invalid upload size.');
    if (!String(asset.name || '').trim() || String(asset.name).length > 240) throw Error('Invalid upload filename.');
    return { ...asset, type: String(asset.type || 'application/octet-stream'), properties: { ...(asset.properties || {}) } };
  }
  function batch(value, assets, finalizers = []) {
    const c = context(value), seen = new Set();
    const rows = assets.map(validateAsset);
    for (const item of rows) {
      if (seen.has(item.key)) throw Error('Duplicate asset in upload batch.');
      seen.add(item.key);
    }
    return { version: 1, context: c, key: key(c), assets: rows, finalizers };
  }
  function progress(snapshot) {
    const rows = Array.isArray(snapshot?.assets) ? snapshot.assets : [];
    const total = rows.reduce((sum, row) => sum + Math.max(0, Number(row.size) || 0), 0);
    const confirmed = rows.reduce((sum, row) => sum + Math.min(Math.max(0, Number(row.confirmed) || 0), Math.max(0, Number(row.size) || 0)), 0);
    return { confirmed, total, percent: snapshot?.state === 'complete' ? 100 : total ? Math.min(99, Math.floor(confirmed * 100 / total)) : 0 };
  }
  function completed(snapshot, expected) {
    if (!sameContext(snapshot?.context, expected)) throw Error('The background upload belongs to another account, Store or edit.');
    if (snapshot.state !== 'complete') return null;
    const results = {};
    for (const row of snapshot.assets || []) {
      if (!FILE_ID.test(String(row.result?.id || ''))) throw Error('Drive has not confirmed every uploaded file.');
      results[row.key] = { ...row.result };
    }
    return results;
  }
  return { context, key, sameContext, acceptedOffset, validateAsset, batch, progress, completed, terminal: value => terminal.has(value) };
});
