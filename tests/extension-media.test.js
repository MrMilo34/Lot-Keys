'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib');
function extensionSource(){
  if(process.env.LOTKEYS_EXTENSION_SOURCE)return fs.readFileSync(process.env.LOTKEYS_EXTENSION_SOURCE,'utf8');
  const version=JSON.parse(fs.readFileSync(path.join(__dirname,'../extension/latest.json'))).version;
  const data=fs.readFileSync(path.join(__dirname,`../extension/releases/LotKeys-Facebook-Assistant-Beta-v${version}.zip`));
  let end=data.length-22;while(data.readUInt32LE(end)!==0x06054b50)end--;
  let offset=data.readUInt32LE(end+16);
  for(let i=0;i<data.readUInt16LE(end+10);i++){
    const n=data.readUInt16LE(offset+28),extra=data.readUInt16LE(offset+30),comment=data.readUInt16LE(offset+32),method=data.readUInt16LE(offset+10),size=data.readUInt32LE(offset+20),local=data.readUInt32LE(offset+42),name=data.subarray(offset+46,offset+46+n).toString();
    if(name==='facebook.js'){const start=local+30+data.readUInt16LE(local+26)+data.readUInt16LE(local+28),bytes=data.subarray(start,start+size);return(method===8?zlib.inflateRawSync(bytes):bytes).toString();}
    offset+=46+n+extra+comment;
  }
  throw Error('facebook.js missing');
}
const source=extensionSource();
function fixture({existing=0,counter=true,readonly=false,resetInput=false,reject=false,stuck=false,video=false,brokenPhoto=-1,invalidPhoto=-1,loseControls=false}={}){
  let count=existing,clock=0,generation=0;const assignments=[],removed=[],fetched=[];const body={};
  const scope={parentElement:body,get innerText(){return counter?`Photo upload Photos · ${count} / 20 Add photos`:'Photo upload Add photos';},querySelectorAll(selector){return selector==='img'?Array.from({length:count},(_,i)=>({src:`photo-${generation}-${i}`})):buttons();}};
  const files=()=>video?[new File(['video'],'walkaround.mp4',{type:'video/mp4'})]:[];
  let current;
  class Input{
    constructor(initial=[]){this.accept='image/*,video/*';this.parentElement=scope;this.current=initial;this.events=[];this.disabled=false;}
    get isConnected(){return current===this;}get files(){return this.current;}
    set files(value){assert.equal(this.isConnected,true,'cannot attach to a detached Facebook picker');this.current=Array.from(value);assignments.push({input:this,files:this.current});}
    dispatchEvent(event){this.events.push(event.type);if(event.type==='change'&&!reject){count+=this.current.filter(f=>f.type.startsWith('image/')).length;generation++;if(resetInput)current=new Input();}}
  }
  current=new Input(files());
  function buttons(){if(readonly||(loseControls&&removed.length))return[];return Array.from({length:count},(_,i)=>{
    const gen=generation;return{get isConnected(){return generation===gen;},getAttribute:key=>key==='aria-label'?'Remove photo':null,innerText:'',scrollIntoView(){},click(){removed.push(i);if(!stuck){count--;generation++;current=new Input();}}};
  });}
  const unrelated={innerText:'',getAttribute:key=>key==='aria-label'?'Remove photo':null,click(){throw Error('outside photo area must not be touched');}};
  const document={body,querySelectorAll:selector=>selector==='input[type=file]'?[current]:selector==='img'?[]:[...buttons(),unrelated]};
  class Transfer{constructor(){this.files=[];this.items={add:file=>this.files.push(file)};}}
  const ctx={console:{warn(){}},document,File,Uint8Array,Map,Set,Array,Number,String,Math,Promise,Error,DataTransfer:Transfer,Event:class{constructor(type){this.type=type;}},Date:{now:()=>clock},location:{href:'https://facebook.com/marketplace/create/vehicle'},
    visible:()=>true,textOf:el=>el?.innerText||'',wait:async ms=>{clock+=ms;},safeRuntimeMessage:async message=>{const i=message.photoIndex;fetched.push(i);return{ok:true,photo:i===brokenPhoto?null:{dataUrl:i===invalidPhoto?'data:image/jpeg;base64,%%%':'data:image/jpeg;base64,'+Buffer.from('original-'+i).toString('base64'),name:`photo-${i}.jpg`,type:'image/jpeg'}};},atob:value=>atob(value),
    controlForKey:key=>key==='photos'?current:null,HTMLInputElement:Input,HTMLTextAreaElement:class{},HTMLSelectElement:class{}};
  vm.createContext(ctx);const start=source.indexOf('  async function fetchPhoto('),end=source.indexOf('  async function findVideoInput(',start);
  vm.runInContext('let photoTransferState=null;let activeListingId="listing";\n'+source.slice(start,end)+source.slice(source.indexOf('  function fieldState('),source.indexOf('  async function inspectFields(')),ctx);
  const listing={id:'listing',photoCount:3,photoIds:['a','b','c']};
  return{ctx,listing,assignments,removed,fetched,get count(){return count;},get input(){return current;}};
}
test('Update Photos fills an explicitly empty 0/20 uploader even without Remove buttons',async()=>{
  const f=fixture(),result=await f.ctx.addPhotos(f.listing,{replaceExisting:true});
  assert.equal(result.status,'done');assert.equal(f.count,3);assert.equal(f.removed.length,0);assert.equal(f.assignments.length,1);
  assert.deepEqual(f.assignments[0].files.map(file=>file.name),['photo-0.jpg','photo-1.jpg','photo-2.jpg']);
});
test('replacement reacquires the live picker after each Facebook grid rebuild and preserves a selected video',async()=>{
  const f=fixture({existing:2,video:true,resetInput:true}),result=await f.ctx.addPhotos(f.listing,{replaceExisting:true});
  assert.equal(result.status,'done');assert.equal(f.removed.length,2);assert.equal(f.count,3);assert.equal(f.assignments.length,1);
  assert.deepEqual(f.assignments[0].files.map(file=>file.name),['walkaround.mp4','photo-0.jpg','photo-1.jpg','photo-2.jpg']);
});
for(const option of ['brokenPhoto','invalidPhoto'])test(option+' cannot remove old Facebook photos before every replacement is prepared',async()=>{
  const f=fixture({existing:2,[option]:1}),result=await f.ctx.addPhotos(f.listing,{replaceExisting:true});
  assert.equal(result.status,'manual');assert.equal(f.removed.length,0);assert.equal(f.assignments.length,0);assert.equal(f.count,2);
});
test('a populated uploader without safe removal controls keeps its existing photos',async()=>{
  const f=fixture({existing:3,readonly:true}),result=await f.ctx.addPhotos(f.listing,{replaceExisting:true});
  assert.equal(result.status,'manual');assert.equal(f.assignments.length,0);assert.equal(f.count,3);assert.equal(f.ctx.fieldState('photos').filled,false);
});
test('an unknown photo count without removal controls never assumes the existing listing is empty',async()=>{
  const f=fixture({counter:false,readonly:true}),result=await f.ctx.addPhotos(f.listing,{replaceExisting:true});
  assert.equal(result.status,'manual');assert.equal(f.removed.length,0);assert.equal(f.assignments.length,0);
});
test('a partial removal stops before appending replacements or claiming the old set was untouched',async()=>{
  const f=fixture({existing:2,loseControls:true}),result=await f.ctx.addPhotos(f.listing,{replaceExisting:true});
  assert.equal(result.status,'manual');assert.equal(f.removed.length,1);assert.equal(f.assignments.length,0);assert.doesNotMatch(result.reason,/left unchanged/i);
});
test('a Facebook removal that does not take effect has a bounded failure and never appends duplicates',async()=>{
  const f=fixture({existing:2,stuck:true}),result=await f.ctx.addPhotos(f.listing,{replaceExisting:true});
  assert.equal(result.status,'manual');assert.equal(f.assignments.length,0);assert.equal(f.count,2);assert.ok(f.removed.length<5);
});
test('Facebook clearing FileList after accepting photos still reports the visible photo count as filled',async()=>{
  const f=fixture({resetInput:true});await f.ctx.addPhotos(f.listing,{replaceExisting:true});
  assert.equal(f.input.files.length,0);assert.equal(f.ctx.fieldState('photos').filled,true);
});
test('a video in a mixed file picker cannot satisfy the Photos field',()=>{
  const f=fixture({video:true});assert.equal(f.ctx.fieldState('photos').filled,false);
});
test('assigning FileList is not success when Facebook keeps reporting zero accepted photos',async()=>{
  const f=fixture({reject:true}),result=await f.ctx.addPhotos(f.listing,{replaceExisting:true});
  assert.equal(result.status,'manual');assert.equal(f.ctx.fieldState('photos').filled,false);
});
test('new-post photo transfer still works without a visible counter and keeps photo order',async()=>{
  const f=fixture({counter:false}),result=await f.ctx.addPhotos(f.listing);
  assert.equal(result.status,'done');assert.equal(f.count,3);assert.deepEqual(f.assignments[0].files.map(file=>file.name),['photo-0.jpg','photo-1.jpg','photo-2.jpg']);
});
test('a full twenty-photo gallery replaces within the bounded loop without touching removal controls elsewhere',async()=>{
  const f=fixture({existing:20}),result=await f.ctx.addPhotos(f.listing,{replaceExisting:true});
  assert.equal(result.status,'done');assert.equal(f.removed.length,20);assert.equal(f.count,3);
});
test('an empty mixed uploader preserves its selected video exactly once alongside ordered images',async()=>{
  const f=fixture({video:true}),result=await f.ctx.addPhotos(f.listing,{replaceExisting:true});
  assert.equal(result.status,'done');assert.equal(f.assignments[0].files.filter(file=>file.type.startsWith('video/')).length,1);
});
test('the actual Photos-only update leaves unchecked Details and Description untouched',async()=>{
  const f=fixture({video:true});Object.assign(f.ctx,{clearManualHighlights(){},highlightManualField(){},jumpToField:async()=>{},scrollToFinalAction:async()=>({ok:true}),
    ensureVehicleForSale(){throw Error('update must not create another listing');},setTextKey(){throw Error('unchecked text must stay untouched');},selectDropdownKey(){throw Error('unchecked Details must stay untouched');}});
  const start=source.indexOf('  async function fill(listing)'),end=source.indexOf('  function fieldState(',start);vm.runInContext('let fillFinished=false;\n'+source.slice(start,end),f.ctx);
  const result=await f.ctx.fill({...f.listing,updateMode:true,transferOptions:{photos:true,details:false,description:false}});
  assert.equal(result.ok,true);assert.equal(result.needsManual,0);assert.deepEqual(Array.from(result.steps,row=>row.key),['photos']);assert.equal(f.count,3);
});
