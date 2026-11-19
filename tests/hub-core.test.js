'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Hub = require('../lotkeys-hub-core.js');

const categories = [
  { id: 'customers', name: 'Customers', color: '#ed8b2f', parentId: '', order: 0 },
  { id: 'follow-up', name: 'Follow-up', color: '#f59e0b', parentId: 'customers', order: 1 },
  { id: 'personal', name: 'Personal', color: '#9671d8', parentId: '', order: 2 }
];

test('legacy categoryId becomes the multi-category model', () => {
  const contact = Hub.normalizeContact({ id: 'one', categoryId: 'customers' });
  assert.deepEqual(contact.categoryIds, ['customers']);
  assert.equal('categoryId' in contact, false);
});

test('contact normalization keeps unique vehicle links with the primary first', () => {
  const contact = Hub.normalizeContact({ primaryVehicleId: 'v2', vehicleIds: ['v1', 'v1'] });
  assert.deepEqual(contact.vehicleIds, ['v2', 'v1']);
  assert.equal(contact.primaryVehicleId, 'v2');
});

test('category normalization keeps only one nested level', () => {
  const rows = Hub.normalizeCategories([
    ...categories,
    { id: 'deep', name: 'Deep', color: '#112233', parentId: 'follow-up', order: 3 }
  ]);
  assert.equal(rows.find(row => row.id === 'deep').parentId, 'customers');
});

test('category normalization preserves only the first three ordered Important choices', () => {
  const rows = Hub.normalizeCategories([
    { id: 'fourth', name: 'Fourth', color: '#444444', important: true, order: 3 },
    { id: 'first', name: 'First', color: '#111111', important: true, order: 0 },
    { id: 'second', name: 'Second', color: '#222222', important: true, order: 1 },
    { id: 'third', name: 'Third', color: '#333333', important: true, order: 2 },
    { id: 'ordinary', name: 'Ordinary', color: '#555555', important: false, order: 4 }
  ]);
  assert.deepEqual(rows.filter(row => row.important).map(row => row.id), ['first', 'second', 'third']);
  assert.equal(rows.find(row => row.id === 'fourth').important, false);
  assert.equal(rows.find(row => row.id === 'ordinary').important, false);
});

test('category reordering persists the physical row order', () => {
  const rows = Hub.reorderCategories(categories, 2, 0);
  assert.deepEqual(rows.map(row => row.id), ['personal', 'customers', 'follow-up']);
  assert.deepEqual(rows.map(row => row.order), [0, 1, 2]);
  assert.equal(rows.find(row => row.id === 'follow-up').parentId, 'customers');
  assert.equal(Hub.reorderCategories([{ id: 'draft', name: '', order: 0 }, categories[0]], 0, 1).length, 2);
});

test('a subcategory contact also matches its parent', () => {
  const closure = Hub.categoryClosure({ categoryIds: ['follow-up'] }, categories);
  assert.deepEqual(new Set(closure), new Set(['follow-up', 'customers']));
});

test('category unread totals cover every category while Important totals remain starred-only', () => {
  const categoryRows = categories.map(category => ({
    ...category,
    important: category.id === 'customers'
  }));
  const rows = [
    { live: true, unread: 2, organization: { categoryIds: ['follow-up'] } },
    { live: true, unread: 4, organization: { categoryIds: ['personal'] } },
    { live: true, unread: 8, blocked: true, organization: { categoryIds: ['customers'] } },
    { live: false, unread: 99, contact: { categoryIds: ['customers'] } }
  ];
  const all = Hub.categoryUnreadCounts(categoryRows, rows);
  assert.deepEqual(Object.fromEntries(all.map(item => [item.category.id, item.count])), {
    customers: 2,
    'follow-up': 2,
    personal: 4
  });
  const important = Hub.categoryUnreadCounts(categoryRows, rows, { importantOnly: true });
  assert.deepEqual(important.map(item => [item.category.id, item.count]), [['customers', 2]]);
});

