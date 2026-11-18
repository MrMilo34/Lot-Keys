(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.LotKeysStoreRequests=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const API='https://www.googleapis.com/drive/v3/files/';
  const FIELDS='fileId,proposalId,requesterEmailAddress,recipientEmailAddress,rolesAndViews,requestMessage,createTime';
  const folderId=value=>{const id=String(value||'');if(!/^[A-Za-z0-9_-]{10,200}$/.test(id))throw Error('The Store invitation is invalid. Ask its administrator for a new invitation.');return id;};
  const email=value=>{const address=String(value||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))throw Error('Google did not return a valid request email.');return address;};
  function target(value,base){
    const text=String(value||'').trim(),site=new URL('./',base);
    if(!text)throw Error('Enter a Store Code or invitation link.');
    if(!/^https?:/i.test(text))return {code:text.toUpperCase(),folderId:'',name:''};
    const link=new URL(text);
    if(link.protocol!=='https:'||link.username||link.password)throw Error('Use the Store invitation copied from LotKeys.');
    if(link.origin===site.origin&&link.pathname===site.pathname&&link.searchParams.has('joinStore'))return {folderId:folderId(link.searchParams.get('joinStore')),code:String(link.searchParams.get('storeCode')||'').trim().toUpperCase(),name:String(link.searchParams.get('storeName')||'LotKeys Store').slice(0,80)};
    const match=link.hostname==='drive.google.com'&&link.pathname.match(/^\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]+)\/?$/);
    if(match)return {folderId:folderId(match[1]),code:'',name:'LotKeys Store'};
    throw Error('Use a LotKeys Store invitation or its Google Drive folder link.');
  }
  function invitation(store,base){
    const link=new URL('./',base);link.searchParams.set('joinStore',folderId(store.folderId));
    link.searchParams.set('storeCode',String(store.code||''));link.searchParams.set('storeName',String(store.name||'LotKeys Store').slice(0,80));return link.href;
  }
  function requestUrl(store,account){const url=new URL('https://drive.google.com/drive/folders/'+folderId(store.folderId));url.searchParams.set('authuser',email(account));return url.href;}
  function proposal(row,root){
    if(!row||row.fileId!==root||!row.proposalId||String(row.proposalId).length>1000)throw Error('Google returned an invalid Store access request. Refresh Requests.');
    const recipient=email(row.recipientEmailAddress),requester=email(row.requesterEmailAddress);
    return {id:String(row.proposalId),rootId:root,email:recipient,requester,message:String(row.requestMessage||'').slice(0,500),createdAt:String(row.createTime||''),self:recipient===requester&&!((row.rolesAndViews||[]).some(x=>x.view)),kind:'proposal'};
  }
  function createClient({api,context,readReceipts,writeReceipts,provision,blocked=async()=>false,clock=Date.now}){
    let cache=null;const busy=new Set();
    async function scope(){const s=await context();if(Number(s.adminLevel)<1||!s.rootId)throw Error('Store Administration access is required.');return {...s,rootId:folderId(s.rootId),account:email(s.account)};}
    async function authority(s,recipient=''){
      const url=new URL('https://www.googleapis.com/drive/v3/files');url.searchParams.set('q',"'"+s.rootId+"' in parents and trashed = false and name = 'Store Access.json'");url.searchParams.set('supportsAllDrives','true');url.searchParams.set('includeItemsFromAllDrives','true');url.searchParams.set('fields','nextPageToken,files(id)');url.searchParams.set('pageSize','1000');
      const files=await api(url.href);if(files.nextPageToken||files.files?.length!==1)throw Error('The Store access record could not be confirmed. Ask its owner to review Store setup.');
      const raw=await api(API+encodeURIComponent(files.files[0].id)+'?alt=media&supportsAllDrives=true'),data=typeof raw==='string'?JSON.parse(raw):raw;
      if(data?.app!=='LotKeys'||data.recordType!=='storeAccess'||data.storeFolderId!==s.rootId||!Array.isArray(data.accessUsers))throw Error('Google did not return the current Store access record.');
      const disabled=user=>['disabled','banned','blacklisted','removed'].includes(String(user?.status||'').toLowerCase());
      const actor=data.accessUsers.find(user=>String(user.email||'').trim().toLowerCase()===s.account);
      if(!actor||disabled(actor)||Number(actor.adminLevel)<1)throw Error('Your current Store record does not allow Administration approval. Refresh Store access.');
      const member=recipient&&data.accessUsers.find(user=>String(user.email||'').trim().toLowerCase()===recipient);
      if(member&&disabled(member))throw Error('This account is disabled or removed in the current Store record. Review Approved Users.');
    }
    async function guard(s,fresh=false,recipient=''){const live=await context(fresh);if(live.rootId!==s.rootId||String(live.account||'').toLowerCase()!==s.account||Number(live.adminLevel)<1)throw Error('The Store or Google account changed. Open Reports / Requests again.');if(fresh){await authority(s,recipient);const after=await context();if(after.rootId!==s.rootId||String(after.account||'').toLowerCase()!==s.account||Number(after.adminLevel)<1)throw Error('The Store or Google account changed. Refresh Requests.');}}
    const key=s=>'storeJoinSetupsV1:'+s.rootId+':'+s.account;
    async function receipts(s){const rows=await readReceipts(key(s));return Array.isArray(rows)?rows.filter(x=>x.rootId===s.rootId&&x.account===s.account):[];}
    async function retain(s,row){await guard(s);const rows=await receipts(s);const next=rows.filter(x=>x.id!==row.id);next.push(row);await writeReceipts(key(s),next);cache=null;}
    async function remove(s,id){await guard(s);await writeReceipts(key(s),(await receipts(s)).filter(x=>x.id!==id));cache=null;}
    async function list({force=false}={}){
      const s=await scope(),identity=s.rootId+':'+s.account;
      if(!force&&cache?.identity===identity&&clock()-cache.at<20000)return cache.value;
      const file=await api(API+encodeURIComponent(s.rootId)+'?supportsAllDrives=true&fields=id,capabilities(canShare)');await guard(s);
      if(file.id!==s.rootId)throw Error('Google returned another Store folder.');
      if(!file.capabilities?.canShare)return {canReview:false,requests:[]};
      let token='',rows=[];const seen=new Set();
      do{
        if(seen.has(token))throw Error('Google repeated a request page. Refresh Requests.');seen.add(token);
        const url=new URL(API+encodeURIComponent(s.rootId)+'/accessproposals');url.searchParams.set('pageSize','100');url.searchParams.set('fields','nextPageToken,accessProposals('+FIELDS+')');if(token)url.searchParams.set('pageToken',token);
        const page=await api(url.href);await guard(s);if(page.accessProposals!==undefined&&!Array.isArray(page.accessProposals))throw Error('Google returned an incomplete access-request list.');
        rows.push(...(page.accessProposals||[]).map(x=>proposal(x,s.rootId)));token=String(page.nextPageToken||'');
      }while(token);
      const pending=await receipts(s),byId=new Map(rows.map(x=>[x.id,x]));
      for(const row of pending)byId.set(row.id,{...row,kind:'setup',self:true,pendingProposal:byId.has(row.id)});
      const value={canReview:true,requests:[...byId.values()].sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')))};
      cache={identity,at:clock(),value};return value;
    }
    async function hasDirectAccess(s,address){
      let token='';const seen=new Set();
      do{
        if(seen.has(token))throw Error('Google repeated a permissions page.');seen.add(token);
        const url=new URL(API+encodeURIComponent(s.rootId)+'/permissions');url.searchParams.set('supportsAllDrives','true');url.searchParams.set('fields','nextPageToken,permissions(type,emailAddress,role,deleted)');if(token)url.searchParams.set('pageToken',token);
        const page=await api(url.href);await guard(s);
        if(!Array.isArray(page.permissions))throw Error('Google did not confirm the approved Store access.');
        if(page.permissions.some(x=>!x.deleted&&x.type==='user'&&String(x.emailAddress||'').toLowerCase()===address&&['reader','writer','owner','organizer','fileOrganizer'].includes(x.role)))return true;
        token=String(page.nextPageToken||'');
      }while(token);return false;
    }
    async function resolve(id,action,{rootId,account}={}){
      if(!['approve','deny'].includes(action))throw Error('Choose Approve or Deny.');
      const s=await scope();if(s.rootId!==rootId||s.account!==String(account||'').toLowerCase())throw Error('The Store or Google account changed. Refresh Requests.');
      const lock=s.rootId+':'+id;if(busy.has(lock))throw Error('This request is already being processed.');busy.add(lock);
      try{
        await guard(s,true);let row,remembered=(await receipts(s)).find(x=>x.id===id);
        const endpoint=API+encodeURIComponent(s.rootId)+'/accessproposals/'+encodeURIComponent(id);
        try{row=proposal(await api(endpoint+'?fields='+encodeURIComponent(FIELDS)),s.rootId);}catch(error){if(error.status!==404||!remembered)throw error;}
        await guard(s);
        if(action==='deny'){
          if(!row)throw Error('Google already resolved this request. Check its Store access before changing it.');
          await api(endpoint+':resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'DENY',sendNotification:false})});await remove(s,id);return {status:'denied'};
        }
        const address=row?.email||email(remembered?.email);
        if(row&&!row.self)throw Error('This is not a self-service Store join request. Review it in Google Drive.');
        if(await blocked(address))throw Error('This account is disabled or removed. Review its existing Approved User record before restoring access.');
        await guard(s,true,address);
        if(row&&remembered?.state!=='setup_pending'){
          remembered={id,rootId:s.rootId,account:s.account,email:address,createdAt:row.createdAt,state:'approval_check'};await retain(s,remembered);
          try{await api(endpoint+':resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'ACCEPT',role:['reader'],sendNotification:false})});}
          catch(error){cache=null;throw Error('Google approval could not be confirmed. Refresh Requests and check this request before retrying.');}
          remembered.state='setup_pending';await retain(s,remembered);
        }
        if(!await hasDirectAccess(s,address))throw Error('Google has not confirmed this account’s Store access. Refresh Requests; no Store user was provisioned.');
        await guard(s,true,address);if(await blocked(address))throw Error('This account was disabled while approval was in progress. Review Approved Users.');
        await provision({email:address,userName:''});await guard(s);await remove(s,id);return {status:'approved',email:address};
      }finally{busy.delete(lock);cache=null;}
    }
    return {list,resolve};
  }
  return {target,invitation,requestUrl,proposal,createClient};
});
