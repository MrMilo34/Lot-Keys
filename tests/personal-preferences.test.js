'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const P=require('../lotkeys-personal-preferences.js');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const copy=x=>structuredClone(x),template=(id='mine',updatedAt=20,text='My wording')=>({id,name:'My template',updatedAt,blocks:[{type:'custom',config:{text}}]});
function fixture(record={}){
  let remote={googleAccount:'test@example.test',displayName:'Original name',appearance:{theme:'dark'},updatedAt:new Date(10).toISOString(),descriptionTemplates:[template('mine',10,'Old wording')],lastDescriptionTemplateId:'mine',...copy(record)};
  const values=new Map([['currentAccountEmail','test@example.test'],['personalProfileDriveFolderId','personal'],['personalProfileHydratedFileId','account'],['personalProfileBaseUpdatedAt',10],['descriptionTemplates',[template()]],['lastDescriptionTemplateId','mine']]),writes=[],assets=[],removed=[];
  const d={setting:async(k,f)=>values.has(k)?copy(values.get(k)):f,setSetting:async(k,v)=>values.set(k,copy(v)),folder:async()=>({id:'personal'}),accountFile:async()=>({id:'account'}),readAccount:async()=>copy(remote),writeAccount:async(file,root,data)=>{writes.push(copy(data));remote=copy(data)},templateRecovery:async(parent,rows)=>({templates:rows}),writeTemplates:async(parent,rows)=>assets.push([parent,copy(rows)]),removeTemplateFile:async id=>removed.push(id),saveSound:async(root,clip)=>({fileId:'audio',name:clip.name,mimeType:clip.type,duration:clip.duration}),loadSound:async meta=>({...meta,type:meta.mimeType,dataUrl:'data:audio/wav;base64,AA=='})};
  return {d,service:P.create(d),values,writes,assets,removed,get remote(){return copy(remote)},set remote(x){remote=copy(x)}};
}
test('template edit saves Account.json and its recovery file without replacing unrelated remote settings',async()=>{
  const f=fixture({displayName:'New name on another PC',appearance:{theme:'light'},unrelated:{keep:true}});
  await f.service.mark('templates');await f.service.flush();
  assert.equal(f.remote.descriptionTemplates[0].blocks[0].config.text,'My wording');assert.equal(f.remote.displayName,'New name on another PC');assert.equal(f.remote.appearance.theme,'light');assert.deepEqual(f.remote.unrelated,{keep:true});assert.equal(f.assets[0][0],'personal');assert.equal(f.values.get('personalPreferencesLastSyncError'),'');assert.equal(await f.service.pending(),false);
});
test('another device changing Account.json while assets upload is preserved by the final re-read',async()=>{
  const f=fixture();f.values.set('lotkeysNotificationSoundId','custom');f.values.set('lotkeysNotificationCustomSound',{name:'Alert.wav',type:'audio/wav',duration:2,dataUrl:'data:audio/wav;base64,AA=='});
  f.d.saveSound=async()=>{f.remote={...f.remote,displayName:'Changed during upload',updatedAt:new Date(30).toISOString()};return {fileId:'audio',duration:2}};
  await f.service.mark('notification');await f.service.flush();assert.equal(f.remote.displayName,'Changed during upload');assert.equal(f.remote.notificationSettings.customSound.fileId,'audio');
});
test('custom PC audio is stored privately as a Drive file reference, with no embedded audio in Account.json',async()=>{
  const f=fixture(),clip={name:'My alert.wav',type:'audio/wav',duration:2,dataUrl:'data:audio/wav;base64,AA=='};let uploaded;
  f.d.saveSound=async(root,value)=>{uploaded=[root,value];return{fileId:'audio',name:value.name,mimeType:value.type,duration:2}};f.values.set('lotkeysNotificationSoundId','custom');f.values.set('lotkeysNotificationCustomSound',clip);
  await f.service.mark('notification');await f.service.flush();assert.equal(uploaded[0].id,'personal');assert.deepEqual(uploaded[1],clip);assert.equal(f.remote.notificationSettings.soundId,'custom');assert.equal(f.remote.notificationSettings.customSound.fileId,'audio');assert.ok(!JSON.stringify(f.remote).includes('base64'));assert.deepEqual(f.remote.descriptionTemplates,[template('mine',10,'Old wording')]);
});
for(const soundId of ['classic','chime','silent'])test('PC '+soundId+' choice survives a fresh-device restore',async()=>{
  const f=fixture();f.values.set('lotkeysNotificationSoundId',soundId);await f.service.mark('notification');await f.service.flush();f.values.set('lotkeysNotificationSoundId','pop');await f.service.restore(f.remote);assert.equal(f.values.get('lotkeysNotificationSoundId'),soundId);assert.equal(f.values.get('lotkeysNotificationCustomSound'),null);
});
test('fresh-device custom audio restore downloads the clip and restores selection',async()=>{
  const f=fixture({notificationSettings:{soundId:'custom',customSound:{fileId:'audio',name:'Alert',mimeType:'audio/wav',duration:2}}});await f.service.restore(f.remote);assert.equal(f.values.get('lotkeysNotificationSoundId'),'custom');assert.match(f.values.get('lotkeysNotificationCustomSound').dataUrl,/^data:audio/);
});
test('failed custom sound restore keeps the existing device sound',async()=>{
  const f=fixture({notificationSettings:{soundId:'custom',customSound:{fileId:'missing'}}});f.values.set('lotkeysNotificationSoundId','pop');f.d.loadSound=async()=>{throw Error('file missing')};await assert.rejects(f.service.restore(f.remote),/missing/);assert.equal(f.values.get('lotkeysNotificationSoundId'),'pop');
});
test('offline changes remain queued and are verified on retry',async()=>{
  const f=fixture(),read=f.d.readAccount;f.d.readAccount=async()=>{throw Error('Offline')};await f.service.mark('templates');await assert.rejects(f.service.flush(),/Offline/);assert.equal(await f.service.pending(),true);assert.equal(f.values.get('personalPreferencesLastSyncError'),'Offline');assert.equal(f.writes.length,0);f.d.readAccount=read;await f.service.flush();assert.equal(await f.service.pending(),false);assert.equal(f.remote.descriptionTemplates[0].updatedAt,20);
});
test('a failed template recovery-file write remains pending even after Account.json saves',async()=>{
  const f=fixture(),write=f.d.writeTemplates;f.d.writeTemplates=async()=>{throw Error('Drive unavailable')};await f.service.mark('templates');await assert.rejects(f.service.flush(),/unavailable/);assert.equal(await f.service.pending(),true);f.d.writeTemplates=write;await f.service.flush();assert.equal(await f.service.pending(),false);assert.equal(f.assets.length,1);
});
test('readback mismatch cannot produce a successful backup status',async()=>{
  const f=fixture();f.d.writeAccount=async()=>{};await f.service.mark('templates');await assert.rejects(f.service.flush(),/verification/);assert.equal(await f.service.pending(),true);assert.equal(f.values.has('personalPreferencesLastSyncedAt'),false);
});
test('template deletion writes a tombstone before removing files and does not recover the old template',async()=>{
  const f=fixture();f.values.set('descriptionTemplates',[]);await f.service.mark('templates',{deletedTemplateId:'mine'});await f.service.flush();assert.deepEqual(f.remote.descriptionTemplates,[]);assert.ok(f.remote.descriptionTemplateDeletes.mine);assert.equal(f.remote.lastDescriptionTemplateId,'builtin-marketplace-detailed');assert.deepEqual(f.removed,['mine']);assert.deepEqual(P.mergeTemplates([template()],[],f.remote.descriptionTemplateDeletes),[]);
});
test('offline deletion retries without resurrecting the old Drive recovery file',async()=>{
  const f=fixture();f.values.set('descriptionTemplates',[]);f.d.templateRecovery=async()=>({templates:[template('mine',10,'Old wording')]});const write=f.d.writeAccount;f.d.writeAccount=async()=>{throw Error('Offline')};await f.service.mark('templates',{deletedTemplateId:'mine'});await assert.rejects(f.service.flush(),/Offline/);assert.deepEqual(f.values.get('descriptionTemplates'),[]);f.d.writeAccount=write;await f.service.flush();assert.deepEqual(f.remote.descriptionTemplates,[]);
});
test('default template choice is independent and preserves the template collection',async()=>{
  const f=fixture();f.values.set('lastDescriptionTemplateId','builtin-marketplace-detailed');await f.service.mark('defaultTemplate');await f.service.flush();assert.equal(f.remote.lastDescriptionTemplateId,'builtin-marketplace-detailed');assert.equal(f.remote.descriptionTemplates[0].updatedAt,10);assert.equal(f.assets.length,0);
});
test('a newer remote template wins over an older local copy while other local edits survive',async()=>{
  const f=fixture({descriptionTemplates:[template('mine',50,'Newer on PC two')]});f.values.set('descriptionTemplates',[template('mine',20),template('new',30)]);await f.service.mark('templates');await f.service.flush();assert.equal(f.remote.descriptionTemplates.find(x=>x.id==='mine').updatedAt,50);assert.ok(f.remote.descriptionTemplates.some(x=>x.id==='new'));
});
test('legacy local template edits are detected even when the template counts match',async()=>{
  const f=fixture();await f.service.migrate(f.remote);assert.equal(await f.service.pending(),true);await f.service.flush();assert.equal(f.remote.descriptionTemplates[0].updatedAt,20);
});
test('legacy local custom PC sound automatically enters the backup queue',async()=>{
  const f=fixture({descriptionTemplates:[template()]});f.values.set('lotkeysNotificationSoundId','custom');f.values.set('lotkeysNotificationCustomSound',{dataUrl:'data:audio/wav;base64,AA=='});await f.service.migrate(f.remote);assert.ok(f.values.get('personalPreferencesPendingV1').notification);
});
test('a new device with defaults restores the remote sound without uploading defaults',async()=>{
  const f=fixture({descriptionTemplates:[],notificationSettings:{soundId:'chime',customSound:null}});f.values.set('descriptionTemplates',[]);await f.service.migrate(f.remote);assert.equal(await f.service.pending(),false);await f.service.restore(f.remote);assert.equal(f.values.get('lotkeysNotificationSoundId'),'chime');assert.equal(f.writes.length,0);
});
test('another Google account folder is rejected without writes',async()=>{
  const f=fixture({googleAccount:'someone-else@example.test'});await f.service.mark('templates');await assert.rejects(f.service.flush(),/different Google account/);assert.equal(f.writes.length,0);assert.equal(await f.service.pending(),true);
});
test('missing Account.json leaves all local settings and retry state intact',async()=>{
  const f=fixture();f.d.accountFile=async()=>null;await f.service.mark('templates');await assert.rejects(f.service.flush(),/Account.json is missing/);assert.equal(f.writes.length,0);assert.equal(f.values.get('descriptionTemplates')[0].updatedAt,20);
});
test('an edit made during upload cannot be cleared by completion of the earlier save',async()=>{
  const f=fixture(),write=f.d.writeAccount;let once=false;f.d.writeAccount=async(...args)=>{if(!once){once=true;f.values.set('descriptionTemplates',[template('mine',99,'Later edit')]);await f.service.mark('templates')}return write(...args)};await f.service.mark('templates');await f.service.flush();assert.equal(await f.service.pending(),true);assert.equal(f.values.get('descriptionTemplates')[0].updatedAt,99);await f.service.flush();assert.equal(f.remote.descriptionTemplates[0].updatedAt,99);assert.equal(await f.service.pending(),false);
});
test('a late audio restore does not replace a sound just selected by the user',async()=>{
  const f=fixture();f.d.loadSound=async()=>{f.values.set('lotkeysNotificationSoundId','pop');await f.service.mark('notification');return{dataUrl:'data:audio/wav;base64,AA=='}};await f.service.restore({notificationSettings:{soundId:'custom',customSound:{fileId:'a'}}});assert.equal(f.values.get('lotkeysNotificationSoundId'),'pop');
});
test('the actual Account wrappers serialize profile loads, writes and preference writes',async()=>{
  const events=[],context={personalPreferences:{flush:async()=>{events.push('preferences');return true}},loadPersonalProfileNow:async()=>{events.push('load');return{}},syncPersonalProfileNow:async()=>{events.push('save');return{}},console};vm.createContext(context);
  vm.runInContext(html.slice(html.indexOf('  let personalAccountJobs='),html.indexOf('  async function rememberPersonalProfileBaseline(')),context);
  await Promise.all([context.syncPersonalPreferences(),context.loadPersonalProfile(),context.syncPersonalProfile()]);assert.deepEqual(events,['preferences','load','save']);
});
test('the actual Account restore migrates an edited template before old Drive data can replace it',async()=>{
  const f=fixture(),context={console,Date,DB:{all:async()=>[],put:async()=>{},del:async()=>{}},setting:f.d.setting,setSetting:f.d.setSetting,personalPreferences:f.service,connected:()=>true,patchMetadata:async()=>{},ensurePersonalProfileRoot:f.d.folder,driveGet:async()=>({id:'account',name:'Account.json',appProperties:{lotkeysRole:'personalAccountData'}}),findPersonalAccountDataFile:f.d.accountFile,readPersonalAccountFile:f.d.readAccount,personalProfileTimestamp:x=>Date.parse(x.updatedAt)||0,discoverPersonalAccountAssets:async(folder,remote)=>({data:remote,recovered:{}}),applyPersonalAccountAssetRecovery:async recovery=>f.values.set('descriptionTemplates',copy(recovery.data.descriptionTemplates)),syncPersonalDescriptionTemplateFiles:async()=>{}};
  vm.createContext(context);vm.runInContext(html.slice(html.indexOf('  async function rememberPersonalProfileBaseline('),html.indexOf('  async function syncPersonalProfileNow(')),context);
  const result=await context.loadPersonalProfileNow();assert.equal(result.applied,true);assert.equal(f.values.get('descriptionTemplates')[0].updatedAt,20);assert.equal(f.remote.descriptionTemplates[0].updatedAt,20);assert.equal(f.writes.length,1);
});
test('custom audio storage uses the personal Notification Sounds folder and never Store sharing',async()=>{
  const files=new Map(),events=[],clip={name:'Alert.wav',type:'audio/wav',duration:2,dataUrl:'data:audio/wav;base64,AA=='},context={fetch:async()=>({blob:async()=>new Blob(['audio'],{type:'audio/wav'})}),ensureFolder:async(parent,name)=>{events.push(['folder',parent,name]);return{id:'sounds'}},profileHash:()=> 'fingerprint',findChildByAppProperty:async()=>null,findChildByName:async()=>null,multipartCreate:async(blob,meta)=>{events.push(['create',meta]);return{id:'audio'}},patchMetadata:async(id,meta)=>{files.set(id,meta);return{id}},updateTextFile:async()=>assert.fail('unexpected update')};
  vm.createContext(context);vm.runInContext(html.slice(html.indexOf('  async function savePersonalNotificationSound('),html.indexOf('  async function loadPersonalNotificationSound(')),context);const result=await context.savePersonalNotificationSound({id:'personal'},clip);assert.deepEqual(events[0],['folder','personal','Notification Sounds']);assert.equal(events[1][1].parents[0],'sounds');assert.equal(result.fileId,'audio');assert.equal(files.get('audio').appProperties.lotkeysRole,'personalNotificationSound');assert.doesNotMatch(context.savePersonalNotificationSound.toString(),/setAnyoneReader|Store/);
});
test('actual audio upload enforces clip type, duration and size',async()=>{
  const context={fetch:async()=>({blob:async()=>new Blob([new Uint8Array(1600000)],{type:'audio/wav'})})};vm.createContext(context);vm.runInContext(html.slice(html.indexOf('  async function savePersonalNotificationSound('),html.indexOf('  async function loadPersonalNotificationSound(')),context);
  for(const clip of [{type:'image/png',duration:2,dataUrl:'data:image/png;base64,AA=='},{type:'audio/wav',duration:9,dataUrl:'data:audio/wav;base64,AA=='},{type:'audio/wav',duration:2,dataUrl:'data:audio/wav;base64,AA=='}])await assert.rejects(context.savePersonalNotificationSound({id:'personal'},clip),/valid audio|larger than/);
});