test('multiple Device filters combine without leaking LotKeys chat rows', () => {
  const rows = [
    { id: 'chat', source: 'lotkeys', title: 'Internal', unread: 1, at: 3 },
    { id: 'lead', source: 'device', title: 'Lead', contact: { name: 'Lead', fields: [], categoryIds: ['follow-up'] }, at: 2 },
    { id: 'friend', source: 'device', title: 'Friend', contact: { name: 'Friend', fields: [], categoryIds: ['personal'] }, at: 1 }
  ];
  const filtered = Hub.filtered(rows, {
    scope: 'device',
    selectedCategories: ['follow-up', 'personal'],
    categoryRows: categories
  });
  assert.deepEqual(filtered.map(row => row.id), ['lead', 'friend']);
});

test('parent Device filter includes contacts filed only in its subcategory', () => {
  const rows = [
    { id: 'lead', source: 'device', title: 'Lead', contact: { name: 'Lead', fields: [], categoryIds: ['follow-up'] } }
  ];
  assert.equal(Hub.filtered(rows, {
    scope: 'device',
    selectedCategories: ['customers'],
    categoryRows: categories
  }).length, 1);
});

test('Unsorted includes only Device conversations without category paths', () => {
  const rows = [
    { id: 'unknown', source: 'device', title: 'Unknown', organization: { categoryIds: [] } },
    { id: 'filed', source: 'device', title: 'Filed', organization: { categoryIds: ['customers'] } },
    { id: 'chat', source: 'lotkeys', title: 'Internal' }
  ];
  assert.deepEqual(Hub.filtered(rows, { filter: 'unsorted', categoryRows: categories }).map(row => row.id), ['unknown']);
});

test('blocked Device numbers stay out of normal and unread views and appear only in Blocked', () => {
  const rows = [
    { id: 'open', source: 'device', title: 'Open', unread: 1, organization: { categoryIds: [] }, at: 3 },
    { id: 'blocked-contact', source: 'device', title: 'Blocked contact', unread: 4, blocked: true, savedContact: { name: 'Blocked contact', fields: [] }, at: 2 },
    { id: 'blocked-number', source: 'device', title: '+17805550123', blocked: true, organization: { categoryIds: [] }, at: 1 },
    { id: 'chat', source: 'lotkeys', title: 'Internal', unread: 2, at: 4 }
  ];
  assert.deepEqual(Hub.filtered(rows).map(row => row.id), ['chat', 'open']);
  assert.deepEqual(Hub.filtered(rows, { scope: 'device', filter: 'unread' }).map(row => row.id), ['open']);
  assert.deepEqual(Hub.filtered(rows, { scope: 'device', filter: 'blocked' }).map(row => row.id), ['blocked-contact', 'blocked-number']);
  assert.deepEqual(Hub.filtered(rows, { scope: 'device', filter: 'unsorted' }).map(row => row.id), ['open']);
});

test('phone matching and contact validation retain the V0.9.4.82 contract', () => {
  const contact = {
    name: 'Jordan Example',
    fields: [{ id: 'p1', kind: 'phone', label: 'Cellphone', value: '780-555-0123', primary: true }]
  };
  assert.doesNotThrow(() => Hub.validateContact(contact));
  assert.equal(Hub.phone('780-555-0123'), '+17805550123');
  assert.equal(Hub.matches(contact, '5550123'), true);
  assert.equal(Hub.validPhone('66000'), false);
  assert.equal(Hub.validMessageAddress('66000'), true);
  assert.equal(Hub.validMessageAddress('12'), false);
});

test('Device identity keeps a saved name and phone inline without duplicating phone-only rows', () => {
  assert.deepEqual(Hub.deviceIdentity('John, Loe', '+15879215379'), {
    title: 'John, Loe',
    phone: '+15879215379',
    phoneOnly: false
  });
  assert.deepEqual(Hub.deviceIdentity('+1 (780) 994-0229', '+17809940229'), {
    title: '+1 (780) 994-0229',
    phone: '',
    phoneOnly: true
  });
  assert.deepEqual(Hub.deviceIdentity('', '+17805569292'), {
    title: '+17805569292',
    phone: '',
    phoneOnly: true
  });
});

