const embedded=new URLSearchParams(location.search).get('embedded')==='1';document.documentElement.classList.toggle('embedded',embedded);document.body.classList.toggle('embedded',embedded);
let listings=[],selected=null,lastResult=null,manualKeys=[],manualIndex=0,postingSession=null;
let fieldWatchTimer=null,fieldWatchBusy=false;
const POSTING_SESSION_KEY='lotkeysActivePostingSession';
const APPEARANCE_KEY='lotkeysAppearance';
const CURRENT_EXTENSION_VERSION=chrome.runtime.getManifest().version;
const UPDATE_MANIFEST_URL='https://raw.githubusercontent.com/MrMilo34/Lot-Keys/main/extension/latest.json';
const TRUSTED_UPDATE_PREFIXES=['https://raw.githubusercontent.com/MrMilo34/Lot-Keys/','https://github.com/MrMilo34/Lot-Keys/'];
let thumbCache={};
const DEFAULT_APPEARANCE={theme:'light',accent:'#2563eb',accentInk:'#ffffff',background:'#f4f5f7',card:'#ffffff',ink:'#111827',muted:'#6b7280',line:'#e5e7eb'};
let appearance={...DEFAULT_APPEARANCE};
const thumbLoading=new Map();
let thumbObserver=null;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=n=>n===''||n==null?'—':new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(Number(n)||0);
function extensionAlive(){try{return !!chrome?.runtime?.id}catch{return false}}
async function msg(payload){
  try{
    if(!extensionAlive()) return {ok:false,error:'LotKeys Helper was updated. Reload the Facebook tab once.'};
    return await chrome.runtime.sendMessage(payload);
  }catch(err){
    return {ok:false,error:String(err?.message||err||'Extension context unavailable.')};
  }
}
async function safeStorageGet(keys){try{return extensionAlive()?await chrome.storage.local.get(keys):{}}catch{return {}}}
async function safeStorageSet(value){try{if(!extensionAlive())return false;await chrome.storage.local.set(value);return true}catch{return false}}
function validColor(value,fallback){const candidate=String(value||'').trim();return candidate&&CSS.supports('color',candidate)?candidate:fallback}
function applyAppearance(next={}){appearance={...DEFAULT_APPEARANCE,...(next&&typeof next==='object'?next:{})};const root=document.documentElement;root.dataset.lkTheme=appearance.theme==='dark'?'dark':'light';root.style.setProperty('--lk-bg',validColor(appearance.background,DEFAULT_APPEARANCE.background));root.style.setProperty('--lk-card',validColor(appearance.card,DEFAULT_APPEARANCE.card));root.style.setProperty('--lk-ink',validColor(appearance.ink,DEFAULT_APPEARANCE.ink));root.style.setProperty('--lk-muted',validColor(appearance.muted,DEFAULT_APPEARANCE.muted));root.style.setProperty('--lk-line',validColor(appearance.line,DEFAULT_APPEARANCE.line));root.style.setProperty('--lk-accent',validColor(appearance.accent,DEFAULT_APPEARANCE.accent));root.style.setProperty('--lk-accent-ink',validColor(appearance.accentInk,DEFAULT_APPEARANCE.accentInk))}
async function refreshAppearance(){const r=await msg({type:'GET_LOTKEYS_APPEARANCE'});if(r?.ok&&r.appearance){applyAppearance(r.appearance);return r.appearance}const cache=await safeStorageGet(APPEARANCE_KEY);if(cache?.[APPEARANCE_KEY])applyAppearance(cache[APPEARANCE_KEY]);return appearance}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function compareVersions(a,b){const left=String(a||'').split('.').map(x=>Number(x)||0),right=String(b||'').split('.').map(x=>Number(x)||0),len=Math.max(left.length,right.length);for(let i=0;i<len;i++){if((left[i]||0)!==(right[i]||0))return (left[i]||0)>(right[i]||0)?1:-1}return 0}
function trustedUpdateUrl(url){return TRUSTED_UPDATE_PREFIXES.some(prefix=>String(url||'').startsWith(prefix))}
async function checkForExtensionUpdate({quiet=false}={}){
  const button=$('#check-updates'),download=$('#download-update'),status=$('#update-status'),version=$('#extension-version');
  if(version)version.textContent=`V${CURRENT_EXTENSION_VERSION}`;if(button){button.disabled=true;button.textContent='Checking…'}if(download)download.hidden=true;
  try{
    const response=await fetch(UPDATE_MANIFEST_URL,{cache:'no-store'});if(!response.ok)throw new Error(`GitHub returned ${response.status}`);
    const release=await response.json(),latest=String(release?.version||'').trim(),url=String(release?.downloadUrl||'').trim();
    if(!/^\d+(?:\.\d+){1,3}$/.test(latest)||!trustedUpdateUrl(url))throw new Error('Release information is incomplete.');
    if(compareVersions(latest,CURRENT_EXTENSION_VERSION)>0){status.hidden=false;status.className='update-status available';status.textContent=`V${latest} is ready on GitHub.`;download.hidden=false;download.textContent=`Download V${latest}`;download.onclick=()=>chrome.tabs.create({url});}
    else{status.hidden=false;status.className='update-status good';status.textContent=`V${CURRENT_EXTENSION_VERSION} is the newest release.`;}
  }catch(error){if(!quiet){status.hidden=false;status.className='update-status warn';status.textContent='Could not check GitHub right now. The Posting Buddy will keep working.';}else status.hidden=true;}
  finally{if(button){button.disabled=false;button.textContent='Check for update'}}
}
async function savePostingSession(session){postingSession=session||null;await safeStorageSet({[POSTING_SESSION_KEY]:postingSession});}
async function clearPostingSession(){postingSession=null;await safeStorageSet({[POSTING_SESSION_KEY]:null});}
function unresolvedRows(result=lastResult){return (result?.steps||[]).filter(x=>x.status==='manual'||x.status==='skipped')}
function unresolvedNames(result=lastResult){return unresolvedRows(result).map(x=>String(x.label||'').replace(/^\d+\.\s*/,''))}
function stopFieldWatch(){if(fieldWatchTimer)clearInterval(fieldWatchTimer);fieldWatchTimer=null;fieldWatchBusy=false}
async function checkFacebookFields({autoAdvance=true}={}){
  if(fieldWatchBusy||!selected||!lastResult||String(postingSession?.phase||'')!=='attention')return false;
  const pending=unresolvedRows(lastResult);if(!pending.length){if(autoAdvance)await completeFieldTransfer({detected:true});return true}
  fieldWatchBusy=true;
  try{
    const r=await msg({type:'CHECK_FACEBOOK_FIELDS',keys:pending.map(x=>x.key)});if(!r?.ok)return false;
    const steps=(lastResult?.steps||[]).map(x=>({...x}));let changed=false;
    for(const step of steps){if(step.status!=='manual'&&step.status!=='skipped')continue;const state=r.fields?.[step.key];if(state?.filled){step.status='done';step.reason='filled on Facebook';changed=true}}
    if(changed){lastResult={...(lastResult||{}),steps,manualKeys:unresolvedRows({steps}).map(x=>x.key)};renderProgress(lastResult,false)}
    const remain=unresolvedRows(lastResult);
    if(!remain.length&&autoAdvance){await completeFieldTransfer({detected:true});return true}
    if(changed){sessionAttention(unresolvedNames(lastResult));await savePostingSession({listingId:selected.id,phase:'attention',result:lastResult,startedAt:postingSession?.startedAt||Date.now(),updatedAt:Date.now()})}
    return false;
  }finally{fieldWatchBusy=false}
}
function startFieldWatch(){stopFieldWatch();fieldWatchTimer=setInterval(()=>checkFacebookFields({autoAdvance:true}).catch(()=>{}),850);setTimeout(()=>checkFacebookFields({autoAdvance:true}).catch(()=>{}),180)}

