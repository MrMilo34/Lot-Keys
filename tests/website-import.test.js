'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('const WebsiteInfo = (()=>{');
const end = html.indexOf('\n})();', start) + '\n})();'.length;
assert.ok(start >= 0 && end > start, 'WebsiteInfo module must exist');
const normalizers = html.slice(html.indexOf('const FACEBOOK_BODY_STYLE_OPTIONS='), html.indexOf('function seedListingFacebookFields('));
const source = html.slice(start, end).replace('return{scan,scanFacts,imageBlob,primaryVehicleText};', 'return{scan,scanFacts,imageBlob,primaryVehicleText,parseText,detectVehiclePrice,headingVehicle,carfaxReportUrl,extractCarfaxReportUrl,extractImagesFromMarkdown,classifyPhotos};');
const context = vm.createContext({ URL, Date, AbortController, setTimeout, clearTimeout, LotKeysWebsiteIdentity: require('../lotkeys-website-identity.js') });
vm.runInContext(normalizers + source + '\nglobalThis.importer = WebsiteInfo;', context);
const importer = context.importer;
const descriptionStart = html.indexOf('const DescriptionTools = (()=>{');
const descriptionEnd = html.indexOf('\n})();', descriptionStart) + '\n})();'.length;
vm.runInContext(html.slice(descriptionStart, descriptionEnd).replace('return{inspect,build};', 'return{inspect,build,parseSupplementary};') + '\nglobalThis.descriptionTools = DescriptionTools;', context);
const descriptionTools = context.descriptionTools;

// Transcribed from Blair's supplied screenshot; this is not a live-site capture.
const listing = fs.readFileSync(path.join(__dirname, 'fixtures', 'legacy-listing.txt'), 'utf8');
const legacyUrl = 'https://www.legacydodgewetaskiwin.com/vehicles/2023/jeep/grand-wagoneer/wetaskiwin/ab/71380234/?sale_class=used';
const reportUrl = 'https://vhr.carfax.ca/?id=PHaYmcXfU70iH2wRsnrlJWBW6g93B4az';
const vehicle = { year: '2023', make: 'Jeep', model: 'Grand Wagoneer Series II', stock: 'BT2556' };
const sticker = { price: 79507, source: 'jsonld', name: '2023 Jeep Grand Wagoneer Series II', stock: 'BT2556', availability: 'https://schema.org/InStock' };
// Nautilus facts and headings from the live page; the overview uses our own factual wording.
const nautilus = fs.readFileSync(path.join(__dirname, 'fixtures', 'legacy-nautilus-reader.txt'), 'utf8');
const nautilusUrl = 'https://www.legacydodgewetaskiwin.com/vehicles/2024/lincoln/nautilus/wetaskiwin/ab/71216856/?sale_class=used';
const nautilusReport = 'https://vhr.carfax.ca/?id=Gn7slbZVDZagPUkKvrAs6YdajCnkj1oB';
const nautilusVehicle = { year: '2024', make: 'Lincoln', model: 'Nautilus Reserve', stock: 'BT2550', vin: '5LMPJ8KA5RJ825421' };

test('Nautilus Overview supplies a real profile description before generic metadata', () => {
  const fields = importer.parseText(nautilus, nautilusUrl, { description: 'Generic dealership metadata that contains no specific vehicle equipment.' });
  assert.match(fields.description?.value || '', /Nautilus Reserve SUV/);
  assert.match(fields.description.value, /250HP 2\.0L 4 Cylinder Engine/);
  assert.match(fields.description.value, /Apple CarPlay/);
  assert.doesNotMatch(fields.description.value, /Detailed Pricing|\$99,999|Recommended Vehicles|Generic dealership/);
});

test('plain vehicle descriptions stop before options and pricing sections', () => {
  for (const label of ['Overview', 'Description', 'Vehicle details']) {
    const text = `2024 Lincoln Nautilus Reserve\n${label}\nThis vehicle includes Apple CarPlay, adaptive cruise control and cooled front seats.\nOptions\nUnverified optional equipment\nDetailed Pricing\nLegacy Price $55,990`;
    const fields = importer.parseText(text, nautilusUrl);
    assert.match(fields.description?.value || '', /Apple CarPlay/);
    assert.doesNotMatch(fields.description.value, /Unverified|Detailed Pricing|Legacy Price/);
  }
});

test('established Go Auto description sections and metadata fallback still work', () => {
  const url = 'https://www.goauto.ca/vehicles/test-inventory';
  const copy = 'This SUV includes heated front seats, navigation and a panoramic sunroof.';
  for (const label of ['Vehicle details', 'Description']) {
    const fields = importer.parseText(`2023 Infiniti QX60 Luxe\n## Overview\nBody Style: SUV\n## ${label}\n${copy}\n## Location\nDealer address`, url);
    assert.equal(fields.description?.value, copy);
  }
  assert.equal(importer.parseText('2023 Infiniti QX60 Luxe', url, { description: copy }).description.value, copy);
  assert.equal(importer.parseText('2023 Infiniti QX60 Luxe', url).description, undefined);
});

test('Legacy import uses sale price and preserves the supplied vehicle facts and report', () => {
  const fields = importer.parseText(listing, legacyUrl, { carfaxUrl: reportUrl }, vehicle);
  assert.equal(fields.price.value, '70990');
  assert.equal(fields.price.label, 'legacy price');
  assert.equal(fields.price.confidence, 'high');
  assert.equal(fields.price.identityBound, true);
  assert.equal(fields.price.ambiguous, false);
  assert.equal(fields.year.value, '2023');
  assert.equal(fields.make.value, 'Jeep');
  assert.equal(fields.model.value, 'GRAND WAGONEER SERIES II');
  assert.equal(fields.stock.value, 'BT2556');
  assert.equal(fields.odometer.value, '39446');
  assert.equal(fields.odometerUnit.value, 'KM');
  assert.equal(fields.bodyStyle.value, 'SUV');
  assert.equal(fields.exteriorColor.value, 'Blue');
  assert.equal(fields.transmission.value, 'Automatic');
  assert.equal(fields.fuelType.value, 'Gasoline');
  assert.equal(fields.carfaxUrl.value, reportUrl);
  assert.equal(fields.carfaxOneOwner, undefined, 'report findings require separate verification');
  assert.equal(fields.carfaxNoAccidents, undefined);
});

test('Legacy sale label outranks matching structured sticker metadata', () => {
  const fields = importer.parseText(listing, legacyUrl, { structuredPrices: [sticker] }, vehicle);
  assert.equal(fields.price.value, '70990');
  assert.equal(fields.price.source, 'text');
  assert.equal(fields.price.label, 'legacy price');
});

test('retrieved Nautilus layout keeps Reserve trim and reads bulleted specifications', () => {
  const fields = importer.parseText(nautilus, nautilusUrl, { title: '2024 Lincoln Nautilus' }, nautilusVehicle);
  assert.equal(fields.year.value, '2024');
  assert.equal(fields.make.value, 'Lincoln');
  assert.equal(fields.model.value, 'Nautilus Reserve');
  assert.equal(fields.price.value, '55990');
  assert.equal(fields.price.ambiguous, false);
  assert.equal(fields.price.identityBound, true);
  assert.equal(fields.stock.value, 'BT2550');
  assert.equal(fields.vin.value, '5LMPJ8KA5RJ825421');
  assert.equal(fields.odometer.value, '38366');
  assert.equal(fields.bodyStyle.value, 'SUV');
  assert.equal(fields.exteriorColor.value, 'White');
  assert.equal(fields.transmission.value, 'Automatic');
  assert.equal(fields.fuelType.value, 'Gasoline');
});

test('Nautilus new import and stock-only verification exclude recommended vehicle prices', () => {
  for (const expected of [{}, { ...nautilusVehicle, vin: '' }]) {
    const fields = importer.parseText(nautilus, nautilusUrl, {}, expected);
    assert.equal(fields.price.value, '55990');
    assert.equal(fields.price.ambiguous, false);
    assert.deepEqual(Array.from(fields.price.alternatives, x => x.price), [55990]);
  }
  const fields = importer.parseText(`${listing}\n### Similar Vehicles\n2021 Ford Escape\nCall for Price`, legacyUrl, {}, vehicle);
  assert.equal(fields.price.value, '70990');
  assert.equal(fields.priceStatus, undefined);
});

test('a CARFAX request button is distinct from a report and the supplied Nautilus link stays exact', () => {
  assert.equal(importer.extractCarfaxReportUrl(null, nautilus, nautilusUrl), '');
  assert.equal(importer.parseText(nautilus, nautilusUrl).carfaxUrl, undefined);
  const fields = importer.parseText(nautilus, nautilusUrl, { carfaxUrl: nautilusReport });
  assert.equal(fields.carfaxUrl.value, nautilusReport);
  assert.notEqual(fields.carfaxUrl.value, reportUrl);
  assert.equal(fields.carfaxNoAccidents, undefined);
});

test('Nautilus thumbnail links resolve to original photos without duplicates or page placeholders', () => {
  const images = importer.extractImagesFromMarkdown(nautilus, nautilusUrl);
  assert.deepEqual(Array.from(images, x => x.url), [
    'https://prod.pictures.autoscout24.net/listing-images/3a42266f-c06d-4b0e-89d0-0249266027ef_3afdaba0-1af6-49b2-9ac7-b0a3b85e4172.png',
    'https://prod.pictures.autoscout24.net/listing-images/3a42266f-c06d-4b0e-89d0-0249266027ef_00daedcc-099f-4430-bda7-fb926b15865f.png'
  ]);
  assert.ok(images.every(x => !x.width && !x.height));
});

test('standard 800-by-600 primary vehicle galleries are recommended after size probing', () => {
  const images = importer.extractImagesFromMarkdown(nautilus, nautilusUrl);
  const photos = importer.classifyPhotos(images.map(x => ({ ...x, naturalWidth: 800, naturalHeight: 600 })));
  assert.equal(photos.length, 2);
  assert.ok(photos.every(x => x.confidence === 'high' && x.selected));
});

test('a Recently viewed navigation label cannot hide the primary vehicle', () => {
  const text = nautilus.replace('Markdown Content:', 'Markdown Content:\n\nRecently viewed');
  const fields = importer.parseText(text, nautilusUrl);
  assert.equal(fields.model.value, 'Nautilus Reserve');
  assert.equal(fields.price.value, '55990');
  assert.equal(fields.price.ambiguous, false);
});

test('original-photo resolution does not assume that unrelated CDNs share this format', () => {
  for (const host of ['dealer.example', 'prod.pictures.autoscout24.net.example']) {
    const text = `![Thumbnail](https://${host}/listing-images/vehicle.png/133x100.webp)`;
    assert.equal(importer.extractImagesFromMarkdown(text, nautilusUrl).length, 0);
  }
});

test('short reader titles remain a fallback when there is no vehicle heading', () => {
  assert.equal(importer.headingVehicle('Title: 2024 Lincoln Nautilus').model, 'Nautilus');
  assert.equal(importer.headingVehicle('2023 Ford F-150 Lariat').model, 'F-150 Lariat');
});

test('new imports without an expected identity still use Legacy sale price', () => {
  for (const host of ['www.legacydodgewetaskiwin.com', 'legacydodgewetaskiwin.ca']) {
    const fields = importer.parseText(listing, `https://${host}/vehicles/71380234/`, { structuredPrices: [sticker] });
    assert.equal(fields.price.value, '70990');
    assert.equal(fields.price.confidence, 'suggested');
    assert.equal(fields.price.identityBound, false, 'new import must not claim an existing identity match');
  }
});

test('Legacy preference cannot override a different expected stock number', () => {
  const expected = { ...vehicle, stock: 'OTHER123' };
  const matched = { ...sticker, stock: expected.stock, price: 65000 };
  const fields = importer.parseText(listing, legacyUrl, { structuredPrices: [matched] }, expected);
  assert.equal(fields.price, undefined, 'mismatched sale text and sticker metadata cannot establish a sale price');
});

test('conflicting Legacy sale labels remain ambiguous', () => {
  const fields = importer.parseText(`${listing}\n${'Details '.repeat(65)}\nLegacy Price $72,990`, legacyUrl, {}, vehicle);
  assert.equal(fields.price.ambiguous, true);
  assert.equal(fields.price.confidence, 'low');
  assert.deepEqual(Array.from(fields.price.alternatives, x => x.price).sort(), [70990, 72990]);
});

test('payment amounts and a negative discount cannot become a vehicle price', () => {
  for (const unit of [' per month', '\nper month', '\n/mo']) {
    const text = '2023 Jeep Grand Wagoneer Series II - $271.41 /WK\nStock #: BT2556\nDiscount $-8,517\nFinance Price $1,200/bw\nLegacy Price $1,500' + unit;
    const fields = importer.parseText(text, legacyUrl, {}, vehicle);
    assert.equal(fields.price, undefined);
  }
});

test('a recently rejected Legacy price is not preferred over matched structured data', () => {
  const expected = { ...vehicle, websitePriceFinding: { feedback: [{ at: new Date().toISOString(), detectedPrice: 70990, reason: 'wrong-price' }] } };
  const fields = importer.parseText(listing, legacyUrl, { structuredPrices: [sticker] }, expected);
  assert.equal(fields.price, undefined, 'rejected sale price must not cause a sticker-price substitution');
});

test('missing Legacy sale price does not fall back to Vehicle Price or metadata', () => {
  const noSale = listing.replace('Legacy Price\n$70,990\n', '');
  assert.equal(importer.parseText(noSale, legacyUrl, { structuredPrices: [sticker] }, vehicle).price, undefined);
  assert.equal(importer.parseText(noSale, legacyUrl, { structuredPrices: [sticker] }).price, undefined);
});

test('Legacy rules stay confined to the recognized dealership hosts', () => {
  for (const url of ['https://dealer.example/vehicle', 'https://legacydodgewetaskiwin.com.example/vehicle']) {
    const fields = importer.parseText(listing, url, { structuredPrices: [sticker] }, vehicle);
    assert.equal(fields.price.value, '79507');
    assert.equal(fields.price.label, 'structured');
  }
  const fields = importer.parseText('2023 Jeep Grand Wagoneer Series II\nSale Price $70,990\nStock #: BT2556', 'https://dealer.example/vehicle', {}, vehicle);
  assert.equal(fields.price.value, '70990');
  assert.equal(fields.price.confidence, 'high');
});

// Synthetic examples of the existing Go Auto-style labels and gallery format.
// These cases preserve the previous parser contract; they are not live-site captures.
test('Go Auto-style Your Price remains valid before a separate payment heading', () => {
  const expected = { year: '2023', make: 'Infiniti', model: 'QX60 Luxe', stock: 'TEST43' };
  for (const payment of ['Weekly Payment $125', 'Monthly Payment $500', 'Bi-weekly Payment $250', 'Weekly\n$125', 'Monthly\n$500']) {
    const text = '2023 Infiniti QX60 Luxe\nStock #: TEST43\nYour Price $59,500\n' + payment;
    const fields = importer.parseText(text, 'https://www.goauto.ca/vehicles/test-inventory', {}, expected);
    assert.equal(fields.price.value, '59500');
    assert.equal(fields.price.label, 'your price');
    assert.equal(fields.price.confidence, 'high');
    assert.equal(fields.price.identityBound, true);
  }
});

test('Go Auto matching structured sale data keeps its established priority', () => {
  const expected = { year: '2023', make: 'Infiniti', model: 'QX60 Luxe', stock: 'TEST43' };
  const structured = { price: 59500, source: 'jsonld', name: '2023 Infiniti QX60 Luxe', stock: 'TEST43' };
  const fields = importer.parseText('2023 Infiniti QX60 Luxe\nStock #: TEST43\nYour Price $59,500', 'https://www.goauto.ca/vehicles/test-inventory', { structuredPrices: [structured] }, expected);
  assert.equal(fields.price.value, '59500');
  assert.equal(fields.price.source, 'jsonld');
  assert.equal(fields.price.confidence, 'high');
  assert.equal(fields.price.identityBound, true);
});

test('existing gallery recognition retains large photos and excludes duplicates and related vehicles', () => {
  const text = [
    '![Front](https://dealer.example/vehicle-front-1200x800.jpg)',
    '![Front thumbnail](https://dealer.example/vehicle-front-400x300.jpg)',
    '![Rear](https://dealer.example/vehicle-rear-1200x800.jpg)',
    '![Logo](https://dealer.example/dealer-logo.png)',
    '![CARFAX](https://dealer.example/carfax-badge.png)',
    '## Similar vehicles',
    '![Other vehicle](https://dealer.example/vehicle-other-1200x800.jpg)'
  ].join('\n');
  const images = importer.extractImagesFromMarkdown(text, 'https://www.goauto.ca/vehicles/test-inventory');
  assert.deepEqual(Array.from(images, x => x.url), ['https://dealer.example/vehicle-front-1200x800.jpg', 'https://dealer.example/vehicle-rear-1200x800.jpg']);
  const photos = importer.classifyPhotos(images);
  assert.equal(photos.length, 2);
  assert.ok(photos.every(x => x.confidence === 'high' && x.selected));
});

test('call-for-price status still takes priority over a nearby price', () => {
  const fields = importer.parseText(`${listing}\nCall for Price`, legacyUrl, { structuredPrices: [sticker] }, vehicle);
  assert.equal(fields.price, undefined);
  assert.equal(fields.priceStatus.value, 'call-for-price');
});

test('weekly and monthly title payments are removed while model hyphens survive', () => {
  for (const suffix of [' - $271.41 /WK', ' - $510/bw', ' $650 per month', ' - $500 bi-weekly']) {
    const fields = importer.headingVehicle(`2023 Ford F-150 Lariat${suffix}`);
    assert.equal(fields.model, 'F-150 Lariat');
  }
  assert.equal(importer.headingVehicle('2023 Ford F-150 Lariat').model, 'F-150 Lariat');
});

test('CARFAX View Report anchors and button attributes retain the exact report query', () => {
  for (const attr of ['href', 'data-carfax-url', 'data-href', 'data-url']) {
    const doc = { querySelectorAll: () => [{ getAttribute: name => name === attr ? reportUrl : null }] };
    assert.equal(importer.extractCarfaxReportUrl(doc, '', legacyUrl), reportUrl);
  }
  assert.equal(importer.carfaxReportUrl(reportUrl.replace('https:', ''), legacyUrl), reportUrl);
});

test('reader links and escaped page data extract each listing’s own CARFAX report', () => {
  assert.equal(importer.extractCarfaxReportUrl(null, `[View Report](${reportUrl})`, legacyUrl), reportUrl);
  assert.equal(importer.extractCarfaxReportUrl(null, JSON.stringify({ report: reportUrl }).replaceAll('/', '\\/').replace('=', '\\u003d'), legacyUrl), reportUrl);
  const anotherReport = 'https://vhr.carfax.ca/?id=OtherVehicle123&language=en';
  assert.equal(importer.extractCarfaxReportUrl(null, `<button data-url="${anotherReport.replace('&', '&amp;')}">View Report</button>`, legacyUrl), anotherReport);
  assert.equal(importer.parseText(listing, legacyUrl).carfaxUrl, undefined, 'never reuse the example vehicle report when none is present');
});

test('CARFAX assets, trade-in pages and unrelated hosts are rejected', () => {
  for (const url of ['https://vhr.carfax.ca/badge.svg', 'https://www.carfax.ca/trade-in', 'https://vhr.carfax.ca.example/?id=123', 'ftp://vhr.carfax.ca/?id=123']) {
    assert.equal(importer.carfaxReportUrl(url, legacyUrl), '');
  }
  assert.equal(importer.extractCarfaxReportUrl(null, '<img src="https://vhr.carfax.ca/badge.png">', legacyUrl), '');
});

test('reader fallback passes the Legacy URL and extracted report into the real scan path', async () => {
  context.fetch = async url => {
    if (url === legacyUrl) throw new Error('Direct fetch blocked');
    assert.equal(url, 'https://r.jina.ai/' + legacyUrl);
    return { ok: true, text: async () => listing + `\n[View Report](${reportUrl})` };
  };
  const result = await importer.scanFacts(legacyUrl, () => {}, vehicle);
  assert.equal(result.mode, 'reader');
  assert.equal(result.fields.price.value, '70990');
  assert.equal(result.fields.carfaxUrl.value, reportUrl);
  assert.equal(result.fields.model.value, 'GRAND WAGONEER SERIES II');
});

test('a successful fetch of the Legacy JavaScript shell still uses rendered page facts', async () => {
  context.DOMParser = class {
    parseFromString() {
      return { body: { innerText: 'Sales\nInventory\nRequest CARFAX Canada' }, title: '2024 Lincoln Nautilus in Wetaskiwin', querySelector: () => null };
    }
  };
  context.fetch = async url => {
    if (url === nautilusUrl) return { ok: true, text: async () => '<vehicle-details></vehicle-details>' };
    assert.equal(url, 'https://r.jina.ai/' + nautilusUrl);
    return { ok: true, text: async () => nautilus };
  };
  const result = await importer.scanFacts(nautilusUrl);
  assert.equal(result.mode, 'reader');
  assert.equal(result.fields.model.value, 'Nautilus Reserve');
  assert.equal(result.fields.price.value, '55990');
  assert.equal(result.fields.price.ambiguous, false);
});

test('readable Legacy vehicle pages retain the direct scan path', async () => {
  const text = '2024 Lincoln Nautilus Reserve\nStock #: BT2550\nLegacy Price $55,990';
  context.DOMParser = class {
    parseFromString() {
      return { body: { innerText: text }, title: '2024 Lincoln Nautilus', querySelector: () => null, querySelectorAll: () => [] };
    }
  };
  context.fetch = async url => {
    assert.equal(url, nautilusUrl, 'readable pages need no reader request');
    return { ok: true, text: async () => '<h1>2024 Lincoln Nautilus Reserve</h1>' };
  };
  const result = await importer.scanFacts(nautilusUrl,()=>{},{},{force:true});
  assert.equal(result.mode, 'direct');
  assert.equal(result.fields.model.value, 'Nautilus Reserve');
  assert.equal(result.fields.price.value, '55990');
});

test('Description Builder receives the Nautilus overview, equipment and bulleted specifications', async () => {
  const savedScan = importer.scanFacts;
  const profile = { ...nautilusVehicle, price: '55990', odometer: '38366', odometerUnit: 'KM', description: '', originalListingUrl: nautilusUrl };
  importer.scanFacts = async () => ({ fields: importer.parseText(nautilus, nautilusUrl, {}, profile), rawText: nautilus + '\nPanoramic Sunroof on the recommended vehicle only' });
  try {
    const result = await descriptionTools.inspect(profile, {});
    assert.match(result.facts.overviewSource, /Nautilus Reserve SUV/);
    assert.equal(result.facts.engine, '2.0L 4 Cylinder Engine');
    assert.equal(result.facts.hp, '250HP');
    assert.equal(result.facts.drivetrain, 'All Wheel Drive');
    assert.equal(result.facts.transmission, '8-Speed Automatic');
    const labels = Array.from(result.features, x => x.label);
    assert.ok(labels.includes('Power Liftgate'));
    assert.ok(labels.includes('Ventilated Front Seats'));
    assert.ok(labels.includes('Apple CarPlay'));
    assert.ok(!labels.includes('Panoramic Sunroof'));
    const template = { blocks: [{ type: 'overview', title: 'Overview', useEmojis: false }, { type: 'features', title: 'Features', useEmojis: false }] };
    const copy = descriptionTools.build(template, result.facts, result.features, 'Blair');
    assert.match(copy, /2\.0L 4 Cylinder Engine/);
    assert.match(copy, /Power Liftgate/);
    assert.doesNotMatch(copy, /Recommended Vehicles|\$99,999|Panoramic Sunroof/);
    assert.equal(profile.description, '', 'inspection cannot write into the saved profile');
  } finally { importer.scanFacts = savedScan; }
});

test('Description Builder keeps an existing personal description and Profile price authoritative', async () => {
  const savedScan = importer.scanFacts;
  const ownCopy = 'My existing description contains the equipment and wording I have personally reviewed.';
  const profile = { ...nautilusVehicle, description: ownCopy, price: '55000', originalListingUrl: nautilusUrl };
  importer.scanFacts = async () => ({ fields: importer.parseText(nautilus, nautilusUrl, {}, profile), rawText: nautilus });
  try {
    const result = await descriptionTools.inspect(profile, {});
    assert.equal(result.facts.overviewSource, ownCopy);
    assert.equal(result.facts.priceValue, 55000);
    assert.equal(profile.description, ownCopy);
    assert.equal(result.discrepancies.length, 1);
  } finally { importer.scanFacts = savedScan; }
});

test('a partial Legacy reader response is refreshed and all 20 returned gallery photos stay ordered', async () => {
  const saved = { fetch: context.fetch, Image: context.Image };
  const withoutImages = nautilus.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  const gallery = Array.from({ length: 20 }, (_, i) => `![Vehicle photo ${i + 1}](https://prod.pictures.autoscout24.net/listing-images/test-gallery_photo-${i + 1}.png/133x100.webp)`).join('\n');
  const urls = Array.from({ length: 20 }, (_, i) => `https://prod.pictures.autoscout24.net/listing-images/test-gallery_photo-${i + 1}.png`);
  const progress = [];
  let readerCalls = 0;
  context.Image = class {
    constructor() { this.naturalWidth = 800; this.naturalHeight = 600; }
    set src(value) { queueMicrotask(() => this.onload?.()); }
  };
  context.fetch = async (url, options) => {
    if (url === nautilusUrl) throw new Error('CORS blocked');
    if (url === 'https://r.jina.ai/' + nautilusUrl) {
      readerCalls++;
      if (readerCalls === 1) return { ok: true, text: async () => withoutImages };
      assert.equal(options.headers['X-No-Cache'], 'true');
      assert.equal(options.headers['X-Wait-For-Selector'], 'img[src*="/listing-images/"]');
      return { ok: true, text: async () => withoutImages.replace('# 2024 Lincoln Nautilus Reserve', '# 2024 Lincoln Nautilus Reserve\n' + gallery) };
    }
    return { ok: false };
  };
  try {
    const result = await importer.scan(nautilusUrl, message => progress.push(message));
    assert.equal(readerCalls, 2);
    assert.ok(progress.some(x => /Waiting for the vehicle photo gallery/.test(x)));
    assert.equal(result.photoWarning, '');
    assert.match(result.fields.description.value, /Nautilus Reserve SUV/);
    assert.equal(result.photos.length, 20);
    assert.deepEqual(Array.from(result.photos, x => x.url), urls);
    assert.ok(result.photos.every(x => x.selected && x.confidence === 'high'));
  } finally { Object.assign(context, saved); }
});

test('an unavailable gallery keeps the vehicle description and reports that photos need another import', async () => {
  const saved = { fetch: context.fetch, Image: context.Image };
  const withoutImages = nautilus.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  let readerCalls = 0;
  context.fetch = async url => {
    if (url === nautilusUrl) throw new Error('CORS blocked');
    readerCalls++;
    if (readerCalls === 1) return { ok: true, text: async () => withoutImages };
    throw new Error('Gallery unavailable');
  };
  try {
    const result = await importer.scan(nautilusUrl);
    assert.match(result.fields.description.value, /Nautilus Reserve SUV/);
    assert.equal(result.fields.price.value, '55990');
    assert.equal(result.photos.length, 0);
    assert.match(result.photoWarning, /photo gallery.*Try Import again/);
  } finally { Object.assign(context, saved); }
});

test('original gallery downloads reuse available image bytes and preserve the generic photo fallback', async () => {
  const savedFetch = context.fetch;
  const original = 'https://prod.pictures.autoscout24.net/listing-images/test-gallery_photo-1.png';
  const image = { type: 'image/png' };
  const calls = [];
  context.fetch = async (url, options) => {
    calls.push({ url, options });
    if (url === original) return { ok: true, blob: async () => image };
    if (url.startsWith('https://images.weserv.nl/')) return { ok: true, blob: async () => image };
    throw new Error('Direct download blocked');
  };
  try {
    assert.equal(await importer.imageBlob(original), image);
    assert.equal(calls[0].options.cache, 'force-cache');
    assert.ok(calls[0].options.signal instanceof AbortSignal);
    assert.equal(await importer.imageBlob('https://dealer.example/vehicle-photo.jpg'), image);
    assert.equal(calls[1].options.cache, 'no-store');
    assert.ok(calls[2].url.startsWith('https://images.weserv.nl/'));
  } finally { context.fetch = savedFetch; }
});

test('a stalled photo body is aborted and the existing fallback can finish the download', { timeout: 1000 }, async () => {
  const saved = { fetch: context.fetch, setTimeout: context.setTimeout };
  const image = { type: 'image/jpeg' };
  const calls = [];
  context.setTimeout = callback => setTimeout(callback, 5);
  context.fetch = async (url, options) => {
    calls.push({ url, options });
    if (calls.length === 1) return { ok: true, blob: () => new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('Body download aborted')), { once: true })) };
    return { ok: true, blob: async () => image };
  };
  try {
    assert.equal(await importer.imageBlob('https://dealer.example/vehicle-photo.jpg'), image);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].options.signal.aborted, true);
    assert.ok(calls[1].url.startsWith('https://images.weserv.nl/'));
  } finally { Object.assign(context, saved); }
});