test('live Device history keeps older rows and reconciles local sends one for one', () => {
  const current = [
    { id: 'old', text: 'Earlier', at: 100, outgoing: false },
    { id: 'local-one', text: 'Same reply', at: 1_000, outgoing: true, local: true },
    { id: 'local-two', text: 'Same reply', at: 1_100, outgoing: true, local: true },
    { id: 'local-media', text: 'Same reply', at: 1_200, outgoing: true, local: true, attachments: [{ id: 'photo' }] }
  ];
  const incoming = [
    { id: 'confirmed-one', text: 'Same reply', at: 1_020, outgoing: true },
    { id: 'new', text: 'New incoming', at: 2_000, outgoing: false }
  ];
  const merged = Hub.mergeDeviceMessages(current, incoming);
  assert.deepEqual(merged.map(message => message.id), ['old', 'confirmed-one', 'local-two', 'local-media', 'new']);
  assert.equal(merged.filter(message => message.text === 'Same reply').length, 3);
});

test('Device history opens with six messages and reveals the buffered past in nearest-first chunks', () => {
  const newestFirst = Array.from({ length: 40 }, (_, index) => ({
    id: String(40 - index),
    at: 40 - index
  }));
  const first = Hub.splitDeviceHistory(newestFirst, 6);
  assert.deepEqual(first.visible.map(message => message.id), ['35', '36', '37', '38', '39', '40']);
  assert.equal(first.buffered.length, 34);

  const next = Hub.revealDeviceHistory(first.buffered, 20);
  assert.deepEqual(next.revealed.map(message => message.id), Array.from({ length: 20 }, (_, index) => String(index + 15)));
  assert.deepEqual(next.buffered.map(message => message.id), Array.from({ length: 14 }, (_, index) => String(index + 1)));
  assert.equal(newestFirst[0].id, '40');
});

test('a burst of live Device replies cannot hide the seventh new message in the older buffer', () => {
  const current = Array.from({ length: 6 }, (_, index) => ({ id: String(index + 35), at: index + 35 }));
  const buffered = Array.from({ length: 34 }, (_, index) => ({ id: String(index + 1), at: index + 1 }));
  const refreshed = Array.from({ length: 40 }, (_, index) => ({ id: String(index + 8), at: index + 8 }));
  assert.deepEqual(Hub.unseenDeviceMessages(current, buffered, refreshed).map(message => message.id), ['41', '42', '43', '44', '45', '46', '47']);
});

test('saved contact media separates photos from documents using MIME type or filename', () => {
  const grouped = Hub.splitAttachments([
    { id: 'jpeg', name: 'customer.jpg', type: 'image/jpeg' },
    { id: 'heic', name: 'trade-in.HEIC', type: 'application/octet-stream' },
    { id: 'pdf', name: 'registration.pdf', type: 'application/pdf' },
    { id: 'voice', name: 'message.m4a', type: 'audio/mp4' }
  ]);
  assert.deepEqual(grouped.photos.map(file => file.id), ['jpeg', 'heic']);
  assert.deepEqual(grouped.documents.map(file => file.id), ['pdf', 'voice']);
  assert.equal(Hub.isPhotoAttachment({ name: 'scan.docx', type: 'application/octet-stream' }), false);
});

test('appointment identity shows a phone-only customer exactly once', () => {
  assert.deepEqual(Hub.appointmentIdentity({
    customerName: '+1 (780) 872-1598',
    phoneNumber: '+17808721598',
    title: '+1 (780) 872-1598 · Test Drive',
    appointmentType: 'Test Drive'
  }), { primary: '+17808721598', phone: '' });
  assert.deepEqual(Hub.appointmentIdentity({ customerName: '', title: 'Appointment', kind: 'Appointment' }), {
    primary: 'Unnamed appointment',
    phone: ''
  });
});

test('appointment identity keeps a real name and one normalized phone companion', () => {
  const contact = {
    name: 'Mariana',
    fields: [{ kind: 'phone', value: '+1 (780) 555-0199', primary: true }]
  };
  assert.deepEqual(Hub.appointmentIdentity({ customerName: 'Mariana' }, contact), {
    primary: 'Mariana',
    phone: '+1 (780) 555-0199'
  });
});