let transferFeedbackTimer=null;
function showTransferFeedback(kind,missingNames=[]){
  const box=$('#transfer-feedback');if(!box)return;
  const good=kind==='good';
  $('#transfer-feedback-icon').textContent='✓';
  $('#transfer-feedback-title').textContent=good?'Vehicle information moved to Facebook':'Facebook needs a quick review';
  $('#transfer-feedback-text').textContent=good?'Everything LotKeys could fill was transferred. Review Facebook, then click Next when ready.':(missingNames.length?`Check ${missingNames.join(', ')} — the highlighted fields are ready to jump to or reinject.`:'Some Facebook fields still need attention.');
  box.className='transfer-feedback '+(good?'good':'warn');box.hidden=false;
  clearTimeout(transferFeedbackTimer);transferFeedbackTimer=setTimeout(()=>{box.hidden=true},good?2600:3400);
}
function setStatus(el,ok,text){el.className='status '+(ok===true?'good':ok===false?'bad':'');el.querySelector('span').textContent=text}
async function refreshStatus(){
  const r=await msg({type:'GET_TAB_STATUS'});
  const connected=!!(r?.lotkeys&&r?.facebook);
  setStatus($('#lotkeys-status'),r?.lotkeys,r?.lotkeys?'LotKeys tab connected':'Open LotKeys in Chrome');
  setStatus($('#facebook-status'),r?.facebook,r?.facebook?'Facebook tab detected':'Open Facebook Marketplace → Vehicle for sale');
  const refresh=$('#refresh-status');
  refresh.hidden=connected;
  refresh.textContent=connected?'Connection ready ✓':'Refresh connection';
  $('#fill-facebook').disabled=!(selected&&connected);
}
function filtered(){const q=$('#search').value.trim().toLowerCase();return listings.filter(x=>!q||[x.title,x.year,x.make,x.model].join(' ').toLowerCase().includes(q))}
function thumbKey(listingId,index=0,photoId=''){return `${String(listingId)}:${String(photoId||('index-'+(Number(index)||0)))}`}
async function saveThumbCache(){
  const entries=Object.entries(thumbCache);
  if(entries.length>80){
    entries.sort((a,b)=>(Number(b[1]?.at)||0)-(Number(a[1]?.at)||0));
    thumbCache=Object.fromEntries(entries.slice(0,80));
  }
  await chrome.storage.local.set({lotkeysThumbCache:thumbCache});
}
async function fetchThumb(listingId,index=0,photoId=''){
  const key=thumbKey(listingId,index,photoId),cached=thumbCache[key];
  if(cached?.dataUrl)return cached.dataUrl;
  if(thumbLoading.has(key))return thumbLoading.get(key);
  const promise=(async()=>{
    try{
      const r=await msg({type:'GET_THUMB',listingId:String(listingId||''),photoIndex:Number(index)||0,photoId:String(photoId||'')});
      if(!r?.ok)throw new Error(r?.error||'Could not load preview');
      const dataUrl=r?.photo?.dataUrl||'';
      if(dataUrl){thumbCache[key]={dataUrl,at:Date.now()};saveThumbCache().catch(()=>{});}
      return dataUrl;
    }catch(e){return ''}
    finally{thumbLoading.delete(key)}
  })();
  thumbLoading.set(key,promise);
  return promise;
}
async function paintThumb(el){
  if(!el||el.dataset.loaded==='1')return;
  const listingId=el.dataset.listingId,index=Number(el.dataset.photoIndex)||0,photoId=el.dataset.photoId||'';
  el.dataset.loaded='1';
  const dataUrl=await fetchThumb(listingId,index,photoId);
  if(!el.isConnected)return;
  if(dataUrl){el.innerHTML=`<img src="${dataUrl}" alt="Listing photo">`;el.classList.add('loaded')}
  else{el.innerHTML='<span>🚗</span>';el.classList.add('missing')}
}
function observeThumbs(root=document){
  if(!thumbObserver){
    thumbObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){paintThumb(entry.target);thumbObserver.unobserve(entry.target)}}),{root:null,rootMargin:'100px'});
  }
  root.querySelectorAll?.('.listing-thumb[data-listing-id],.selected-photo[data-listing-id],.session-photo[data-listing-id]').forEach(el=>thumbObserver.observe(el));
}
function renderListings(){
  const rows=filtered(),box=$('#listings');
  box.innerHTML=rows.length?rows.map(x=>`<button class="listing ${selected?.id===x.id?'selected':''}" data-id="${esc(x.id)}"><span class="listing-thumb" data-listing-id="${esc(x.id)}" data-photo-index="0" data-photo-id="${esc((x.photoIds||[])[0]||'')}"><span>${Number(x.photoCount)||0?'…':'🚗'}</span></span><span class="listing-copy"><strong>${esc(x.title)}</strong><small>${esc([x.year,x.make,x.model].filter(Boolean).join(' '))}</small><span class="meta"><span class="pill">${money(x.price)}</span><span class="pill">${esc(x.odometer===''?'No mileage':Number(x.odometer).toLocaleString()+' '+(x.odometerUnit||''))}</span><span class="pill">${Number(x.photoCount)||0} photos</span></span></span></button>`).join(''):'<div class="empty">No matching LotKeys Listings.</div>';
  box.querySelectorAll('.listing').forEach(b=>b.onclick=()=>selectListing(b.dataset.id));
  observeThumbs(box);
}
function renderSelectedPhotos(){
  const box=$('#selected-photos');if(!box)return;
  const count=Math.min(6,Number(selected?.photoCount)||0);
  box.hidden=!count;
  box.innerHTML=count?Array.from({length:count},(_,i)=>`<button class="selected-photo" type="button" data-listing-id="${esc(selected.id)}" data-photo-index="${i}" data-photo-id="${esc((selected.photoIds||[])[i]||'')}" title="Photo ${i+1}"><span>…</span></button>`).join(''):'';
  observeThumbs(box);
}
function sessionVehicleCard(){
  if(!selected)return '';
  return `<span class="session-photo" data-listing-id="${esc(selected.id)}" data-photo-index="0" data-photo-id="${esc((selected.photoIds||[])[0]||'')}"><span>${Number(selected.photoCount)||0?'…':'🚗'}</span></span><span class="session-copy"><strong>${esc(selected.title)}</strong><small>${esc([selected.year,selected.make,selected.model,selected.bodyStyle].filter(Boolean).join(' · '))}</small><small>${money(selected.price)} · ${selected.odometer===''?'Mileage blank':Number(selected.odometer).toLocaleString()+' '+selected.odometerUnit} · ${Number(selected.photoCount)||0} photos</small></span>`;
}
function setFollowupLocked(locked=true){const details=$('#followup-details'),input=$('#views-input'),button=$('#save-view-snapshot');if(!details)return;details.classList.toggle('locked',!!locked);details.setAttribute('aria-disabled',locked?'true':'false');if(input)input.disabled=!!locked;if(button)button.disabled=!!locked}
function paintSelectedListing({followup=false}={}){
  const sec=$('#selected-section');if(!sec)return;sec.hidden=!selected;if(!selected)return;
  const websiteButton=$('#use-facebook-website');if(websiteButton&&String(websiteButton.dataset.listingId||'')!==String(selected.id)){websiteButton.dataset.listingId=String(selected.id);websiteButton.classList.remove('url-saved');websiteButton.disabled=false;websiteButton.textContent=selected.facebookUrl?'Update / Use this Website':'Save / Use this Website'}
  $('#selected-card').className='selected-card';
  $('#selected-card').innerHTML=`<strong>${esc(selected.title)}</strong><small>${esc([selected.year,selected.make,selected.model,selected.bodyStyle].filter(Boolean).join(' · '))}</small><small>${money(selected.price)} · ${selected.odometer===''?'Mileage blank':Number(selected.odometer).toLocaleString()+' '+selected.odometerUnit} · ${selected.photoCount} photos</small><small class="active-confirm">${followup?'✓ Facebook fields complete · save the live page when ready':'✓ Active Listing selected for this Facebook post'}</small>`;
  renderSelectedPhotos();const fill=$('#fill-facebook');if(fill)fill.hidden=!!followup;
  const follow=$('#followup-section');if(follow){follow.hidden=!(followup||selected?.facebookUrl);follow.classList.toggle('active-followup',!!followup);setFollowupLocked(!selected?.facebookUrl)}
  if(followup){$('#followup-status').textContent='';$('#followup-status').className='followup-status';setTimeout(()=>follow?.scrollIntoView({behavior:'smooth',block:'start'}),80)}
}