test('distinct original photos at the same resolution survive a similar visual hash', () => {
  const photos = importer.classifyPhotos([
    { url: 'https://dealer.example/vehicle-front-a.png', naturalWidth: 800, naturalHeight: 600, fingerprint: '0'.repeat(64), position: 0.1 },
    { url: 'https://dealer.example/vehicle-front-b.png', naturalWidth: 800, naturalHeight: 600, fingerprint: '0'.repeat(63) + '1', position: 0.2 }
  ]);
  assert.equal(photos.length, 2);
  assert.ok(photos.every(x => x.selected));
});

test('lower-resolution visual duplicates still yield to the original gallery', () => {
  const photos = importer.classifyPhotos([
    { url: 'https://dealer.example/vehicle-front-small.png', naturalWidth: 800, naturalHeight: 600, fingerprint: '0'.repeat(64), position: 0.1 },
    { url: 'https://dealer.example/vehicle-front-large.png', naturalWidth: 1200, naturalHeight: 900, fingerprint: '0'.repeat(64), position: 0.2 },
    { url: 'https://dealer.example/vehicle-rear-large.png', naturalWidth: 1200, naturalHeight: 900, fingerprint: '1'.repeat(64), position: 0.3 }
  ]);
  assert.equal(photos.length, 2);
  assert.ok(photos.every(x => x.url.includes('-large.png') && x.selected));
});