test('standalone reminder completion and daily reset use the Edmonton calendar day', () => {
  const morning = '2026-09-25T08:00:00-06:00';
  const evening = '2026-09-25T22:00:00-06:00';
  const tomorrow = '2026-09-26T08:00:00-06:00';
  const daily = Hub.toggleReminder({ id: 'daily', title: 'Check leads', dailyRepeat: true }, morning);
  assert.equal(daily.lastCompletedDay, '2026-09-25');
  assert.equal(Hub.reminderComplete(daily, evening), true);
  assert.equal(Hub.reminderComplete(daily, tomorrow), false);
  assert.equal(Hub.toggleReminder(daily, evening).lastCompletedDay, '');
  const oneTime = Hub.toggleReminder({ id: 'one', title: 'Call customer' }, morning);
  assert.ok(oneTime.completedAt);
  assert.equal(Hub.reminderComplete(oneTime, tomorrow), true);
  assert.equal(Hub.toggleReminder(oneTime, tomorrow).completedAt, '');
});

test('reminder bell urgency uses inclusive 7-day and 3-day calendar boundaries', () => {
  const now = '2026-09-25T23:30:00-06:00';
  assert.equal(Hub.reminderUrgency({ title: 'Eight', dueDate: '2026-10-03' }, now), 0);
  assert.equal(Hub.reminderUrgency({ title: 'Seven', dueDate: '2026-10-02' }, now), 1);
  assert.equal(Hub.reminderUrgency({ title: 'Four', dueDate: '2026-09-29' }, now), 1);
  assert.equal(Hub.reminderUrgency({ title: 'Three', dueDate: '2026-09-28' }, now), 2);
  assert.equal(Hub.reminderUrgency({ title: 'Today', dueDate: '2026-09-25' }, now), 2);
  assert.equal(Hub.reminderUrgency({ title: 'Overdue', dueDate: '2026-09-20' }, now), 2);
  assert.equal(Hub.reminderBellState([{ title: 'Daily', dailyRepeat: true }], now).symbol, '🔔');
  assert.equal(Hub.reminderBellState([{ title: 'Done', completedAt: now }], now).visible, false);
});

test('daily and undated reminders stay out of Calendar while completed dated reminders remain', () => {
  const rows = [
    { id: 'dated', title: 'Dated', dueDate: '2026-09-25', dueTime: '14:15', completedAt: '2026-09-24T18:00:00.000Z' },
    { id: 'daily', title: 'Daily', dailyRepeat: true },
    { id: 'undated', title: 'Undated' }
  ];
  assert.deepEqual(Hub.remindersForDay(rows, '2026-09-25').map(row => row.id), ['dated']);
});

test('legacy appointment reminders normalize to one stable standalone record', () => {
  const reminder = Hub.legacyAppointmentToReminder({
    id: 'REM-stable',
    kind: 'Reminder',
    title: 'Follow up',
    notes: 'About financing',
    contactId: 'CUST-1',
    customerName: 'John',
    noteId: 'N-1',
    start: '2026-09-25T20:30:00.000Z',
    end: '2026-09-25T21:00:00.000Z',
    status: 'Completed',
    createdAt: '2026-09-20T12:00:00.000Z',
    updatedAt: '2026-09-25T21:00:00.000Z'
  });
  assert.equal(reminder.id, 'REM-stable');
  assert.equal(reminder.dueDate, '2026-09-25');
  assert.equal(reminder.dueTime, '14:30');
  assert.equal(reminder.contactId, 'CUST-1');
  assert.equal(reminder.noteId, 'N-1');
  assert.equal(reminder.completedAt, '2026-09-25T21:00:00.000Z');
});

test('appointment overlap excludes cancelled appointments', () => {
  const candidate = { id: 'a', start: '2026-09-22T16:00:00.000Z', end: '2026-09-22T16:30:00.000Z' };
  const rows = [
    { id: 'b', start: '2026-09-22T16:15:00.000Z', end: '2026-09-22T16:45:00.000Z', status: 'Confirmed' },
    { id: 'c', start: '2026-09-22T16:00:00.000Z', end: '2026-09-22T17:00:00.000Z', status: 'Cancelled' }
  ];
  assert.deepEqual(Hub.overlap(rows, candidate).map(row => row.id), ['b']);
});