function showPickerStart({keepSelected=false}={}){
  stopFieldWatch();$('#fill-facebook').hidden=false;$('#followup-section').classList.remove('active-followup');
  $('#listing-picker-section').hidden=false;$('#posting-session-section').hidden=true;$('#progress-section').hidden=true;
  if(!keepSelected){selected=null;manualKeys=[];manualIndex=0;lastResult=null;$('#selected-section').hidden=true;$('#followup-section').hidden=true;renderListings();}
  else{paintSelectedListing({followup:false});renderListings();}
  refreshStatus();
}
function paintSessionCard(){const card=$('#posting-session-card');if(!card||!selected)return;card.innerHTML=sessionVehicleCard();observeThumbs(card)}
function sessionLoading(copy='Moving your LotKeys Listing into Facebook…'){
  const sec=$('#posting-session-section'),stage=$('#posting-session-stage');if(!sec||!stage)return;
  sec.classList.remove('transfer-ready','transfer-attention');stage.innerHTML=`<div class="session-loader"><div class="session-logo-ring"><img src="icon.png" alt="LotKeys"></div><strong class="session-stage-title">LotKeys is working</strong><span class="session-stage-copy">${esc(copy)}</span></div>`;
}
function sessionAttention(missingNames=[]){
  const sec=$('#posting-session-section'),stage=$('#posting-session-stage');if(!sec||!stage)return;
  sec.classList.remove('transfer-ready');sec.classList.add('transfer-attention');stage.innerHTML=`<div class="session-check warn">✓</div><strong class="session-stage-title">Facebook needs a quick review</strong><span class="session-stage-copy">${missingNames.length?`Check ${esc(missingNames.join(', '))}. LotKeys will notice as you fill Facebook, or you can confirm everything at the bottom.`:'One or more Facebook fields still need attention.'}</span>`;
}
function sessionTransferComplete({animate=true}={}){
  const sec=$('#posting-session-section'),stage=$('#posting-session-stage');if(!sec||!stage)return;
  sec.classList.remove('transfer-attention');sec.classList.add('transfer-ready');
  stage.innerHTML=`<div class="session-check good">✓</div><strong class="session-stage-title">All Facebook fields filled</strong><span class="session-stage-copy">The vehicle information looks complete. Continue when you are ready to finish publishing and save the live Facebook URL / views back into LotKeys.</span><div class="session-url-box"><button id="continue-to-followup" class="primary session-continue" type="button">Continue to URL &amp; Views</button></div>`;
  $('#continue-to-followup').onclick=enterFollowupView;if(!animate){const check=stage.querySelector('.session-check');if(check)check.style.animation='none'}
}
function showPostingSession(phase='filling',{restore=false}={}){
  if(!selected)return;$('#listing-picker-section').hidden=true;$('#selected-section').hidden=true;$('#followup-section').hidden=true;$('#posting-session-section').hidden=false;paintSessionCard();
  if(phase==='filling'){stopFieldWatch();sessionLoading()}
  else if(phase==='attention'){sessionAttention(unresolvedNames(lastResult));$('#progress-section').hidden=false;startFieldWatch();}
  else if(phase==='transfer_complete'||phase==='awaiting_url'||phase==='complete'){stopFieldWatch();sessionTransferComplete({animate:!restore});$('#progress-section').hidden=true;}
  setTimeout(()=>$('#posting-session-section')?.scrollIntoView({behavior:restore?'auto':'smooth',block:'start'}),40);
}
async function completeFieldTransfer({detected=false}={}){
  if(!selected)return;stopFieldWatch();await savePostingSession({listingId:selected.id,phase:'transfer_complete',result:lastResult,startedAt:postingSession?.startedAt||Date.now(),updatedAt:Date.now(),detected:!!detected});
  $('#progress-section').hidden=true;sessionTransferComplete({animate:true});setTimeout(()=>$('#posting-session-section')?.scrollIntoView({behavior:'smooth',block:'start'}),40);
}
async function enterFollowupView({restore=false}={}){
  if(!selected)return;stopFieldWatch();await savePostingSession({listingId:selected.id,phase:'followup',result:lastResult,startedAt:postingSession?.startedAt||Date.now(),updatedAt:Date.now()});
  $('#posting-session-section').hidden=true;$('#progress-section').hidden=true;$('#listing-picker-section').hidden=false;renderListings();paintSelectedListing({followup:true});if(!restore)setTimeout(()=>$('#followup-section')?.scrollIntoView({behavior:'smooth',block:'start'}),70);
}
async function abandonPostingSession(){stopFieldWatch();await clearPostingSession();showPickerStart({keepSelected:false})}
async function restorePostingSession(){
  if(!postingSession?.listingId)return false;selected=listings.find(x=>String(x.id)===String(postingSession.listingId))||null;if(!selected){await clearPostingSession();return false}
  renderListings();lastResult=postingSession.result||lastResult;const phase=String(postingSession.phase||'followup');
  if(phase==='attention'&&lastResult){renderProgress(lastResult,false);showPostingSession('attention',{restore:true});}
  else if(phase==='filling'){await savePostingSession({...postingSession,phase:'attention',updatedAt:Date.now()});showPostingSession('attention',{restore:true});$('#posting-session-stage').innerHTML='<div class="session-check warn">!</div><strong class="session-stage-title">Posting session was interrupted</strong><span class="session-stage-copy">Use Back and run Fill Facebook Listing again so LotKeys can verify every field before continuing.</span>';$('#progress-section').hidden=true;}
  else if(phase==='transfer_complete'||phase==='awaiting_url'||phase==='complete')showPostingSession('transfer_complete',{restore:true});else await enterFollowupView({restore:true});return true;
}
async function selectListing(id){
  if(postingSession?.listingId&&String(postingSession.listingId)!==String(id))await clearPostingSession();stopFieldWatch();selected=listings.find(x=>x.id===id)||null;renderListings();$('#posting-session-section').hidden=true;$('#listing-picker-section').hidden=false;
  manualKeys=[];manualIndex=0;lastResult=null;$('#progress-section').hidden=true;paintSelectedListing({followup:false});
  if(selected){$('#views-input').value='';$('#followup-status').textContent='';$('#followup-status').className='followup-status';setTimeout(()=>$('#selected-section')?.scrollIntoView({behavior:'smooth',block:'start'}),40)}refreshStatus();
}
async function syncListings(){
  const b=$('#sync-listings');b.disabled=true;b.textContent='Syncing…';
  try{
    const r=await msg({type:'SYNC_LISTINGS'});if(!r?.ok)throw new Error(r?.error||'Could not sync Listings');
    listings=r.listings||[];if(r.appearance)applyAppearance(r.appearance);else refreshAppearance().catch(()=>{});
    if(postingSession?.listingId){selected=listings.find(x=>String(x.id)===String(postingSession.listingId))||null;renderListings();if(selected)await restorePostingSession();else{await clearPostingSession();showPickerStart({keepSelected:false})}}
    else{selected=selected&&listings.find(x=>x.id===selected.id)||null;renderListings();if(selected)selectListing(selected.id);else{$('#selected-section').hidden=true;$('#followup-section').hidden=true;}}
  }catch(e){$('#listings').innerHTML=`<div class="empty">${esc(e.message||e)}</div>`}
  finally{b.disabled=false;b.textContent='↻ Sync';refreshStatus()}
}
function renderProgress(result,announce=false){
  lastResult=result;const steps=result?.steps||[],pending=unresolvedRows({steps}),missingNames=pending.map(x=>String(x.label||'').replace(/^\d+\.\s*/,''));manualKeys=pending.map(x=>x.key).filter(Boolean);manualIndex=Math.min(manualIndex,Math.max(0,manualKeys.length-1));
  const section=$('#progress-section');section.hidden=false;$('#next-confirm').hidden=true;$('#progress-summary').textContent=pending.length?`${pending.length} Facebook field${pending.length===1?'':'s'} still to confirm · ${missingNames.slice(0,3).join(', ')}${missingNames.length>3?'…':''}`:'All Facebook fields filled ✓';
  const badge=$('#completion-badge');badge.textContent='✓';badge.className='completion '+(pending.length?'warn':'good');section.classList.toggle('fill-good',!pending.length);section.classList.toggle('fill-warn',!!pending.length);
  $('#progress-list').innerHTML=steps.map(s=>{const unresolved=s.status==='manual'||s.status==='skipped',manual=s.status==='manual',reason=s.status==='skipped'&&/blank in LotKeys/i.test(String(s.reason||''))?'blank in LotKeys · fill manually on Facebook':s.reason;return `<div class="progress-row ${manual?'manual':s.status==='skipped'?'pending':''}"><span class="progress-icon">${s.status==='done'?'✅':s.status==='skipped'?'○':'⚠️'}</span><div><b>${esc(s.label)}</b>${reason?`<small>${esc(reason)}</small>`:''}${unresolved?`<div class="progress-row-actions"><button class="jump-field" type="button" data-field-key="${esc(s.key||'')}">Jump to field</button>${manual?`<button class="retry-field" type="button" data-field-key="${esc(s.key||'')}">↻ Reinject</button>`:''}</div>`:''}</div></div>`}).join('');
  document.querySelectorAll('.jump-field').forEach(b=>b.onclick=()=>jumpToMissing(b.dataset.fieldKey));document.querySelectorAll('.retry-field').forEach(b=>b.onclick=()=>retryMissing(b.dataset.fieldKey,b));$('#jump-next-missing').disabled=!manualKeys.length;if(announce&&pending.length)sessionAttention(missingNames);if(pending.length)setTimeout(()=>section.scrollIntoView({behavior:'smooth',block:'start'}),80);
}
async function jumpToMissing(key){if(!key)return;const r=await msg({type:'JUMP_FIELD',key});if(!r?.ok)$('#progress-summary').textContent=r?.error||'Could not find that Facebook field'}
async function retryMissing(key,button){if(!key||!selected)return;if(button){button.disabled=true;button.textContent='Retrying…'}try{const r=await msg({type:'RETRY_FIELD',key,listing:selected});if(!r?.ok)throw new Error(r?.error||'Could not reinject that field');const steps=(lastResult?.steps||[]).map(x=>({...x})),i=steps.findIndex(x=>x.key===key);if(i>=0)steps[i]={...steps[i],...(r.result||{})};lastResult={...(lastResult||{}),steps,manualKeys:unresolvedRows({steps}).map(x=>x.key)};renderProgress(lastResult,false);const remain=unresolvedRows(lastResult);if(remain.length){sessionAttention(unresolvedNames(lastResult));await savePostingSession({listingId:selected.id,phase:'attention',result:lastResult,startedAt:postingSession?.startedAt||Date.now(),updatedAt:Date.now()});startFieldWatch()}else{sessionLoading('Final check complete. Preparing the Facebook handoff…');await wait(450);await completeFieldTransfer({detected:true})}}catch(e){$('#progress-summary').textContent=e.message||e}finally{if(button){button.disabled=false;button.textContent='↻ Reinject'}}}
async function confirmAllFieldsFilled(){
  if(!selected||!lastResult)return;stopFieldWatch();const steps=(lastResult.steps||[]).map(x=>(x.status==='manual'||x.status==='skipped')?{...x,status:'done',reason:'confirmed filled on Facebook'}:{...x});lastResult={...lastResult,steps,manualKeys:[]};renderProgress(lastResult,false);sessionLoading('All fields confirmed. Preparing the Facebook handoff…');await wait(380);await completeFieldTransfer({detected:false});
}
async function fillFacebook(){if(!selected)return;stopFieldWatch();const b=$('#fill-facebook');b.disabled=true;b.textContent='Starting…';manualKeys=[];manualIndex=0;lastResult=null;
  // Refresh only the lightweight Listing records before posting so the current LotKeys selected photo IDs/order
  // are used even if the Helper list was opened before the Listing was edited.
  try{const fresh=await msg({type:'SYNC_LISTINGS'});if(fresh?.ok&&Array.isArray(fresh.listings)){listings=fresh.listings;const current=listings.find(x=>String(x.id)===String(selected.id));if(current)selected=current;renderListings();paintSelectedListing();}}catch(e){console.warn('LotKeys Assistant pre-fill listing refresh',e)}
  await savePostingSession({listingId:selected.id,phase:'filling',startedAt:Date.now(),updatedAt:Date.now()});showPostingSession('filling');$('#progress-section').hidden=true;const started=Date.now();try{const r=await msg({type:'FILL_FACEBOOK',listing:selected});if(!r?.ok)throw new Error(r?.error||'Facebook fill failed');await wait(Math.max(0,850-(Date.now()-started)));lastResult=r;const pending=unresolvedRows(r);if(pending.length){renderProgress(r,false);sessionAttention(unresolvedNames(r));await savePostingSession({listingId:selected.id,phase:'attention',result:r,startedAt:postingSession?.startedAt||Date.now(),updatedAt:Date.now()});startFieldWatch()}else{sessionLoading('Everything LotKeys can verify is in place. Finishing the handoff…');await wait(500);await completeFieldTransfer({detected:true})}}catch(e){stopFieldWatch();await clearPostingSession();showPostingSession('attention');$('#posting-session-stage').innerHTML=`<div class="session-check warn">!</div><strong class="session-stage-title">Facebook Assistant stopped</strong><span class="session-stage-copy">${esc(e.message||e)}<br><br>Use Back and retry after Facebook is ready.</span>`}finally{b.disabled=false;b.textContent='Fill Facebook Listing'}}
