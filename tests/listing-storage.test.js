'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Storage = require('../lotkeys-listing-storage.js');
const FOLDER = 'application/vnd.google-apps.folder';
function fixture() {
  const files = new Map(), calls = []; let sequence = 0, failCopy = false;
  function add(id, name, parent, tags = {}, data = null, mimeType = FOLDER) {
    const file = {id,name,mimeType,parents:[parent],appProperties:tags,data}; files.set(id,file); return file;
  }
  add('personal','LotKeys Personal Profile','root');add('workspace','Blair','store');
  add('old-listings','Listings','workspace',{lotkeysRole:'userListings'});
  add('old-assets','Listing Assets','workspace',{lotkeysRole:'userListingAssets'});
  add('group','2024 Lincoln Nautilus','old-assets',{lotkeysListingAssetGroup:'vehicle'});
  add('photos','Photos','group',{lotkeysRole:'listingAssetPhotos'});
  add('photo','Photo.jpg','photos',{lotkeysListingAssetId:'asset'},'photo bytes','image/jpeg');
  add('listing','Nautilus.json','old-listings',{lotkeysListingId:'L1',lotkeysRole:'marketplaceListing'}, {listingId:'L1',userName:'Blair',price:55990,status:'Posted',facebookUrl:'https://facebook.com/example',updatedAt:123,photoOrder:['asset'],marketplaceDescription:'Keep photo and listing words intact',listingAssets:[{id:'asset',driveFileId:'photo',webViewLink:'https://drive.google.com/file/d/photo/view'}]},'application/json');
  add('old-index','Listings Index.json','old-listings',{lotkeysRole:'userListingsIndex'},{listings:[]},'application/json');
  const drive = {
    get:async id=>{if(!files.has(id))throw Error('Missing '+id);return files.get(id)},
    list:async id=>[...files.values()].filter(file=>file.parents.includes(id)),
    createFolder:async(name,parent,tags)=>{calls.push(['folder',name,parent]);return add('new-'+ ++sequence,name,parent,tags)},
    rename:async(id,name)=>{files.get(id).name=name},
    move:async(id,from,to)=>{assert.ok(files.get(id).parents.includes(from));files.get(id).parents=[to]},
    copy:async(id,name,parent,tags)=>{if(failCopy){failCopy=false;throw Error('Interrupted copy')}calls.push(['copy',id,parent]);const source=files.get(id);return add('new-'+ ++sequence,name,parent,tags,source.data,source.mimeType)},
    readJson:async id=>structuredClone(files.get(id).data),
    writeJson:async({fileId,name,parentId,data,appProperties})=>{calls.push(['json',name,parentId]);if(fileId){files.get(fileId).data=structuredClone(data);return files.get(fileId)}return add('new-'+ ++sequence,name,parentId,appProperties,structuredClone(data),'application/json')}
  };
  const options = {drive,personalRootId:'personal',storeId:'store',storeName:'Legacy Wetaskiwin',userId:'workspace',userName:'Blair',legacyListingsId:'old-listings',legacyAssetsId:'old-assets'};
  return {files,calls,drive,options,add,fail:()=>{failCopy=true}};
}
test('existing listings and nested photos migrate together under the personal Store folder', async()=>{
  const f=fixture(),result=await Storage.ensure(f.options),data=f.files.get(result.ids.listing).data;
  assert.deepEqual(f.files.get(result.storeFolderId).parents,['personal']);
  assert.deepEqual(f.files.get(result.listingsId).parents,[result.storeFolderId]);
  assert.deepEqual(f.files.get(result.listingAssetsId).parents,[result.storeFolderId]);
  assert.equal(data.listingAssets[0].driveFileId,result.ids.photo);
  assert.equal(data.listingAssets[0].webViewLink,'https://drive.google.com/file/d/'+result.ids.photo+'/view');
  assert.equal(data.price,55990);assert.equal(data.status,'Posted');assert.equal(data.updatedAt,123);assert.deepEqual(data.photoOrder,['asset']);
  assert.equal(f.files.get(result.ids.photo).data,'photo bytes');
  assert.deepEqual(f.files.get('listing').parents,['old-listings']);assert.deepEqual(f.files.get('photo').parents,['photos']);
  assert.ok(!result.ids['old-index']);
});
test('interrupted migration resumes without duplicating folders, photos or listings',async()=>{
  const f=fixture();f.fail();await assert.rejects(Storage.ensure(f.options),/Interrupted/);
  assert.equal([...f.files.values()].filter(file=>file.appProperties.lotkeysRole==='personalListingMigration').length,0);
  const result=await Storage.ensure(f.options),size=f.files.size,again=await Storage.ensure(f.options);
  assert.deepEqual(again,result);assert.equal(f.files.size,size);
  assert.equal(f.calls.filter(call=>call[0]==='copy'&&call[1]==='photo').length,1);
});
test('same-name Stores stay separate and a Store rename retains its existing folder and files',async()=>{
  const f=fixture(),first=await Storage.ensure(f.options);
  const renamed=await Storage.ensure({...f.options,storeName:'Legacy Dodge Wetaskiwin'});
  assert.equal(renamed.storeFolderId,first.storeFolderId);assert.equal(f.files.get(first.storeFolderId).name,'Legacy Dodge Wetaskiwin');
  const second=await Storage.ensure({...f.options,storeId:'other-store',storeName:'Legacy Dodge Wetaskiwin',legacyListingsId:'',legacyAssetsId:''});
  assert.notEqual(second.storeFolderId,first.storeFolderId);assert.deepEqual(await f.drive.list(second.listingsId),[]);
});
test('another Store or user workspace cannot be used as a migration source',async()=>{
  const f=fixture();f.files.get('old-listings').parents=['another-user'];
  await assert.rejects(Storage.ensure(f.options),/outside this Store workspace/);
  assert.ok(![...f.files.values()].some(file=>file.appProperties.lotkeysRole==='personalListingMigration'));
});
test('deleted listings are excluded and foreign-user records stop migration',async()=>{
  const f=fixture(),result=await Storage.ensure({...f.options,deletedIds:['L1']});
  assert.deepEqual(await f.drive.list(result.listingsId),[]);
  const other=fixture();other.files.get('listing').data.userName='Someone else';
  await assert.rejects(Storage.ensure(other.options),/another user/);
});
test('an account or Store transition aborts before the next migration write',async()=>{
  const f=fixture();let active=true;
  const list=f.drive.list;f.drive.list=async id=>{const value=await list(id);if(id==='old-assets')active=false;return value};
  await assert.rejects(Storage.ensure({...f.options,check:async()=>{if(!active)throw Error('Account changed')}}),/Account changed/);
  assert.equal(f.calls.filter(call=>call[0]==='copy').length,0);
});
test('changing Account Storage moves the personal Store folder and preserves all IDs',async()=>{
  const f=fixture(),first=await Storage.ensure(f.options);f.add('new-personal','New Account','root');
  const next=await Storage.ensure({...f.options,personalRootId:'new-personal',previousRootId:'personal',previousStoreFolderId:first.storeFolderId});
  assert.deepEqual(next,first);assert.deepEqual(f.files.get(first.storeFolderId).parents,['new-personal']);
});
test('ID remapping preserves local pending edits, descriptions and photo blobs',()=>{
  const blob=new Blob(['image']),local={driveFileId:'old',description:'old',syncStatus:'pending',listingAssets:[{driveFileId:'photo',blob}],facebookUrl:'https://facebook.com/old'};
  const mapped=Storage.remap(local,{old:'new',photo:'new-photo'});
  assert.equal(mapped.driveFileId,'new');assert.equal(mapped.description,'old');assert.equal(mapped.syncStatus,'pending');assert.equal(mapped.listingAssets[0].blob,blob);assert.equal(mapped.facebookUrl,local.facebookUrl);
});
test('Drive listing pagination collects every page',async()=>{
  const html=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
  const source=html.slice(html.indexOf('  async function listFiles('),html.indexOf('  async function createMetadata('));let calls=0;
  const context={URL,apiFetch:async url=>{calls++;const u=new URL(url);assert.match(u.searchParams.get('fields'),/nextPageToken/);return u.searchParams.get('pageToken')?{files:[{id:'last'}]}:{files:[{id:'first'}],nextPageToken:'page-2'}}};
  vm.runInNewContext(source,context);const rows=await context.listFiles('q');assert.equal(calls,2);assert.deepEqual(Array.from(rows,row=>row.id),['first','last']);
});
test('Store reference summaries retain admin listing cards without private files or descriptions',()=>{
  const [summary]=Storage.summaries([{listingId:'L1',userName:'Blair',price:55990,status:'Posted',facebookUrl:'https://facebook.com/example',marketplaceTitle:'Nautilus',driveFileId:'private',listingAssets:[{driveFileId:'photo'}],marketplaceDescription:'private draft'}]);
  assert.equal(summary.marketplaceTitle,'Nautilus');assert.equal(summary.price,55990);assert.equal(summary.facebookUrl,'https://facebook.com/example');
  assert.ok(!('driveFileId' in summary));assert.ok(!('listingAssets' in summary));assert.ok(!('marketplaceDescription' in summary));
});
test('a removed personal listing folder stops sync instead of restoring stale Store records',async()=>{
  const f=fixture(),result=await Storage.ensure(f.options);f.files.delete(result.listingsId);
  const size=f.files.size;await assert.rejects(Storage.ensure(f.options),/removed/);assert.equal(f.files.size,size);
});
test('a cached Listings Index from another folder is rejected by the actual index lookup',async()=>{
  const html=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8'),source=html.slice(html.indexOf('  async function findListingsIndex('),html.indexOf('  async function readListingsIndex('));
  let remembered='';const context={setting:async()=> 'old-index',driveGet:async()=>({id:'old-index',parents:['old-listings']}),findChildByAppProperty:async id=>{assert.equal(id,'personal-listings');return{id:'new-index'}},findChildByName:async()=>null,setSetting:async(_,id)=>{remembered=id}};
  vm.runInNewContext(source,context);const found=await context.findListingsIndex({listingsId:'personal-listings'});assert.equal(found.id,'new-index');assert.equal(remembered,'new-index');
});