test('all-day reminders sort first and never create appointment collisions', () => {
  const at = (hour, minute = 0) => new Date(2026, 8, 24, hour, minute).toISOString();
  const rows = [
    { id: 'appt', kind: 'Test drive', start: at(16), end: at(16, 30) },
    { id: 'rem', kind: 'Reminder', allDay: true, start: at(12), end: new Date(2026, 8, 25, 12).toISOString() }
  ];
  assert.deepEqual(Hub.agenda(rows, '2026-09-24').map(row => row.id), ['rem', 'appt']);
  assert.deepEqual(Hub.overlap(rows, rows[1]), []);
});

test('all-day reminder calendar export uses date values', () => {
  const output = Hub.ics({
    id: 'reminder',
    title: 'Talk to Finance about John',
    kind: 'Reminder',
    allDay: true,
    start: '2026-09-24T12:00:00.000Z',
    end: '2026-09-25T12:00:00.000Z'
  });
  assert.match(output, /DTSTART;VALUE=DATE:20260924/);
  assert.match(output, /DTEND;VALUE=DATE:20260925/);
  assert.doesNotMatch(output, /DTSTART:\d+T/);
});

test('question recommendations prioritize context and omit answered topics', () => {
  const contact = { notes: [{ key: 'budget', text: '$500 monthly' }] };
  const rows = Hub.recommendQuestions(contact, 'I want to finance a vehicle and need AWD.');
  assert.equal(rows.some(row => row.key === 'budget'), false);
  assert.equal(rows.some(row => row.key === 'purchaseMethod'), false, 'recognized financing answer is omitted');
  assert.equal(rows[0].key, 'biweeklyPayment');
  assert.ok(rows.findIndex(row => row.key === 'features') < rows.findIndex(row => row.key === 'dealType'));
});

test('buying details normalize and render in the shared compact order', () => {
  const contact = Hub.normalizeContact({
    buying: {
      method: 'Financing',
      totalBudget: '$45,000',
      biweeklyPayment: '400',
      downPayment: '2,000',
      tradeStatus: 'Trade',
      expectedTradeValue: '20,000'
    }
  });
  assert.deepEqual(Hub.buyingSummary(contact), [
    'Financing', '$45,000 Total', '$400 Bi-W', '$2,000 Dwn', 'Trade', '$20,000 Expected'
  ]);
});

test('structured note choices update contact fields without creating a second vehicle concept', () => {
  let contact = Hub.applyContactField({ name: 'John', fields: [] }, 'biweeklyPayment', '$400');
  contact = Hub.applyContactField(contact, 'tradeStatus', 'No Trade');
  contact = Hub.applyContactField(contact, 'interestedVehicle', 'Honda Civic Type R');
  assert.equal(contact.buying.biweeklyPayment, 400);
  assert.equal(contact.buying.tradeStatus, 'No Trade');
  assert.equal(contact.interestedVehicleText, 'Honda Civic Type R');
  assert.equal('wantedVehicle' in contact, false);
});

test('message suggestions retain competing bi-weekly values and label negative context', () => {
  const suggestions = Hub.suggestNotes('Make $400 bi-weekly work. $567 bi-weekly would never really work because it is too high.');
  const payments = suggestions.filter(item => item.key === 'biweeklyPayment');
  assert.deepEqual(payments.map(item => item.value), ['$400', '$567']);
  assert.equal(payments[0].meaning, 'likely goal');
  assert.equal(payments[1].meaning, 'mentioned as too high');
  assert.equal(suggestions.some(item => item.key === 'interestedVehicle'), false);
});

test('appointment display helpers enforce MM/DD/YYYY and 12-hour time', () => {
  assert.equal(Hub.parseDisplayDate('09/26/2026'), '2026-09-26');
  assert.equal(Hub.displayDate('2026-09-26'), '09/26/2026');
  assert.equal(Hub.displayTime('00:05'), '12:05 AM');
  assert.equal(Hub.displayTime('12:30'), '12:30 PM');
  assert.throws(() => Hub.parseDisplayDate('26/09/2026'), /MM\/DD\/YYYY|valid/);
});
