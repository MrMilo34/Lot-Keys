(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LotKeysPersonalPreferences=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const PENDING='personalPreferencesPendingV1',DELETES='personalDescriptionTemplateDeletesV1',DEFAULT='builtin-marketplace-detailed';
  const list=value=>Array.isArray(value)?value:[];
  const time=value=>Number(value)||Date.parse(value||'')||0;
  function mergeDeletes(...sources){const out={};for(const source of sources)for(const [id,at] of Object.entries(source||{}))out[id]=Math.max(out[id]||0,time(at));return out}
  function mergeTemplates(primary,secondary,deletes={}){const rows=new Map();for(const row of [...list(primary),...list(secondary)]){if(!row?.id||row.builtIn)continue;const id=String(row.id);if(time(deletes[id])>=time(row.updatedAt)&&deletes[id])continue;const old=rows.get(id);if(!old||time(row.updatedAt)>=time(old.updatedAt))rows.set(id,{...row,id,builtIn:false})}return [...rows.values()]}
  function buildPatch(remote,local,pending){
    const data={...remote};
    if(pending.templates){data.descriptionTemplateDeletes=mergeDeletes(remote.descriptionTemplateDeletes,local.deletes);data.descriptionTemplates=mergeTemplates(remote.descriptionTemplates,local.templates,data.descriptionTemplateDeletes)}
    if(pending.defaultTemplate)data.lastDescriptionTemplateId=String(local.defaultTemplate||DEFAULT);
    if(data.descriptionTemplateDeletes?.[data.lastDescriptionTemplateId]&&!list(data.descriptionTemplates).some(x=>x.id===data.lastDescriptionTemplateId))data.lastDescriptionTemplateId=DEFAULT;
    if(pending.notification)data.notificationSettings=local.notification;
    data.schemaVersion=Math.max(10,Number(data.schemaVersion)||0);
    return data;
  }
  function create(d){
    const {setting,setSetting}=d;let edits=Promise.resolve();
    function mark(section,{deletedTemplateId=''}={}){const job=edits.catch(()=>{}).then(async()=>{const pending={...await setting(PENDING,{})};pending[section]=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);if(deletedTemplateId){const deletes={...await setting(DELETES,{})};deletes[deletedTemplateId]=Date.now();await setSetting(DELETES,deletes)}await setSetting(PENDING,pending);return pending});edits=job;return job}
    async function pending(){await edits;return Object.keys(await setting(PENDING,{})).length>0}
    async function migrate(remote){
      const templates=list(await setting('descriptionTemplates',[])),remoteRows=new Map(list(remote.descriptionTemplates).map(x=>[x.id,x]));
      if(templates.some(x=>x?.id&&!x.builtIn&&!remote.descriptionTemplateDeletes?.[x.id]&&(!remoteRows.has(x.id)||time(x.updatedAt)>time(remoteRows.get(x.id).updatedAt))))await mark('templates');
      if(!await setting('personalNotificationPreferencesMigratedV1',false)){
        const id=String(await setting('lotkeysNotificationSoundId','classic')||'classic'),custom=await setting('lotkeysNotificationCustomSound',null);
        if(!remote.notificationSettings&&(id!=='classic'||custom?.dataUrl))await mark('notification');
        await setSetting('personalNotificationPreferencesMigratedV1',true);
      }
    }
    async function restore(remote){
      if(!remote.notificationSettings)return;
      const value=remote.notificationSettings,custom=value.customSound?await d.loadSound(value.customSound):null;
      if(value.soundId==='custom'&&!custom?.dataUrl)throw new Error('Your PC notification sound could not be restored. Your current sound was kept.');
      await edits;if((await setting(PENDING,{})).notification)return;
      await setSetting('lotkeysNotificationCustomSound',custom);
      await setSetting('lotkeysNotificationSoundId',String(value.soundId||'classic'));
      await setSetting('personalNotificationPreferencesMigratedV1',true);
    }
    async function flush(){
      await edits;const snapshot={...await setting(PENDING,{})};if(!Object.keys(snapshot).length)return false;
      try{
        const root=await d.folder();if(!root)throw new Error('Choose your LotKeys personal Account Storage folder to back up these settings.');
        const file=await d.accountFile(root.id);if(!file)throw new Error('Account.json is missing. Reconnect your personal Account Storage folder; your changes remain on this device.');
        let remote=await d.readAccount(file.id);
        const email=String(await setting('currentAccountEmail','')||'');
        const verifyIdentity=record=>{if(email&&record.googleAccount&&email.toLowerCase()!==String(record.googleAccount).toLowerCase())throw new Error('This Account Storage folder belongs to a different Google account. Nothing was overwritten.')};
        const assertCurrent=async()=>{if(String(await setting('currentAccountEmail','')||'')!==email||String(await setting('personalProfileDriveFolderId','')||'')!==String(root.id))throw new Error('The personal account changed during backup. Retry from the current account.')};
        verifyIdentity(remote);
        const local={templates:list(await setting('descriptionTemplates',[])),deletes:await setting(DELETES,{}),defaultTemplate:await setting('lastDescriptionTemplateId',DEFAULT)};
        if(snapshot.templates){const recovery=await d.templateRecovery(root.id,remote.descriptionTemplates);local.templates=mergeTemplates(recovery.templates,local.templates,mergeDeletes(remote.descriptionTemplateDeletes,local.deletes))}
        let custom=null;
        if(snapshot.notification){custom=await setting('lotkeysNotificationCustomSound',null);local.notification={schemaVersion:1,soundId:String(await setting('lotkeysNotificationSoundId','classic')||'classic'),customSound:custom?.dataUrl?await d.saveSound(root,custom):null};if(local.notification.soundId==='custom'&&!local.notification.customSound)throw new Error('Choose a custom notification sound before saving it.')}
        // Asset transfers can take time. Re-read Account.json before patching only
        // the requested sections so unrelated changes on another device survive.
        remote=await d.readAccount(file.id);verifyIdentity(remote);
        const previousAt=time(remote.updatedAt),data=buildPatch(remote,local,snapshot);
        data.updatedAt=new Date(Math.max(Date.now(),previousAt+1)).toISOString();
        await assertCurrent();await d.writeAccount(file,root,data);
        const verified=await d.readAccount(file.id);
        for(const key of ['descriptionTemplates','descriptionTemplateDeletes','lastDescriptionTemplateId','notificationSettings'])if(Object.prototype.hasOwnProperty.call(data,key)&&JSON.stringify(verified[key])!==JSON.stringify(data[key]))throw new Error('Drive settings verification did not match. Your changes are still queued for retry.');
        if(snapshot.templates){await d.writeTemplates(root.id,data.descriptionTemplates);for(const id of Object.keys(data.descriptionTemplateDeletes||{}))if(!data.descriptionTemplates.some(x=>x.id===id))await d.removeTemplateFile(id)}
        await assertCurrent();await edits;const current={...await setting(PENDING,{})};
        if(current.templates===snapshot.templates&&snapshot.templates){await setSetting('descriptionTemplates',data.descriptionTemplates);await setSetting(DELETES,data.descriptionTemplateDeletes||{})}
        if(current.defaultTemplate===snapshot.defaultTemplate&&snapshot.defaultTemplate)await setSetting('lastDescriptionTemplateId',data.lastDescriptionTemplateId);
        for(const [key,token] of Object.entries(snapshot))if(current[key]===token)delete current[key];
        await setSetting(PENDING,current);
        const hydrated=String(await setting('personalProfileHydratedFileId','')||''),base=Number(await setting('personalProfileBaseUpdatedAt',0))||0;
        if(hydrated===file.id&&base===previousAt)await setSetting('personalProfileBaseUpdatedAt',time(data.updatedAt));
        await setSetting('personalPreferencesLastSyncedAt',data.updatedAt);await setSetting('personalPreferencesLastSyncError','');
        return data;
      }catch(error){await setSetting('personalPreferencesLastSyncError',error?.message||String(error));throw error}
    }
    return {mark,pending,migrate,restore,flush};
  }
  return {create,mergeDeletes,mergeTemplates,buildPatch};
});