async function useFacebookWebsite(){if(!selected)return;const b=$('#session-use-facebook-website')||$('#use-facebook-website'),status=$('#session-url-status')||$('#followup-status');b.disabled=true;b.textContent='Saving website…';try{const page=await msg({type:'GET_FACEBOOK_URL'});const url=String(page?.url||'').trim();if(!/^https:\/\/(?:www\.)?facebook\.com\/marketplace\/item\/[^/?#]+/i.test(url))throw new Error('Finish publishing and open the live Facebook Marketplace ad first.');const r=await msg({type:'SAVE_LISTING_FOLLOWUP',listingId:selected.id,facebookUrl:url,views:''});if(!r?.ok)throw new Error(r?.error||'Could not save Facebook URL');selected.facebookUrl=url;listings=listings.map(x=>String(x.id)===String(selected.id)?{...x,facebookUrl:url}:x);await safeStorageSet({lotkeysListings:listings});await savePostingSession({listingId:selected.id,phase:'website_saved',result:lastResult,facebookUrl:url,startedAt:postingSession?.startedAt||Date.now(),updatedAt:Date.now()});setFollowupLocked(false);b.textContent='✓ Website saved to LotKeys';b.classList.add('url-saved');status.textContent='Live Facebook ad saved back to this Listing ✓ · Add the current views below.';status.className=status.id==='session-url-status'?'session-url-status good':'followup-status good';$('#views-input')?.focus()}catch(e){status.textContent=e.message||e;status.className=status.id==='session-url-status'?'session-url-status warn':'followup-status warn';b.disabled=false;b.textContent='Save / Use this Website';return}finally{if(b?.isConnected&&!b.classList.contains('url-saved'))b.disabled=false}}
async function saveViews(){if(!selected)return;const b=$('#save-view-snapshot'),status=$('#followup-status'),views=$('#views-input').value.trim();if(!selected.facebookUrl){status.textContent='Save / Use this Website before adding views.';status.className='followup-status warn';setFollowupLocked(true);return}if(!views){status.textContent='Enter the current Marketplace view count first.';status.className='followup-status warn';return}b.disabled=true;b.textContent='Saving…';try{const r=await msg({type:'SAVE_LISTING_FOLLOWUP',listingId:selected.id,facebookUrl:'',views});if(!r?.ok)throw new Error(r?.error||'Could not save views');status.textContent=`${Number(r.views).toLocaleString()} views saved to LotKeys ✓`;status.className='followup-status good';$('#views-input').value=''}catch(e){status.textContent=e.message||e;status.className='followup-status warn'}finally{b.disabled=false;b.textContent='Save Views'}}
$('#sync-listings').onclick=syncListings;$('#refresh-status').onclick=refreshStatus;$('#check-updates').onclick=()=>checkForExtensionUpdate({quiet:false});$('#search').oninput=renderListings;$('#fill-facebook').onclick=fillFacebook;$('#back-to-listings').onclick=abandonPostingSession;$('#progress-back').onclick=abandonPostingSession;$('#all-fields-filled').onclick=confirmAllFieldsFilled;$('#jump-next-missing').onclick=()=>{if(!manualKeys.length)return;const key=manualKeys[manualIndex%manualKeys.length];manualIndex=(manualIndex+1)%manualKeys.length;jumpToMissing(key)};$('#use-facebook-website').onclick=useFacebookWebsite;$('#save-view-snapshot').onclick=saveViews;
try{chrome.runtime.onMessage.addListener(msg=>{if(msg?.type==='FACEBOOK_NEXT_CLICKED'&&selected&&msg.listingId===selected.id){$('#next-confirm').hidden=false;$('#completion-badge').textContent='✓';$('#completion-badge').className='completion good';$('#progress-summary').textContent='Facebook first step complete ✓'}})}catch{}
try{chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes?.[APPEARANCE_KEY]?.newValue)applyAppearance(changes[APPEARANCE_KEY].newValue)})}catch{}
let statusTicks=0;const statusTimer=setInterval(()=>{if(!extensionAlive()){clearInterval(statusTimer);return}refreshStatus().catch(()=>{});statusTicks++;if(statusTicks%24===0)refreshAppearance().catch(()=>{})},2500);
(async()=>{try{const cache=await safeStorageGet(['lotkeysListings','lotkeysThumbCache',POSTING_SESSION_KEY,APPEARANCE_KEY]);applyAppearance(cache[APPEARANCE_KEY]||DEFAULT_APPEARANCE);thumbCache=cache.lotkeysThumbCache&&typeof cache.lotkeysThumbCache==='object'?cache.lotkeysThumbCache:{};listings=Array.isArray(cache.lotkeysListings)?cache.lotkeysListings:[];postingSession=cache[POSTING_SESSION_KEY]&&typeof cache[POSTING_SESSION_KEY]==='object'?cache[POSTING_SESSION_KEY]:null;selected=null;renderListings();$('#selected-section').hidden=true;$('#followup-section').hidden=true;$('#posting-session-section').hidden=true;if(!extensionAlive()){setStatus(false,false,'Helper updated · reload Facebook');return}await refreshStatus();refreshAppearance().catch(()=>{});checkForExtensionUpdate({quiet:true}).catch(()=>{});if(!listings.length)await syncListings();else if(postingSession?.listingId)await restorePostingSession()}catch{setStatus(false,false,'Helper updated · reload Facebook')}})();