test('readable direct vehicle facts retain their price while the reader supplies a missing gallery', async () => {
  const saved = { fetch: context.fetch, Image: context.Image, DOMParser: context.DOMParser };
  const text = '2024 Lincoln Nautilus Reserve\nStock #: BT2550\nLegacy Price $55,990';
  context.DOMParser = class {
    parseFromString() { return { body: { innerText: text }, title: '2024 Lincoln Nautilus', querySelector: () => null, querySelectorAll: () => [] }; }
  };
  context.Image = class {
    constructor() { this.naturalWidth = 800; this.naturalHeight = 600; }
    set src(value) { queueMicrotask(() => this.onload?.()); }
  };
  context.fetch = async url => {
    if (url === nautilusUrl) return { ok: true, text: async () => '<h1>2024 Lincoln Nautilus Reserve</h1>' };
    if (url === 'https://r.jina.ai/' + nautilusUrl) return { ok: true, text: async () => nautilus.replace('$55,990', '$56,990') };
    return { ok: false };
  };
  try {
    const result = await importer.scan(nautilusUrl);
    assert.equal(result.mode, 'direct');
    assert.equal(result.fields.price.value, '55990');
    assert.match(result.fields.description.value, /Nautilus Reserve SUV/);
    assert.equal(result.photos.length, 2);
    assert.ok(result.photos.every(x => x.selected));
  } finally { Object.assign(context, saved); }
});
