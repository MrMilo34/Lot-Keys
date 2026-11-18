'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const I=require('../lotkeys-website-identity.js'),html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const vehicle={year:'2018',make:'Toyota',model:'RAV4 AWD SE',stock:'BT2050A',vin:'2T3JFREV7JW754389'};
const text='2018 Toyota RAV4 AWD SE\nVIN: 2T3JFREV7JW754389\nLegacy Price $19,888\nVehicle Price $23,502\nKilometres: 221,881\n'+('Vehicle specifications and equipment. '.repeat(12));
test('RAV4 missing stock with matching VIN and vehicle details is verified, without an unavailable warning',()=>{
  const r=I.match(vehicle,{rawText:text});assert.equal(r.ok,true);assert.equal(r.alertWorthy,false);assert.equal(r.priceEligible,true);assert.deepEqual(r.identityMisses,['stock']);assert.ok(r.identityHits.includes('VIN'));
});
test('stock-only matching pages can omit VIN without appearing removed',()=>{
  const r=I.match(vehicle,{rawText:text.replace('VIN: 2T3JFREV7JW754389','Stock #: BT2050A')});assert.equal(r.priceEligible,true);assert.equal(r.alertWorthy,false);
});
test('an absent identifier or long partial page is inconclusive and cannot create an unavailable warning',()=>{
  for(const rawText of ['Toyota dealer '+('menu '.repeat(90)),'2018 Toyota RAV4 AWD SE\n'+('equipment '.repeat(90))]){const r=I.match(vehicle,{rawText});assert.equal(r.alertWorthy,false);assert.equal(r.priceEligible,false)}
});
test('explicit sold and removed messages still create real warnings even if old identifiers remain',()=>{
  for(const status of ['This vehicle has been sold','Listing has been removed','Vehicle no longer available','404 Not Found']){const r=I.match(vehicle,{rawText:text+'\n'+status});assert.equal(r.alertWorthy,true);assert.equal(r.priceEligible,false);assert.equal(r.reasonCode,'explicit-unavailable')}
});
test('another primary vehicle with conflicting identifiers creates an identity-changed warning',()=>{
  const r=I.match(vehicle,{rawText:'2022 Ford Escape SEL\nVIN: 1FMCU9G60NUB12345\nStock #: OTHER123\nSale Price $25,000'});assert.equal(r.priceEligible,false);assert.equal(r.alertWorthy,true);assert.equal(r.reasonCode,'identity-changed');
});
test('a conflicting stock cannot be excused by a matching VIN or approved feedback',()=>{
  const r=I.match({...vehicle,_websiteVerificationFeedbackWeight:100},{rawText:text+'\nStock #: WRONG123'});assert.equal(r.priceEligible,false);assert.equal(r.alertWorthy,false);assert.ok(r.identityConflicts.includes('stock'));
});
test('identifiers are whole values, including punctuation/markdown variants',()=>{
  assert.equal(I.containsIdentifier('Stock BT2050A','BT2050'),false);assert.equal(I.containsIdentifier('Stock BT2050AB','BT2050A'),false);assert.equal(I.containsIdentifier('Stock **BT-2050-A**','BT2050A'),true);assert.equal(I.containsIdentifier('VIN 2T3 JFREV7 JW754389','2T3JFREV7JW754389'),true);
});
test('RAV4 and RAV 4 names are recognized without changing the saved model',()=>{
  const r=I.match({...vehicle,model:'RAV 4 AWD SE'},{rawText:text});assert.equal(r.priceEligible,true);assert.ok(r.identityHits.includes('model'));
});
test('matching identities and sold labels on recommended vehicles cannot identify the primary vehicle',()=>{
  const r=I.match(vehicle,{rawText:'2021 Chevrolet Tahoe LT\nDetails\n## Similar Vehicles\n'+text+'\nThis vehicle has been sold'});assert.equal(r.priceEligible,false);assert.equal(r.alertWorthy,false);
});
test('a parsed conflicting VIN takes precedence over an old identifier elsewhere on the page',()=>{
  const r=I.match(vehicle,{rawText:text,fields:{vin:{value:'1FMCU9G60NUB12345'}}});assert.equal(r.priceEligible,false);assert.ok(r.identityConflicts.includes('VIN'));
});
function importerFixture(){
  const start=html.indexOf('const WebsiteInfo = (()=>{'),end=html.indexOf('\n})();',start)+'\n})();'.length,normalizers=html.slice(html.indexOf('const FACEBOOK_BODY_STYLE_OPTIONS='),html.indexOf('function seedListingFacebookFields('));
  const source=html.slice(start,end).replace('return{scan,scanFacts,imageBlob,primaryVehicleText};','return{scan,scanFacts,imageBlob,primaryVehicleText,parseText};');
  const ctx={URL,Date,AbortController,setTimeout,clearTimeout,LotKeysWebsiteIdentity:I};vm.createContext(ctx);vm.runInContext(normalizers+source+'\nglobalThis.importer=WebsiteInfo;',ctx);return ctx;
}
test('the real price parser uses Legacy Price when VIN matches and stock is absent',()=>{
  const c=importerFixture(),r=c.importer.parseText(text,'https://www.legacydodgewetaskiwin.com/vehicles/2018/toyota/rav4/wetaskiwin/ab/66936526/',{},vehicle);assert.equal(r.price.value,'19888');assert.equal(r.price.identityBound,true);assert.equal(r.price.label,'legacy price');
});
test('known-price backchecks use Legacy Price and cannot substitute sticker price',()=>{
  const v={...vehicle,originalListingUrl:'https://www.legacydodgewetaskiwin.com/vehicles/2018/toyota/rav4/wetaskiwin/ab/66936526/'};
  assert.equal(I.priceBackcheck({rawText:text},23502,v),null);assert.equal(I.priceBackcheck({rawText:text},19888,v).price,19888);assert.equal(I.priceBackcheck({rawText:text.replace('Legacy Price $19,888','')},23502,v),null);
});
test('ambiguous current prices and prices on recommended vehicles cannot pass backchecks',()=>{
  const v={...vehicle,originalListingUrl:'https://www.legacydodgewetaskiwin.com/vehicles/vehicle/'};
  assert.equal(I.priceBackcheck({rawText:text+'\nLegacy Price $22,888'},19888,v),null);assert.equal(I.priceBackcheck({rawText:text,fields:{price:{ambiguous:true}}},19888,v),null);assert.equal(I.priceBackcheck({rawText:text.replace('Legacy Price $19,888','')+'\nSimilar Vehicles\nLegacy Price $19,888'},19888,v),null);
});
test('fact readers reuse successful exact-URL reads, reparse for identity, and honor forced checks',async()=>{
  const c=importerFixture();let reads=0;c.fetch=async url=>{if(!url.startsWith('https://r.jina.ai/'))throw Error('CORS');reads++;return{ok:true,text:async()=>text}};
  const url='https://dealer.example/vehicle';const [a,b]=await Promise.all([c.importer.scanFacts(url,()=>{},vehicle),c.importer.scanFacts(url,()=>{},vehicle)]);assert.equal(reads,1);assert.equal(a.fields.price.value,b.fields.price.value);const wrong=await c.importer.scanFacts(url,()=>{},{...vehicle,vin:'1FMCU9G60NUB12345'});assert.equal(wrong.fields.price?.identityBound,false);await c.importer.scanFacts(url,()=>{},vehicle,{force:true});assert.equal(reads,2);
});
test('failed exact-URL reads are not cached as evidence of a removed vehicle',async()=>{
  const c=importerFixture();let reads=0;c.fetch=async()=>{reads++;throw Error('network unavailable')};for(let i=0;i<2;i++)await assert.rejects(c.importer.scanFacts('https://dealer.example/vehicle'),/network/);assert.equal(reads,4);
});
function alertFixture({editDuringRead=false,partial=false}={}){
  const v={...vehicle,id:'vehicle',price:19888,updatedAt:10,syncStatus:'synced',originalListingUrl:'https://www.legacydodgewetaskiwin.com/vehicles/2018/toyota/rav4/wetaskiwin/ab/66936526/'},l={id:'listing',vehicleId:'vehicle',ownerUserName:'Blair',price:19888,marketplaceTitle:'My saved title',description:'My saved copy',status:'Active',priceAlert:{type:'unavailable',verificationBasis:'identity-missing',reason:'stock missing'}},rows={vehicles:new Map([[v.id,v]]),listings:new Map([[l.id,l]])},parser=importerFixture();
  const ctx={console,Date,URL,LotKeysWebsiteIdentity:I,navigator:{onLine:true},priceNumber:x=>Number(String(x??'').replace(/[^0-9.]/g,''))||null,setting:async(key,f)=>key==='userName'?'Blair':f,setSetting:async()=>{},DB:{all:async type=>structuredClone([...rows[type].values()]),get:async(type,id)=>structuredClone(rows[type].get(id)),put:async(type,row)=>rows[type].set(row.id,structuredClone(row))},sameUserName:(a,b)=>a===b,updateListingNavAlert:async()=>{},toast:()=>{},WebsiteInfo:{scanFacts:async()=>{if(editDuringRead){rows.listings.get('listing').marketplaceTitle='New custom title';rows.listings.get('listing').description='New custom description';rows.listings.get('listing').price=20999}return partial?{rawText:'Dealer menu '+('options '.repeat(80)),fields:{}}:{rawText:text,fields:parser.importer.parseText(text,v.originalListingUrl,{},v)}}}};
  vm.createContext(ctx);vm.runInContext(html.slice(html.indexOf('  function websiteVehicleMatch('),html.indexOf('  async function approvePriceCorrectionRequest(')),ctx);ctx.updateListingNavAlert=async()=>{};return{ctx,rows};
}
test('the actual background check clears the false RAV4 warning and verifies its Legacy price',async()=>{
  const f=alertFixture();assert.equal(await f.ctx.checkPriceAlerts({force:true}),1);assert.equal(f.rows.vehicles.get('vehicle').websitePriceFinding.status,'found');assert.equal(f.rows.vehicles.get('vehicle').websitePriceFinding.price,19888);assert.equal(f.rows.listings.get('listing').priceAlert,null);
});
test('a slow source check preserves a newly saved Listing title, description and price',async()=>{
  const f=alertFixture({editDuringRead:true});await f.ctx.checkPriceAlerts({force:true});const l=f.rows.listings.get('listing');assert.equal(l.marketplaceTitle,'New custom title');assert.equal(l.description,'New custom description');assert.equal(l.price,20999);assert.equal(l.priceAlert,null);
});
test('a partial reader response clears an old missing-field warning without claiming verification',async()=>{
  const f=alertFixture({partial:true});await f.ctx.checkPriceAlerts({force:true});assert.equal(f.rows.listings.get('listing').priceAlert,null);assert.equal(f.rows.vehicles.get('vehicle').websitePriceFinding.status,'price-unconfirmed');
});
test('source findings cannot overwrite a Vehicle Profile edited or queued after the check began',async()=>{
  const f=alertFixture();const snapshot=structuredClone(f.rows.vehicles.get('vehicle'));snapshot.websitePriceFinding={status:'old-finding'};f.rows.vehicles.get('vehicle').price=17999;f.rows.vehicles.get('vehicle').updatedAt=11;assert.equal(await f.ctx.writeVehicleWebsiteFinding(snapshot),false);assert.equal(f.rows.vehicles.get('vehicle').price,17999);assert.equal(f.rows.vehicles.get('vehicle').websitePriceFinding,undefined);
});
