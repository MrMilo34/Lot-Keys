
// Shared helper used by both the UI and Google Drive sync.
function buildVehicleProfileName({stock='',year='',make='',model=''}={}){
  stock=String(stock||'').trim();year=String(year||'').trim();make=String(make||'').trim();model=String(model||'').trim();
  let vehicle='';
  if(model && make && model.toLowerCase().startsWith(make.toLowerCase()+' ')) vehicle=[year,model].filter(Boolean).join(' ');
  else vehicle=[year,make,model].filter(Boolean).join(' ');
  if(stock && vehicle) return `${vehicle} - ${stock}`;
  if(stock) return stock;
  return vehicle||'New Vehicle Profile';
}

// Shared user/account normalizers are intentionally global because DriveSync and the UI
// live in separate closures. v0.8.9 accidentally left these helpers only inside App,
// which caused Store refresh to stop at `normalizeStoreUsers is not defined`.
function lotKeysUserKey(u={}){return String(u.googleSub||u.email||u.userName||'').trim().toLowerCase()}
function lotKeysDefaultUserPermissions(overrides={}){return {createVehicleProfiles:true,markVehicleForDeletion:true,useListings:true,showOnLeaderboard:true,useDescriptionBuilder:true,useChromeExtension:true,...(overrides||{})}}
function lotKeysDefaultModerationStats(overrides={}){return {submitted:0,approved:0,dismissed:0,falseReports:0,...(overrides||{})}}
function lotKeysNormalizedAdminLevel(user={}){const raw=user.adminLevel!=null?Number(user.adminLevel):(user.role==='admin'?2:0);return Math.max(0,Math.min(2,Number.isFinite(raw)?raw:0))}
function normalizeUserAccount(user={}){const permissions=lotKeysDefaultUserPermissions(user.permissions||{}),moderation=lotKeysDefaultModerationStats(user.moderation||{}),contributions={points:Number(user?.contributions?.points)||0,awards:Array.isArray(user?.contributions?.awards)?user.contributions.awards:[]},adminLevel=lotKeysNormalizedAdminLevel(user);return {...user,adminLevel,role:adminLevel>0?'admin':'user',status:user.status||'active',permissions,moderation,contributions}}
function normalizeStoreUsers(users=[]){const seen=new Set(),out=[];for(const raw of Array.isArray(users)?users:[]){const u=normalizeUserAccount(raw||{}),key=lotKeysUserKey(u);if(key&&seen.has(key))continue;if(key)seen.add(key);out.push(u)}return out}
function normalizeRevealSettings(raw={}){
  raw=raw&&typeof raw==='object'?raw:{};
  let build=Number(raw.buildUpSeconds);if(!Number.isFinite(build)||build<=0)build=15;build=Math.max(1,Math.min(60,Math.round(build*100)/100));
  const hasFp=Object.prototype.hasOwnProperty.call(raw,'finalPushAtSeconds');let fp=hasFp?raw.finalPushAtSeconds:Math.round((build*.7)*100)/100;if(fp===''||fp==null)fp=null;else{fp=Number(fp);if(!Number.isFinite(fp)||fp<=0||fp>=build)fp=null;else fp=Math.round(fp*100)/100}
  const cleanAudio=x=>{x=x&&typeof x==='object'?x:{};return {fileId:String(x.fileId||''),name:String(x.name||''),mimeType:String(x.mimeType||''),duration:Number(x.duration)||0,updatedAt:String(x.updatedAt||'')}};
  return {schemaVersion:1,buildUpSeconds:build,finalPushAtSeconds:fp,buildUpSound:cleanAudio(raw.buildUpSound),revealSound:cleanAudio(raw.revealSound),updatedAt:String(raw.updatedAt||'')};
}
function lotKeysAudioExtension(mime='',name=''){
  const ext=String(name||'').match(/\.([a-z0-9]{2,5})$/i)?.[1];if(ext)return ext.toLowerCase();
  mime=String(mime||'').toLowerCase();if(mime.includes('mpeg')||mime.includes('mp3'))return'mp3';if(mime.includes('wav'))return'wav';if(mime.includes('ogg'))return'ogg';if(mime.includes('mp4')||mime.includes('m4a')||mime.includes('aac'))return'm4a';if(mime.includes('webm'))return'webm';return'audio';
}
async function lotKeysAudioDuration(blob){
  if(!blob)return 0;const url=URL.createObjectURL(blob);try{return await new Promise((resolve,reject)=>{const a=document.createElement('audio');let done=false;const finish=v=>{if(done)return;done=true;resolve(Number.isFinite(Number(v))?Number(v):0)};const fail=()=>{if(done)return;done=true;reject(new Error('LotKeys could not read the duration of that audio file.'))};a.preload='metadata';a.onloadedmetadata=()=>finish(a.duration);a.onerror=fail;a.src=url;setTimeout(()=>finish(a.duration||0),6000)})}finally{URL.revokeObjectURL(url)}
}

