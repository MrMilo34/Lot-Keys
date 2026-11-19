/* Pure planning for an early, durable Android Vehicle save. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./lotkeys-transfer-core.js'));else root.LotKeysDeferredSave=factory(root.LotKeysTransferCore);})(typeof globalThis!=='undefined'?globalThis:this,function(Core){
  'use strict';
  const groups=[['photo','photos','photosFolderId'],['video','videos','videosFolderId'],['document','attachments','documentsFolderId']];
  function filename(item,kind,position){const base=kind==='photo'?String(item.name||`${kind}-${position+1}`).replace(/^\s*(?:(?:\d{1,3})\s*-\s*)+/,'').trim():String(item.name||`${kind}-${position+1}`);return ((kind==='photo'?String(position+1).padStart(2,'0')+' - ':'')+base).replace(/[\\/:*?"<>|]/g,'-').trim()||'file';}
  function analyze(v,remote={}){
    const rows=[];
    for(const [kind,field,parent] of groups){const files=remote[field]||[],used=new Set();
      for(let position=0;position<(v[field]||[]).length;position++){
        const item=v[field][position],name=filename(item,kind,position),file=files.find(f=>f.id===item.driveFileId||f.appProperties?.lotkeysAssetId===item.id);
        // Destructive edits and renames keep the established foreground reconciliation.
        if(file&&file.name!==name)return {eligible:false,reason:'media-rename'};
        if(file)used.add(file.id);else if(!(item.blob instanceof Blob))throw Error(`The original ${kind} is missing. Restore it before saving.`);
        rows.push({kind,field,parent:v.drive[parent],position,item,name,file});
      }
      if(files.some(file=>!used.has(file.id)))return {eligible:false,reason:'media-removal-or-unlisted-file'};
    }
    return {eligible:true,rows,needed:rows.filter(row=>!row.file).length+(!v.drive.directoryPdfId?1:0)};
  }
  function assign(v,analysis,ids){
    if(!analysis.eligible||ids.length!==analysis.needed||ids.some(id=>!/^[-\w]{8,200}$/.test(id))||new Set(ids).size!==ids.length)throw Error('Drive did not reserve every destination for this save.');
    const available=ids.slice(),assets=[];
    for(const row of analysis.rows){const id=row.file?.id||available.shift();row.item.driveFileId=id;row.item.driveName=row.name;if(row.kind==='photo')row.item.name=String(row.item.name||`photo-${row.position+1}`).replace(/^\s*(?:(?:\d{1,3})\s*-\s*)+/,'').trim();
      if(!row.file)assets.push({key:`${row.kind}:${row.item.id}`,parent:row.parent,name:row.name,driveId:id,size:row.item.blob.size,type:row.item.blob.type||'application/octet-stream',properties:{lotkeysAssetId:row.item.id,lotkeysVehicleId:v.id,lotkeysAssetKind:row.kind}});
    }
    v.drive.directoryPdfId=v.drive.directoryPdfId||available.shift();v.drive.directoryPdfUrl=`https://drive.google.com/file/d/${v.drive.directoryPdfId}/view`;v.drive.nativeFinalizationPending=true;
    return assets;
  }
  function directory(v,c,templateId,fingerprint,assetBase){
    const d=v.drive,title=[v.year,v.make,v.model].filter(Boolean).join(' '),odometer=v.odometer!==''&&v.odometer!=null?`${Number(v.odometer).toLocaleString()} ${v.odometerUnit||'KM'}`:'';
    return {type:'vehicle-directory',templateId,profileId:d.profileFolderId,sharedId:d.sharedFolderId,pdfId:d.directoryPdfId,fingerprint,makePublic:!!c.publicShareEnabled,
      values:Object.fromEntries(Object.entries({'{{STORE_NAME}}':c.storeName||'','{{STORE_ADDRESS}}':c.directoryStoreAddress||'','{{DIRECTIONS_LINK}}':c.directoryDirectionsUrl?'GET DIRECTIONS':'','{{VEHICLE_TITLE}}':title,'{{STOCK_NUMBER}}':v.stock||'','{{ODOMETER}}':odometer,'{{VEHICLE_LISTING_LINK}}':v.originalListingUrl?'VIEW VEHICLE LISTING':'','{{PHOTOS_LINK}}':'VIEW PHOTOS','{{VIDEOS_LINK}}':'VIEW VIDEOS','{{DOCUMENTS_LINK}}':'VIEW INSPECTIONS & DOCUMENTS','{{CARFAX_LINK}}':v.carfaxUrl?'VIEW CARFAX REPORT':''}).map(([key,value])=>[key,String(value)])),
      links:[['GET DIRECTIONS',c.directoryDirectionsUrl||''],['VIEW VEHICLE LISTING',v.originalListingUrl||''],['VIEW PHOTOS',`https://drive.google.com/drive/folders/${d.photosFolderId}`],['VIEW VIDEOS',`https://drive.google.com/drive/folders/${d.videosFolderId}`],['VIEW INSPECTIONS & DOCUMENTS',`https://drive.google.com/drive/folders/${d.documentsFolderId}`],['VIEW CARFAX REPORT',v.carfaxUrl||'']],
      badges:[['{{BADGE_ONE_OWNER}}','carfax-one-owner.png',!!v.carfaxOneOwner,42],['{{BADGE_LOW_KM}}','carfax-low-kilometres.png',!!v.carfaxLowKm,42],['{{BADGE_NO_ACCIDENTS}}','carfax-no-reported-accidents.png',!!v.carfaxNoAccidents,41]].map(([token,file,enabled,height])=>({token,uri:new URL(file,assetBase).href,enabled,width:90,height}))};
  }
  function plan(v,scope,assets,directoryOperation,indexId,sheetUpdated){
    const cover=v.photos?.[0],coverKey=cover&&assets.some(row=>row.key===`photo:${cover.id}`)?`photo:${cover.id}`:'';
    const result=Core.batch(scope,assets,[directoryOperation,{type:'vehicle-cover',sheetId:v.drive.adminSheetId,sheetUpdated,indexId,recordUpdated:Number(v.updatedAt),assetKey:coverKey,coverId:cover?.driveFileId||''}]);
    result.version=2;result.key=JSON.stringify(['vehicle-save-v2',Core.key(scope),sheetUpdated,directoryOperation.pdfId]);result.stagingChunkBytes=1024*1024;result.inventory=[];
    for(const [kind,field] of groups)for(let position=0;position<(v[field]||[]).length;position++){const item=v[field][position];result.inventory.push({id:item.id,kind,position,name:item.name||'',driveFileId:item.driveFileId||'',driveName:item.driveName||'',size:item.blob?.size??item.size??0,type:item.blob?.type||item.type||''});}
    return result;
  }
  function mergeIndex(entries,current,{recordId='',removeId='',retainedIds=[]}={}){
    const next=new Map(entries.filter(row=>row.id!==removeId).map(row=>[row.id,row]));
    for(const row of current){if(row.id===recordId||row.id===removeId)continue;const incoming=next.get(row.id);
      if(row.drive?.nativeFinalizationPending===true||row.drive?.nativeFinalizationPending===false&&incoming?.drive?.nativeFinalizationPending===true||!incoming&&retainedIds.includes(row.id))next.set(row.id,row);
      else if(incoming&&row.drive?.nativeFinalizationPending===false)next.set(row.id,{...incoming,drive:{...incoming.drive,nativeFinalizationPending:false,lastDirectoryFingerprint:row.drive.lastDirectoryFingerprint}});
    }return [...next.values()];
  }
  return {analyze,assign,directory,plan,mergeIndex};
});
