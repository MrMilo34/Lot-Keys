/* LotKeys Phone V0.9.5.32 — identity, trust, pairing and SMS receipt helpers. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LotKeysPhoneCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const text = value => String(value ?? '').trim();

  function buildMultipartJsonUpload(boundary, metadata, data) {
    if (!/^[A-Za-z0-9_-]+$/.test(boundary)) throw new Error('Invalid Drive upload boundary.');
    const contentType = 'multipart/related; boundary=' + boundary;
    const body = new Blob([
      '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n', JSON.stringify(metadata),
      '\r\n--' + boundary + '\r\nContent-Type: application/json\r\n\r\n', JSON.stringify(data),
      '\r\n--' + boundary + '--'
    ]);
    return { contentType, body };
  }

  function phone(value) {
    let normalized = text(value)
      .replace(/^tel:/i, '')
      .replace(/(?:ext\.?|x)\s*\d+$/i, '')
      .replace(/[^+\d]/g, '');
    if (normalized.startsWith('00')) normalized = '+' + normalized.slice(2);
    const digits = normalized.replace(/\D/g, '');
    if (digits.length === 10) return '+1' + digits;
    if (digits.length === 11 && digits[0] === '1') return '+' + digits;
    return normalized.startsWith('+') && digits.length >= 7 && digits.length <= 15 ? '+' + digits : digits;
  }

  function contactPhone(contact) {
    const fields = Array.isArray(contact?.fields) ? contact.fields : [];
    const field = fields.find(item => item.kind === 'phone' && item.primary) || fields.find(item => item.kind === 'phone');
    return phone(field?.value || '');
  }

  function contactFor(thread, contacts = []) {
    const wanted = phone(thread?.address || '');
    if (!wanted) return null;
    return contacts.find(contact => (contact.fields || []).some(field => field.kind === 'phone' && phone(field.value) === wanted)) || null;
  }

  function sortingFor(thread, sorting = []) {
    const wanted = phone(thread?.address || '');
    return wanted ? sorting.find(item => phone(item.phone) === wanted) || null : null;
  }

  function displayName(thread, contacts = []) {
    const contact = contactFor(thread, contacts);
    return text(contact?.name) || text(thread?.phoneContactName) || text(thread?.title) || text(thread?.address) || 'Unknown number';
  }

  function decorateThread(thread, contacts = [], sorting = []) {
    const contact = contactFor(thread, contacts);
    const sort = sortingFor(thread, sorting);
    const categoryIds = [...new Set([
      ...(Array.isArray(sort?.categoryIds) ? sort.categoryIds : []),
      ...(!sort && Array.isArray(contact?.categoryIds) ? contact.categoryIds : [])
    ].map(text).filter(Boolean))];
    return {
      ...thread,
      source: 'device',
      contact: contact || null,
      sorting: sort || null,
      title: displayName(thread, contacts),
      phone: phone(thread?.address || ''),
      organization: {
        categoryIds,
        primaryCategoryId: text(sort?.primaryCategoryId || contact?.primaryCategoryId || categoryIds[0] || '')
      }
    };
  }

  function normalizeThreads(rows, contacts = [], sorting = []) {
    const seen = new Set();
    return (Array.isArray(rows) ? rows : [])
      .filter(row => row && /^smsmms-\d{1,18}$/.test(text(row.id)) && !seen.has(row.id) && seen.add(row.id))
      .map(row => decorateThread({
        ...row,
        at: Number(row.at) || 0,
        unread: Math.max(0, Number(row.unread) || 0),
        preview: text(row.preview).slice(0, 350),
        address: text(row.address).slice(0, 100),
        phoneContactName: text(row.phoneContactName).slice(0, 300),
        group: !!row.group,
        canReply: !!row.canReply
      }, contacts, sorting))
      .sort((left, right) => right.at - left.at || left.title.localeCompare(right.title));
  }

  function threadAlertSignature(thread) {
    return JSON.stringify([
      text(thread?.id),
      Math.max(0, Number(thread?.at) || 0),
      Math.max(0, Number(thread?.count) || 0),
      text(thread?.preview).slice(0, 350)
    ]);
  }

  function latestIncomingMarker(messages) {
    let latest = null;
    for (const message of Array.isArray(messages) ? messages : []) {
      if (!message || message.outgoing) continue;
      const candidate = { at: Math.max(0, Number(message.at) || 0), id: text(message.id) };
      if (!latest || candidate.at > latest.at || (candidate.at === latest.at && candidate.id > latest.id)) latest = candidate;
    }
    return latest ? JSON.stringify([latest.at, latest.id]) : '';
  }

  function makeThreadReadReceipt(thread, messages, seenAt = Date.now()) {
    return {
      signature: threadAlertSignature(thread),
      incomingMarker: latestIncomingMarker(messages),
      seenAt: Math.max(0, Number(seenAt) || 0)
    };
  }

  function applyThreadReadReceipts(rows, receipts = {}) {
    const source = receipts && typeof receipts === 'object' ? receipts : {};
    return (Array.isArray(rows) ? rows : []).map(thread => {
      const rawUnread = Math.max(0, Number(thread?.rawUnread ?? thread?.unread) || 0);
      const receipt = source[text(thread?.id)];
      const acknowledged = rawUnread > 0 && text(receipt?.signature) === threadAlertSignature(thread);
      return { ...thread, rawUnread, unread: acknowledged ? 0 : rawUnread };
    });
  }

  function receiptHasNewIncoming(receipt, messages) {
    const latest = latestIncomingMarker(messages);
    return !latest || !text(receipt?.incomingMarker) || latest !== text(receipt.incomingMarker);
  }

  function trustExpiry(mode, now = Date.now()) {
    if (mode === '36h') return now + 36 * 60 * 60 * 1000;
    if (mode === '7d') return now + 7 * 24 * 60 * 60 * 1000;
    if (mode === 'until-disconnect') return Number.MAX_SAFE_INTEGER;
    return 0;
  }

  function trustValid(record, browserId, now = Date.now()) {
    if (!record || text(record.browserId) !== text(browserId) || record.mode === 'ask') return false;
    return record.mode === 'until-disconnect' || Number(record.expiresAt) > now;
  }

  function rememberedPairValid(record, browserId, now = Date.now()) {
    if (!record || text(record.browserId) !== text(browserId)) return false;
    if (!['36h', '7d', 'until-disconnect'].includes(text(record.trustMode))) return false;
    if (record.trustMode === 'until-disconnect') return record.disconnected !== true;
    return Number(record.trustExpiresAt) > now;
  }

  function automaticReconnectReady({
    nativeToken = false,
    session = false,
    pairing = false,
    remembered = false,
    driveConnected = false,
    lastAttemptAt = 0,
    now = Date.now(),
    minimumInterval = 10000
  } = {}) {
    if (nativeToken || session || pairing || !remembered || !driveConnected) return false;
    return Number(now) - Number(lastAttemptAt || 0) >= Math.max(0, Number(minimumInterval) || 0);
  }

  function validateStoredSession(value, role, now = Date.now()) {
    if (!value || value.version !== 1 || value.role !== role) return false;
    if (!/^[A-Za-z0-9_-]{16,80}$/.test(text(value.sessionId))) return false;
    if (!/^[A-Za-z0-9_-]{40,60}$/.test(text(value.key))) return false;
    if (!/^[A-Za-z0-9_-]{16,100}$/.test(text(value.browserId))) return false;
    const savedAt = Number(value.savedAt);
    if (!savedAt || savedAt > now + 60000 || now - savedAt > 8 * 24 * 60 * 60 * 1000) return false;
    return true;
  }

  function coverage({ connected = false, native = false, sms = false, rcs = false } = {}) {
    if (!connected && !native) return { level: 'red', label: 'Phone unavailable', detail: 'Device Messages are locked.' };
    if (sms && rcs) return { level: 'green', label: 'Full coverage', detail: 'SMS/MMS and the RCS safety watcher are active.' };
    if (sms) return { level: 'amber', label: 'SMS/MMS live', detail: 'RCS safety coverage is not enabled yet.' };
    return { level: 'red', label: 'Messages unavailable', detail: 'Repair Android Messages access.' };
  }

  function connectionStatus({ connected = false, registered = false, role = 'pc' } = {}) {
    if (connected) return { level: 'blue', label: role === 'phone' ? 'Computer connected' : 'Phone connected', detail: 'The paired device has acknowledged the live connection.' };
    if (registered) return { level: 'green', label: role === 'phone' ? 'Phone ready' : 'Phone registered', detail: role === 'phone' ? 'Waiting for a trusted computer to connect.' : 'Not connected yet. This PC automatically retries while LotKeys is open.' };
    return { level: 'red', label: 'Phone setup needed', detail: role === 'phone' ? 'Finish the Android phone connection setup.' : 'Connect a phone once and approve this computer.' };
  }

  function validatePairOffer(value, now = Date.now()) {
    if (!value || value.version !== 1 || value.type !== 'offer') return false;
    if (!/^[A-Za-z0-9_-]{16,80}$/.test(text(value.sessionId))) return false;
    if (!/^\d{4}$/.test(text(value.code))) return false;
    if (!/^[A-Za-z0-9_-]{16,100}$/.test(text(value.browserId))) return false;
    if (!value.publicKey || value.publicKey.kty !== 'EC' || value.publicKey.crv !== 'P-256') return false;
    return Number(value.expiresAt) > now && Number(value.expiresAt) <= now + 15 * 60 * 1000;
  }

  function smsSendOutcome(receipt = {}) {
    const phase = text(receipt.phase), error = text(receipt.error);
    if (phase === 'sent') return {state:'sent',label:'Sent',error:'',action:''};
    if (phase === 'sending') return {state:'sending',label:'Sending',error,action:'check'};
    // The installed connector cannot distinguish an all-part failure from a partial send.
    // Only explicit pre-submission validation failures permit a brand-new send request.
    const safeFailure = phase === 'failed' && /^(Allow SMS sending|Allow SMS access|Allow Messages access|Choose the default SMS SIM|Use the phone's messaging app|The phone recipient changed|Enter a message under|This message exceeds|The phone could not reserve|SMS was not submitted)/.test(error);
    if (safeFailure) return {state:'failed',label:'Failed',error,action:'retry'};
    return {state:'unconfirmed',label:phase === 'failed'?'Check phone':'Not confirmed',error:error || 'The phone has not confirmed this SMS. Check the phone before sending it again.',action:'check'};
  }

  return {
    version: '0.9.5.32',
    buildMultipartJsonUpload,
    smsSendOutcome,
    phone,
    contactPhone,
    contactFor,
    sortingFor,
    displayName,
    decorateThread,
    normalizeThreads,
    threadAlertSignature,
    latestIncomingMarker,
    makeThreadReadReceipt,
    applyThreadReadReceipts,
    receiptHasNewIncoming,
    trustExpiry,
    trustValid,
    rememberedPairValid,
    automaticReconnectReady,
    validateStoredSession,
    coverage,
    connectionStatus,
    validatePairOffer
  };
});
