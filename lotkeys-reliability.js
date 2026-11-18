/* Vehicle preparation stays visible; this does not claim browser background execution. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.LotKeysReliability=api.createPreparationLease({document:root.document,navigator:root.navigator});root.LotKeysAccountControls=api;}})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function createPreparationLease({document,navigator}){
    let count=0,lock=null,request=null,epoch=0,disposed=false;
    const release=async sentinel=>{try{await sentinel?.release();}catch{}};
    async function acquire(){
      if(disposed||!count||document?.visibilityState!=='visible'||lock||request||!navigator?.wakeLock?.request)return;
      const generation=epoch;
      request=Promise.resolve().then(()=>navigator.wakeLock.request('screen')).then(async sentinel=>{
        if(disposed||!count||generation!==epoch||document.visibilityState!=='visible'){await release(sentinel);return;}
        lock=sentinel;sentinel.addEventListener?.('release',()=>{if(lock===sentinel)lock=null;},{once:true});
      }).catch(()=>{}).finally(()=>{request=null;if(!disposed&&count&&generation!==epoch)acquire();});
      await request;
    }
    function visibility(){epoch++;if(document.visibilityState!=='visible'){const old=lock;lock=null;release(old);}else acquire();}
    document?.addEventListener?.('visibilitychange',visibility);
    function begin(){if(disposed)return()=>{};count++;acquire();let ended=false;return()=>{if(ended)return;ended=true;count=Math.max(0,count-1);if(!count){epoch++;const old=lock;lock=null;release(old);}};}
    return{begin,status:()=>({preparing:count>0,screenAwake:!!lock}),dispose(){disposed=true;count=0;epoch++;document?.removeEventListener?.('visibilitychange',visibility);const old=lock;lock=null;release(old);}};
  }
  const lower=v=>String(v||'').trim().toLowerCase();
  function accountStatus(native,context,job=null,previous=null){
    const result={uploads:{tone:'amber',text:'Open Android controls to set up uploads.'},connector:{tone:'amber',text:'Check the installed phone connection.'}};
    if(!native)return result;
    const sameUpload=!!context.account&&lower(native.uploadAccount)===lower(context.account);
    const sameRelay=!!context.account&&lower(native.relay?.account)===lower(context.account);
    if(!sameUpload)result.uploads.text='Choose this Google account in Android upload settings.';
    else if(!native.capabilities?.backgroundUploads)result.uploads.text='Background upload permission needs attention.';
    else result.uploads.text='Configured · only retained Android saves can continue after switching apps.';
    if(sameRelay&&native.relay?.authorized===true&&native.permissions?.readSms&&native.permissions?.sendSms){
      result.connector={tone:native.relay?.connected===true?'green':'amber',text:native.relay?.lastError?'Phone relay needs attention: '+native.relay.lastError:native.relay?.connected===true?'Connected · phone permissions checked':'Permissions checked · waiting for a PC connection'};
      if(native.relay?.lastError)result.connector.tone='amber';
    }else result.connector.text=sameRelay?'Open Android setup to allow Messages and SMS sending.':'Use the same Google account for the phone connector.';
    const c=job?.context;
    if(sameUpload&&native.capabilities?.backgroundUploads===true&&c&&lower(c.account)===lower(context.account)&&c.store===context.store&&!job.held){
      const bytes=x=>(x?.assets||[]).reduce((n,a)=>n+(Number(a.confirmed)||0),0);
      const progressing=previous?.id===job.id&&lower(previous.context?.account)===lower(c.account)&&previous.context?.store===c.store&&bytes(job)>bytes(previous);
      if(job.state==='complete'&&job.id&&Array.isArray(job.assets)&&job.assets.every(a=>/^[A-Za-z0-9_-]{8,200}$/.test(String(a.result?.id||''))))result.uploads={tone:'green',text:'Last Android transfer completed · receipt checked.'};
      else if(job.state==='uploading'&&progressing)result.uploads={tone:'green',text:'Uploading · Android progress confirmed.'};
      else if(job.error||/^paused_|failed|needs_reconcile/.test(job.state))result.uploads={tone:'amber',text:job.error||'Saved files need attention in Android controls.'};
      else result.uploads={tone:'amber',text:'Files retained · Android may defer or retry this save.'};
    }
    return result;
  }
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const owners=new WeakMap();let activeMount=null;
  const uploadIntent='intent://uploads#Intent;scheme=lotkeys-test;package=ca.lotkeys.connector.test;end';
  function mount(api){
    activeMount?.dispose();
    const host=api.host,owner={};owners.set(host,owner);let sequence=0,previous=null;
    const current=()=>owners.get(host)===owner&&host.isConnected;
    function paint(status){if(!current())return;host.innerHTML=`<h3>Uploads &amp; phone connector</h3>${[['uploads','Background uploads','Open upload controls'],['connector','Phone connector','Check / reconnect']].map(([id,label,button])=>`<div class="account-capability"><strong>${label}</strong><p role="status"><span class="capability-light ${status[id].tone}" aria-label="${status[id].tone==='green'?'Verified':'Needs checking'}"></span>${esc(status[id].text)}</p>${id==='uploads'?`<a class="btn" href="${uploadIntent}">${button}</a>`:`<button class="btn" type="button" data-check-connector>${button}</button>`}</div>`).join('')}<p class="help">Keep LotKeys open while originals are prepared. Android controls request the necessary permissions and background continuation. Regular-user submissions still need LotKeys open. Phone setup is available in the installed app’s Phone &amp; upload settings.</p>`;host.querySelector('[data-check-connector]').onclick=async()=>{if(!current())return;try{await api.phone?.connectNative?.();await refresh();}catch(error){if(current())host.querySelectorAll('[role=status]')[1].textContent=error.message||String(error);}};}
    async function refresh(){
      const run=++sequence,context=await api.context();if(!current()||run!==sequence)return;
      let native=null,job=null;
      try{native=await api.phone?.uploadCapabilities?.();if(!current()||run!==sequence)return;const receipts=await api.receipts();const receipt=receipts.find(r=>r.handoffComplete&&lower(r.context?.account)===lower(context.account)&&r.context?.store===context.store);if(receipt){const response=await api.phone.uploadCall('status',{id:receipt.id});if(response?.id===receipt.id&&['account','store','record','revision'].every(k=>String(response.context?.[k]||'')===String(receipt.context?.[k]||'')))job=response;}}catch{}
      const next=await api.context();if(!current()||run!==sequence||JSON.stringify(next)!==JSON.stringify(context)){if(current())paint(accountStatus(null,{}));return;}
      paint(accountStatus(native,context,job,previous));previous=job;
    }
    const resume=()=>{if(api.document.visibilityState==='visible')refresh().catch(()=>{});};
    api.document.addEventListener('visibilitychange',resume);
    api.document.defaultView?.addEventListener('focus',resume);
    paint(accountStatus(null,{}));refresh().catch(()=>{});
    const handle={refresh,dispose(){sequence++;if(owners.get(host)===owner)owners.delete(host);api.document.removeEventListener('visibilitychange',resume);api.document.defaultView?.removeEventListener('focus',resume);}};activeMount=handle;return handle;
  }
  return{createPreparationLease,accountStatus,mount,uploadIntent};
});
