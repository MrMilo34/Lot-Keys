'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const zlib=require('node:zlib');
const root=path.resolve(__dirname,'..');
function zipFiles(relative){
  const b=fs.readFileSync(path.join(root,relative));let e=b.length-22;
  while(e>=Math.max(0,b.length-65557)&&b.readUInt32LE(e)!==0x06054b50)e--;
  assert.ok(e>=0,'ZIP directory missing');let offset=b.readUInt32LE(e+16);const files=new Map();
  for(let i=0;i<b.readUInt16LE(e+10);i++){
    assert.equal(b.readUInt32LE(offset),0x02014b50);const n=b.readUInt16LE(offset+28),extra=b.readUInt16LE(offset+30),comment=b.readUInt16LE(offset+32),method=b.readUInt16LE(offset+10),size=b.readUInt32LE(offset+20),local=b.readUInt32LE(offset+42),name=b.subarray(offset+46,offset+46+n).toString();
    assert.equal(b.readUInt32LE(local),0x04034b50);const start=local+30+b.readUInt16LE(local+26)+b.readUInt16LE(local+28),compressed=b.subarray(start,start+size);assert.ok(method===0||method===8);files.set(name,method===8?zlib.inflateRawSync(compressed):compressed);offset+=46+n+extra+comment;
  }
  return files;
}
const old=zipFiles('extension/releases/LotKeys-Facebook-Assistant-Beta-v0.1.23.zip');
const packed=zipFiles('extension/releases/LotKeys-Facebook-Assistant-Beta-v0.1.25.zip');
const fb=packed.get('facebook.js').toString();
const helper=fb.slice(fb.indexOf('  function listingModelValue('),fb.indexOf('  const labelsForKey'));
function name(listing){const ctx={};vm.createContext(ctx);vm.runInContext(helper,ctx);return ctx.listingModelValue(listing)}
for(const [label,title,year,make,expected] of [
  ['custom saved name','2023 Hyundai Elantra — Sunroof & Heated Seats!','2023','Hyundai','Elantra — Sunroof & Heated Seats!'],
  ['name without year/make','Elantra — My custom offer','2023','Hyundai','Elantra — My custom offer'],
  ['case and whitespace','  2024\tLINCOLN   Nautilus • Luxury AWD  ','2024','Lincoln','Nautilus • Luxury AWD'],
  ['multiword make','2022 Land Rover Range Rover Sport – Clean CARFAX','2022','Land Rover','Range Rover Sport – Clean CARFAX'],
  ['punctuation in make','2020 Mercedes-Benz C300 (AWD) 🚙','2020','Mercedes-Benz','C300 (AWD) 🚙'],
  ['similar make is not a prefix','2024 Lincolnshire Nautilus','2024','Lincoln','2024 Lincolnshire Nautilus'],
  ['different year is preserved','2022 Lincoln Nautilus','2024','Lincoln','2022 Lincoln Nautilus'],
  ['matching words later are preserved','Special: 2024 Lincoln Nautilus','2024','Lincoln','Special: 2024 Lincoln Nautilus'],
  ['prefix-only name needs a model','2024 Lincoln','2024','Lincoln',''],
  ['missing year keeps the full name','My Nautilus offer','','Lincoln','My Nautilus offer']
])test('Posting Buddy preserves '+label,()=>{const l={title,year,make,model:'Wrong Vehicle Profile Name'};assert.equal(name(l),expected);assert.equal(l.title,title);assert.equal(l.model,'Wrong Vehicle Profile Name')});
test('an explicit marketplaceTitle wins over an older cached title; unnamed legacy records retain their model',()=>{
  assert.equal(name({marketplaceTitle:'2024 Lincoln My latest listing name',title:'2024 Lincoln Old name',year:'2024',make:'Lincoln',model:'Profile wording'}),'My latest listing name');
  assert.equal(name({title:'   ',model:'Legacy model'}),'Legacy model');
});
test('the actual LotKeys reader uses each Listing name even when multiple listings share one Vehicle Profile',async()=>{
  const background=packed.get('background.js').toString(),source=background.slice(background.indexOf('async function lotKeysListingsReader('),background.indexOf('async function lotKeysPhotoReader('));
  const data={listings:[{id:'a',vehicleId:'v',marketplaceTitle:'2024 Lincoln Nautilus — City offer',updatedAt:2},{id:'b',vehicleId:'v',marketplaceTitle:'2024 Lincoln Nautilus — Family offer',updatedAt:1}],vehicles:[{id:'v',year:'2024',make:'Lincoln',model:'Nautilus Reserve - BT2550',name:'Wrong Vehicle Profile heading'}],locations:[]};
  const ctx={DB:{all:async key=>data[key]}};vm.createContext(ctx);vm.runInContext(source,ctx);const rows=await ctx.lotKeysListingsReader();
  assert.equal(rows[0].title,data.listings[0].marketplaceTitle);assert.equal(rows[1].title,data.listings[1].marketplaceTitle);assert.equal(name(rows[0]),'Nautilus — City offer');assert.equal(name(rows[1]),'Nautilus — Family offer');
});
function form(){
  class Input{constructor(value=''){this.current=value;this.values=[];this.events=[]}get value(){return this.current}set value(v){this.current=String(v);this.values.push(this.current)}scrollIntoView(){}focus(){}dispatchEvent(e){this.events.push(e.type)}}
  class Textarea extends Input{}class Select extends Input{}
  const controls=new Map([['model',new Input('Old profile wording')],['price',new Input('100')],['mileage',new Input('1000')],['description',new Textarea('Old description')]]),drops=[];
  const ctx={HTMLInputElement:Input,HTMLTextAreaElement:Textarea,HTMLSelectElement:Select,Event:class{constructor(type){this.type=type}},
    activeListingId:'',fillFinished:false,wait:async()=>{},waitForControl:async key=>controls.get(key),clearManualHighlights:()=>{},clearManualHighlight:()=>{},highlightManualField:()=>{},jumpToField:async()=>{},ensureVehicleForSale:async()=>{},
    selectDropdownKey:async(key,value)=>{drops.push([key,value]);return {status:'done'}},addPhotos:async()=>({status:'done'}),bodyStyleAliases:()=>[],facebookColor:()=>'',facebookCondition:()=>'',fillLocation:async()=>({status:'done'}),scrollToFinalAction:async()=>({ok:true})};
  vm.createContext(ctx);
  const native=fb.slice(fb.indexOf('  const nativeSet ='),fb.indexOf('  const selectorForKind'));
  const text=fb.slice(fb.indexOf('  async function setTextKey('),fb.indexOf('  const optionElements'));
  const fill=fb.slice(fb.indexOf('  async function fill(listing)'),fb.indexOf('  function fieldState('));
  const retry=fb.slice(fb.indexOf('  async function retryField('),fb.indexOf("  document.addEventListener('click'"));
  vm.runInContext(native+helper+text+fill+retry,ctx);return{ctx,controls,drops};
}
function listing(overrides={}){return {id:'listing',title:'2024 Lincoln Nautilus — My custom name',year:'2024',make:'Lincoln',model:'Nautilus Reserve - Vehicle Profile wording',price:55990,odometer:39446,bodyStyle:'SUV',description:'My saved listing description',transferOptions:{photos:false,description:false,details:true},...overrides}}
test('new Facebook fills write the saved name through the real input setter and retain separate Year/Make and price',async()=>{
  const f=form(),l=listing(),result=await f.ctx.fill(l);assert.equal(result.ok,true);assert.equal(f.controls.get('model').value,'Nautilus — My custom name');assert.deepEqual(f.drops.slice(0,3),[['vehicleType','Car/Truck'],['year','2024'],['make','Lincoln']]);
  assert.equal(f.controls.get('price').value,'55990');assert.equal(f.controls.get('mileage').value,'39446');assert.deepEqual(f.controls.get('model').events,['input','change','blur']);assert.equal(l.model,'Nautilus Reserve - Vehicle Profile wording');
});
test('Details updates replace old Facebook wording rather than append it or fall back to the profile',async()=>{
  const f=form();await f.ctx.fill(listing({facebookUrl:'https://facebook.com/marketplace/item/example'}));assert.deepEqual(f.controls.get('model').values,['','Nautilus — My custom name']);
});
test('Model retries use the same saved name and current update mode without a ReferenceError',async()=>{
  const f=form();const r=await f.ctx.retryField('model',listing({facebookUrl:'https://facebook.com/marketplace/item/example'}));assert.equal(r.result.status,'done');assert.deepEqual(f.controls.get('model').values,['','Nautilus — My custom name']);
  const fresh=form();await fresh.ctx.retryField('model',listing());assert.deepEqual(fresh.controls.get('model').values,['Nautilus — My custom name']);
});
test('price and description retries retain replacement behavior',async()=>{
  const f=form(),l=listing({updateMode:true});await f.ctx.retryField('price',l);await f.ctx.retryField('description',l);assert.deepEqual(f.controls.get('price').values,['','55990']);assert.deepEqual(f.controls.get('description').values,['','My saved listing description']);
});
test('unchecked Details never change the Facebook name',async()=>{
  const f=form();await f.ctx.fill(listing({transferOptions:{photos:false,description:true,details:false},facebookUrl:'https://facebook.com/marketplace/item/example'}));assert.equal(f.controls.get('model').value,'Old profile wording');assert.deepEqual(f.controls.get('model').values,[]);assert.equal(f.controls.get('description').value,'My saved listing description');
});
test('a prefix-only saved name asks for manual Model completion instead of inventing profile wording',async()=>{
  const f=form(),result=await f.ctx.fill(listing({title:'2024 Lincoln'}));assert.ok(result.manualKeys.includes('model'));assert.deepEqual(f.controls.get('model').values,[]);
});
test('the shipped extension keeps its permissions and media/UI assets, with consistent V0.1.25 metadata',()=>{
  const before=JSON.parse(old.get('manifest.json')),after=JSON.parse(packed.get('manifest.json'));assert.equal(after.version,'0.1.25');assert.deepEqual(after.permissions,before.permissions);assert.deepEqual(after.host_permissions,before.host_permissions);
  for(const file of ['icon.png','sidepanel.css','sidepanel.js','vehicle-placeholder.webp'])assert.ok(packed.get(file).equals(old.get(file)),file);
  assert.match(packed.get('background.js').toString(),/HELPER_VERSION = '0\.1\.25'/);assert.match(fb,/version:'0\.1\.25'/);assert.match(packed.get('sidepanel.html').toString(),/V0\.1\.25/);
  const pointer=JSON.parse(fs.readFileSync(path.join(root,'extension/latest.json'),'utf8'));assert.equal(pointer.version,after.version);assert.ok(pointer.downloadUrl.endsWith('/LotKeys-Facebook-Assistant-Beta-v0.1.25.zip'));assert.match(fs.readFileSync(path.join(root,'index.html'),'utf8'),/BUNDLED_POST_BUDDY_VERSION = '0\.1\.25'/);
});
test('Garage reports the bundled version it actually downloads when a saved release pointer is older',async()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),source=html.slice(html.indexOf('async function openPostBuddyDownload('),html.indexOf('const LISTING_PROFILE_RETENTION_MS'));
  const bundle='https://example.test/extension/releases/LotKeys-Facebook-Assistant-Beta-v0.1.25.zip',links=[],notices=[];
  const ctx={URL,location:{href:'https://example.test/'},BUNDLED_POST_BUDDY_ZIP_URL:bundle,BUNDLED_POST_BUDDY_VERSION:'0.1.25',resolvePostBuddyDownloadUrl:async()=>({url:'https://example.test/old.zip',version:'0.1.23'}),fetch:async url=>{assert.equal(url,bundle);return{ok:true,blob:async()=>new Blob([packed.get('manifest.json')])}},document:{body:{appendChild:x=>links.push(x)},createElement:()=>({click(){},remove(){}})},setTimeout:()=>{},showPostBuddyNotice:x=>notices.push(x),alert:x=>{throw Error(x)}};
  vm.createContext(ctx);vm.runInContext(source,ctx);await ctx.openPostBuddyDownload('https://example.test/latest.json');assert.equal(links[0].download,'LotKeys-Facebook-Assistant-Beta-v0.1.25.zip');assert.ok(notices[0].includes('V0.1.25'));
});
