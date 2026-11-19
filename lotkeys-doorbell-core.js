(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LotKeysDoorbellCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const ID = /^[A-Za-z0-9_-]{16,100}$/;
  function endpoint(value) { try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'script.google.com' && /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) && !url.search && !url.hash && !url.username && !url.password && !url.port; } catch { return false; } }
  function validGrant(grant, expected, time = Date.now()) {
    return !!grant && endpoint(grant.endpoint) && ID.test(grant.id) && /^[A-Za-z0-9_-]{43}$/.test(grant.secret || '') &&
      ID.test(grant.deviceId) && ID.test(grant.browserId) && grant.deviceId === expected.deviceId && grant.browserId === expected.browserId &&
      String(grant.account || '').toLowerCase() === String(expected.account || '').toLowerCase() && !!expected.account &&
      Number.isSafeInteger(grant.expiresAt) && grant.expiresAt > time && grant.expiresAt <= time + 8 * 86400000;
  }
  function canonical(value) {
    for (const key of ['id', 'deviceId', 'browserId', 'nonce', 'sessionId']) if (!ID.test(value[key] || '')) throw Error('Invalid phone wake identifier.');
    const time = Number(value.issuedAt); if (!Number.isSafeInteger(time) || time <= 0) throw Error('Invalid phone wake time.');
    return ['lotkeys-wake-v1', value.id, value.deviceId, value.browserId, value.nonce, String(time), value.sessionId].join('\n');
  }
  async function envelope(grant, sessionId, { crypto = globalThis.crypto, time = Date.now() } = {}) {
    const encode = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const value = { action: 'wake', id: grant.id, deviceId: grant.deviceId, browserId: grant.browserId, sessionId, nonce: encode(crypto.getRandomValues(new Uint8Array(18))), issuedAt: time };
    const key = await crypto.subtle.importKey('raw', Uint8Array.from(atob(grant.secret.replace(/-/g, '+').replace(/_/g, '/') + '='), x => x.charCodeAt(0)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    value.signature = encode(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(canonical(value)))));
    return value;
  }
  return { endpoint, validGrant, canonical, envelope };
});