const DriveSync = (() => {
  const FOLDER_MIME = 'application/vnd.google-apps.folder';
  const SHEET_MIME = 'application/vnd.google-apps.spreadsheet';
  const DOC_MIME = 'application/vnd.google-apps.document';
  const DRIVE_SCOPE = 'openid email https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly';
  let accessToken = '';
  let expiresAt = 0;
  let tokenClient = null;
  let tokenClientId = '';
  let pickerPromise = null;
  const AUTH_SESSION_KEY = 'lotkeys-google-auth-v1';

  async function setting(id, def=''){ return (await DB.get('settings',id))?.value ?? def; }
  async function setSetting(id,value){ return DB.put('settings',{id,value}); }
  const LISTING_DELETE_TOMBSTONES='listingDeletionTombstonesV1';
  async function getListingDeleteTombstones(){const raw=await setting(LISTING_DELETE_TOMBSTONES,{});return raw&&typeof raw==='object'&&!Array.isArray(raw)?{...raw}:{}}
  async function saveListingDeleteTombstones(map){const rows=Object.entries(map||{}).sort((a,b)=>Number(b[1]?.createdAt||0)-Number(a[1]?.createdAt||0)).slice(0,250);await setSetting(LISTING_DELETE_TOMBSTONES,Object.fromEntries(rows));return Object.fromEntries(rows)}
  async function markListingDeleteTombstone(l,userName=''){if(!l?.id)return null;const map=await getListingDeleteTombstones();map[String(l.id)]={listingId:String(l.id),driveFileId:String(l.driveFileId||''),userName:String(userName||l.ownerUserName||''),createdAt:Date.now(),confirmedAbsentAt:0};await saveListingDeleteTombstones(map);return map[String(l.id)]}
  async function listingDeleteTombstoned(id){if(!id)return false;const map=await getListingDeleteTombstones();return !!map[String(id)]}
  async function processListingDeleteTombstones(s){const map=await getListingDeleteTombstones(),ids=Object.keys(map);if(!ids.length)return map;let changed=false;for(const id of ids.slice(0,30)){const t=map[id]||{};if(t.userName&&s?.userName&&String(t.userName).toLowerCase()!==String(s.userName).toLowerCase())continue;try{let remote=null;if(t.driveFileId)remote=await driveGet(t.driveFileId,'id,name,trashed,appProperties').catch(()=>null);if(!remote)remote=await findChildByAppProperty(s.listingsId,'lotkeysListingId',id).catch(()=>null);if(remote&&!remote.trashed){await trashFile(remote.id);t.driveFileId=remote.id;t.confirmedAbsentAt=0;changed=true}await removeListingsIndexEntry(id,s).catch(()=>{});const stillRemote=await findChildByAppProperty(s.listingsId,'lotkeysListingId',id).catch(()=>null);const idx=await readListingsIndex(s).catch(()=>({entries:[]}));const stillIndexed=(idx.entries||[]).some(e=>String(e?.listingId||'')===id);if(!stillRemote&&!stillIndexed){if(!t.confirmedAbsentAt){t.confirmedAbsentAt=Date.now();changed=true}else if(Date.now()-Number(t.confirmedAbsentAt)>24*60*60*1000){delete map[id];changed=true}}else if(t.confirmedAbsentAt){t.confirmedAbsentAt=0;changed=true}}catch(err){console.warn('Deferred listing deletion cleanup',id,err)}}if(changed)await saveListingDeleteTombstones(map);return map}
  function now(){ return Date.now(); }
  function qEscape(s){ return String(s??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
  function clearSessionAuthorization(){
    accessToken='';expiresAt=0;
    try{sessionStorage.removeItem(AUTH_SESSION_KEY)}catch{}
  }
  function rememberSessionAuthorization(clientId){
    try{sessionStorage.setItem(AUTH_SESSION_KEY,JSON.stringify({accessToken,expiresAt,clientId:String(clientId||'')}))}catch{}
  }
  async function restoreSessionAuthorization(){
    try{
      const c=await config();
      const raw=sessionStorage.getItem(AUTH_SESSION_KEY);
      if(!raw)return false;
      const saved=JSON.parse(raw);
      if(!saved?.accessToken || !saved?.expiresAt || String(saved.clientId||'')!==String(c.clientId||'') || Number(saved.expiresAt)-now()<=60000){clearSessionAuthorization();return false}
      accessToken=String(saved.accessToken);expiresAt=Number(saved.expiresAt);return true;
    }catch{clearSessionAuthorization();return false}
  }
  function isHttps(){ return location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'; }
  async function config(){
    return {
      clientId: (await setting('googleClientId','')).trim(),
      apiKey: (await setting('googleApiKey','')).trim(),
      projectNumber: String(await setting('googleProjectNumber','')).trim(),
      storeFolderId: (await setting('storeFolderId','')).trim(),
      storeFolderName: (await setting('storeFolderName','')).trim(),
      userName: (await setting('userName','')).trim(),
      storeName: (await setting('storeName','')).trim(),
      publicShareEnabled: await setting('publicShareEnabled', true),
      originalListingMandatory: await setting('originalListingMandatory', false),
      directoryStoreAddress: (await setting('directoryStoreAddress','')).trim(),
      directoryDirectionsUrl: (await setting('directoryDirectionsUrl','')).trim(),
      userRole: (await setting('currentUserRole','')).trim(),
      accountEmail: (await setting('currentAccountEmail','')).trim(),
    };
  }
  async function waitForGoogle(timeoutMs=12000){
    const start=now();
    while(now()-start < timeoutMs){
      if(window.google?.accounts?.oauth2 && window.gapi) return;
      await new Promise(r=>setTimeout(r,100));
    }
    throw new Error('Google sign-in libraries did not load. Check your internet connection and reload LotKeys.');
  }
  async function initPicker(){
    if(pickerPromise) return pickerPromise;
    pickerPromise=(async()=>{
      await waitForGoogle();
      await new Promise((resolve,reject)=>{
        try { gapi.load('picker',{callback:resolve,onerror:()=>reject(new Error('Google Picker failed to load'))}); }
        catch(e){ reject(e); }
      });
      return true;
    })();
    return pickerPromise;
  }
  async function authorize(forcePrompt=false){
    const c=await config();
    if(!isHttps()) throw new Error('Google authorization requires HTTPS (or localhost). Host this build first, then open that URL.');
    if(!c.clientId) throw new Error('Google OAuth Client ID is not configured in Garage.');
    if(!accessToken)await restoreSessionAuthorization();
    await waitForGoogle();
    if(accessToken && expiresAt-now()>60000 && !forcePrompt) return accessToken;
    if(!tokenClient || tokenClientId!==c.clientId){
      tokenClientId=c.clientId;
      tokenClient=google.accounts.oauth2.initTokenClient({client_id:c.clientId,scope:DRIVE_SCOPE,callback:()=>{}});
    }
    return new Promise((resolve,reject)=>{
      tokenClient.callback=resp=>{
        if(resp?.error) return reject(new Error(resp.error_description || resp.error));
        accessToken=resp.access_token;
        expiresAt=now()+(Number(resp.expires_in||3600)*1000);
        rememberSessionAuthorization(c.clientId);
        resolve(accessToken);
      };
      tokenClient.error_callback=err=>reject(new Error(err?.message || err?.type || 'Google authorization was cancelled.'));
      const request={prompt:forcePrompt?'consent':''};
      if(c.accountEmail)request.login_hint=c.accountEmail;
      tokenClient.requestAccessToken(request);
    });
  }
  function connected(){ return !!(accessToken && expiresAt-now()>60000); }
  async function getGoogleIdentity(){
    await authorize(false);
    const info=await apiFetch('https://www.googleapis.com/oauth2/v3/userinfo');
    const identity={email:String(info?.email||'').trim().toLowerCase(),sub:String(info?.sub||'').trim(),name:String(info?.name||'').trim()};
    if(!identity.email) throw new Error('LotKeys could not read the signed-in Google account email. Reconnect Google Drive and approve email access.');
    await setSetting('currentAccountEmail',identity.email);await setSetting('currentAccountSub',identity.sub);await setSetting('currentAccountName',identity.name);
    return identity;
  }
  async function ready(){ const c=await config(); return !!(c.clientId && c.storeFolderId && c.userName); }
  async function disconnect(){
    if(accessToken && window.google?.accounts?.oauth2){ try{ google.accounts.oauth2.revoke(accessToken,()=>{}); }catch{} }
    clearSessionAuthorization();
  }
  async function apiFetch(url, opts={}, retry=true){
    const token=await authorize(false);
    const headers=new Headers(opts.headers||{}); headers.set('Authorization',`Bearer ${token}`);
    const res=await fetch(url,{...opts,headers});
    if(res.status===401 && retry){clearSessionAuthorization();const e=new Error('Google Drive authorization expired. Reconnect Google Drive to resume sync.');e.code='AUTH_REQUIRED';throw e;}
    if(!res.ok){
      let detail='';try{const j=await res.json();detail=j?.error?.message||JSON.stringify(j);}catch{detail=await res.text();}
      const e=new Error(detail||`Google API request failed (${res.status})`); e.status=res.status; throw e;
    }
    if(res.status===204) return null;
    const type=res.headers.get('content-type')||'';
    return type.includes('application/json') ? res.json() : res.text();
  }
  async function fetchFileBlob(id,retry=true){
    const token=await authorize(false);
    const res=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`,{headers:{Authorization:`Bearer ${token}`}});
    if(res.status===401 && retry){clearSessionAuthorization();const e=new Error('Google Drive authorization expired. Reconnect Google Drive to resume sync.');e.code='AUTH_REQUIRED';throw e;}
    if(!res.ok){let detail='';try{const j=await res.json();detail=j?.error?.message||JSON.stringify(j)}catch{detail=await res.text()}throw new Error(detail||`Could not download Drive file (${res.status})`);}
    return res.blob();
  }
  async function driveGet(id,fields='id,name,mimeType,webViewLink,appProperties,parents,driveId'){
    return apiFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?supportsAllDrives=true&fields=${encodeURIComponent(fields)}`);
  }
  async function listFiles(q,fields='files(id,name,mimeType,webViewLink,appProperties,parents,trashed)'){
    const u=new URL('https://www.googleapis.com/drive/v3/files');
    u.searchParams.set('q',q);u.searchParams.set('fields',fields);u.searchParams.set('pageSize','1000');
    u.searchParams.set('supportsAllDrives','true');u.searchParams.set('includeItemsFromAllDrives','true');
    return (await apiFetch(u.toString())).files||[];
  }
  async function createMetadata(meta,fields='id,name,mimeType,webViewLink,appProperties'){
    return apiFetch(`https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=${encodeURIComponent(fields)}`,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(meta)
    });
  }
  async function patchMetadata(id,meta,fields='id,name,webViewLink,appProperties'){
    return apiFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?supportsAllDrives=true&fields=${encodeURIComponent(fields)}`,{
      method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(meta)
    });
  }
  async function trashFile(id){ if(!id)return; return patchMetadata(id,{trashed:true},'id,trashed'); }
  async function createFolder(name,parentId,appProperties={}){
    return createMetadata({name,mimeType:FOLDER_MIME,parents:[parentId],appProperties});
  }
  async function findChildByName(parentId,name,mimeType=''){
    let q=`'${qEscape(parentId)}' in parents and name = '${qEscape(name)}' and trashed = false`;
    if(mimeType) q+=` and mimeType = '${qEscape(mimeType)}'`;
    return (await listFiles(q))[0]||null;
  }
  async function findChildByAppProperty(parentId,key,value,mimeType=''){
    let q=`'${qEscape(parentId)}' in parents and appProperties has { key='${qEscape(key)}' and value='${qEscape(value)}' } and trashed = false`;
    if(mimeType) q+=` and mimeType = '${qEscape(mimeType)}'`;
    return (await listFiles(q))[0]||null;
  }
  async function ensureFolder(parentId,name,key='',value=''){
    let f=null;
    if(key && value) f=await findChildByAppProperty(parentId,key,value,FOLDER_MIME);
    if(!f) f=await findChildByName(parentId,name,FOLDER_MIME);
    if(!f) f=await createFolder(name,parentId,key&&value?{[key]:value}:{})
    else if(f.name!==name) f=await patchMetadata(f.id,{name});
    return f;
  }
  async function updateTextFile(fileId,blob){
    const token=await authorize(false);
    const res=await fetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media&supportsAllDrives=true`,{
      method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':blob.type||'application/octet-stream'},body:blob
    });
    if(!res.ok){let d='';try{d=(await res.json())?.error?.message||''}catch{};throw new Error(d||`Could not update Drive file (${res.status})`)}
    return res.json();
  }
  async function multipartCreate(blob,metadata){
    const token=await authorize(false);
    const boundary='lotkeys_'+Math.random().toString(36).slice(2);
    const body=new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,JSON.stringify(metadata),
      `\r\n--${boundary}\r\nContent-Type: ${blob.type||'application/octet-stream'}\r\n\r\n`,blob,`\r\n--${boundary}--`
    ]);
    const res=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink,appProperties',{
      method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':`multipart/related; boundary=${boundary}`},body
    });
    if(!res.ok){let d='';try{d=(await res.json())?.error?.message||''}catch{};const e=new Error(d||`Could not upload file (${res.status})`);e.status=res.status;throw e}
    return res.json();
  }
  const RESUMABLE_SESSION_STORAGE='lotkeys-resumable-upload-sessions-v1';
  function readResumableSessions(){try{return JSON.parse(localStorage.getItem(RESUMABLE_SESSION_STORAGE)||'{}')||{}}catch{return {}}}
  function writeResumableSessions(rows){try{localStorage.setItem(RESUMABLE_SESSION_STORAGE,JSON.stringify(rows||{}))}catch{}}
  function getResumableSession(key){if(!key)return null;const rows=readResumableSessions(),x=rows[key];if(!x)return null;if(Date.now()-(Number(x.updatedAt)||0)>6*86400000){delete rows[key];writeResumableSessions(rows);return null}return x}
  function saveResumableSession(key,data){if(!key)return;const rows=readResumableSessions();rows[key]={...(data||{}),updatedAt:Date.now()};writeResumableSessions(rows)}
  function clearResumableSession(key){if(!key)return;const rows=readResumableSessions();if(rows[key]){delete rows[key];writeResumableSessions(rows)}}
  function acceptedOffsetFromRange(range,fallback=0){const m=String(range||'').match(/bytes\s*=\s*0-(\d+)/i);return m?Number(m[1])+1:fallback}
  async function queryResumableOffset(uploadUrl,total,token){
    return new Promise((resolve,reject)=>{
      const xhr=new XMLHttpRequest();xhr.open('PUT',uploadUrl,true);xhr.responseType='json';xhr.setRequestHeader('Authorization',`Bearer ${token}`);xhr.setRequestHeader('Content-Range',`bytes */${total}`);
      xhr.onload=()=>{
        if(xhr.status===308){resolve({valid:true,complete:false,offset:acceptedOffsetFromRange(xhr.getResponseHeader('Range'),0)});return}
        if(xhr.status===200||xhr.status===201){let body=xhr.response;if(!body){try{body=JSON.parse(xhr.responseText||'{}')}catch{body={}}}resolve({valid:true,complete:true,offset:total,body});return}
        if(xhr.status===404||xhr.status===410){resolve({valid:false,complete:false,offset:0});return}
        const er=new Error(xhr.response?.error?.message||`Could not check upload progress (${xhr.status})`);er.status=xhr.status;reject(er);
      };
      xhr.onerror=()=>reject(Object.assign(new Error('Could not check the saved upload session.'),{code:'MEDIA_UPLOAD_INTERRUPTED'}));
      xhr.send(null);
    });
  }
  async function createResumableSession(blob,metadata,token){
    const start=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,webViewLink,appProperties',{
      method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':blob.type||'application/octet-stream','X-Upload-Content-Length':String(blob.size)},body:JSON.stringify(metadata)
    });
    if(start.status===401){clearSessionAuthorization();const e=new Error('Google Drive authorization expired. Reconnect Google Drive to resume sync.');e.code='AUTH_REQUIRED';throw e}
    if(!start.ok){let d='';try{d=(await start.json())?.error?.message||''}catch{};const e=new Error(d||`Could not start Drive upload (${start.status})`);e.status=start.status;throw e}
    return start.headers.get('Location')||'';
  }
  function uploadChunkSize(blob){
    const MB=1024*1024,size=Number(blob?.size)||0,isVideo=/^video\//i.test(String(blob?.type||''));
    if(!isVideo)return 8*MB;
    if(size<=64*MB)return Math.max(256*1024,size);
    const effective=String(navigator.connection?.effectiveType||'').toLowerCase();
    if((!effective||effective==='4g')&&size<=768*MB)return 128*MB;
    return effective==='2g'||effective==='slow-2g'?16*MB:64*MB;
  }
  async function requestUploadWakeLock(blob){
    if(!/^video\//i.test(String(blob?.type||''))||!navigator.wakeLock||document.visibilityState!=='visible')return null;
    try{return await navigator.wakeLock.request('screen')}catch{return null}
  }
  async function resumableCreate(blob,metadata,onProgress=()=>{},resumeKey=''){
    if(!blob?.size)return multipartCreate(blob,metadata);
    const token=await authorize(false),CHUNK=uploadChunkSize(blob);
    let wakeLock=null;
    let uploadUrl='',offset=0,lastResult=null;
    const stored=resumeKey?getResumableSession(resumeKey):null;
    if(stored?.uploadUrl&&Number(stored.size)===Number(blob.size)){
      try{
        const status=await queryResumableOffset(stored.uploadUrl,blob.size,token);
        if(status.valid&&!status.complete){uploadUrl=stored.uploadUrl;offset=Math.max(0,Math.min(blob.size,Number(status.offset)||0));}
        else if(status.complete&&status.body?.id){clearResumableSession(resumeKey);onProgress(blob.size,blob.size);try{await wakeLock?.release()}catch{};return status.body}
        else clearResumableSession(resumeKey);
      }catch(err){
        // A backgrounded browser can temporarily block the status check. The last
        // completed chunk is still a safe checkpoint, so keep the session alive.
        uploadUrl=stored.uploadUrl;offset=Math.max(0,Math.min(blob.size,Number(stored.offset)||0));
      }
    }
    if(!uploadUrl){
      uploadUrl=await createResumableSession(blob,metadata,token);
      if(!uploadUrl){const f=await multipartCreate(blob,metadata);onProgress(blob.size,blob.size);try{await wakeLock?.release()}catch{};return f}
      offset=0;saveResumableSession(resumeKey,{uploadUrl,size:blob.size,offset:0,name:metadata?.name||'',type:blob.type||''});
    }
    wakeLock=await requestUploadWakeLock(blob);
    onProgress(offset,blob.size);
    let failures=0;
    while(offset<blob.size){
      const startOffset=offset,end=Math.min(blob.size,startOffset+CHUNK),chunk=blob.slice(startOffset,end,blob.type||'application/octet-stream');
      try{
        const result=await new Promise((resolve,reject)=>{
          const xhr=new XMLHttpRequest();xhr.open('PUT',uploadUrl,true);xhr.responseType='json';xhr.setRequestHeader('Authorization',`Bearer ${token}`);xhr.setRequestHeader('Content-Type',blob.type||'application/octet-stream');xhr.setRequestHeader('Content-Range',`bytes ${startOffset}-${end-1}/${blob.size}`);
          // Show bytes being sent immediately so large video chunks have smooth progress.
          // Durable resume checkpoints are still saved only after Drive acknowledges a chunk.
          if(xhr.upload)xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.min(blob.size,startOffset+Number(e.loaded||0)),blob.size)};
          xhr.onload=()=>{
            if(xhr.status===200||xhr.status===201){onProgress(blob.size,blob.size);let body=xhr.response;if(!body){try{body=JSON.parse(xhr.responseText||'{}')}catch{body={}}}resolve({offset:blob.size,body,complete:true});return}
            if(xhr.status===308){const accepted=Math.max(startOffset,Math.min(blob.size,acceptedOffsetFromRange(xhr.getResponseHeader('Range'),end)));onProgress(accepted,blob.size);resolve({offset:accepted,body:null,complete:false});return}
            const er=new Error(xhr.response?.error?.message||`Drive upload failed (${xhr.status})`);er.status=xhr.status;reject(er);
          };
          xhr.onerror=()=>reject(Object.assign(new Error('Media upload was interrupted. LotKeys saved the upload checkpoint and will retry.'),{code:'MEDIA_UPLOAD_INTERRUPTED'}));
          xhr.onabort=()=>reject(Object.assign(new Error('Media upload was interrupted. LotKeys saved the upload checkpoint and will retry.'),{code:'MEDIA_UPLOAD_INTERRUPTED'}));
          xhr.send(chunk);
        });
        failures=0;offset=result.offset;lastResult=result.body||lastResult;
        saveResumableSession(resumeKey,{uploadUrl,size:blob.size,offset,name:metadata?.name||'',type:blob.type||''});
        if(result.complete)break;
      }catch(err){
        if(err?.status===401){clearSessionAuthorization();err.code='AUTH_REQUIRED';try{await wakeLock?.release()}catch{};throw err}
        failures++;
        try{
          const status=await queryResumableOffset(uploadUrl,blob.size,token);
          if(!status.valid){
            clearResumableSession(resumeKey);
            uploadUrl=await createResumableSession(blob,metadata,token);offset=0;failures=0;
            saveResumableSession(resumeKey,{uploadUrl,size:blob.size,offset:0,name:metadata?.name||'',type:blob.type||''});onProgress(0,blob.size);continue;
          }
          offset=Math.max(offset,Math.min(blob.size,Number(status.offset)||0));onProgress(offset,blob.size);
          saveResumableSession(resumeKey,{uploadUrl,size:blob.size,offset,name:metadata?.name||'',type:blob.type||''});
          if(status.complete&&status.body?.id){lastResult=status.body;offset=blob.size;break}
        }catch(statusErr){if(statusErr?.status===401){clearSessionAuthorization();statusErr.code='AUTH_REQUIRED';try{await wakeLock?.release()}catch{};throw statusErr}}
        if(failures>=4){err.code=err.code||'MEDIA_UPLOAD_INTERRUPTED';try{await wakeLock?.release()}catch{};throw err}
        await new Promise(r=>setTimeout(r,Math.min(5000,750*failures)));
      }
    }
    clearResumableSession(resumeKey);
    try{await wakeLock?.release()}catch{}
    if(lastResult?.id)return lastResult;
    // If the final response was lost, the uploaded file is discoverable on the next
    // retry by its LotKeys appProperties, so pause instead of starting a duplicate.
    throw Object.assign(new Error('Drive received the media but LotKeys did not receive the final file record. The upload will be verified on retry.'),{code:'MEDIA_UPLOAD_INTERRUPTED'});
  }
  async function upsertJson({fileId='',name,parentId,data,appProperties={}}){
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    if(fileId){ await updateTextFile(fileId,blob); return driveGet(fileId,'id,name,webViewLink,appProperties'); }
    return multipartCreate(blob,{name,parents:[parentId],appProperties});
  }
  async function copyDriveFile(fileId,name,parentId,appProperties={}){
    return apiFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/copy?supportsAllDrives=true&fields=id,name,mimeType,webViewLink,appProperties`,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,parents:[parentId],appProperties})
    });
  }
  async function docsBatchUpdate(documentId,requests){
    return apiFetch(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requests})
    });
  }
  async function docsGet(documentId){
    return apiFetch(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}`);
  }
  async function exportGoogleFileBlob(fileId,mimeType='application/pdf',retry=true){
    const token=await authorize(false);
    const url=`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(mimeType)}`;
    const res=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});
    if(res.status===401 && retry){clearSessionAuthorization();const e=new Error('Google Drive authorization expired. Reconnect Google Drive to resume sync.');e.code='AUTH_REQUIRED';throw e}
    if(!res.ok){let detail='';try{detail=(await res.json())?.error?.message||''}catch{detail=await res.text()}throw new Error(detail||`Could not export Google file (${res.status})`)}
    return res.blob();
  }
  function walkDocElements(elements,cb){
    for(const el of elements||[]){
      if(el.paragraph) for(const pe of el.paragraph.elements||[]) if(pe.textRun) cb(pe.textRun.content||'',pe.startIndex,pe.endIndex);
      if(el.table) for(const row of el.table.tableRows||[]) for(const cell of row.tableCells||[]) walkDocElements(cell.content||[],cb);
      if(el.tableOfContents) walkDocElements(el.tableOfContents.content||[],cb);
    }
  }
  async function linkTextsInDoc(documentId,pairs){
    pairs=(pairs||[]).filter(([label,url])=>label&&url);if(!pairs.length)return;
    const doc=await docsGet(documentId);const req=[];
    walkDocElements(doc.body?.content||[],(text,start)=>{
      for(const [label,url] of pairs){let at=0;while((at=text.indexOf(label,at))>=0){req.push({updateTextStyle:{range:{startIndex:start+at,endIndex:start+at+label.length},textStyle:{link:{url},foregroundColor:{color:{rgbColor:{blue:0.65,green:0.25,red:0.05}}},underline:true},fields:'link,foregroundColor,underline'}});at+=label.length;}}
    });
    if(req.length)await docsBatchUpdate(documentId,req);
  }
  function publicAssetUrl(name){return new URL(`./assets/${name}`,location.href).href;}
  async function replacePlaceholderWithImage(documentId,token,uri,{enabled=true,width=90,height=56,linkUrl=''}={}){
    if(!enabled){await docsBatchUpdate(documentId,[{replaceAllText:{containsText:{text:token,matchCase:true},replaceText:''}}]);return false;}
    const doc=await docsGet(documentId);const ranges=[];
    walkDocElements(doc.body?.content||[],(text,start)=>{let at=0;while((at=text.indexOf(token,at))>=0){ranges.push({startIndex:start+at,endIndex:start+at+token.length});at+=token.length;}});
    if(!ranges.length)return false;
    ranges.sort((a,b)=>b.startIndex-a.startIndex);
    for(const r of ranges){
      const req=[
        {deleteContentRange:{range:{startIndex:r.startIndex,endIndex:r.endIndex}}},
        {insertInlineImage:{location:{index:r.startIndex},uri,objectSize:{width:{magnitude:width,unit:'PT'},height:{magnitude:height,unit:'PT'}}}}
      ];
      await docsBatchUpdate(documentId,req);
      if(linkUrl){await docsBatchUpdate(documentId,[{updateTextStyle:{range:{startIndex:r.startIndex,endIndex:r.startIndex+1},textStyle:{link:{url:linkUrl}},fields:'link'}}]).catch(()=>{});}
    }
    return true;
  }
  function defaultDirectoryTemplate(){
    return `{{STORE_NAME}}\n{{STORE_ADDRESS}}\n{{DIRECTIONS_LINK}}\n\n{{VEHICLE_TITLE}}\nStock # {{STOCK_NUMBER}}\n{{ODOMETER}}\n\n{{VEHICLE_LISTING_LINK}}\n\n{{PHOTOS_LINK}}\n\n{{VIDEOS_LINK}}\n\n{{DOCUMENTS_LINK}}\n\n{{CARFAX_LINK}}\n\nCARFAX - VEHICLE HISTORY\n{{BADGE_ONE_OWNER}}   {{BADGE_LOW_KM}}   {{BADGE_NO_ACCIDENTS}}\n`;
  }
  async function ensureDirectoryTemplate(existingStructure=null){
    const s=existingStructure||await structure();
    // Administration is the source of truth. Re-resolve the template every time instead of
    // trusting a stale cached/template ID from an older LotKeys build or phone.
    let q=`'${qEscape(s.adminId)}' in parents and name = '${qEscape('Vehicle Info Directory Template')}' and mimeType = '${qEscape(DOC_MIME)}' and trashed = false`;
    let candidates=await listFiles(q,'files(id,name,mimeType,webViewLink,appProperties,parents,trashed,modifiedTime)');
    candidates.sort((a,b)=>String(b.modifiedTime||'').localeCompare(String(a.modifiedTime||'')));
    let t=candidates[0]||null;
    if(!t){
      t=await createMetadata({name:'Vehicle Info Directory Template',mimeType:DOC_MIME,parents:[s.adminId],appProperties:{lotkeysRole:'vehicleInfoDirectoryTemplate'}},'id,name,mimeType,webViewLink,appProperties,parents');
      try{await docsBatchUpdate(t.id,[{insertText:{location:{index:1},text:defaultDirectoryTemplate()}}]);}
      catch(err){await trashFile(t.id).catch(()=>{});throw new Error('Vehicle Info Directory template could not be created. Enable the Google Docs API for the LotKeys Google Cloud project, then try again. '+(err.message||err));}
    } else {
      // Mark the real Administration template so future installs can also identify it by role.
      await patchMetadata(t.id,{appProperties:{...(t.appProperties||{}),lotkeysRole:'vehicleInfoDirectoryTemplate'}},'id,name,mimeType,webViewLink,appProperties,parents').catch(()=>{});
    }
    await setSetting('directoryTemplateFileId',t.id);
    // Keep LotKeys.json aligned with the template actually selected from Administration.
    await syncStoreConfig(s).catch(()=>{});
    return t;
  }
  async function upsertPdf(fileId,name,parentId,blob,appProperties={}){
    if(fileId){await updateTextFile(fileId,blob);const cur=await driveGet(fileId,'id,name,webViewLink,appProperties').catch(()=>null);if(cur){if(cur.name!==name)await patchMetadata(fileId,{name});return driveGet(fileId,'id,name,webViewLink,appProperties')}}
    return multipartCreate(blob,{name,parents:[parentId],appProperties});
  }
  async function generateVehicleInfoDirectory(v,templateOverride=null){
    if(!v?.drive?.sharedFolderId)return null;
    const s=await structure();const c=await config();const template=templateOverride||await ensureDirectoryTemplate(s);
    const temp=await copyDriveFile(template.id,`LotKeys Temp - ${v.id}`,v.drive.profileFolderId,{lotkeysRole:'vehicleDirectoryTemp',lotkeysVehicleId:v.id});
    const title=[v.year,v.make,v.model].filter(Boolean).join(' ');
    const odometer=v.odometer!==''&&v.odometer!=null?`${Number(v.odometer).toLocaleString()} ${v.odometerUnit||'KM'}`:'';
    const values={
      '{{STORE_NAME}}':c.storeName||'',
      '{{STORE_ADDRESS}}':c.directoryStoreAddress||'',
      '{{DIRECTIONS_LINK}}':c.directoryDirectionsUrl?'GET DIRECTIONS':'',
      '{{VEHICLE_TITLE}}':title,
      '{{STOCK_NUMBER}}':v.stock||'',
      '{{ODOMETER}}':odometer,
      '{{VEHICLE_LISTING_LINK}}':v.originalListingUrl?'VIEW VEHICLE LISTING':'',
      '{{PHOTOS_LINK}}':'VIEW PHOTOS',
      '{{VIDEOS_LINK}}':'VIEW VIDEOS',
      '{{DOCUMENTS_LINK}}':'VIEW INSPECTIONS & DOCUMENTS',
      '{{CARFAX_LINK}}':v.carfaxUrl?'VIEW CARFAX REPORT':''
    };
    try{
      await docsBatchUpdate(temp.id,Object.entries(values).map(([find,replaceText])=>({replaceAllText:{containsText:{text:find,matchCase:true},replaceText}})));
      const links=[
        ['GET DIRECTIONS',c.directoryDirectionsUrl],['VIEW VEHICLE LISTING',v.originalListingUrl],
        ['VIEW PHOTOS',`https://drive.google.com/drive/folders/${v.drive.photosFolderId}`],
        ['VIEW VIDEOS',`https://drive.google.com/drive/folders/${v.drive.videosFolderId}`],
        ['VIEW INSPECTIONS & DOCUMENTS',`https://drive.google.com/drive/folders/${v.drive.documentsFolderId}`],
        ['VIEW CARFAX REPORT',v.carfaxUrl]
      ];
      await linkTextsInDoc(temp.id,links);
      // The CARFAX report stays a normal text hyperlink; only history highlights use graphics.
      await replacePlaceholderWithImage(temp.id,'{{BADGE_ONE_OWNER}}',publicAssetUrl('carfax-one-owner.png'),{enabled:!!v.carfaxOneOwner,width:90,height:42});
      await replacePlaceholderWithImage(temp.id,'{{BADGE_LOW_KM}}',publicAssetUrl('carfax-low-kilometres.png'),{enabled:!!v.carfaxLowKm,width:90,height:42});
      await replacePlaceholderWithImage(temp.id,'{{BADGE_NO_ACCIDENTS}}',publicAssetUrl('carfax-no-reported-accidents.png'),{enabled:!!v.carfaxNoAccidents,width:90,height:41});
      const pdfBlob=await exportGoogleFileBlob(temp.id,'application/pdf');
      // Exactly one Vehicle Info Directory PDF is allowed per vehicle. Resolve the
      // existing Drive file by ID/role/name, overwrite it, then remove stale duplicates.
      const allShared=await listFiles(`'${qEscape(v.drive.sharedFolderId)}' in parents and trashed = false`,'files(id,name,mimeType,webViewLink,appProperties,modifiedTime,trashed)');
      const candidates=allShared.filter(f=>f.name==='Vehicle Info Directory.pdf'||(f.appProperties?.lotkeysRole==='vehicleInfoDirectoryPdf'&&(!f.appProperties?.lotkeysVehicleId||f.appProperties.lotkeysVehicleId===v.id)));
      candidates.sort((a,b)=>Date.parse(b.modifiedTime||0)-Date.parse(a.modifiedTime||0));
      const remembered=v.drive.directoryPdfId||'';
      const preferred=candidates.find(f=>f.id===remembered)||candidates.find(f=>f.appProperties?.lotkeysRole==='vehicleInfoDirectoryPdf'&&f.appProperties?.lotkeysVehicleId===v.id)||candidates[0]||null;
      const pdf=await upsertPdf(preferred?.id||'','Vehicle Info Directory.pdf',v.drive.sharedFolderId,pdfBlob,{lotkeysRole:'vehicleInfoDirectoryPdf',lotkeysVehicleId:v.id});
      await Promise.allSettled(candidates.filter(f=>f.id!==pdf.id).map(f=>trashFile(f.id)));
      v.drive.directoryPdfId=pdf.id;v.drive.directoryPdfUrl=pdf.webViewLink||`https://drive.google.com/file/d/${pdf.id}/view`;
      return pdf;
    } finally { await trashFile(temp.id).catch(()=>{}); }
  }
  async function setAnyoneReader(folderId){
    const p=await apiFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}/permissions?supportsAllDrives=true&fields=permissions(id,type,role)`).catch(()=>({permissions:[]}));
    if((p.permissions||[]).some(x=>x.type==='anyone'&&x.role==='reader')) return true;
    await apiFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}/permissions?supportsAllDrives=true&fields=id,type,role`,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'anyone',role:'reader'})
    });
    return true;
  }
  async function ensureStoreStructure(){
    const c=await config();
    if(!c.storeFolderId) throw new Error('Choose a Store Folder first.');
    await authorize(false);
    const root=await driveGet(c.storeFolderId,'id,name,mimeType,webViewLink,capabilities(canAddChildren,canListChildren)');
    if(root.mimeType!==FOLDER_MIME) throw new Error('The selected Store item is not a folder.');
    const users=await ensureFolder(root.id,'Users','lotkeysRole','users');
    const admin=await ensureFolder(root.id,'Administration','lotkeysRole','administration');
    const inventory=await ensureFolder(root.id,'Inventory','lotkeysRole','inventory');
    const base={rootId:root.id,rootName:root.name,usersId:users.id,adminId:admin.id,inventoryId:inventory.id,updatedAt:new Date().toISOString()};
    await setSetting('driveStoreStructure',base);
    await loadStoreConfig(base).catch(()=>false);

    const identity=await getGoogleIdentity();await setSetting('currentUserRole','');
    let registry=normalizeStoreUsers(await setting('storeUsers',[]));if(!Array.isArray(registry))registry=[];
    let userName=(await setting('userName','')).trim();
    let account=registry.find(u=>(identity.sub&&u.googleSub===identity.sub)||(identity.email&&String(u.email||'').toLowerCase()===identity.email));
    if(account){
      userName=account.userName;account=normalizeUserAccount(account);await setSetting('userName',userName);await setSetting('currentUserRole',account.role||'user');await setSetting('currentUserAdminLevel',account.adminLevel||0);
    }else{
      if(!userName) throw new Error('This Google account is not registered with this LotKeys Store yet. Enter a new “My User Name”, then connect again.');
      const claimed=registry.find(u=>String(u.userName||'').toLowerCase()===userName.toLowerCase());
      if(claimed) throw new Error(`The LotKeys user name “${userName}” already belongs to another Google account. Choose a different user name or contact management.`);
      account=normalizeUserAccount({userName,email:identity.email,googleSub:identity.sub,adminLevel:registry.length?0:2,status:'active',createdAt:new Date().toISOString()});
      registry.push(account);await setSetting('storeUsers',registry);await setSetting('currentUserRole',account.role);await setSetting('currentUserAdminLevel',account.adminLevel||0);
    }
    if(['disabled','banned','blacklisted','removed'].includes(String(account.status||'').toLowerCase())){const e=new Error('Your access to this LotKeys Store has been removed. Please speak with the Store administration or management.');e.code='STORE_BLOCKED';throw e;}
    const user=await ensureFolder(users.id,userName,'lotkeysUserName',userName);
    const listings=await ensureFolder(user.id,'Listings','lotkeysRole','userListings');
    const listingAssets=await ensureFolder(user.id,'Listing Assets','lotkeysRole','userListingAssets');
    for(const loc of await DB.all('locations'))if(!loc.ownerUserName){loc.ownerUserName=userName;await DB.put('locations',loc);}
    for(const li of await DB.all('listings'))if(!li.ownerUserName){li.ownerUserName=userName;await DB.put('listings',li);}
    const structure={...base,userId:user.id,listingsId:listings.id,listingAssetsId:listingAssets.id,userName,updatedAt:new Date().toISOString()};
    await setSetting('driveStoreStructure',structure);
    await syncStoreConfig(structure).catch(()=>{});
    await ensureDirectoryTemplate(structure).catch(err=>console.warn('Directory template not ready',err));
    await migrateLocalListingsToDrive(structure).catch(err=>console.warn('Listing migration deferred',err));
    await syncPersonalProfile({preferRemote:true}).catch(err=>console.warn('Personal profile sync deferred',err));
    await syncStoreProfileThumbnail(structure).catch(err=>console.warn('Store profile thumbnail sync deferred',err));
    await syncStoreCelebrationSound(structure).catch(err=>console.warn('Store Celebration Sound sync deferred',err));
    return structure;
  }
  async function structure(){
    const s=await setting('driveStoreStructure',null); const c=await config();
    if(s?.rootId===c.storeFolderId && s?.inventoryId && s?.listingsId && s?.listingAssetsId && s?.userId) return s;
    return ensureStoreStructure();
  }
  async function loadStoreConfig(existingStructure=null){
    const s=existingStructure||await structure();
    let f=await findChildByAppProperty(s.adminId,'lotkeysRole','storeConfig');
    if(!f) f=await findChildByName(s.adminId,'LotKeys.json');
    if(!f) f=await findChildByName(s.adminId,'LotKeys Store Config.json');
    if(!f) return false;
    try{
      const blob=await fetchFileBlob(f.id);const data=JSON.parse(await blob.text());
      await setSetting('storeConfigFileId',f.id);
      if(data.storeName!=null) await setSetting('storeName',String(data.storeName||''));if(data.storeCode!=null)await setSetting('storeCode',String(data.storeCode||''));if(Array.isArray(data.userReports))await setSetting('storeUserReports',data.userReports);const topContributors=data.topContributors||{};if(Array.isArray(topContributors.history))await setSetting('monthlyContributionHistory',topContributors.history);if(topContributors.reveal!==undefined)await setSetting('monthlyReveal',topContributors.reveal||null);await setSetting('monthlyRevealSettings',normalizeRevealSettings(topContributors.revealSettings||{}));
      const d=data.directory||{};
      // v0.6 migration: if the old directory-specific name exists but Store Name is blank, promote it.
      if(!String(data.storeName||'').trim() && d.storeName) await setSetting('storeName',String(d.storeName||''));
      if(d.address!=null) await setSetting('directoryStoreAddress',String(d.address||''));
      if(d.directionsUrl!=null) await setSetting('directoryDirectionsUrl',String(d.directionsUrl||''));
      if(d.templateFileId) await setSetting('directoryTemplateFileId',String(d.templateFileId));
      const controls=data.controls||{};
      if(controls.publicShareEnabled!=null) await setSetting('publicShareEnabled',!!controls.publicShareEnabled);
      if(controls.originalListingMandatory!=null) await setSetting('originalListingMandatory',!!controls.originalListingMandatory);
      const branding=data.branding||{};
      if(branding.logoFileId!=null) await setSetting('storeLogoFileId',String(branding.logoFileId||''));
      if(branding.logoUpdatedAt!=null) await setSetting('storeLogoUpdatedAt',String(branding.logoUpdatedAt||''));
      await refreshStoreLogoCache(s,branding).catch(err=>console.warn('Could not refresh Store logo',err));
      if(Array.isArray(data.users)) await setSetting('storeUsers',normalizeStoreUsers(data.users));
      return data;
    }catch(err){console.warn('Could not read LotKeys.json',err);return false;}
  }
  async function syncStoreConfig(existingStructure=null){
    const s=existingStructure||await structure();const c=await config();
    let users=normalizeStoreUsers(await setting('storeUsers',[]));if(!Array.isArray(users))users=[];
    const _mh=await setting('monthlyContributionHistory',[]),monthlyHistory=(Array.isArray(_mh)?_mh:[]).filter(x=>x&&x.monthKey&&Array.isArray(x.standings)).slice().sort((a,b)=>Number(b.monthEnd||0)-Number(a.monthEnd||0)),monthlyReveal=await setting('monthlyReveal',null),revealSettings=normalizeRevealSettings(await setting('monthlyRevealSettings',{}));const data={schemaVersion:11,app:'LotKeys',storeName:c.storeName,storeCode:String(await setting('storeCode','')||''),branding:{logoFileId:await setting('storeLogoFileId',''),logoUpdatedAt:await setting('storeLogoUpdatedAt','')},directory:{address:c.directoryStoreAddress,directionsUrl:c.directoryDirectionsUrl,templateFileId:await setting('directoryTemplateFileId','')},controls:{publicShareEnabled:!!c.publicShareEnabled,originalListingMandatory:!!c.originalListingMandatory},users,userReports:Array.isArray(await setting('storeUserReports',[]))?await setting('storeUserReports',[]):[],topContributors:{history:monthlyHistory,reveal:monthlyReveal||null,revealSettings},updatedAt:new Date().toISOString()};
    let fileId=await setting('storeConfigFileId','');let found=null;
    if(fileId){try{found=await driveGet(fileId,'id,name,webViewLink,appProperties')}catch{fileId='';}}
    if(!fileId){found=await findChildByAppProperty(s.adminId,'lotkeysRole','storeConfig');fileId=found?.id||'';}
    if(!fileId){found=await findChildByName(s.adminId,'LotKeys.json');fileId=found?.id||'';}
    if(!fileId){found=await findChildByName(s.adminId,'LotKeys Store Config.json');fileId=found?.id||'';}
    if(fileId && (!found || found.name!=='LotKeys.json')) await patchMetadata(fileId,{name:'LotKeys.json',appProperties:{lotkeysRole:'storeConfig'}}).catch(()=>{});
    if(fileId){try{const remote=JSON.parse(await (await fetchFileBlob(fileId)).text());if(Array.isArray(remote.users)){const merged=new Map(remote.users.map(u=>[(u.googleSub||String(u.email||'').toLowerCase()||String(u.userName||'').toLowerCase()),u]));for(const u of users)merged.set(u.googleSub||String(u.email||'').toLowerCase()||String(u.userName||'').toLowerCase(),u);users=[...merged.values()];data.users=users;await setSetting('storeUsers',users);}}catch{}}
    const f=await upsertJson({fileId,name:'LotKeys.json',parentId:s.adminId,data,appProperties:{lotkeysRole:'storeConfig'}});
    await setSetting('storeConfigFileId',f.id);try{const publicUsers=users.map(u=>({userName:u.userName,profileDisplayName:u.profileDisplayName||u.userName,profilePhotoFileId:u.profilePhotoFileId||'',profileUpdatedAt:u.profileUpdatedAt||'',tagline:u.tagline||'',favoriteBadge:u.favoriteBadge||'',lotLevel:Number(u.lotLevel)||0,unlockedBadges:Array.isArray(u.unlockedBadges)?u.unlockedBadges:[],profileTheme:u.profileTheme||'system',profileAccent:u.profileAccent||'#2563eb',monthlyPlacement:u.monthlyPlacement||null,celebrationSoundFileId:u.celebrationSoundFileId||'',celebrationSoundName:u.celebrationSoundName||'',celebrationSoundMimeType:u.celebrationSoundMimeType||'',celebrationSoundDuration:Number(u.celebrationSoundDuration)||0,celebrationSoundUpdatedAt:u.celebrationSoundUpdatedAt||'',status:u.status==='disabled'?'disabled':'active'}));const accessData={schemaVersion:4,app:'LotKeys',recordType:'storeAccess',storeName:c.storeName,storeCode:String(await setting('storeCode','')||''),storeFolderId:s.rootId,publicUsers,topContributors:{history:monthlyHistory,reveal:monthlyReveal||null,revealSettings},updatedAt:new Date().toISOString()};let rootAccess=await findChildByAppProperty(s.rootId,'lotkeysRole','storeAccess');if(!rootAccess)rootAccess=await findChildByName(s.rootId,'Store Access.json');await upsertJson({fileId:rootAccess?.id||'',name:'Store Access.json',parentId:s.rootId,data:accessData,appProperties:{lotkeysRole:'storeAccess'}});let userAccess=await findChildByAppProperty(s.usersId,'lotkeysRole','storeAccess');if(!userAccess)userAccess=await findChildByName(s.usersId,'Store Access.json');await upsertJson({fileId:userAccess?.id||'',name:'Store Access.json',parentId:s.usersId,data:accessData,appProperties:{lotkeysRole:'storeAccess'}})}catch(e){console.warn('Could not refresh Store Access.json',e)}return f;
  }

  async function squareStoreLogoBlob(file,size=512){
    if(!file||!String(file.type||'').startsWith('image/'))throw new Error('Please choose a square JPG, PNG or WebP image.');
    const url=URL.createObjectURL(file);
    try{
      const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('LotKeys could not read that Store Logo image.'));im.src=url});
      const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
      if(!w||!h)throw new Error('That Store Logo has no readable dimensions.');
      if(w!==h)throw new Error(`Store Logo must be square (1:1). This image is ${w} × ${h}.`);
      const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
      const ctx=canvas.getContext('2d');ctx.clearRect(0,0,size,size);ctx.drawImage(img,0,0,size,size);
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not prepare Store Logo.')),'image/png'));
      return blob;
    }finally{URL.revokeObjectURL(url)}
  }
  async function refreshStoreLogoCache(existingStructure=null,brandingMeta=null){
    const s=existingStructure||await structure();
    const requested=String(brandingMeta?.logoFileId||await setting('storeLogoFileId','')||'');
    let logo=null;
    if(requested)logo=await driveGet(requested,'id,name,mimeType,webViewLink,appProperties,modifiedTime').catch(()=>null);
    if(!logo)logo=await findChildByAppProperty(s.adminId,'lotkeysRole','storeLogo').catch(()=>null);
    if(!logo)logo=await findChildByName(s.adminId,'Store Logo.png').catch(()=>null);
    if(!logo){
      await setSetting('storeLogoFileId','');await setSetting('storeLogoDataUrl','');await setSetting('storeLogoUpdatedAt','');
      return {custom:false,fileId:'',dataUrl:''};
    }
    const remoteVersion=String(brandingMeta?.logoUpdatedAt||logo.modifiedTime||'');
    const cachedId=await setting('storeLogoFileId',''),cachedVersion=await setting('storeLogoCachedVersion',''),cachedData=await setting('storeLogoDataUrl','');
    let dataUrl=cachedData;
    if(!dataUrl||cachedId!==logo.id||cachedVersion!==remoteVersion){
      const blob=await fetchFileBlob(logo.id);dataUrl=await driveBlobToDataUrl(blob);
      await setSetting('storeLogoDataUrl',dataUrl);await setSetting('storeLogoCachedVersion',remoteVersion);
    }
    await setSetting('storeLogoFileId',logo.id);await setSetting('storeLogoUpdatedAt',remoteVersion||new Date().toISOString());
    return {custom:true,fileId:logo.id,dataUrl,webViewLink:logo.webViewLink||''};
  }
  async function saveStoreLogo(file,existingStructure=null){
    await authorize(false);const s=existingStructure||await structure();const blob=await squareStoreLogoBlob(file,512);
    let logoId=await setting('storeLogoFileId',''),logo=null;
    if(logoId)logo=await driveGet(logoId,'id,name,webViewLink,appProperties').catch(()=>null);
    if(!logo)logo=await findChildByAppProperty(s.adminId,'lotkeysRole','storeLogo').catch(()=>null);
    if(!logo)logo=await findChildByName(s.adminId,'Store Logo.png').catch(()=>null);
    if(logo?.id){logoId=logo.id;await updateTextFile(logoId,blob);await patchMetadata(logoId,{name:'Store Logo.png',appProperties:{lotkeysRole:'storeLogo'}}).catch(()=>{})}
    else{logo=await multipartCreate(blob,{name:'Store Logo.png',parents:[s.adminId],appProperties:{lotkeysRole:'storeLogo'}});logoId=logo.id}
    const dataUrl=await driveBlobToDataUrl(blob),updatedAt=new Date().toISOString();
    await setSetting('storeLogoFileId',logoId);await setSetting('storeLogoDataUrl',dataUrl);await setSetting('storeLogoUpdatedAt',updatedAt);await setSetting('storeLogoCachedVersion',updatedAt);
    await syncStoreConfig(s);
    return {custom:true,fileId:logoId,dataUrl,updatedAt};
  }
  async function removeStoreLogo(existingStructure=null){
    await authorize(false);const s=existingStructure||await structure();let id=await setting('storeLogoFileId','');
    if(!id){const found=await findChildByAppProperty(s.adminId,'lotkeysRole','storeLogo').catch(()=>null)||await findChildByName(s.adminId,'Store Logo.png').catch(()=>null);id=found?.id||''}
    if(id)await trashFile(id).catch(()=>{});
    await setSetting('storeLogoFileId','');await setSetting('storeLogoDataUrl','');await setSetting('storeLogoUpdatedAt','');await setSetting('storeLogoCachedVersion','');
    await syncStoreConfig(s);
    return true;
  }
  function profileHash(value){let h=2166136261;const text=String(value||'');for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
  async function driveBlobToDataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(r.error||new Error('Could not read profile image'));r.readAsDataURL(blob)})}
  async function resizeProfileDataUrl(dataUrl,size=96,quality=.82){if(!dataUrl)return'';const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Could not resize profile image'));im.src=dataUrl});const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,size,size);return canvas.toDataURL('image/jpeg',quality)}
  async function rememberPersonalAccountFolder(folder,parentName=''){if(!folder?.id)return null;await setSetting('personalProfileDriveFolderId',folder.id);await setSetting('personalAccountDriveFolderName',folder.name||'Lot-Keys Account');await setSetting('personalAccountDriveFolderUrl',folder.webViewLink||`https://drive.google.com/drive/folders/${folder.id}`);if(parentName)await setSetting('personalAccountDriveParentName',parentName);return folder}
  async function ensurePersonalProfileRoot({createIfMissing=false,parentId='root',parentName='My Drive'}={}){await authorize(false);let id=await setting('personalProfileDriveFolderId',''),folder=null;if(id)folder=await driveGet(id,'id,name,mimeType,webViewLink,appProperties').catch(()=>null);if(!folder&&parentId==='root')folder=await findChildByAppProperty('root','lotkeysRole','personalAccountRoot',FOLDER_MIME).catch(()=>null);if(!folder&&parentId==='root')folder=await findChildByAppProperty('root','lotkeysRole','personalProfileRoot',FOLDER_MIME).catch(()=>null);if(!folder&&parentId==='root')folder=await findChildByName('root','Lot-Keys Account',FOLDER_MIME).catch(()=>null);if(!folder&&parentId==='root')folder=await findChildByName('root','LotKeys Personal Profile',FOLDER_MIME).catch(()=>null);if(!folder&&createIfMissing)folder=await createFolder('Lot-Keys Account',parentId,{lotkeysRole:'personalAccountRoot'});if(folder)await rememberPersonalAccountFolder(folder,parentName);return folder}
  async function choosePersonalAccountLocation(){const c=await config();if(!c.apiKey)throw new Error('Google API Key is not configured in Garage.');if(!c.projectNumber)throw new Error('Google Cloud Project Number is not configured in Garage.');await authorize(false);await initPicker();return new Promise((resolve,reject)=>{const view=new google.picker.DocsView(google.picker.ViewId.FOLDERS).setSelectFolderEnabled(true);const picker=new google.picker.PickerBuilder().addView(view).setOAuthToken(accessToken).setDeveloperKey(c.apiKey).setAppId(c.projectNumber).setCallback(async data=>{const action=data[google.picker.Response.ACTION];if(action===google.picker.Action.CANCEL)return reject(new Error('Folder selection cancelled.'));if(action!==google.picker.Action.PICKED)return;try{const doc=data[google.picker.Response.DOCUMENTS][0],id=doc[google.picker.Document.ID],selected=await driveGet(id,'id,name,mimeType,webViewLink,appProperties');if(selected.mimeType!==FOLDER_MIME)throw new Error('Please choose a folder.');const role=selected.appProperties?.lotkeysRole||'';let folder=null;if(role==='personalAccountRoot'||role==='personalProfileRoot'||selected.name==='Lot-Keys Account'||selected.name==='LotKeys Personal Profile')folder=selected;if(!folder)folder=await findChildByAppProperty(selected.id,'lotkeysRole','personalAccountRoot',FOLDER_MIME).catch(()=>null);if(!folder)folder=await findChildByAppProperty(selected.id,'lotkeysRole','personalProfileRoot',FOLDER_MIME).catch(()=>null);if(!folder)folder=await findChildByName(selected.id,'Lot-Keys Account',FOLDER_MIME).catch(()=>null);if(!folder)folder=await findChildByName(selected.id,'LotKeys Personal Profile',FOLDER_MIME).catch(()=>null);if(!folder)folder=await createFolder('Lot-Keys Account',selected.id,{lotkeysRole:'personalAccountRoot'});const previous=await setting('personalProfileDriveFolderId','');if(previous!==folder.id){await setSetting('personalProfileDriveFileId','');await setSetting('personalProfilePhotoDriveFileId','');await setSetting('personalProfilePhotoDriveFingerprint','')}await rememberPersonalAccountFolder(folder,selected.id===folder.id?'Selected folder':selected.name||'Google Drive');resolve(folder)}catch(e){reject(e)}}).build();picker.setVisible(true)})}
  async function getPersonalAccountStatus(){let id=await setting('personalProfileDriveFolderId',''),name=await setting('personalAccountDriveFolderName',''),url=await setting('personalAccountDriveFolderUrl',''),parentName=await setting('personalAccountDriveParentName',''),dataFileId=await setting('personalProfileDriveFileId','');if(id&&connected()){const folder=await driveGet(id,'id,name,mimeType,webViewLink,appProperties').catch(()=>null);if(folder){name=folder.name||name;url=folder.webViewLink||url||`https://drive.google.com/drive/folders/${folder.id}`;await rememberPersonalAccountFolder(folder,parentName)}if(dataFileId){const dataFile=await driveGet(dataFileId,'id,name').catch(()=>null);if(!dataFile)dataFileId=''}}return {linked:!!id,id,name:name||'Lot-Keys Account',url,parentName,dataSaved:!!dataFileId,dataFileName:dataFileId?'Account.json':''}}
  async function findPersonalAccountDataFile(folderId){let file=await findChildByAppProperty(folderId,'lotkeysRole','personalAccountData').catch(()=>null);if(!file)file=await findChildByAppProperty(folderId,'lotkeysRole','personalProfileData').catch(()=>null);if(!file)file=await findChildByName(folderId,'Account.json').catch(()=>null);if(!file)file=await findChildByName(folderId,'Profile.json').catch(()=>null);if(file&&(file.name!=='Account.json'||file.appProperties?.lotkeysRole!=='personalAccountData'))await patchMetadata(file.id,{name:'Account.json',appProperties:{lotkeysRole:'personalAccountData'}}).catch(()=>{});return file}
  async function findPersonalAccountPhotoFile(folderId){let file=await findChildByAppProperty(folderId,'lotkeysRole','personalAccountPhoto').catch(()=>null);if(!file)file=await findChildByAppProperty(folderId,'lotkeysRole','personalProfilePhoto').catch(()=>null);if(!file)file=await findChildByName(folderId,'Account Photo.jpg').catch(()=>null);if(!file)file=await findChildByName(folderId,'Profile Photo.jpg').catch(()=>null);if(file&&(file.name!=='Account Photo.jpg'||file.appProperties?.lotkeysRole!=='personalAccountPhoto'))await patchMetadata(file.id,{name:'Account Photo.jpg',appProperties:{lotkeysRole:'personalAccountPhoto'}}).catch(()=>{});return file}
  async function loadPersonalProfile(){if(!connected())return{found:false,applied:false};const folder=await ensurePersonalProfileRoot({createIfMissing:false});if(!folder)return{found:false,applied:false,needsFolder:true};let fileId=await setting('personalProfileDriveFileId',''),file=null;if(fileId)file=await driveGet(fileId,'id,name,webViewLink,appProperties').catch(()=>null);if(!file)file=await findPersonalAccountDataFile(folder.id);if(!file)return{found:false,applied:false};if(file.name!=='Account.json'||file.appProperties?.lotkeysRole!=='personalAccountData')await patchMetadata(file.id,{name:'Account.json',appProperties:{lotkeysRole:'personalAccountData'}}).catch(()=>{});await setSetting('personalProfileDriveFileId',file.id);try{const remote=JSON.parse(await (await fetchFileBlob(file.id)).text()),remoteAt=Date.parse(remote.updatedAt||0)||Number(remote.updatedAt||0)||0,localAt=Number(await setting('personalProfileUpdatedAt',0))||0;if(remoteAt<localAt)return{found:true,applied:false,remote};if(remote.displayName!=null)await setSetting('personalDisplayName',String(remote.displayName||''));if(remote.tagline!=null)await setSetting('personalTagline',String(remote.tagline||''));if(remote.favoriteBadge!=null)await setSetting('favoriteBadge',String(remote.favoriteBadge||''));if(Array.isArray(remote.unlockedBadges))await setSetting('unlockedBadges',remote.unlockedBadges);if(Array.isArray(remote.savedStores))await setSetting('savedStores',remote.savedStores);const remoteTheme=remote.appearance?.theme??remote.theme,remoteAccent=remote.appearance?.accent??remote.accent;if(remoteTheme!=null)await setSetting('personalTheme',String(remoteTheme||'system'));if(remoteAccent!=null)await setSetting('personalAccent',String(remoteAccent||'#2563eb'));if(Array.isArray(remote.descriptionTemplates))await setSetting('descriptionTemplates',remote.descriptionTemplates);if(remote.lastDescriptionTemplateId)await setSetting('lastDescriptionTemplateId',String(remote.lastDescriptionTemplateId));if(Array.isArray(remote.celebrationSounds))await setSetting('personalCelebrationSounds',remote.celebrationSounds);if(remote.selectedCelebrationSoundId!==undefined)await setSetting('selectedCelebrationSoundId',String(remote.selectedCelebrationSoundId||''));if(remote.profilePhotoFileId){const currentId=await setting('personalProfilePhotoDriveFileId','');if(currentId!==remote.profilePhotoFileId||!(await setting('personalProfilePhoto',''))){try{const photoBlob=await fetchFileBlob(remote.profilePhotoFileId),data=await driveBlobToDataUrl(photoBlob);await setSetting('personalProfilePhoto',data);await setSetting('personalProfilePhotoDriveFileId',remote.profilePhotoFileId);await setSetting('personalProfilePhotoDriveFingerprint',profileHash(data))}catch(e){console.warn('Could not restore personal account photo',e)}}}else{await setSetting('personalProfilePhoto','');await setSetting('personalProfilePhotoDriveFileId','');await setSetting('personalProfilePhotoDriveFingerprint','')}await setSetting('personalProfileUpdatedAt',remoteAt||Date.now());return{found:true,applied:true,remote}}catch(err){console.warn('Could not load personal Account.json',err);return{found:true,applied:false}}}
  async function syncPersonalProfile({preferRemote=false}={}){await authorize(false);if(preferRemote){const loaded=await loadPersonalProfile();if(loaded.applied)return loaded.remote}const folder=await ensurePersonalProfileRoot({createIfMissing:false});if(!folder)return false;let accountFileId=await setting('personalProfileDriveFileId',''),accountFile=null;if(accountFileId)accountFile=await driveGet(accountFileId,'id,name,webViewLink,appProperties').catch(()=>null);if(!accountFile)accountFile=await findPersonalAccountDataFile(folder.id);accountFileId=accountFile?.id||'';const photo=await setting('personalProfilePhoto','');let photoFileId=await setting('personalProfilePhotoDriveFileId',''),photoFile=null;if(photoFileId)photoFile=await driveGet(photoFileId,'id,name,webViewLink,appProperties').catch(()=>null);if(!photoFile)photoFile=await findPersonalAccountPhotoFile(folder.id);photoFileId=photoFile?.id||'';if(photo){const fp=profileHash(photo),syncedFp=await setting('personalProfilePhotoDriveFingerprint','');if(!photoFileId||fp!==syncedFp){const blob=await(await fetch(photo)).blob();if(photoFileId)await updateTextFile(photoFileId,blob);else{photoFile=await multipartCreate(blob,{name:'Account Photo.jpg',parents:[folder.id],appProperties:{lotkeysRole:'personalAccountPhoto'}});photoFileId=photoFile.id}if(photoFileId)await patchMetadata(photoFileId,{name:'Account Photo.jpg',appProperties:{lotkeysRole:'personalAccountPhoto'}}).catch(()=>{});await setSetting('personalProfilePhotoDriveFileId',photoFileId);await setSetting('personalProfilePhotoDriveFingerprint',fp)}}else if(photoFileId){await trashFile(photoFileId).catch(()=>{});photoFileId='';await setSetting('personalProfilePhotoDriveFileId','');await setSetting('personalProfilePhotoDriveFingerprint','')}let localAt=Number(await setting('personalProfileUpdatedAt',0))||Date.now();await setSetting('personalProfileUpdatedAt',localAt);const theme=await setting('personalTheme','system'),accent=await setting('personalAccent','#2563eb'),celebrationSounds=Array.isArray(await setting('personalCelebrationSounds',[]))?await setting('personalCelebrationSounds',[]):[],selectedCelebrationSoundId=String(await setting('selectedCelebrationSoundId','')||''),data={schemaVersion:4,app:'LotKeys',recordType:'account',googleAccount:await setting('currentAccountEmail',''),storeUser:await setting('userName',''),displayName:await setting('personalDisplayName',''),tagline:await setting('personalTagline',''),favoriteBadge:await setting('favoriteBadge',''),unlockedBadges:Array.isArray(await setting('unlockedBadges',[]))?await setting('unlockedBadges',[]):[],savedStores:Array.isArray(await setting('savedStores',[]))?await setting('savedStores',[]):[],appearance:{theme,accent},theme,accent,descriptionTemplates:await setting('descriptionTemplates',[]),lastDescriptionTemplateId:await setting('lastDescriptionTemplateId','builtin-marketplace-detailed'),profilePhotoFileId:photoFileId,celebrationSounds,selectedCelebrationSoundId,updatedAt:new Date(localAt).toISOString()};const f=await upsertJson({fileId:accountFileId,name:'Account.json',parentId:folder.id,data,appProperties:{lotkeysRole:'personalAccountData'}});await setSetting('personalProfileDriveFileId',f.id);return data}
  async function ensurePersonalCelebrationFolder(){
    const root=await ensurePersonalProfileRoot({createIfMissing:false});if(!root)throw new Error('Choose your LotKeys Account Storage location before adding a Celebration Sound.');
    return ensureFolder(root.id,'Celebration Sounds','lotkeysRole','personalCelebrationSounds');
  }
  async function uploadPersonalCelebrationSound(file){
    if(!file||!String(file.type||'').startsWith('audio/'))throw new Error('Choose an audio file for your Celebration Sound.');
    const duration=await lotKeysAudioDuration(file);if(!duration)throw new Error('LotKeys could not read that audio clip. Try MP3, M4A, WAV, OGG or WebM audio.');if(duration>=10)throw new Error(`Celebration clips must be under 10 seconds. This clip is ${duration.toFixed(1)} seconds.`);
    await authorize(false);const folder=await ensurePersonalCelebrationFolder(),ext=lotKeysAudioExtension(file.type,file.name),base=String(file.name||'Celebration Sound').replace(/\.[^.]+$/,'').replace(/[^a-z0-9 _-]+/gi,'').trim().slice(0,55)||'Celebration Sound',stamp=new Date().toISOString().replace(/[:.]/g,'-'),name=`${base} - ${stamp}.${ext}`;
    const created=await multipartCreate(file,{name,parents:[folder.id],appProperties:{lotkeysRole:'personalCelebrationSound'}}),meta={fileId:created.id,name:String(file.name||name),driveName:name,mimeType:String(file.type||''),duration:Math.round(duration*100)/100,uploadedAt:new Date().toISOString()};
    let library=await setting('personalCelebrationSounds',[]);if(!Array.isArray(library))library=[];library=[...library.filter(x=>x&&x.fileId!==meta.fileId),meta];await setSetting('personalCelebrationSounds',library);await setSetting('selectedCelebrationSoundId',meta.fileId);await setSetting('personalProfileUpdatedAt',Date.now());await syncPersonalProfile();await syncStoreCelebrationSound().catch(e=>console.warn('Could not copy Celebration Sound to Store profile',e));return meta;
  }
  async function selectPersonalCelebrationSound(fileId=''){
    fileId=String(fileId||'');let library=await setting('personalCelebrationSounds',[]);if(!Array.isArray(library))library=[];if(fileId&&!library.some(x=>String(x?.fileId||'')===fileId))throw new Error('That Celebration Sound is no longer in your personal sound library.');
    if(fileId)await driveGet(fileId,'id,name,mimeType').catch(()=>{throw new Error('That Celebration Sound could not be found in Google Drive.')});await setSetting('selectedCelebrationSoundId',fileId);await setSetting('personalProfileUpdatedAt',Date.now());await syncPersonalProfile();await syncStoreCelebrationSound().catch(e=>console.warn('Celebration Sound selected; Store copy will sync when Store connection is ready',e));return fileId;
  }
  async function syncStoreCelebrationSound(existingStructure=null){
    await authorize(false);let s=existingStructure||await structure();if(!s?.userId)s=await ensureStoreStructure();if(!s?.userId)throw new Error('LotKeys could not locate your Store user folder.');
    let library=await setting('personalCelebrationSounds',[]);if(!Array.isArray(library))library=[];const selectedId=String(await setting('selectedCelebrationSoundId','')||''),selected=library.find(x=>String(x?.fileId||'')===selectedId)||null;
    let storeFile=await findChildByAppProperty(s.userId,'lotkeysRole','userCelebrationSound').catch(()=>null);if(!storeFile)storeFile=await findChildByName(s.userId,'Celebration Sound.mp3').catch(()=>null);let storeFileId=storeFile?.id||'',storeMeta={fileId:'',name:'',mimeType:'',duration:0,updatedAt:''};
    if(selected){const blob=await fetchFileBlob(selected.fileId),ext=lotKeysAudioExtension(selected.mimeType||blob.type,selected.name),name=`Celebration Sound.${ext}`;if(storeFileId){await updateTextFile(storeFileId,blob);await patchMetadata(storeFileId,{name,appProperties:{lotkeysRole:'userCelebrationSound',lotkeysUserName:s.userName}}).catch(()=>{})}else{storeFile=await multipartCreate(blob,{name,parents:[s.userId],appProperties:{lotkeysRole:'userCelebrationSound',lotkeysUserName:s.userName}});storeFileId=storeFile.id}storeMeta={fileId:storeFileId,name:String(selected.name||name),mimeType:String(selected.mimeType||blob.type||''),duration:Number(selected.duration)||0,updatedAt:new Date().toISOString()}}else if(storeFileId){await trashFile(storeFileId).catch(()=>{});storeFileId=''}
    let users=normalizeStoreUsers(await setting('storeUsers',[]));const idx=users.findIndex(u=>String(u.userName||'').toLowerCase()===String(s.userName||'').toLowerCase());if(idx>=0){users[idx]=normalizeUserAccount({...users[idx],celebrationSoundFileId:storeMeta.fileId,celebrationSoundName:storeMeta.name,celebrationSoundMimeType:storeMeta.mimeType,celebrationSoundDuration:storeMeta.duration,celebrationSoundUpdatedAt:storeMeta.updatedAt});await setSetting('storeUsers',users);await syncStoreConfig(s).catch(console.warn);await syncStoreProfileThumbnail(s).catch(console.warn)}return storeMeta;
  }
  async function saveStoreRevealAudio(kind,file){
    if(Number(await setting('currentUserAdminLevel',0))<2)throw new Error('Admin Level 2 is required to change Monthly Reveal audio.');if(!file||!String(file.type||'').startsWith('audio/'))throw new Error('Choose an audio file.');
    const duration=await lotKeysAudioDuration(file),s=await structure(),folder=await ensureFolder(s.rootId,'Reveal Audio','lotkeysRole','revealAudio'),isBuild=kind==='buildUp',label=isBuild?'Build Up Soundtrack':'Reveal Sound',ext=lotKeysAudioExtension(file.type,file.name),name=`${label}.${ext}`,role=isBuild?'revealBuildUpSound':'revealPodiumSound';
    let current=await findChildByAppProperty(folder.id,'lotkeysRole',role).catch(()=>null);if(current){await updateTextFile(current.id,file);await patchMetadata(current.id,{name,appProperties:{lotkeysRole:role,lotkeysRevealAudioKind:isBuild?'buildUp':'reveal'}}).catch(()=>{})}else current=await multipartCreate(file,{name,parents:[folder.id],appProperties:{lotkeysRole:role,lotkeysRevealAudioKind:isBuild?'buildUp':'reveal'}});
    const meta={fileId:current.id,name:String(file.name||name),mimeType:String(file.type||''),duration:Math.round((Number(duration)||0)*100)/100,updatedAt:new Date().toISOString()},settings=normalizeRevealSettings(await setting('monthlyRevealSettings',{}));if(isBuild)settings.buildUpSound=meta;else settings.revealSound=meta;settings.updatedAt=new Date().toISOString();await setSetting('monthlyRevealSettings',settings);await syncStoreConfig(s);return meta;
  }
  async function clearStoreRevealAudio(kind){
    if(Number(await setting('currentUserAdminLevel',0))<2)throw new Error('Admin Level 2 is required to change Monthly Reveal audio.');const settings=normalizeRevealSettings(await setting('monthlyRevealSettings',{})),target=kind==='buildUp'?settings.buildUpSound:settings.revealSound,fileId=String(target?.fileId||'');if(fileId)await trashFile(fileId).catch(()=>{});if(kind==='buildUp')settings.buildUpSound={fileId:'',name:'',mimeType:'',duration:0,updatedAt:''};else settings.revealSound={fileId:'',name:'',mimeType:'',duration:0,updatedAt:''};settings.updatedAt=new Date().toISOString();await setSetting('monthlyRevealSettings',settings);await syncStoreConfig();return settings;
  }
  async function syncStoreProfileThumbnail(existingStructure=null){await authorize(false);let s=existingStructure||await structure();if(!s?.userId)s=await ensureStoreStructure();if(!s?.userId)throw new Error('LotKeys could not locate your Store user folder for the profile thumbnail.');const photo=await setting('personalProfilePhoto',''),displayName=await setting('personalDisplayName',s.userName||''),accountEmail=await setting('currentAccountEmail',''),tagline=await setting('personalTagline',''),favoriteBadge=await setting('favoriteBadge',''),profileTheme=await setting('personalTheme','system'),profileAccent=await setting('personalAccent','#2563eb'),unlockedBadges=Array.isArray(await setting('unlockedBadges',[]))?await setting('unlockedBadges',[]):[];let thumb=await findChildByAppProperty(s.userId,'lotkeysRole','userProfileThumbnail').catch(()=>null);if(!thumb)thumb=await findChildByName(s.userId,'Profile Thumbnail.jpg').catch(()=>null);let thumbId=thumb?.id||'';if(photo){const data=await resizeProfileDataUrl(photo,96,.8),blob=await(await fetch(data)).blob();if(thumbId)await updateTextFile(thumbId,blob);else{thumb=await multipartCreate(blob,{name:'Profile Thumbnail.jpg',parents:[s.userId],appProperties:{lotkeysRole:'userProfileThumbnail',lotkeysUserName:s.userName}});thumbId=thumb.id}}else if(thumbId){await trashFile(thumbId).catch(()=>{});thumbId=''}let users=await setting('storeUsers',[]);if(!Array.isArray(users))users=[];const idx=users.findIndex(u=>String(u.userName||'').toLowerCase()===String(s.userName||'').toLowerCase()||(accountEmail&&String(u.email||'').toLowerCase()===String(accountEmail).toLowerCase()));if(idx>=0){users[idx]=normalizeUserAccount({...users[idx],profileDisplayName:displayName||s.userName,profilePhotoFileId:thumbId,profileUpdatedAt:new Date().toISOString(),tagline,favoriteBadge,profileTheme,profileAccent,unlockedBadges,lotLevel:Number(users[idx].lotLevel)||0});await setSetting('storeUsers',users);await syncStoreConfig(s).catch(e=>console.warn('Could not update Store public profile registry',e))}let profileFile=await findChildByAppProperty(s.userId,'lotkeysRole','userPublicProfile').catch(()=>null);if(!profileFile)profileFile=await findChildByName(s.userId,'PublicProfile.json').catch(()=>null);const publicProfile={schemaVersion:2,app:'LotKeys',recordType:'publicUserProfile',userName:s.userName,displayName:displayName||s.userName,tagline,favoriteBadge,lotLevel:Number(users[idx]?.lotLevel)||0,unlockedBadges,appearance:{theme:profileTheme,accent:profileAccent},profilePhotoFileId:thumbId,monthlyPlacement:users[idx]?.monthlyPlacement||null,celebrationSoundFileId:users[idx]?.celebrationSoundFileId||'',celebrationSoundName:users[idx]?.celebrationSoundName||'',celebrationSoundMimeType:users[idx]?.celebrationSoundMimeType||'',celebrationSoundDuration:Number(users[idx]?.celebrationSoundDuration)||0,celebrationSoundUpdatedAt:users[idx]?.celebrationSoundUpdatedAt||'',updatedAt:new Date().toISOString()};await upsertJson({fileId:profileFile?.id||'',name:'PublicProfile.json',parentId:s.userId,data:publicProfile,appProperties:{lotkeysRole:'userPublicProfile',lotkeysUserName:s.userName}}).catch(e=>console.warn('Could not update PublicProfile.json',e));return thumbId}

  async function createSpreadsheet(parentId,vehicleId){
    const found=await findChildByAppProperty(parentId,'lotkeysVehicleSheet',vehicleId,SHEET_MIME);
    if(found) return found;
    return createMetadata({name:'Vehicle Data - Administrative',mimeType:SHEET_MIME,parents:[parentId],appProperties:{lotkeysVehicleSheet:vehicleId}},'id,name,mimeType,webViewLink,appProperties');
  }
  async function writeVehicleSheet(sheetId,v){
    const d=v.drive||{};
    const values=[
      ['Field','Value'],
      ['Profile Name',v.name||''],['Year',v.year||''],['Make',v.make||''],['Model',v.model||''],['Body Style',v.bodyStyle||''],['Exterior Color',v.exteriorColor||''],['Interior Color',v.interiorColor||''],['Vehicle Condition',v.vehicleCondition||''],['Fuel Type',v.fuelType||''],['Price',v.price??''],
      ['Odometer',v.odometer??''],['Odometer Unit',v.odometerUnit||''],['VIN #',v.vin||''],['STK #',v.stock||''],
      ['Photos Folder',d.photosFolderId?`https://drive.google.com/drive/folders/${d.photosFolderId}`:''],
      ['Videos Folder',d.videosFolderId?`https://drive.google.com/drive/folders/${d.videosFolderId}`:''],
      ['Documents Folder',d.documentsFolderId?`https://drive.google.com/drive/folders/${d.documentsFolderId}`:''],
      ['Shared Folder',d.sharedFolderId?`https://drive.google.com/drive/folders/${d.sharedFolderId}`:''],
      ['Vehicle Info Directory',d.directoryPdfUrl||''],
      ['Original Vehicle Listing URL',v.originalListingUrl||''],['CARFAX URL',v.carfaxUrl||''],
      ['CARFAX - One Owner',v.carfaxOneOwner?'TRUE':'FALSE'],['CARFAX - Low Odometer',v.carfaxLowKm?'TRUE':'FALSE'],['CARFAX - No Accidents',v.carfaxNoAccidents?'TRUE':'FALSE'],
      ['Description',v.description||''],['Profile ID',v.id],['Created By User',v.createdByUserName||''],['Created By Email',v.createdByEmail||''],['Created At',v.createdAt?new Date(v.createdAt).toISOString():''],['Deletion Requests JSON',JSON.stringify(Array.isArray(v.deletionRequests)?v.deletionRequests:[])],['Price Change Requests JSON',JSON.stringify(Array.isArray(v.priceChangeRequests)?v.priceChangeRequests:[])],['Price Change Awards JSON',JSON.stringify(Array.isArray(v.priceChangeAwards)?v.priceChangeAwards:[])],['Website Price Finding JSON',JSON.stringify(v.websitePriceFinding||null)],['Cover Photo File ID',v.photos?.[0]?.driveFileId||''],['Updated',new Date().toISOString()]
    ];
    return apiFetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/A1:B${values.length}?valueInputOption=RAW`,{
      method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({majorDimension:'ROWS',values})
    });
  }
  async function readSheetValues(sheetId,range='A1:B40'){
    const r=await apiFetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}`);
    return r.values||[];
  }
  function folderIdFromUrl(url){const m=String(url||'').match(/\/folders\/([a-zA-Z0-9_-]+)/);return m?m[1]:'';}
  function boolCell(v){return String(v||'').trim().toUpperCase()==='TRUE';}
  function jsonCell(v,def=[]){try{const parsed=JSON.parse(String(v||''));return parsed==null?def:parsed}catch{return def}}
  function vehicleFromSheetRows(rows,profile){
    const map=new Map((rows||[]).slice(1).map(r=>[String(r?.[0]||'').trim(),r?.[1]??'']));
    const id=String(map.get('Profile ID')||profile?.appProperties?.lotkeysVehicleId||`DRV-${profile.id}`);
    const v={id,name:String(map.get('Profile Name')||profile?.name||''),year:String(map.get('Year')||''),make:String(map.get('Make')||''),model:String(map.get('Model')||''),bodyStyle:String(map.get('Body Style')||''),exteriorColor:String(map.get('Exterior Color')||''),interiorColor:String(map.get('Interior Color')||''),vehicleCondition:String(map.get('Vehicle Condition')||''),fuelType:String(map.get('Fuel Type')||''),price:map.get('Price')===''?'':Number(map.get('Price')||0),odometer:map.get('Odometer')===''?'':Number(map.get('Odometer')||0),odometerUnit:String(map.get('Odometer Unit')||'KM'),vin:String(map.get('VIN #')||''),stock:String(map.get('STK #')||''),description:String(map.get('Description')||''),originalListingUrl:String(map.get('Original Vehicle Listing URL')||''),carfaxUrl:String(map.get('CARFAX URL')||''),carfaxOneOwner:boolCell(map.get('CARFAX - One Owner')),carfaxLowKm:boolCell(map.get('CARFAX - Low Odometer')),carfaxNoAccidents:boolCell(map.get('CARFAX - No Accidents')),createdByUserName:String(map.get('Created By User')||''),createdByEmail:String(map.get('Created By Email')||''),createdAt:Date.parse(map.get('Created At'))||0,deletionRequests:Array.isArray(jsonCell(map.get('Deletion Requests JSON'),[]))?jsonCell(map.get('Deletion Requests JSON'),[]):[],priceChangeRequests:Array.isArray(jsonCell(map.get('Price Change Requests JSON'),[]))?jsonCell(map.get('Price Change Requests JSON'),[]):[],priceChangeAwards:Array.isArray(jsonCell(map.get('Price Change Awards JSON'),[]))?jsonCell(map.get('Price Change Awards JSON'),[]):[],websitePriceFinding:jsonCell(map.get('Website Price Finding JSON'),null),syncStatus:'synced',drive:{profileFolderId:profile.id,adminSheetId:'',photosFolderId:folderIdFromUrl(map.get('Photos Folder')),videosFolderId:folderIdFromUrl(map.get('Videos Folder')),documentsFolderId:folderIdFromUrl(map.get('Documents Folder')),sharedFolderId:folderIdFromUrl(map.get('Shared Folder')),directoryPdfUrl:String(map.get('Vehicle Info Directory')||''),coverPhotoFileId:String(map.get('Cover Photo File ID')||'')},updatedAt:Date.parse(map.get('Updated'))||Date.now()};
    v.sharedFolderUrl=v.drive.sharedFolderId?`https://drive.google.com/drive/folders/${v.drive.sharedFolderId}`:'';return v;
  }
  async function findInventoryIndex(s){
    const cached=String(await setting('inventoryIndexFileId','')||'');if(cached){const f=await driveGet(cached,'id,name,mimeType,webViewLink,appProperties,modifiedTime').catch(()=>null);if(f)return f}
    let f=await findChildByAppProperty(s.adminId,'lotkeysRole','inventoryIndex');if(!f)f=await findChildByName(s.adminId,'Inventory Index.json');if(f)await setSetting('inventoryIndexFileId',f.id);return f;
  }
  async function readInventoryIndex(s){
    const f=await findInventoryIndex(s);if(!f)return {file:null,entries:[]};
    try{const data=JSON.parse(await (await fetchFileBlob(f.id)).text());return {file:f,entries:Array.isArray(data.vehicles)?data.vehicles:[]};}catch{return {file:f,entries:[]};}
  }
  function indexEntry(v){const d=v.drive||{};return {id:v.id,name:v.name||buildVehicleProfileName(v),year:v.year||'',make:v.make||'',model:v.model||'',bodyStyle:v.bodyStyle||'',exteriorColor:v.exteriorColor||'',interiorColor:v.interiorColor||'',vehicleCondition:v.vehicleCondition||'',fuelType:v.fuelType||'',price:v.price??'',odometer:v.odometer??'',odometerUnit:v.odometerUnit||'KM',vin:v.vin||'',stock:v.stock||'',description:v.description||'',originalListingUrl:v.originalListingUrl||'',carfaxUrl:v.carfaxUrl||'',carfaxOneOwner:!!v.carfaxOneOwner,carfaxLowKm:!!v.carfaxLowKm,carfaxNoAccidents:!!v.carfaxNoAccidents,createdByUserName:v.createdByUserName||'',createdByEmail:v.createdByEmail||'',createdAt:v.createdAt||0,deletionRequests:Array.isArray(v.deletionRequests)?v.deletionRequests:[],priceChangeRequests:Array.isArray(v.priceChangeRequests)?v.priceChangeRequests:[],priceChangeAwards:Array.isArray(v.priceChangeAwards)?v.priceChangeAwards:[],websitePriceFinding:v.websitePriceFinding||null,updatedAt:v.updatedAt||Date.now(),drive:{profileFolderId:d.profileFolderId||'',adminSheetId:d.adminSheetId||'',sharedFolderId:d.sharedFolderId||'',photosFolderId:d.photosFolderId||'',videosFolderId:d.videosFolderId||'',documentsFolderId:d.documentsFolderId||'',directoryPdfId:d.directoryPdfId||'',directoryPdfUrl:d.directoryPdfUrl||'',coverPhotoFileId:v.photos?.[0]?.driveFileId||d.coverPhotoFileId||''}};}
  function inventoryIndexSignature(entries=[]){return [...(entries||[])].map(e=>`${e?.id||''}:${Number(e?.updatedAt)||0}:${e?.drive?.profileFolderId||''}`).sort().join('|')}
  function listingsIndexSignature(entries=[]){return [...(entries||[])].map(e=>`${e?.listingId||''}:${Number(e?.updatedAt)||0}:${e?.driveFileId||''}`).sort().join('|')}
  async function writeInventoryIndex(entries,s,fileId=''){
    const data={schemaVersion:1,app:'LotKeys',vehicles:entries,updatedAt:new Date().toISOString()};
    const f=await upsertJson({fileId,name:'Inventory Index.json',parentId:s.adminId,data,appProperties:{lotkeysRole:'inventoryIndex'}});await setSetting('inventoryIndexFileId',f.id);return f;
  }
  async function updateInventoryIndex(v,s=null){
    s=s||await structure();const cur=await readInventoryIndex(s);let entries=cur.entries.filter(x=>x?.id!==v.id);entries.push(indexEntry(v));await writeInventoryIndex(entries,s,cur.file?.id||'');
  }
  async function removeInventoryIndexEntry(vehicleId,s=null){
    s=s||await structure();const cur=await readInventoryIndex(s);if(!cur.file)return;const entries=cur.entries.filter(x=>x?.id!==vehicleId);await writeInventoryIndex(entries,s,cur.file.id);
  }
  async function scanVehicleProfile(profile){
    let sheet=await findChildByAppProperty(profile.id,'lotkeysVehicleSheet',profile.appProperties?.lotkeysVehicleId||'',SHEET_MIME);
    if(!sheet)sheet=await findChildByName(profile.id,'Vehicle Data - Administrative',SHEET_MIME);if(!sheet)return null;
    const rows=await readSheetValues(sheet.id);const v=vehicleFromSheetRows(rows,profile);v.drive.adminSheetId=sheet.id;v.drive.adminSheetUrl=sheet.webViewLink||`https://docs.google.com/spreadsheets/d/${sheet.id}/edit`;return v;
  }
  async function refreshInventoryFromDrive({quiet=true,forceFull=false}={}){
    const s=await structure();await loadStoreConfig(s).catch(()=>false);const profiles=await listFiles(`'${qEscape(s.inventoryId)}' in parents and mimeType = '${qEscape(FOLDER_MIME)}' and trashed = false`,'files(id,name,mimeType,webViewLink,appProperties,modifiedTime)');
    const profileIds=new Set(profiles.map(x=>x.id));let cur=await readInventoryIndex(s);let entries=cur.entries||[];
    const knownFolders=new Set(entries.map(x=>x?.drive?.profileFolderId).filter(Boolean));const missing=profiles.filter(p=>forceFull||!knownFolders.has(p.id));
    if(forceFull)entries=[];
    const chunks=[];for(let i=0;i<missing.length;i+=6)chunks.push(missing.slice(i,i+6));
    for(const chunk of chunks){const found=(await Promise.all(chunk.map(p=>scanVehicleProfile(p).catch(()=>null)))).filter(Boolean);for(const v of found){entries=entries.filter(x=>x.id!==v.id&&x?.drive?.profileFolderId!==v.drive.profileFolderId);entries.push(indexEntry(v));}}
    entries=entries.filter(x=>profileIds.has(x?.drive?.profileFolderId));
    if(!cur.file||missing.length||forceFull||entries.length!==cur.entries.length){cur.file=await writeInventoryIndex(entries,s,cur.file?.id||'');}
    const existing=await DB.all('vehicles');const byId=new Map(existing.map(v=>[v.id,v]));
    for(const e of entries){const local=byId.get(e.id)||{};if(['pending','syncing'].includes(local.syncStatus))continue;const v={...local,...e,drive:{...(local.drive||{}),...(e.drive||{})},syncStatus:'synced'};v.sharedFolderUrl=v.drive.sharedFolderId?`https://drive.google.com/drive/folders/${v.drive.sharedFolderId}`:'';
      if(v.drive.coverPhotoFileId){const prev=(local.photos||[]).find(p=>p.driveFileId===v.drive.coverPhotoFileId);if(prev?.blob)v.photos=[prev,...(local.photos||[]).filter(p=>p!==prev)];else{try{const blob=await fetchFileBlob(v.drive.coverPhotoFileId);v.photos=[{id:`DRV-${v.drive.coverPhotoFileId}`,name:'Cover photo',type:blob.type||'image/jpeg',blob,driveFileId:v.drive.coverPhotoFileId}];}catch{v.photos=local.photos||[];}}}
      await DB.put('vehicles',v);
    }
    for(const local of existing){if(local.drive?.profileFolderId && !entries.some(e=>e.id===local.id) && !['local','pending','syncing','error'].includes(local.syncStatus))await DB.del('vehicles',local.id);}
    await setSetting('lastInventoryIndexSignature',inventoryIndexSignature(entries));await setSetting('lastInventoryRefreshAt',Date.now());if(!quiet)await setSetting('lastManualInventoryRefreshAt',Date.now());return entries.length;
  }
  async function quickRefreshInventoryFromDrive({quiet=true}={}){const s=await structure();const cur=await readInventoryIndex(s);if(!cur.file)return refreshInventoryFromDrive({quiet,forceFull:false});const sig=inventoryIndexSignature(cur.entries||[]),last=String(await setting('lastInventoryIndexSignature','')||'');if(last&&sig===last){await setSetting('lastInventoryRefreshAt',Date.now());if(!quiet)await setSetting('lastManualInventoryRefreshAt',Date.now());return (cur.entries||[]).length}return refreshInventoryFromDrive({quiet,forceFull:false})}
  async function hydrateVehicleAssets(v){
    if(!v?.drive?.profileFolderId)return v;const profile=await driveGet(v.drive.profileFolderId,'id,name,mimeType,webViewLink,appProperties').catch(()=>null);if(!profile)return v;
    const fresh=await scanVehicleProfile(profile).catch(()=>null);if(fresh){const keep={photos:v.photos||[],attachments:v.attachments||[],videos:v.videos||[]},keepDrive={...(v.drive||{})};Object.assign(v,fresh);v.drive={...keepDrive,...(fresh.drive||{})};v.photos=keep.photos;v.attachments=keep.attachments;v.videos=keep.videos;}
    async function load(folderId,kind,old=[]){if(!folderId)return[];const fs=await listFiles(`'${qEscape(folderId)}' in parents and trashed = false`,'files(id,name,mimeType,webViewLink,appProperties,modifiedTime)');fs.sort((a,b)=>String(a.name).localeCompare(String(b.name),undefined,{numeric:true}));const oldMap=new Map((old||[]).filter(x=>x.driveFileId).map(x=>[x.driveFileId,x]));return fs.map(f=>{const prev=oldMap.get(f.id)||{};const displayName=kind==='photo'?stripPhotoOrderPrefix(f.name):f.name;return {...prev,id:f.appProperties?.lotkeysAssetId||prev.id||`DRV-${f.id}`,name:displayName,driveName:f.name,type:f.mimeType||prev.type||'',driveFileId:f.id,webViewLink:f.webViewLink||`https://drive.google.com/file/d/${f.id}/view`};});}
    v.photos=await load(v.drive.photosFolderId,'photo',v.photos);v.attachments=await load(v.drive.documentsFolderId,'document',v.attachments);v.videos=await load(v.drive.videosFolderId,'video',v.videos);
    const missing=v.photos.filter(p=>!p.blob&&p.driveFileId);await Promise.allSettled(missing.map(async p=>{p.blob=await fetchFileBlob(p.driveFileId);p.type=p.blob.type||p.type;}));await DB.put('vehicles',v);return v;
  }
  async function findListingsIndex(s){
    const cached=String(await setting('listingsIndexFileId','')||'');if(cached){const f=await driveGet(cached,'id,name,mimeType,webViewLink,appProperties,modifiedTime').catch(()=>null);if(f)return f}
    let f=await findChildByAppProperty(s.listingsId,'lotkeysRole','userListingsIndex');if(!f)f=await findChildByName(s.listingsId,'Listings Index.json');if(f)await setSetting('listingsIndexFileId',f.id);return f;
  }
  async function readListingsIndex(s){
    const f=await findListingsIndex(s);if(!f)return {file:null,entries:[]};
    try{const data=JSON.parse(await (await fetchFileBlob(f.id)).text());return {file:f,entries:Array.isArray(data.listings)?data.listings:[]};}catch{return {file:f,entries:[]};}
  }
  async function writeListingsIndex(entries,s,fileId=''){
    const data={schemaVersion:1,app:'LotKeys',userName:s.userName,listings:entries,updatedAt:new Date().toISOString()};
    const f=await upsertJson({fileId,name:'Listings Index.json',parentId:s.listingsId,data,appProperties:{lotkeysRole:'userListingsIndex',lotkeysUserName:s.userName}});await setSetting('listingsIndexFileId',f.id);return f;
  }
  function listingIndexEntry(data,fileId=''){return {...data,driveFileId:fileId||data.driveFileId||''};}
  async function updateListingsIndex(data,fileId,s=null){
    s=s||await structure();const cur=await readListingsIndex(s);let entries=cur.entries.filter(x=>x?.listingId!==data.listingId);entries.push(listingIndexEntry(data,fileId));await writeListingsIndex(entries,s,cur.file?.id||'');
  }
  async function removeListingsIndexEntry(listingId,s=null){
    s=s||await structure();const cur=await readListingsIndex(s);if(!cur.file)return;const next=cur.entries.filter(x=>String(x?.listingId||'')!==String(listingId||''));if(next.length===cur.entries.length)return;await writeListingsIndex(next,s,cur.file.id);
  }
  function remoteListingToLocal(data,fileId='',locations=[]){
    const snap=data?.location&&typeof data.location==='object'?data.location:null;
    const loc=snap?(locations.find(x=>x.id===snap.id)||locations.find(x=>String(x.name||'').toLowerCase()===String(snap.name||'').toLowerCase())):null;
    return {id:String(data.listingId||`DRV-${fileId}`),ownerUserName:String(data.userName||''),vehicleId:String(data.vehicleId||''),marketplaceTitle:String(data.marketplaceTitle||''),year:String(data.year||''),make:String(data.make||''),model:String(data.model||''),bodyStyle:String(data.bodyStyle||''),exteriorColor:String(data.exteriorColor||''),interiorColor:String(data.interiorColor||''),vehicleCondition:String(data.vehicleCondition||''),fuelType:String(data.fuelType||''),price:data.price===''?'':Number(data.price||0),odometer:data.odometer===''?'':Number(data.odometer||0),odometerUnit:String(data.odometerUnit||'KM'),description:String(data.marketplaceDescription||''),locationId:loc?.id||'',locationSnapshot:snap,status:String(data.status||'Draft'),facebookUrl:String(data.facebookUrl||''),carfaxOneOwner:data.carfaxOneOwner===true,carfaxLowKm:data.carfaxLowKm===true,carfaxNoAccidents:data.carfaxNoAccidents===true,priceAlert:data.priceAlert||null,photoOrder:Array.isArray(data.photoOrder)?data.photoOrder:[],photoOrderCustomized:data.photoOrderCustomized===true,listingAssets:Array.isArray(data.listingAssets)?data.listingAssets:[],createdAt:data.createdAt||null,postedAt:data.postedAt||null,lastPreparedAt:data.lastPreparedAt||null,updatedAt:Number(data.updatedAt||Date.now()),driveFileId:fileId||data.driveFileId||'',syncStatus:'synced',syncError:'',lastDriveSyncAt:Date.now()};
  }
  function listingEntryTime(e){return Number(e?.updatedAt)||Date.parse(e?.syncedAt||'')||Date.parse(e?._driveModifiedTime||'')||Number(e?.createdAt)||0;}
  function listingLocationSignature(e){const l=e?.location&&typeof e.location==='object'?e.location:null;return String(l?.postalCode||l?.name||l?.id||'').trim().toLowerCase();}
  function legacyDraftKey(e){
    if(String(e?.status||'Draft').toLowerCase()!=='draft'||e?.facebookUrl||listingLocationSignature(e))return '';
    const vehicle=String(e?.vehicleId||'').trim();if(vehicle)return `vehicle:${vehicle}`;
    const stock=String(e?.stock||'').trim().toLowerCase();if(stock)return `stock:${stock}`;
    return `manual:${[e?.year,e?.make,e?.model,e?.marketplaceTitle].map(x=>String(x||'').trim().toLowerCase()).join('|')}`;
  }
  function dedupeListingEntries(entries){
    const sorted=[...(entries||[])].sort((a,b)=>listingEntryTime(b)-listingEntryTime(a));
    const kept=[],stale=[],seenIds=new Set(),seenUrls=new Set(),seenDraftKeys=new Set();
    for(const e of sorted){
      const id=String(e?.listingId||'').trim();const url=String(e?.facebookUrl||'').trim().toLowerCase();const draftKey=legacyDraftKey(e);const schema=Number(e?.schemaVersion||0);
      if(id&&seenIds.has(id)){stale.push(e);continue;}
      if(url&&seenUrls.has(url)){stale.push(e);continue;}
      // v0.7.1 intentionally discovered every historical listing JSON. Collapse only the old,
      // no-location/no-Facebook draft copies so real location-specific or posted listings survive.
      if(draftKey&&schema<=4&&seenDraftKeys.has(draftKey)){stale.push(e);continue;}
      kept.push(e);if(id)seenIds.add(id);if(url)seenUrls.add(url);if(draftKey)seenDraftKeys.add(draftKey);
    }
    return {kept,stale};
  }
  async function refreshUserListingsFromDrive({quiet=true,forceFull=false}={}){
    const s=await structure();const c=await config();
    // Finish any prior deletion first, then keep tombstoned listings hidden even if Drive is slow.
    await processListingDeleteTombstones(s).catch(err=>console.warn('Listing deletion cleanup deferred',err));
    const tombstones=await getListingDeleteTombstones(),deletedIds=new Set(Object.keys(tombstones)),deletedDriveIds=new Set(Object.values(tombstones).map(t=>String(t?.driveFileId||'')).filter(Boolean));
    const files=(await listFiles(`'${qEscape(s.listingsId)}' in parents and trashed = false`,'files(id,name,mimeType,webViewLink,appProperties,modifiedTime)')).filter(f=>(f.appProperties?.lotkeysRole==='marketplaceListing'||(/\.json$/i.test(f.name||'')&&f.name!=='Listings Index.json'))&&!deletedDriveIds.has(String(f.id))&&!deletedIds.has(String(f.appProperties?.lotkeysListingId||'')));
    const fileIds=new Set(files.map(f=>f.id));let cur=await readListingsIndex(s);let entries=(cur.entries||[]).filter(e=>!deletedIds.has(String(e?.listingId||''))&&!deletedDriveIds.has(String(e?.driveFileId||''))&&(!e.driveFileId||fileIds.has(e.driveFileId)));
    const known=new Set(entries.map(e=>e.driveFileId).filter(Boolean));const toRead=files.filter(f=>forceFull||!known.has(f.id));if(forceFull)entries=[];
    for(let i=0;i<toRead.length;i+=8){const chunk=toRead.slice(i,i+8);const found=(await Promise.all(chunk.map(async f=>{try{const data=JSON.parse(await (await fetchFileBlob(f.id)).text());if(data.userName&&c.userName&&String(data.userName).toLowerCase()!==String(c.userName).toLowerCase())return null;return {...listingIndexEntry(data,f.id),_driveModifiedTime:f.modifiedTime||''};}catch{return null;}}))).filter(e=>e&&!deletedIds.has(String(e.listingId||''))&&!deletedDriveIds.has(String(e.driveFileId||'')));for(const e of found){entries=entries.filter(x=>x.listingId!==e.listingId&&x.driveFileId!==e.driveFileId);entries.push(e);}}
    const deduped=dedupeListingEntries(entries);entries=deduped.kept;
    if(deduped.stale.length){await Promise.allSettled(deduped.stale.map(e=>e.driveFileId?trashFile(e.driveFileId):Promise.resolve()));for(const e of deduped.stale){if(e.listingId)await DB.del('listings',String(e.listingId)).catch(()=>{});}}
    const changed=!cur.file||toRead.length||forceFull||deduped.stale.length||entries.length!==(cur.entries||[]).length;if(changed)cur.file=await writeListingsIndex(entries,s,cur.file?.id||'');
    const locations=(await DB.all('locations')).filter(x=>!x.ownerUserName||x.ownerUserName===c.userName);const existing=(await DB.all('listings')).filter(x=>!x.ownerUserName||x.ownerUserName===c.userName);const byId=new Map(existing.map(x=>[x.id,x]));
    for(const e of entries){const local=byId.get(String(e.listingId))||{};if(['local','pending','syncing','error'].includes(local.syncStatus))continue;const remote=remoteListingToLocal(e,e.driveFileId,locations);const localAssets=[...(local.listingAssets||[])];const byAssetId=new Map(localAssets.map(a=>[a.id,a]));const byDriveId=new Map(localAssets.filter(a=>a.driveFileId).map(a=>[a.driveFileId,a]));remote.listingAssets=(remote.listingAssets||[]).map(a=>({...byAssetId.get(a.id),...byDriveId.get(a.driveFileId),...a}));await DB.put('listings',{...local,...remote,priceAlert:Object.prototype.hasOwnProperty.call(local,'priceAlert')?local.priceAlert:(remote.priceAlert??null),locationSnapshot:remote.locationSnapshot||local.locationSnapshot||null});}
    const remoteIds=new Set(entries.map(e=>String(e.listingId)));for(const local of existing){if(local.driveFileId&&!remoteIds.has(String(local.id))&&!['local','pending','syncing','error'].includes(local.syncStatus))await DB.del('listings',local.id);}
    await setSetting('lastListingsIndexSignature',listingsIndexSignature(entries));await setSetting('lastListingsRefreshAt',Date.now());if(!quiet)await setSetting('lastManualListingsRefreshAt',Date.now());return entries.length;
  }
  async function quickRefreshUserListingsFromDrive({quiet=true}={}){const s=await structure();await processListingDeleteTombstones(s).catch(err=>console.warn('Listing deletion cleanup deferred',err));const cur=await readListingsIndex(s);if(!cur.file)return refreshUserListingsFromDrive({quiet,forceFull:false});const tombstones=await getListingDeleteTombstones(),deletedIds=new Set(Object.keys(tombstones)),entries=(cur.entries||[]).filter(e=>!deletedIds.has(String(e?.listingId||'')));const sig=listingsIndexSignature(entries),last=String(await setting('lastListingsIndexSignature','')||'');if(last&&sig===last){await setSetting('lastListingsRefreshAt',Date.now());if(!quiet)await setSetting('lastManualListingsRefreshAt',Date.now());return entries.length}return refreshUserListingsFromDrive({quiet,forceFull:false})}
  async function migrateLocalListingsToDrive(s){
    const key=`listingMigrationV071:${s.rootId}:${s.userName}`;if(await setting(key,false))return;
    const locals=(await DB.all('listings')).filter(l=>!l.ownerUserName||l.ownerUserName===s.userName);
    for(const l of locals){if(!l.ownerUserName){l.ownerUserName=s.userName;await DB.put('listings',l);}if(!l.driveFileId){try{await syncListing(l);}catch(err){console.warn('Could not migrate local listing',l.id,err);}}}
    await setSetting(key,true);
  }
  function safeName(name,fallback){
    const n=String(name||fallback||'file').replace(/[\\/:*?"<>|]/g,'-').trim();return n||fallback||'file';
  }
  function stripPhotoOrderPrefix(name){
    // The order number is metadata, not part of the original filename. Remove any
    // previous/repeated LotKeys prefixes before applying the current photo position.
    return String(name||'').replace(/^\s*(?:(?:\d{1,3})\s*-\s*)+/,'').trim();
  }
  async function syncAssets(items,folderId,vehicleId,kind,onProgress=()=>{}){
    items=items||[];
    const remotes=await listFiles(`'${qEscape(folderId)}' in parents and trashed = false`,'files(id,name,mimeType,webViewLink,appProperties,trashed)');
    const byAsset=new Map(remotes.filter(x=>x.appProperties?.lotkeysAssetId).map(x=>[x.appProperties.lotkeysAssetId,x]));
    const localIds=new Set(items.map(x=>x.id));
    const existingFor=item=>(item.driveFileId&&remotes.find(x=>x.id===item.driveFileId))||byAsset.get(item.id)||null;
    const uploadable=items.filter(item=>!existingFor(item)&&item.blob);
    const totalBytes=uploadable.reduce((sum,item)=>sum+Math.max(1,Number(item.blob?.size)||1),0)||1;
    let completedBytes=0,uploadIndex=0;
    for(let i=0;i<items.length;i++){
      const item=items[i]; const existing=existingFor(item);
      const prefix=kind==='photo'?String(i+1).padStart(2,'0')+' - ':'';
      const baseName=kind==='photo'?stripPhotoOrderPrefix(item.name||existing?.name||(`${kind}-${i+1}`)):(item.name||(`${kind}-${i+1}`));
      const wanted=safeName(prefix+baseName,`${kind}-${i+1}`);
      if(kind==='photo') item.name=baseName;
      if(existing){ item.driveFileId=existing.id;item.driveName=wanted; if(existing.name!==wanted) await patchMetadata(existing.id,{name:wanted}); continue; }
      if(!item.blob) continue;
      uploadIndex++;const fileBytes=Math.max(1,Number(item.blob.size)||1);
      const report=(loaded=0,status='uploading')=>{const overall=Math.max(0,Math.min(100,Math.round(((completedBytes+Math.min(fileBytes,loaded||0))/totalBytes)*100)));onProgress({kind,status,folder:kind==='photo'?'Photos':kind==='document'?'Documents':'Videos',fileName:item.name||wanted,fileIndex:uploadIndex,fileCount:uploadable.length,percent:overall,loadedBytes:completedBytes+Math.min(fileBytes,loaded||0),totalBytes})};
      report(0);
      try{
        const f=await resumableCreate(item.blob,{name:wanted,parents:[folderId],appProperties:{lotkeysAssetId:item.id,lotkeysVehicleId:vehicleId,lotkeysAssetKind:kind}},loaded=>report(loaded),`${vehicleId}:${kind}:${item.id}`);
        item.driveFileId=f.id;item.driveName=wanted;report(fileBytes,'complete');completedBytes+=fileBytes;
      }catch(err){err.stage='media';err.mediaKind=kind;err.mediaFolder=kind==='photo'?'Photos':kind==='document'?'Documents':'Videos';err.mediaFileName=item.name||wanted;throw err}
    }
    for(const r of remotes){
      const assetId=r.appProperties?.lotkeysAssetId;
      if(assetId && r.appProperties?.lotkeysVehicleId===vehicleId && !localIds.has(assetId)) await trashFile(r.id).catch(()=>{});
    }
    if(uploadable.length)onProgress({kind,status:'complete',folder:kind==='photo'?'Photos':kind==='document'?'Documents':'Videos',fileName:'',fileIndex:uploadable.length,fileCount:uploadable.length,percent:100,loadedBytes:totalBytes,totalBytes});
    return items;
  }
  function assetFingerprint(items){return (items||[]).map(x=>`${x.id||''}:${x.driveFileId||''}:${x.name||''}`).join('|');}
  function directoryFingerprint(v,c,templateId){return JSON.stringify(['v071-text-only',templateId,c.storeName,c.directoryStoreAddress,c.directoryDirectionsUrl,v.year,v.make,v.model,v.stock,v.odometer,v.odometerUnit,v.originalListingUrl,v.carfaxUrl,!!v.carfaxOneOwner,!!v.carfaxLowKm,!!v.carfaxNoAccidents,v.drive?.photosFolderId,v.drive?.videosFolderId,v.drive?.documentsFolderId]);}
  function sheetFingerprint(v){return JSON.stringify([v.name,v.year,v.make,v.model,v.bodyStyle||'',v.exteriorColor||'',v.interiorColor||'',v.vehicleCondition||'',v.fuelType||'',v.price,v.odometer,v.odometerUnit,v.vin,v.stock,v.originalListingUrl,v.carfaxUrl,!!v.carfaxOneOwner,!!v.carfaxLowKm,!!v.carfaxNoAccidents,v.description,v.createdByUserName||'',v.createdByEmail||'',v.createdAt||0,JSON.stringify(v.priceChangeRequests||[]),JSON.stringify(v.priceChangeAwards||[]),JSON.stringify(v.websitePriceFinding||null),v.photos?.[0]?.driveFileId,v.drive?.directoryPdfUrl]);}
  async function syncVehicle(v,{force=false,onProgress=()=>{}}={}){
    if(!v?.id) throw new Error('Vehicle ID missing.');
    v.name=buildVehicleProfileName(v);const s=await structure();const c=await config();v.drive=v.drive||{};
    let profile=v.drive.profileFolderId&&!force?{id:v.drive.profileFolderId,name:v.name}:null;
    if(!profile&&v.drive.profileFolderId)profile=await driveGet(v.drive.profileFolderId,'id,name,mimeType,webViewLink,appProperties').catch(()=>null);
    if(!profile)profile=await findChildByAppProperty(s.inventoryId,'lotkeysVehicleId',v.id,FOLDER_MIME);
    if(!profile)profile=await createFolder(v.name||v.id,s.inventoryId,{lotkeysVehicleId:v.id,lotkeysRole:'vehicleProfile'});else if(force&&profile.name!==(v.name||v.id))profile=await patchMetadata(profile.id,{name:v.name||v.id});
    v.drive.profileFolderId=profile.id;
    let shared,photos,videos,docs;
    if(!force&&v.drive.sharedFolderId&&v.drive.photosFolderId&&v.drive.videosFolderId&&v.drive.documentsFolderId){shared={id:v.drive.sharedFolderId};photos={id:v.drive.photosFolderId};videos={id:v.drive.videosFolderId};docs={id:v.drive.documentsFolderId};}
    else{shared=await ensureFolder(profile.id,'Shared','lotkeysVehicleShared',v.id);photos=await ensureFolder(shared.id,'Photos','lotkeysVehiclePhotos',v.id);videos=await ensureFolder(shared.id,'Videos','lotkeysVehicleVideos',v.id);docs=await ensureFolder(shared.id,'Documents','lotkeysVehicleDocuments',v.id);}
    v.drive.sharedFolderId=shared.id;v.drive.photosFolderId=photos.id;v.drive.videosFolderId=videos.id;v.drive.documentsFolderId=docs.id;v.sharedFolderUrl=`https://drive.google.com/drive/folders/${shared.id}`;
    if(c.publicShareEnabled){try{if(force||!v.drive.publicShareReady){await setAnyoneReader(shared.id);v.drive.publicShareReady=true;}v.shareWarning='';}catch(e){v.shareWarning=e.message||'Public sharing could not be enabled';}}

    // Save Profile metadata before the heavy media transfer. The Vehicle exists in the
    // shared Inventory immediately; Photos/Documents/Videos can finish afterwards.
    let sheet=v.drive.adminSheetId&&!force?{id:v.drive.adminSheetId,webViewLink:v.drive.adminSheetUrl}:null;if(!sheet&&v.drive.adminSheetId)sheet=await driveGet(v.drive.adminSheetId,'id,name,mimeType,webViewLink').catch(()=>null);if(!sheet)sheet=await createSpreadsheet(profile.id,v.id);v.drive.adminSheetId=sheet.id;v.drive.adminSheetUrl=sheet.webViewLink||`https://docs.google.com/spreadsheets/d/${sheet.id}/edit`;
    let templateId=await setting('directoryTemplateFileId',''),template=templateId&&!force?{id:templateId}:await ensureDirectoryTemplate(s);templateId=template.id;const dfp=directoryFingerprint(v,c,templateId);
    if(force||!v.drive.directoryPdfId||v.drive.lastDirectoryFingerprint!==dfp){await generateVehicleInfoDirectory(v,template);v.drive.lastDirectoryFingerprint=dfp;}
    let sfp=sheetFingerprint(v);if(force||v.drive.lastSheetFingerprint!==sfp){await writeVehicleSheet(sheet.id,v);v.drive.lastSheetFingerprint=sfp;}
    await DB.put('vehicles',v);await updateInventoryIndex(v,s).catch(e=>console.warn('Inventory index update failed',e));

    const photoFp=assetFingerprint(v.photos),documentFp=assetFingerprint(v.attachments),videoFp=assetFingerprint(v.videos),currentAssetFp=[photoFp,documentFp,videoFp].join('||');
    if(force||v.drive.lastAssetFingerprint!==currentAssetFp){
      const legacy=String(v.drive.lastAssetFingerprint||'').split('||'),prevPhoto=v.drive.lastPhotoAssetFingerprint??legacy[0]??'',prevDocument=v.drive.lastDocumentAssetFingerprint??legacy[1]??'',prevVideo=v.drive.lastVideoAssetFingerprint??legacy[2]??'';
      if(force||prevPhoto!==photoFp)v.photos=await syncAssets(v.photos,photos.id,v.id,'photo',onProgress);
      if(force||prevDocument!==documentFp)v.attachments=await syncAssets(v.attachments,docs.id,v.id,'document',onProgress);
      if(force||prevVideo!==videoFp)v.videos=await syncAssets(v.videos,videos.id,v.id,'video',onProgress);
      v.drive.lastPhotoAssetFingerprint=assetFingerprint(v.photos);v.drive.lastDocumentAssetFingerprint=assetFingerprint(v.attachments);v.drive.lastVideoAssetFingerprint=assetFingerprint(v.videos);
      v.drive.lastAssetFingerprint=[v.drive.lastPhotoAssetFingerprint,v.drive.lastDocumentAssetFingerprint,v.drive.lastVideoAssetFingerprint].join('||');
    }
    // Cover Photo file ID may have changed during upload; refresh metadata once media ends.
    sfp=sheetFingerprint(v);if(force||v.drive.lastSheetFingerprint!==sfp){await writeVehicleSheet(sheet.id,v);v.drive.lastSheetFingerprint=sfp;}
    v.syncStatus='synced';v.mediaUpload=null;v.lastDriveSyncAt=Date.now();v.syncError='';await DB.put('vehicles',v);await updateInventoryIndex(v,s).catch(e=>console.warn('Inventory index update failed',e));return v;
  }
  async function deleteVehicle(v){
    if(v?.drive?.profileFolderId) await trashFile(v.drive.profileFolderId);
    if(v?.id) await removeInventoryIndexEntry(v.id).catch(()=>{});
  }
  async function syncListingAssets(l,s,vehicle){
    const items=l.listingAssets||[];if(!items.length)return items;
    const groupKey=l.vehicleId||'manual';
    const label=vehicle?[vehicle.year,vehicle.make,vehicle.model,vehicle.stock].filter(Boolean).join(' '):'Manual Listings';
    const group=await ensureFolder(s.listingAssetsId,safeName(label||groupKey,'Listing Photos'),'lotkeysListingAssetGroup',groupKey);
    const photos=await ensureFolder(group.id,'Photos','lotkeysRole','listingAssetPhotos');
    const remotes=await listFiles(`'${qEscape(photos.id)}' in parents and trashed = false`,'files(id,name,mimeType,webViewLink,appProperties,trashed)');
    const byAssetId=new Map(remotes.filter(x=>x.appProperties?.lotkeysListingAssetId).map(x=>[x.appProperties.lotkeysListingAssetId,x]));
    const byAssetKey=new Map(remotes.filter(x=>x.appProperties?.lotkeysListingAssetKey).map(x=>[x.appProperties.lotkeysListingAssetKey,x]));
    for(const item of items){
      item.assetKey=item.assetKey||listingPhotoAssetKey(item,l.vehicleId||'manual');
      const existing=(item.driveFileId&&remotes.find(x=>x.id===item.driveFileId))||byAssetId.get(item.id)||byAssetKey.get(item.assetKey);
      if(existing){item.driveFileId=existing.id;item.webViewLink=existing.webViewLink||`https://drive.google.com/file/d/${existing.id}/view`;continue}
      if(!item.blob)continue;
      const f=await multipartCreate(item.blob,{name:safeName(item.name||`${item.id}.jpg`,'listing-photo.jpg'),parents:[photos.id],appProperties:{lotkeysListingAssetId:item.id,lotkeysListingAssetKey:item.assetKey,lotkeysVehicleId:l.vehicleId||'manual',lotkeysAssetKind:'listingPhoto'}});
      item.driveFileId=f.id;item.webViewLink=f.webViewLink||`https://drive.google.com/file/d/${f.id}/view`;
    }
    l.listingAssets=items;return items;
  }
  async function syncListing(l){
    if(!l?.id) throw new Error('Listing ID missing.');
    // A listing the user already deleted must never be recreated by a late/background sync.
    if(await listingDeleteTombstoned(l.id))return l;
    const s=await structure();const vehicle=l.vehicleId?await DB.get('vehicles',l.vehicleId):null;const loc=l.locationId?await DB.get('locations',l.locationId):null;const location=loc?{id:loc.id,name:loc.name,address:loc.address||'',postalCode:loc.postalCode||'',lat:loc.lat||'',lng:loc.lng||''}:(l.locationSnapshot||null);
    await syncListingAssets(l,s,vehicle);
    const listingAssets=(l.listingAssets||[]).map(({blob,...rest})=>rest);
    const data={schemaVersion:7,listingId:l.id,userName:(await config()).userName,vehicleId:l.vehicleId||'',vehicleName:vehicle?.name||'',stock:vehicle?.stock||'',marketplaceTitle:l.marketplaceTitle||'',year:l.year||'',make:l.make||'',model:l.model||'',bodyStyle:l.bodyStyle||vehicle?.bodyStyle||'',exteriorColor:l.exteriorColor||vehicle?.exteriorColor||'',interiorColor:l.interiorColor||vehicle?.interiorColor||'',vehicleCondition:l.vehicleCondition||vehicle?.vehicleCondition||'',fuelType:l.fuelType||vehicle?.fuelType||'',price:l.price??'',odometer:l.odometer??'',odometerUnit:l.odometerUnit||'',marketplaceDescription:l.description||'',location,status:l.status||'Draft',facebookUrl:l.facebookUrl||'',carfaxOneOwner:l.carfaxOneOwner===true,carfaxLowKm:l.carfaxLowKm===true,carfaxNoAccidents:l.carfaxNoAccidents===true,priceAlert:l.priceAlert||null,photoOrder:normalizePhotoOrder(l,vehicle),photoOrderCustomized:l.photoOrderCustomized===true,listingAssets,createdAt:l.createdAt||null,postedAt:l.postedAt||null,lastPreparedAt:l.lastPreparedAt||null,updatedAt:l.updatedAt||Date.now(),syncedAt:new Date().toISOString()};
    let fileId=l.driveFileId||'';if(!fileId){const f=await findChildByAppProperty(s.listingsId,'lotkeysListingId',l.id);fileId=f?.id||'';}
    const f=await upsertJson({fileId,name:`${safeName(l.marketplaceTitle||l.id,'listing')}.json`,parentId:s.listingsId,data,appProperties:{lotkeysListingId:l.id,lotkeysRole:'marketplaceListing',lotkeysUserName:s.userName}});
    l.driveFileId=f.id;l.locationSnapshot=location;l.syncStatus='synced';l.lastDriveSyncAt=Date.now();l.syncError='';await DB.put('listings',l);await updateListingsIndex(data,f.id,s).catch(e=>console.warn('Listings index update failed',e));return l;
  }
  async function deleteListing(l){
    if(!l?.id)return {remoteDeleted:false};
    const s=await structure().catch(()=>null);await markListingDeleteTombstone(l,s?.userName||'');
    let remoteDeleted=false;
    if(s){try{let fileId=String(l.driveFileId||'');if(!fileId){const f=await findChildByAppProperty(s.listingsId,'lotkeysListingId',String(l.id)).catch(()=>null);fileId=f?.id||''}if(fileId)await trashFile(fileId);await removeListingsIndexEntry(String(l.id),s);remoteDeleted=true}catch(err){console.warn('Listing removed locally; Drive cleanup deferred',err)}}
    return {remoteDeleted};
  }
  async function chooseStoreFolder(){
    const c=await config();
    if(!c.apiKey) throw new Error('Google API Key is not configured in Garage.');
    if(!c.projectNumber) throw new Error('Google Cloud Project Number is not configured in Garage.');
    await authorize(false);await initPicker();
    return new Promise((resolve,reject)=>{
      const view=new google.picker.DocsView(google.picker.ViewId.FOLDERS).setSelectFolderEnabled(true);
      const picker=new google.picker.PickerBuilder().addView(view).setOAuthToken(accessToken).setDeveloperKey(c.apiKey).setAppId(c.projectNumber).setCallback(async data=>{
        const action=data[google.picker.Response.ACTION];
        if(action===google.picker.Action.CANCEL) return reject(new Error('Folder selection cancelled.'));
        if(action!==google.picker.Action.PICKED) return;
        try{
          const doc=data[google.picker.Response.DOCUMENTS][0];const id=doc[google.picker.Document.ID];
          const meta=await driveGet(id,'id,name,mimeType,webViewLink');
          if(meta.mimeType!==FOLDER_MIME) throw new Error('Please choose a folder.');
          await setSetting('storeFolderId',meta.id);await setSetting('storeFolderName',meta.name);await setSetting('storeFolderUrl',meta.webViewLink||`https://drive.google.com/drive/folders/${meta.id}`);await setSetting('driveStoreStructure',null);
          resolve(meta);
        }catch(e){reject(e)}
      }).build();
      picker.setVisible(true);
    });
  }
  async function useFolderUrl(url){
    const m=String(url||'').match(/\/folders\/([a-zA-Z0-9_-]+)/)||String(url||'').match(/[?&]id=([a-zA-Z0-9_-]+)/);if(!m)throw new Error('Could not find a Google Drive folder ID in that URL.');
    await authorize(false);const meta=await driveGet(m[1],'id,name,mimeType,webViewLink');if(meta.mimeType!==FOLDER_MIME)throw new Error('That Drive link is not a folder.');
    await setSetting('storeFolderId',meta.id);await setSetting('storeFolderName',meta.name);await setSetting('storeFolderUrl',meta.webViewLink||url);await setSetting('driveStoreStructure',null);return meta;
  }
  async function rememberSavedStore(entry){if(!entry?.code)return;let rows=await setting('savedStores',[]);if(!Array.isArray(rows))rows=[];rows=rows.filter(x=>String(x.code||'').toUpperCase()!==String(entry.code||'').toUpperCase());rows.unshift({code:String(entry.code).toUpperCase(),name:String(entry.name||'LotKeys Store'),folderId:String(entry.folderId||''),lastConnectedAt:new Date().toISOString()});rows=rows.slice(0,12);await setSetting('savedStores',rows);syncPersonalProfile().catch(()=>{});return rows}
  async function removeSavedStore(code){let rows=await setting('savedStores',[]);if(!Array.isArray(rows))rows=[];rows=rows.filter(x=>String(x.code||'').toUpperCase()!==String(code||'').toUpperCase());await setSetting('savedStores',rows);syncPersonalProfile().catch(()=>{});return rows}
  async function findStoreByCode(code){code=String(code||'').trim().toUpperCase();if(!code)throw new Error('Enter a Store Code first.');await authorize(false);const currentCode=String(await setting('storeCode','')||'').trim().toUpperCase(),currentRoot=String(await setting('storeFolderId','')||'');if(currentRoot&&currentCode===code){try{const root=await driveGet(currentRoot,'id,name,mimeType,webViewLink');if(root?.mimeType===FOLDER_MIME){const users=normalizeStoreUsers(await setting('storeUsers',[]));return {code,name:String(await setting('storeName',root.name)||root.name||'LotKeys Store'),root,config:{storeName:await setting('storeName',root.name),storeCode:code,users},configFileId:String(await setting('storeConfigFileId','')||'')}}}catch{}}const accessFiles=await listFiles("name = 'Store Access.json' and trashed = false",'files(id,name,parents,webViewLink,appProperties)');for(const f of accessFiles){try{const data=JSON.parse(await (await fetchFileBlob(f.id)).text());if(String(data?.storeCode||'').trim().toUpperCase()!==code)continue;const rootId=String(data.storeFolderId||'');if(!rootId)continue;const root=await driveGet(rootId,'id,name,mimeType,webViewLink');if(root.mimeType!==FOLDER_MIME)continue;return {code,name:String(data.storeName||root.name||'LotKeys Store'),root,config:{storeName:data.storeName||root.name,storeCode:code,users:Array.isArray(data.publicUsers)?data.publicUsers:[],topContributors:data.topContributors||{}},configFileId:''}}catch{}}const files=await listFiles("name = 'LotKeys.json' and trashed = false",'files(id,name,parents,webViewLink,appProperties)');for(const f of files){try{const data=JSON.parse(await (await fetchFileBlob(f.id)).text());if(String(data?.storeCode||'').trim().toUpperCase()!==code)continue;const adminId=f.parents?.[0];if(!adminId)continue;const admin=await driveGet(adminId,'id,name,parents');const rootId=admin.parents?.[0];if(!rootId)continue;const root=await driveGet(rootId,'id,name,mimeType,webViewLink');if(root.mimeType!==FOLDER_MIME)continue;return {code,name:String(data.storeName||root.name||'LotKeys Store'),root,config:data,configFileId:f.id}}catch{}}throw new Error('That Store Code was not found in the Google Drive Stores this account can access. Ask Store management to confirm the code and that your Google account has access.')}
  async function connectByStoreCode(code){const found=await findStoreByCode(code);await setSetting('storeFolderId',found.root.id);await setSetting('storeFolderName',found.root.name);await setSetting('storeFolderUrl',found.root.webViewLink||`https://drive.google.com/drive/folders/${found.root.id}`);if(found.configFileId)await setSetting('storeConfigFileId',found.configFileId);else await setSetting('storeConfigFileId','');await setSetting('driveStoreStructure',null);if(found.config?.storeName!=null)await setSetting('storeName',String(found.config.storeName||found.root.name));if(Array.isArray(found.config?.users))await setSetting('storeUsers',normalizeStoreUsers(found.config.users));if(Array.isArray(found.config?.userReports))await setSetting('storeUserReports',found.config.userReports);if(Array.isArray(found.config?.topContributors?.history))await setSetting('monthlyContributionHistory',found.config.topContributors.history);if(found.config?.topContributors?.reveal!==undefined)await setSetting('monthlyReveal',found.config.topContributors.reveal||null);await setSetting('monthlyRevealSettings',normalizeRevealSettings(found.config?.topContributors?.revealSettings||{}));try{const st=await ensureStoreStructure();await rememberSavedStore({code:found.code,name:found.name,folderId:found.root.id});return st}catch(err){if(err?.code==='STORE_BLOCKED')await removeSavedStore(found.code);throw err}}
  async function healthCheck(){if(!isHttps())return {ok:false,level:'bad',message:'Open the HTTPS LotKeys address to connect.'};const c=await config();if(!c.clientId)return {ok:false,level:'bad',message:'Google OAuth is not configured.'};await authorize(false);const identity=await getGoogleIdentity();if(!c.storeFolderId)return {ok:true,level:'warn',message:'Google account authorized. Choose or connect to a Store.',identity};const root=await driveGet(c.storeFolderId,'id,name,mimeType,webViewLink');if(root.mimeType!==FOLDER_MIME)throw new Error('The saved Store is no longer a Drive folder.');await setSetting('storeFolderName',root.name||c.storeFolderName);const users=normalizeStoreUsers(await setting('storeUsers',[])),account=users.find(u=>(identity.sub&&u.googleSub===identity.sub)||(identity.email&&String(u.email||'').toLowerCase()===identity.email));if(account&&['disabled','banned','blacklisted','removed'].includes(String(account.status||'').toLowerCase())){const e=new Error('Your access to this LotKeys Store has been removed. Please speak with Store administration or management.');e.code='STORE_BLOCKED';throw e}return {ok:true,level:'good',message:`Connected to ${root.name||'Store'} ✓`,identity,root}}
  async function getStatus(){ const c=await config();const s=await setting('driveStoreStructure',null);return {isHttps:isHttps(),configured:!!c.clientId,hasPickerConfig:!!(c.apiKey&&c.projectNumber),connected:connected(),storeFolderId:c.storeFolderId,storeFolderName:c.storeFolderName,structure:s}; }
  return {authorize,disconnect,connected,ready,restoreSessionAuthorization,getGoogleIdentity,chooseStoreFolder,useFolderUrl,choosePersonalAccountLocation,getPersonalAccountStatus,ensureStoreStructure,ensureDirectoryTemplate,syncVehicle,deleteVehicle,syncListing,deleteListing,syncStoreConfig,loadStoreConfig,refreshInventoryFromDrive,quickRefreshInventoryFromDrive,refreshUserListingsFromDrive,quickRefreshUserListingsFromDrive,hydrateVehicleAssets,getStatus,config,fetchFileBlob,loadPersonalProfile,syncPersonalProfile,syncStoreProfileThumbnail,uploadPersonalCelebrationSound,selectPersonalCelebrationSound,syncStoreCelebrationSound,saveStoreRevealAudio,clearStoreRevealAudio,refreshStoreLogoCache,saveStoreLogo,removeStoreLogo,findStoreByCode,connectByStoreCode,rememberSavedStore,removeSavedStore,healthCheck};
})();
