/* LotKeys Hub V0.9.5.26 — pure customer, conversation, media, standalone reminder and appointment models. */
(function (root) {
  'use strict';

  const uid = (prefix = 'H') => prefix + '-' + (
    globalThis.crypto?.randomUUID?.() ||
    Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), value => value.toString(16).padStart(2, '0')).join('')
  );
  const text = value => String(value ?? '').trim();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
  const color = value => /^#[0-9a-f]{6}$/i.test(text(value)) ? text(value) : '';

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

  function validPhone(value) {
    return /^\+?\d{7,15}$/.test(phone(value));
  }

  function validMessageAddress(value) {
    return /^\+?\d{3,15}$/.test(phone(value));
  }

  function deviceIdentity(title, address, fallback = 'Unknown contact') {
    const displayTitle = text(title) || text(address) || text(fallback) || 'Unknown contact';
    const displayPhone = text(address);
    const phoneOnly = !!phone(displayPhone) && phone(displayTitle) === phone(displayPhone);
    return { title: displayTitle, phone: phoneOnly ? '' : displayPhone, phoneOnly };
  }

  function sortDeviceMessages(rows) {
    const unique = new Map();
    for (const [index, message] of (Array.isArray(rows) ? rows : []).entries()) {
      const key = message?.id == null ? 'missing-' + index : String(message.id);
      unique.set(key, message);
    }
    return [...unique.values()].sort((a, b) =>
      (Number(a?.at) || 0) - (Number(b?.at) || 0) || String(a?.id ?? '').localeCompare(String(b?.id ?? ''))
    );
  }

  function mergeDeviceMessages(current, incoming, confirmationWindowMs = 5 * 60 * 1000) {
    const existing = Array.isArray(current) ? current : [];
    const fresh = Array.isArray(incoming) ? incoming : [];
    const localTexts = existing.filter(message => message?.local && !message.attachments?.length);
    const confirmedLocal = new Set();
    for (const candidate of fresh) {
      if (!candidate?.outgoing) continue;
      const match = localTexts
        .filter(message => !confirmedLocal.has(message.id) && text(candidate.text) === text(message.text))
        .map(message => ({ message, delta: Math.abs((Number(candidate.at) || 0) - (Number(message.at) || 0)) }))
        .filter(row => row.delta < confirmationWindowMs)
        .sort((a, b) => a.delta - b.delta)[0]?.message;
      if (match) confirmedLocal.add(match.id);
    }
    return sortDeviceMessages([...existing.filter(message => !confirmedLocal.has(message?.id)), ...fresh]);
  }

  function splitDeviceHistory(rows, visibleCount = 6) {
    const sorted = sortDeviceMessages(rows);
    const count = Math.max(1, Math.floor(Number(visibleCount) || 6));
    const splitAt = Math.max(0, sorted.length - count);
    return {
      buffered: sorted.slice(0, splitAt),
      visible: sorted.slice(splitAt)
    };
  }

  function revealDeviceHistory(buffered, chunkSize = 20) {
    const sorted = sortDeviceMessages(buffered);
    const count = Math.max(1, Math.floor(Number(chunkSize) || 20));
    const splitAt = Math.max(0, sorted.length - count);
    return {
      buffered: sorted.slice(0, splitAt),
      revealed: sorted.slice(splitAt)
    };
  }

  function unseenDeviceMessages(current, buffered, incoming) {
    const known = new Set([...sortDeviceMessages(current), ...sortDeviceMessages(buffered)]
      .map(message => String(message?.id ?? '')));
    return sortDeviceMessages(incoming).filter(message => !known.has(String(message?.id ?? '')));
  }

  function isPhotoAttachment(file) {
    const type = text(file?.type).toLowerCase();
    if (type.startsWith('image/')) return true;
    const name = text(file?.name).toLowerCase();
    return /\.(?:avif|bmp|gif|heic|heif|jpe?g|png|webp)$/.test(name);
  }

  function splitAttachments(rows) {
    const result = { photos: [], documents: [] };
    for (const file of Array.isArray(rows) ? rows : []) {
      result[isPhotoAttachment(file) ? 'photos' : 'documents'].push(file);
    }
    return result;
  }

  function primary(contact) {
    return (contact?.fields || []).find(field => field.kind === 'phone' && field.primary) ||
      (contact?.fields || []).find(field => field.kind === 'phone') || null;
  }

  function nextLabel(fields, kind, label) {
    const taken = new Set(fields.map(field => text(field.label).toLowerCase()));
    if (!taken.has(label.toLowerCase())) return label;
    let number = 2;
    while (taken.has((label + ' ' + number).toLowerCase())) number += 1;
    return label + ' ' + number;
  }

  const LABELS = {
    phone: 'Cellphone',
    email: 'Email',
    alias: 'Alias',
    birthday: 'Birthday',
    address: 'Address',
    text: 'Custom field'
  };

  function field(fields, kind = 'text', base = '') {
    return {
      id: uid('F'),
      kind,
      label: nextLabel(fields, kind, base || LABELS[kind] || 'Field'),
      value: '',
      ...(kind === 'phone' ? { phoneType: 'cell', primary: !fields.some(item => item.kind === 'phone') } : {})
    };
  }

  function categoryIds(contact) {
    const values = Array.isArray(contact?.categoryIds)
      ? contact.categoryIds
      : contact?.categoryId
        ? [contact.categoryId]
        : [];
    return [...new Set(values.map(text).filter(Boolean))];
  }

  function normalizeContact(contact) {
    const vehicleIds = [...new Set((Array.isArray(contact?.vehicleIds) ? contact.vehicleIds : []).map(text).filter(Boolean))];
    const primaryVehicleId = text(contact?.primaryVehicleId);
    if (primaryVehicleId && !vehicleIds.includes(primaryVehicleId)) vehicleIds.unshift(primaryVehicleId);
    const sourceBuying = contact?.buying && typeof contact.buying === 'object' ? contact.buying : {};
    const method = ['Cash', 'Financing'].includes(text(sourceBuying.method)) ? text(sourceBuying.method) : '';
    const tradeStatus = ['Trade', 'No Trade'].includes(text(sourceBuying.tradeStatus)) ? text(sourceBuying.tradeStatus) : '';
    const cleanMoney = value => {
      const raw = text(value).replace(/[$,\s]/g, '');
      if (!raw) return '';
      const number = Number(raw);
      return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : '';
    };
    const buying = {
      method,
      totalBudget: cleanMoney(sourceBuying.totalBudget ?? contact?.totalBudget),
      biweeklyPayment: cleanMoney(sourceBuying.biweeklyPayment ?? contact?.biweeklyPayment),
      downPayment: cleanMoney(sourceBuying.downPayment ?? contact?.downPayment),
      tradeStatus,
      expectedTradeValue: tradeStatus === 'Trade'
        ? cleanMoney(sourceBuying.expectedTradeValue ?? contact?.expectedTradeValue)
        : ''
    };
    const clean = {
      ...(contact || {}),
      categoryIds: categoryIds(contact),
      vehicleIds,
      primaryVehicleId,
      interestedVehicleText: text(contact?.interestedVehicleText).slice(0, 300),
      buying
    };
    delete clean.categoryId;
    delete clean.totalBudget;
    delete clean.biweeklyPayment;
    delete clean.downPayment;
    delete clean.expectedTradeValue;
    return clean;
  }

  function money(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return '';
    return '$' + number.toLocaleString('en-CA', {
      minimumFractionDigits: Number.isInteger(number) ? 0 : 2,
      maximumFractionDigits: 2
    });
  }

  function buyingSummary(contact) {
    const buying = normalizeContact(contact).buying;
    const values = [];
    if (buying.method) values.push(buying.method);
    if (buying.totalBudget !== '') values.push(money(buying.totalBudget) + ' Total');
    if (buying.biweeklyPayment !== '') values.push(money(buying.biweeklyPayment) + ' Bi-W');
    if (buying.downPayment !== '') values.push(money(buying.downPayment) + ' Dwn');
    if (buying.tradeStatus) values.push(buying.tradeStatus);
    if (buying.tradeStatus === 'Trade' && buying.expectedTradeValue !== '') {
      values.push(money(buying.expectedTradeValue) + ' Expected');
    }
    return values;
  }

  function applyContactField(contact, key, value) {
    const next = normalizeContact(contact);
    const amount = input => {
      const match = text(input).replace(/,/g, '').match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
      return match ? Number(match[1]) : '';
    };
    if (key === 'purchaseMethod') next.buying.method = /financ/i.test(value) ? 'Financing' : /cash/i.test(value) ? 'Cash' : '';
    else if (key === 'budget') next.buying.totalBudget = amount(value);
    else if (key === 'biweeklyPayment') next.buying.biweeklyPayment = amount(value);
    else if (key === 'downPayment') next.buying.downPayment = amount(value);
    else if (key === 'tradeStatus') {
      next.buying.tradeStatus = /no\s*trade/i.test(value) ? 'No Trade' : /trade/i.test(value) ? 'Trade' : '';
      if (next.buying.tradeStatus !== 'Trade') next.buying.expectedTradeValue = '';
    } else if (key === 'expectedTradeValue') {
      next.buying.tradeStatus = 'Trade';
      next.buying.expectedTradeValue = amount(value);
    } else if (key === 'interestedVehicle') next.interestedVehicleText = text(value).slice(0, 300);
    return normalizeContact(next);
  }

  function normalizeCategories(items) {
    const rows = (Array.isArray(items) ? items : [])
      .map((item, index) => ({
        id: text(item?.id) || uid('CAT'),
        name: text(item?.name).slice(0, 40),
        color: color(item?.color) || '#2563eb',
        parentId: text(item?.parentId),
        important: !!item?.important,
        order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index
      }))
      .filter(item => item.name);
    const byId = new Map(rows.map(item => [item.id, item]));
    for (const item of rows) {
      if (!item.parentId || item.parentId === item.id || !byId.has(item.parentId)) item.parentId = '';
    }
    for (const item of rows) {
      const parent = byId.get(item.parentId);
      if (parent?.parentId) item.parentId = parent.parentId;
    }
    let importantCount = 0;
    return rows
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      .map((item, order) => {
        const important = item.important && importantCount < 3;
        if (important) importantCount += 1;
        return { ...item, important, order };
      });
  }

  function reorderCategories(items, from, to) {
    const rows = (Array.isArray(items) ? items : []).map(item => ({ ...item }));
    const start = Number(from);
    const end = Number(to);
    if (!Number.isInteger(start) || !Number.isInteger(end) ||
        start < 0 || end < 0 || start >= rows.length || end >= rows.length || start === end) {
      return rows;
    }
    const [moved] = rows.splice(start, 1);
    rows.splice(end, 0, moved);
    return rows.map((item, order) => ({ ...item, order }));
  }

  function categoryClosure(contact, items) {
    const rows = normalizeCategories(items);
    const byId = new Map(rows.map(item => [item.id, item]));
    const found = new Set();
    for (const id of categoryIds(contact)) {
      let current = byId.get(id);
      while (current && !found.has(current.id)) {
        found.add(current.id);
        current = current.parentId ? byId.get(current.parentId) : null;
      }
    }
    return [...found];
  }

  function categoryPath(item, items) {
    if (!item) return '';
    const parent = (items || []).find(row => row.id === item.parentId);
    return parent ? parent.name + ' / ' + item.name : item.name;
  }

  function categoryUnreadCounts(categoryRows, deviceRows, { importantOnly = false } = {}) {
    const categories = normalizeCategories(categoryRows);
    const targets = importantOnly
      ? categories.filter(category => category.important).slice(0, 3)
      : categories;
    const counts = new Map(targets.map(category => [category.id, 0]));
    if (!counts.size) return [];
    for (const row of Array.isArray(deviceRows) ? deviceRows : []) {
      if (row?.blocked === true) continue;
      const unread = row?.live === true ? Math.max(0, Number(row.unread) || 0) : 0;
      if (!unread) continue;
      const organization = row.organization || row.contact || {};
      for (const id of categoryClosure(organization, categories)) {
        if (counts.has(id)) counts.set(id, counts.get(id) + unread);
      }
    }
    return targets.map(category => ({ category, count: counts.get(category.id) || 0 }));
  }

  function validateContact(contact) {
    if (!text(contact.name)) throw Error('Enter a contact name.');
    const fields = contact.fields || [];
    const phones = fields.filter(item => item.kind === 'phone');
    if (!contact.lotkeysId && !phones.some(item => validPhone(item.value))) throw Error('Add a valid phone number.');
    for (const item of phones) {
      if (text(item.value) && !validPhone(item.value)) throw Error('Check ' + (item.label || 'phone number') + '.');
    }
    if (phones.length && phones.filter(item => item.primary).length !== 1) throw Error('Select one primary number.');
    if (phones.length && !validPhone(phones.find(item => item.primary)?.value)) throw Error('The primary phone number must be valid.');
    for (const item of fields) {
      if (item.kind === 'email' && text(item.value) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.value)) {
        throw Error('Check ' + (item.label || 'email') + '.');
      }
    }
    return contact;
  }

  function contactSearch(contact) {
    return [contact.name, ...(contact.fields || []).flatMap(item => [
      item.label,
      item.value,
      ...(item.kind === 'phone' ? [phone(item.value)] : [])
    ])].join(' ').toLowerCase();
  }

  function matches(contact, query) {
    query = text(query).toLowerCase();
    if (!query) return true;
    if (contactSearch(contact).includes(query)) return true;
    const digits = query.replace(/\D/g, '');
    return digits.length >= 3 && (contact.fields || []).some(item =>
      item.kind === 'phone' && phone(item.value).replace(/\D/g, '').includes(digits)
    );
  }

  function conversationMatch(row, query) {
    return matches(row.savedContact || row.contact || {
      name: row.title,
      fields: [
        { kind: 'phone', value: row.phone || row.address || '' },
        { kind: 'email', value: row.email || '' }
      ]
    }, query) || text(row.title + ' ' + (row.preview || '')).toLowerCase().includes(text(query).toLowerCase());
  }

  function filtered(rows, {
    scope = 'all',
    filter = 'all',
    selectedCategories = [],
    categoryRows = [],
    query = ''
  } = {}) {
    const wanted = [...new Set((selectedCategories || []).map(text).filter(Boolean))];
    return rows.filter(row => {
      if (scope !== 'all' && row.source !== scope) return false;
      const blocked = row.source === 'device' && row.blocked === true;
      if (filter === 'blocked') {
        if (!blocked) return false;
      } else if (blocked) return false;
      if (wanted.length) {
        if (row.source !== 'device') return false;
        const assigned = categoryClosure(row.organization || row.contact, categoryRows);
        if (!wanted.some(id => assigned.includes(id))) return false;
      }
      if (filter === 'unread' && !(row.unread > 0)) return false;
      if (filter === 'groups' && row.group !== true) return false;
      if (filter === 'contacts' && !(row.favorite || row.savedContact || (row.source !== 'device' && row.contact))) return false;
      if (filter === 'unsorted' && (row.source !== 'device' || categoryIds(row.organization || row.contact).length)) return false;
      return conversationMatch(row, query);
    }).sort((a, b) => (b.at || 0) - (a.at || 0) || text(a.title).localeCompare(text(b.title)));
  }

  function localDay(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  const REMINDER_TIME_ZONE = 'America/Edmonton';

  function zonedDay(value = new Date(), timeZone = REMINDER_TIME_ZONE) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function zonedTime(value, timeZone = REMINDER_TIME_ZONE) {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone,
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit'
    }).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return `${parts.hour}:${parts.minute}`;
  }

  function validCalendarDay(value) {
    const match = text(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const candidate = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return candidate.getUTCFullYear() === Number(match[1]) &&
      candidate.getUTCMonth() === Number(match[2]) - 1 &&
      candidate.getUTCDate() === Number(match[3]);
  }

  function validClockTime(value) {
    const match = text(value).match(/^(\d{2}):(\d{2})$/);
    return !!match && Number(match[1]) < 24 && Number(match[2]) < 60;
  }

  function dayOrdinal(value) {
    if (!validCalendarDay(value)) return NaN;
    const [year, month, day] = value.split('-').map(Number);
    return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
  }

  function normalizeReminder(reminder = {}) {
    const dailyRepeat = reminder.dailyRepeat === true;
    const dueDate = !dailyRepeat && validCalendarDay(reminder.dueDate) ? text(reminder.dueDate) : '';
    const dueTime = validClockTime(reminder.dueTime) ? text(reminder.dueTime) : '';
    return {
      ...reminder,
      id: text(reminder.id),
      title: text(reminder.title).slice(0, 180),
      notes: text(reminder.notes).slice(0, 6000),
      dueDate,
      dueTime,
      dailyRepeat,
      contactId: text(reminder.contactId),
      customerName: text(reminder.customerName).slice(0, 150),
      phone: text(reminder.phone).slice(0, 40),
      vehicleId: text(reminder.vehicleId),
      vehicleLabel: text(reminder.vehicleLabel).slice(0, 300),
      noteId: text(reminder.noteId),
      completedAt: dailyRepeat ? '' : text(reminder.completedAt),
      lastCompletedDay: dailyRepeat && validCalendarDay(reminder.lastCompletedDay) ? text(reminder.lastCompletedDay) : ''
    };
  }

  function reminderComplete(reminder, value = new Date()) {
    const row = normalizeReminder(reminder);
    return row.dailyRepeat ? row.lastCompletedDay === zonedDay(value) : !!row.completedAt;
  }

  function toggleReminder(reminder, value = new Date()) {
    const row = normalizeReminder(reminder);
    if (row.dailyRepeat) {
      const today = zonedDay(value);
      return { ...row, lastCompletedDay: row.lastCompletedDay === today ? '' : today, completedAt: '' };
    }
    return { ...row, completedAt: row.completedAt ? '' : new Date(value).toISOString(), lastCompletedDay: '' };
  }

  function reminderUrgency(reminder, value = new Date()) {
    const row = normalizeReminder(reminder);
    if (reminderComplete(row, value)) return null;
    if (row.dailyRepeat || !row.dueDate) return 0;
    const difference = dayOrdinal(row.dueDate) - dayOrdinal(zonedDay(value));
    if (!Number.isFinite(difference)) return 0;
    if (difference <= 3) return 2;
    if (difference <= 7) return 1;
    return 0;
  }

  function reminderBellState(reminders, value = new Date()) {
    const active = (Array.isArray(reminders) ? reminders : []).filter(reminder => !reminder?.deleted && !reminderComplete(reminder, value));
    const urgency = active.reduce((highest, reminder) => Math.max(highest, reminderUrgency(reminder, value) ?? 0), 0);
    return {
      visible: active.length > 0,
      urgency,
      count: active.length,
      symbol: urgency === 2 ? '🔔‼️' : urgency === 1 ? '🔔❗' : '🔔'
    };
  }

  function remindersForDay(reminders, day) {
    return (Array.isArray(reminders) ? reminders : [])
      .map(normalizeReminder)
      .filter(reminder => !reminder.deleted && !reminder.dailyRepeat && reminder.dueDate === day)
      .sort((a, b) => Number(!!a.dueTime) - Number(!!b.dueTime) || a.dueTime.localeCompare(b.dueTime) || a.title.localeCompare(b.title));
  }

  function legacyAppointmentToReminder(appointment = {}) {
    const allDay = appointment.allDay === true;
    return normalizeReminder({
      id: text(appointment.id),
      title: text(appointment.title) || 'Reminder',
      notes: text(appointment.notes),
      dueDate: appointment.start ? zonedDay(appointment.start) : '',
      dueTime: !allDay && appointment.start ? zonedTime(appointment.start) : '',
      dailyRepeat: false,
      contactId: text(appointment.contactId),
      customerName: text(appointment.customerName),
      phone: text(appointment.phone || appointment.phoneNumber),
      vehicleId: text(appointment.vehicleId),
      vehicleLabel: text(appointment.vehicleLabel),
      noteId: text(appointment.noteId),
      completedAt: appointment.status === 'Completed'
        ? text(appointment.completedAt || appointment.updatedAt || appointment.end || appointment.start || new Date().toISOString())
        : '',
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
      migratedFromAppointment: true
    });
  }

  function appointmentIdentity(appointment = {}, contact = null) {
    const contactName = text(contact?.name);
    const savedPhone = text(primary(contact)?.value);
    const rawTitle = text(appointment.title);
    const suffixes = [appointment.appointmentType, appointment.kind].map(text).filter(Boolean);
    let titleName = rawTitle;
    for (const suffix of suffixes) if (titleName.toLowerCase().endsWith((' · ' + suffix).toLowerCase())) titleName = titleName.slice(0, -(suffix.length + 3)).trim();
    const genericTitles = new Set(['appointment', ...suffixes.map(value => value.toLowerCase())]);
    const fallbackName = text(appointment.customerName) || (genericTitles.has(titleName.toLowerCase()) ? '' : titleName);
    const suppliedPhone = text(savedPhone || appointment.phone || appointment.phoneNumber || appointment.customerPhone);
    const candidate = contactName || fallbackName;
    const candidatePhone = phone(candidate);
    const normalizedPhone = phone(suppliedPhone);
    const candidateIsPhone = validPhone(candidate) || (!!candidatePhone && !!normalizedPhone && candidatePhone === normalizedPhone);
    const realName = candidate && !candidateIsPhone ? candidate : '';
    const displayPhone = suppliedPhone || (candidateIsPhone ? candidate : '');
    if (realName) return { primary: realName, phone: displayPhone && phone(realName) !== phone(displayPhone) ? displayPhone : '' };
    if (displayPhone) return { primary: displayPhone, phone: '' };
    return { primary: 'Unnamed appointment', phone: '' };
  }

  function atLocal(date, time) {
    const value = new Date(date + 'T' + time + ':00');
    const actual = String(value.getHours()).padStart(2, '0') + ':' + String(value.getMinutes()).padStart(2, '0');
    if (!Number.isFinite(value.getTime()) || localDay(value) !== date || actual !== time) {
      throw Error('That local date/time does not exist. Check the date and daylight-saving change.');
    }
    return value.toISOString();
  }

  function displayDate(value) {
    const day = value instanceof Date ? localDay(value) : /^\d{4}-\d{2}-\d{2}$/.test(text(value)) ? text(value) : localDay(value);
    const [year, month, date] = day.split('-');
    return month + '/' + date + '/' + year;
  }

  function parseDisplayDate(value) {
    const match = text(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) throw Error('Enter the date as MM/DD/YYYY.');
    const month = Number(match[1]);
    const date = Number(match[2]);
    const year = Number(match[3]);
    const candidate = new Date(year, month - 1, date, 12);
    if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== date) {
      throw Error('Enter a valid appointment date.');
    }
    return localDay(candidate);
  }

  function displayTime(value) {
    if (!value) return '';
    const match = text(value).match(/^(\d{1,2}):(\d{2})$/);
    const date = match ? new Date(2000, 0, 1, Number(match[1]), Number(match[2])) : new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    const hour = date.getHours();
    return (hour % 12 || 12) + ':' + String(date.getMinutes()).padStart(2, '0') + (hour >= 12 ? ' PM' : ' AM');
  }

  function agenda(rows, date) {
    return rows.filter(item => localDay(item.start) === date && !item.deleted)
      .sort((a, b) => Number(!a.allDay) - Number(!b.allDay) || Date.parse(a.start) - Date.parse(b.start));
  }

  function overlap(rows, appointment) {
    if (appointment.allDay || appointment.kind === 'Reminder') return [];
    return rows.filter(item =>
      item.id !== appointment.id &&
      !item.deleted &&
      !item.allDay &&
      item.kind !== 'Reminder' &&
      !['Cancelled', 'Completed', 'No show'].includes(item.status) &&
      Date.parse(appointment.start) < Date.parse(item.end) &&
      Date.parse(appointment.end) > Date.parse(item.start)
    );
  }

  function monthCells(date) {
    date = new Date(date.getFullYear(), date.getMonth(), 1, 12);
    const begin = new Date(date);
    begin.setDate(begin.getDate() - begin.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(begin);
      day.setDate(begin.getDate() + index);
      return day;
    });
  }

  function ics(appointment) {
    const clean = value => String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/\r\n|\r|\n/g, '\\n')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,');
    const stamp = value => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const dayStamp = value => localDay(value).replace(/-/g, '');
    const nextDayStamp = value => {
      const date = new Date(localDay(value) + 'T12:00:00');
      date.setDate(date.getDate() + 1);
      return localDay(date).replace(/-/g, '');
    };
    const encoder = new TextEncoder();
    const fold = line => {
      let output = '';
      let part = '';
      let count = 0;
      for (const character of line) {
        const next = encoder.encode(character).length;
        if (count + next > 75) {
          output += part + '\r\n';
          part = ' ';
          count = 1;
        }
        part += character;
        count += next;
      }
      return output + part;
    };
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LotKeys//Hub//EN',
      'BEGIN:VEVENT',
      'UID:' + String(appointment.id || 'appointment').replace(/[^A-Za-z0-9_-]/g, '_') + '@lot-keys.ca',
      'DTSTAMP:' + stamp(new Date()),
      appointment.allDay ? 'DTSTART;VALUE=DATE:' + dayStamp(appointment.start) : 'DTSTART:' + stamp(appointment.start),
      appointment.allDay ? 'DTEND;VALUE=DATE:' + nextDayStamp(appointment.start) : 'DTEND:' + stamp(appointment.end),
      'SUMMARY:' + clean(appointment.title),
      'LOCATION:' + clean(appointment.location),
      'DESCRIPTION:' + clean(appointment.notes || appointment.vehicleLabel || ''),
      'END:VEVENT',
      'END:VCALENDAR',
      ''
    ].map(fold).join('\r\n');
  }

  const questions = [
    ['purchaseMethod', 'Cash or financing', 'Are you planning to pay cash, or would you like financing options?'],
    ['budget', 'Total Budget', 'What total, all-in price would feel comfortable for you?'],
    ['biweeklyPayment', 'Bi-weekly Payment Goal', 'What bi-weekly payment would feel comfortable for you?'],
    ['downPayment', 'Down payment', 'Have you thought about an amount you would like to put down?'],
    ['tradeStatus', 'Trade involved', 'Will you have a vehicle to trade, or no trade?'],
    ['expectedTradeValue', 'Expected Trade Value', 'What value are you expecting for your trade?'],
    ['interestedVehicle', 'Interested Vehicle', 'What vehicle are you interested in?'],
    ['reason', 'Reason for buying', 'What would you like your next vehicle to do better than your current one?'],
    ['timeframe', 'Purchase timeframe', 'When would you ideally like to have the next vehicle?'],
    ['searchDuration', 'Time spent searching', 'How long have you been looking, and what have you already tried?'],
    ['decisionMakers', 'People involved', 'Will anyone else want to see or discuss the vehicle before you decide?'],
    ['dealType', 'In person or remote', 'Would you prefer to visit us or work through the details by phone?'],
    ['coApplicant', 'Co-applicant discussion', 'Would anyone else be applying for financing with you?'],
    ['features', 'Important features', 'Which features are must-haves for you?']
  ];

  // Conservative local suggestions only. They never make credit decisions or write CRM data automatically.
  // Vehicle names are deliberately excluded because broad vehicle language produces noisy matches.
  function suggestNotes(input) {
    const source = text(input).slice(0, 12000);
    if (/\b(?:SIN|social insurance|social security|licen[cs]e\s*(?:number|#))\b/i.test(source)) return [];
    const output = [];
    const contextFor = match => {
      const from = Math.max(0, match.index || 0);
      const to = from + match[0].length;
      const before = source.slice(0, from);
      const after = source.slice(to);
      const leftBoundary = Math.max(before.lastIndexOf('\n'), before.lastIndexOf('.'), before.lastIndexOf('!'), before.lastIndexOf('?'));
      const rightOffsets = [after.indexOf('\n'), after.indexOf('.'), after.indexOf('!'), after.indexOf('?')].filter(index => index >= 0);
      const left = Math.max(leftBoundary + 1, from - 48);
      const right = Math.min(source.length, rightOffsets.length ? to + Math.min(...rightOffsets) : to + 48);
      return source.slice(left, right);
    };
    const add = (key, value, match, defaultMeaning = 'mentioned') => {
      if (!match || !value) return;
      const context = contextFor(match);
      const rejected = /\b(?:never|too high|too much|would(?:n't| not)|won't|cannot|can't|doesn't work|not work|unaffordable|no way)\b/i.test(context);
      const likely = /\b(?:want|need|goal|target|make|comfortable|works?|can do|looking for|budget)\b/i.test(context);
      output.push({
        key,
        value,
        source: match[0].slice(0, 160),
        meaning: rejected ? 'mentioned as too high' : likely ? 'likely goal' : defaultMeaning,
        confidence: rejected ? 0.58 : likely ? 0.9 : 0.72
      });
    };
    let match = source.match(/\b(?:pay(?:ing)?|buy(?:ing)?|purchase)\s+(?:with |in |by )?cash\b/i);
    add('purchaseMethod', 'Cash', match, 'likely choice');
    match = source.match(/\b(?:want|need|using|use|choose|interested in)\s+(?:to |the )?financ(?:ing|e)\b/i);
    add('purchaseMethod', 'Financing', match, 'likely choice');
    match = source.match(/\b(?:down payment|money down|put down)\s*(?:is |of |about |would be )?\$?([\d,]+(?:\.\d{1,2})?)\b/i) ||
      source.match(/\$([\d,]+(?:\.\d{1,2})?)\s*(?:as a )?down payment\b/i);
    add('downPayment', match ? '$' + match[1] : '', match);
    match = source.match(/\b(?:my |our )?(?:total |all[- ]?in )?budget\s*(?:is|of|around|about|:)\s*\$?([\d,]+(?:\.\d{1,2})?)\b/i);
    add('budget', match ? '$' + match[1] : '', match);
    for (const candidate of source.matchAll(/(?:\$\s*)?([\d,]+(?:\.\d{1,2})?)\s*(?:bi[\s-]?weekly|\/\s*bi[\s-]?week|every two weeks)/gi)) {
      add('biweeklyPayment', '$' + candidate[1], candidate);
    }
    match = source.match(/\b(?:no\s+trade|without\s+(?:a\s+)?trade)\b/i);
    if (match) add('tradeStatus', 'No Trade', match, 'likely choice');
    else {
      match = source.match(/\b(?:have|with|bringing|using)\s+(?:a\s+)?trade(?:-?in)?\b/i);
      add('tradeStatus', 'Trade', match, 'likely choice');
    }
    match = source.match(/\b(?:expect|want|need|hoping|get)\w*\s+(?:about\s+|around\s+)?\$?([\d,]+(?:\.\d{1,2})?)\s+(?:for|on)\s+(?:my|the|our)\s+trade\b/i) ||
      source.match(/\btrade(?:-?in)?\s+(?:value|worth)\s*(?:is|of|around|about|:)\s*\$?([\d,]+(?:\.\d{1,2})?)\b/i);
    add('expectedTradeValue', match ? '$' + match[1] : '', match);
    return output.filter((item, index) => output.findIndex(other => other.key === item.key && other.value === item.value) === index);
  }

  // Conversation-aware coaching only. Answers already captured in notes or confidently
  // recognized in the visible conversation are intentionally removed from the prompt list.
  function recommendQuestions(contact = {}, input = '') {
    const answered = new Set((contact.notes || []).map(note => text(note.key)).filter(Boolean));
    const normalized = normalizeContact(contact);
    if (normalized.buying.method) answered.add('purchaseMethod');
    if (normalized.buying.totalBudget !== '') answered.add('budget');
    if (normalized.buying.biweeklyPayment !== '') answered.add('biweeklyPayment');
    if (normalized.buying.downPayment !== '') answered.add('downPayment');
    if (normalized.buying.tradeStatus) answered.add('tradeStatus');
    if (normalized.buying.tradeStatus === 'No Trade' || normalized.buying.expectedTradeValue !== '') answered.add('expectedTradeValue');
    if (normalized.vehicleIds.length || normalized.interestedVehicleText) answered.add('interestedVehicle');
    for (const suggestion of suggestNotes(input)) answered.add(suggestion.key);
    const source = text(input).toLowerCase();
    const score = key => {
      const finance = /\b(?:financ(?:e|ing)?|payment|credit|loan|down payment|cash)\b/.test(source);
      const trade = /\b(?:trade|current vehicle|replace|owe|lien)\b/.test(source);
      const vehicle = /\b(?:vehicle|car|truck|suv|sedan|model|feature|seat|awd|4x4)\b/.test(source);
      const timing = /\b(?:today|tomorrow|week|month|soon|when|timeframe)\b/.test(source);
      const weights = {
        purchaseMethod: finance ? 100 : 72,
        budget: finance ? 98 : 70,
        downPayment: finance ? 96 : 48,
        coApplicant: finance ? 82 : 24,
        tradeStatus: trade ? 100 : 64,
        expectedTradeValue: trade ? 92 : 34,
        biweeklyPayment: finance ? 99 : 68,
        interestedVehicle: vehicle ? 94 : 62,
        features: vehicle ? 92 : 60,
        reason: vehicle ? 84 : 58,
        timeframe: timing ? 96 : 68,
        searchDuration: 50,
        decisionMakers: 46,
        dealType: 42
      };
      return weights[key] || 0;
    };
    return questions
      .filter(([key]) => !answered.has(key))
      .map(question => ({ key: question[0], label: question[1], question: question[2], score: score(question[0]) }))
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  }

  const api = {
    uid,
    text,
    esc,
    color,
    phone,
    validPhone,
    validMessageAddress,
    deviceIdentity,
    sortDeviceMessages,
    mergeDeviceMessages,
    splitDeviceHistory,
    revealDeviceHistory,
    unseenDeviceMessages,
    isPhotoAttachment,
    splitAttachments,
    primary,
    nextLabel,
    field,
    categoryIds,
    normalizeContact,
    money,
    buyingSummary,
    applyContactField,
    normalizeCategories,
    reorderCategories,
    categoryClosure,
    categoryPath,
    categoryUnreadCounts,
    validateContact,
    matches,
    filtered,
    localDay,
    REMINDER_TIME_ZONE,
    zonedDay,
    zonedTime,
    validCalendarDay,
    validClockTime,
    dayOrdinal,
    normalizeReminder,
    reminderComplete,
    toggleReminder,
    reminderUrgency,
    reminderBellState,
    remindersForDay,
    legacyAppointmentToReminder,
    appointmentIdentity,
    atLocal,
    displayDate,
    parseDisplayDate,
    displayTime,
    agenda,
    overlap,
    monthCells,
    ics,
    questions,
    suggestNotes,
    recommendQuestions
  };

  root.LotKeysHubCore = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
