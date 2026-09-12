(function(){
'use strict';

const VERSION='0.9.4.72';
const LOCAL_SOURCE=new URL('./lotkeys-info.json',location.href).href;
const CANONICAL_SOURCE='https://raw.githubusercontent.com/MrMilo34/Lot-Keys/main/lotkeys-info.json';
const CACHE_KEY='lotkeys-platform-info-cache-v1';
const SEEN_KEY='lotkeys-platform-info-seen-v1';
const DRAFT_KEY='lotkeys-platform-info-developer-draft-v1';
const PUBLISH_URL='https://github.com/MrMilo34/Lot-Keys/edit/main/lotkeys-info.json';
const TYPES=new Set(['heading','text','image','video','link','file']);
let current=readJson(CACHE_KEY,null);
let refreshPromise=null;

const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const uid=(prefix='INFO')=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const bridge=()=>window.LotKeysMessagingBridge||null;

function readJson(key,fallback){
  try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}
}
function writeJson(key,value){
  try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}
}
function safeUrl(value=''){
  try{const url=new URL(String(value||'').trim(),location.href);return ['http:','https:'].includes(url.protocol)?url.href:''}catch{return''}
}
function cleanBlock(raw={},index=0){
  raw=raw&&typeof raw==='object'?raw:{};
  const type=TYPES.has(String(raw.type||''))?String(raw.type):'text';
  return {
    id:String(raw.id||`block-${index}`),
    type,
    text:String(raw.text||'').slice(0,5000),
    label:String(raw.label||raw.name||'').slice(0,180),
    url:safeUrl(raw.url||raw.href||''),
    caption:String(raw.caption||'').slice(0,500)
  };
}
function normalizeInfo(raw={}){
  raw=raw&&typeof raw==='object'?raw:{};
  return {
    schemaVersion:1,
    id:String(raw.id||'lotkeys-info-empty'),
    active:raw.active===true,
    title:String(raw.title||'LotKeys Info').trim().slice(0,100)||'LotKeys Info',
    summary:String(raw.summary||'').trim().slice(0,500),
    updatedAt:String(raw.updatedAt||''),
    blocks:(Array.isArray(raw.blocks)?raw.blocks:[]).map(cleanBlock).filter(block=>{
      if(block.type==='heading'||block.type==='text')return !!block.text.trim();
      return !!block.url;
    })
  };
}
function messageKey(info=current){
  const value=normalizeInfo(info||{});
  return `${value.id}|${value.updatedAt}`;
}
function hasUnread(){
  const info=normalizeInfo(current||{});
  if(!info.active)return false;
  try{return localStorage.getItem(SEEN_KEY)!==messageKey(info)}catch{return true}
}
function markSeen(){
  if(!current)return;
  try{localStorage.setItem(SEEN_KEY,messageKey(current))}catch{}
  paintButtons();
}

function paintButtons(){
  for(const button of document.querySelectorAll('#lotkeys-info-btn')){
    button.classList.toggle('has-unread',hasUnread());
    button.setAttribute('aria-label',hasUnread()?'New LotKeys Info available':'Open LotKeys Info');
    if(button.dataset.lotkeysInfoBound!=='1'){
      button.dataset.lotkeysInfoBound='1';
      button.addEventListener('click',open);
    }
  }
}

async function fetchCurrent({quiet=true}={}){
  if(refreshPromise)return refreshPromise;
  refreshPromise=(async()=>{
    // The protected production file is the platform-wide source of truth. The
    // bundled copy keeps a new TEST build useful until that file is published.
    const urls=[CANONICAL_SOURCE,LOCAL_SOURCE].filter((url,index,rows)=>rows.indexOf(url)===index);
    let lastError=null;
    for(const url of urls){
      try{
        const target=new URL(url);target.searchParams.set('lotkeys-info-check',Date.now());
        const response=await fetch(target.href,{cache:'no-store'});
        if(!response.ok)throw new Error(`LotKeys Info returned ${response.status}`);
        const raw=await response.json();
        if(!String(raw?.id||'').trim())throw new Error('LotKeys Info is missing its message ID.');
        const next=normalizeInfo(raw);
        current=next;writeJson(CACHE_KEY,next);paintButtons();
        window.dispatchEvent(new CustomEvent('lotkeys-info-updated',{detail:next}));
        return next;
      }catch(error){lastError=error}
    }
    if(!quiet&&lastError)throw lastError;
    return normalizeInfo(current||{});
  })().finally(()=>{refreshPromise=null});
  return refreshPromise;
}

function renderBlock(block={}){
  const type=String(block.type||'text'),url=safeUrl(block.url||'');
  if(type==='heading')return `<h3 class="lkinfo-heading">${esc(block.text)}</h3>`;
  if(type==='text')return `<div class="lkinfo-text">${esc(block.text).replace(/\n/g,'<br>')}</div>`;
  if(type==='image'&&url)return `<figure class="lkinfo-media"><img src="${esc(url)}" alt="${esc(block.label||block.caption||'LotKeys information image')}" loading="lazy">${block.caption?`<figcaption>${esc(block.caption)}</figcaption>`:''}</figure>`;
  if(type==='video'&&url)return `<figure class="lkinfo-media"><video src="${esc(url)}" controls playsinline preload="metadata"></video>${block.caption?`<figcaption>${esc(block.caption)}</figcaption>`:''}</figure>`;
  if(type==='link'&&url)return `<a class="lkinfo-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span>🔗</span><span><strong>${esc(block.label||'Open link')}</strong>${block.caption?`<small>${esc(block.caption)}</small>`:''}</span><b>›</b></a>`;
  if(type==='file'&&url)return `<a class="lkinfo-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span>📎</span><span><strong>${esc(block.label||'Open file')}</strong>${block.caption?`<small>${esc(block.caption)}</small>`:''}</span><b>›</b></a>`;
  return '';
}
function infoBody(info,{preview=false}={}){
  info=normalizeInfo(info||{});
  const when=info.updatedAt&&!Number.isNaN(Date.parse(info.updatedAt))?new Date(info.updatedAt).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}):'';
  const blocks=info.blocks.map(renderBlock).join('');
  return `<div class="modal-head"><div><div class="eyebrow">${preview?'PREVIEW · LOTKEYS INFO':'FROM THE LOTKEYS TEAM'}</div><h2>${esc(info.title||'LotKeys Info')}</h2></div><button class="close lkinfo-close" type="button" aria-label="Close">×</button></div><div class="lkinfo-hero"><img src="./assets/lotkeys-default-logo.png" alt="LotKeys"><div><strong>${esc(info.title||'LotKeys Info')}</strong>${when?`<small>Updated ${esc(when)}</small>`:''}</div></div>${info.summary?`<div class="lkinfo-summary">${esc(info.summary)}</div>`:''}<div class="lkinfo-blocks">${blocks||(info.active?'<div class="lkinfo-empty">There is no additional platform notice right now.</div>':'<div class="lkinfo-empty">There is no active LotKeys notice right now.</div>')}</div>`;
}
function showModal(html){
  const modal=document.getElementById('modal'),body=document.getElementById('modal-body');
  if(!modal||!body)return null;
  body.innerHTML=html;
  body.querySelector('.lkinfo-close')?.addEventListener('click',()=>modal.close());
  if(!modal.open)modal.showModal();
  return body;
}
function open(){
  const info=normalizeInfo(current||{});
  showModal(infoBody(info));markSeen();
  fetchCurrent().then(next=>{
    const modal=document.getElementById('modal'),body=document.getElementById('modal-body');
    if(modal?.open&&body?.querySelector('.lkinfo-hero')&&messageKey(next)!==messageKey(info)){body.innerHTML=infoBody(next);body.querySelector('.lkinfo-close')?.addEventListener('click',()=>modal.close());markSeen()}
  }).catch(()=>{});
}

function draftBlockHtml(block,index,total){
  const kind={heading:'Heading',text:'Text',image:'Image',video:'Video',link:'Link',file:'File'}[block.type]||'Text';
  const main=block.type==='heading'?`<input data-info-value="text" maxlength="180" value="${esc(block.text)}" placeholder="Heading">`:block.type==='text'?`<textarea data-info-value="text" maxlength="5000" placeholder="Write the update…">${esc(block.text)}</textarea>`:`<input data-info-value="label" maxlength="180" value="${esc(block.label)}" placeholder="${kind} label"><input data-info-value="url" type="url" value="${esc(block.url)}" placeholder="Public https:// URL"><textarea data-info-value="caption" maxlength="500" placeholder="Caption or description · optional">${esc(block.caption)}</textarea>`;
  return `<div class="lkinfo-draft-block" draggable="true" data-info-index="${index}"><div class="lkinfo-draft-head"><span><b class="lkinfo-drag">☰</b> ${kind}</span><span><button type="button" data-info-move="up" ${index===0?'disabled':''}>↑</button><button type="button" data-info-move="down" ${index===total-1?'disabled':''}>↓</button><button type="button" data-info-delete>Delete</button></span></div><div class="lkinfo-draft-body">${main}</div></div>`;
}
function draftFromEditor(body,draft){
  body.querySelectorAll('.lkinfo-draft-block').forEach(element=>{
    const block=draft[Number(element.dataset.infoIndex)];if(!block)return;
    element.querySelectorAll('[data-info-value]').forEach(input=>{block[input.dataset.infoValue]=input.value});
  });
  return draft;
}
function buildPublishInfo(body,draft,{newIdentity=false}={}){
  draftFromEditor(body,draft);
  const previous=normalizeInfo(current||{}),stamp=new Date().toISOString();
  return normalizeInfo({
    id:newIdentity?`lotkeys-info-${Date.now().toString(36)}`:(previous.id||`lotkeys-info-${Date.now().toString(36)}`),
    active:!!body.querySelector('#lkinfo-active')?.checked,
    title:String(body.querySelector('#lkinfo-title')?.value||'LotKeys Info'),
    summary:String(body.querySelector('#lkinfo-summary')?.value||''),
    updatedAt:newIdentity?stamp:(previous.updatedAt||stamp),
    blocks:draft
  });
}
function downloadJson(info){
  const blob=new Blob([`${JSON.stringify(info,null,2)}\n`],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='lotkeys-info.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
async function isDeveloper(){
  try{return !!(await window.LotKeysAwards?.isDeveloper?.())}catch{return false}
}
async function openEditor(){
  if(!await isDeveloper())return;
  const saved=readJson(DRAFT_KEY,null),base=normalizeInfo(saved||current||{}),draft=base.blocks.map(block=>({...block,id:block.id||uid('BLOCK')}));
  const body=showModal(`<div class="modal-head"><div><div class="eyebrow">DEV TOOL KIT · PLATFORM WIDE</div><h2>Edit LotKeys Info</h2></div><button class="close lkinfo-close" type="button">×</button></div><label class="lkinfo-active"><input id="lkinfo-active" type="checkbox" ${base.active?'checked':''}> Show this LotKeys Info message</label><div class="field"><label>Headline</label><input id="lkinfo-title" maxlength="100" value="${esc(base.title)}"></div><div class="field"><label>Short introduction · optional</label><textarea id="lkinfo-summary" maxlength="500">${esc(base.summary)}</textarea></div><div class="lkinfo-add-grid"><button class="btn" type="button" data-info-add="heading">＋ Heading</button><button class="btn" type="button" data-info-add="text">＋ Text</button><button class="btn" type="button" data-info-add="image">＋ Image</button><button class="btn" type="button" data-info-add="video">＋ Video</button><button class="btn" type="button" data-info-add="link">＋ Link</button><button class="btn" type="button" data-info-add="file">＋ File</button></div><div class="lkinfo-draft-list" id="lkinfo-draft-list"></div><div class="notice lkinfo-publish-note"><strong>One protected platform message</strong><div class="small">Preparing a new file changes the unread ID. Replace <code>lotkeys-info.json</code> in the main LotKeys repository; repository permissions remain the publishing security boundary.</div></div><div class="actions"><button class="btn ghost" id="lkinfo-save-draft" type="button">Save Draft</button><button class="btn" id="lkinfo-preview" type="button">Preview</button><button class="btn primary" id="lkinfo-download" type="button">Download Publish File</button><a class="btn ghost" id="lkinfo-open-publisher" href="${PUBLISH_URL}" target="_blank" rel="noopener noreferrer">Open Publisher ↗</a></div>`);
  if(!body)return;
  const list=body.querySelector('#lkinfo-draft-list');let dragIndex=null;
  const sync=()=>draftFromEditor(body,draft);
  const render=()=>{
    list.innerHTML=draft.length?draft.map((block,index)=>draftBlockHtml(block,index,draft.length)).join(''):'<div class="lkinfo-empty">Add a content block. LotKeys Info always displays one message, in this order.</div>';
    list.querySelectorAll('[data-info-delete]').forEach(button=>button.onclick=()=>{sync();draft.splice(Number(button.closest('[data-info-index]').dataset.infoIndex),1);render()});
    list.querySelectorAll('[data-info-move]').forEach(button=>button.onclick=()=>{sync();const from=Number(button.closest('[data-info-index]').dataset.infoIndex),to=from+(button.dataset.infoMove==='up'?-1:1);if(to<0||to>=draft.length)return;[draft[from],draft[to]]=[draft[to],draft[from]];render()});
    list.querySelectorAll('.lkinfo-draft-block').forEach(element=>{
      element.addEventListener('dragstart',()=>{sync();dragIndex=Number(element.dataset.infoIndex)});
      element.addEventListener('dragover',event=>event.preventDefault());
      element.addEventListener('drop',event=>{event.preventDefault();const to=Number(element.dataset.infoIndex);if(dragIndex==null||dragIndex===to)return;const [item]=draft.splice(dragIndex,1);draft.splice(to,0,item);dragIndex=null;render()});
    });
  };
  body.querySelectorAll('[data-info-add]').forEach(button=>button.onclick=()=>{sync();const type=button.dataset.infoAdd;draft.push(cleanBlock({id:uid('BLOCK'),type,text:type==='heading'?'Update':''},draft.length));render()});
  body.querySelector('#lkinfo-save-draft').onclick=()=>{const info=buildPublishInfo(body,draft);writeJson(DRAFT_KEY,info);miniToast('LotKeys Info draft saved on this device ✓')};
  body.querySelector('#lkinfo-preview').onclick=()=>{const info=buildPublishInfo(body,draft);writeJson(DRAFT_KEY,info);showModal(`${infoBody(info,{preview:true})}<button class="btn primary block" id="lkinfo-back-editor" type="button">Back to Editor</button>`)?.querySelector('#lkinfo-back-editor')?.addEventListener('click',openEditor)};
  body.querySelector('#lkinfo-download').onclick=async()=>{const info=buildPublishInfo(body,draft,{newIdentity:true});writeJson(DRAFT_KEY,info);try{await navigator.clipboard?.writeText?.(`${JSON.stringify(info,null,2)}\n`)}catch{}downloadJson(info);miniToast('Publish file downloaded · JSON also copied ✓')};
  render();
}
function miniToast(text){
  const toast=document.getElementById('toast');if(!toast)return;
  toast.textContent=text;toast.hidden=false;clearTimeout(miniToast.timer);miniToast.timer=setTimeout(()=>{toast.hidden=true},3000);
}
function installStyles(){
  if(document.getElementById('lotkeys-info-styles'))return;
  const style=document.createElement('style');style.id='lotkeys-info-styles';style.textContent=`
.lkinfo-hero{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid color-mix(in srgb,var(--accent) 22%,var(--line));border-radius:17px;background:color-mix(in srgb,var(--accent) 6%,var(--card))}.lkinfo-hero img{width:58px;height:58px;object-fit:contain;border-radius:14px}.lkinfo-hero strong,.lkinfo-hero small{display:block}.lkinfo-hero strong{font-size:18px}.lkinfo-hero small{margin-top:3px;color:var(--muted);font-size:10px}.lkinfo-summary{font-size:15px;line-height:1.5;font-weight:750;margin:14px 2px}.lkinfo-blocks{display:grid;gap:11px}.lkinfo-heading{font-size:21px;margin:7px 0 0}.lkinfo-text{font-size:14px;line-height:1.58}.lkinfo-media{margin:0;border:1px solid var(--line);border-radius:15px;overflow:hidden;background:color-mix(in srgb,var(--accent) 3%,var(--card))}.lkinfo-media img,.lkinfo-media video{display:block;width:100%;max-height:min(62vh,620px);object-fit:contain;background:#0f172a}.lkinfo-media figcaption{padding:9px 11px;color:var(--muted);font-size:11px}.lkinfo-link{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:9px;align-items:center;padding:11px;border:1px solid var(--line);border-radius:13px;background:color-mix(in srgb,var(--accent) 4%,var(--card));color:var(--ink);text-decoration:none}.lkinfo-link>span:first-child{width:38px;height:38px;display:grid;place-items:center;border-radius:10px;background:color-mix(in srgb,var(--accent) 12%,var(--card));font-size:20px}.lkinfo-link strong,.lkinfo-link small{display:block}.lkinfo-link small{color:var(--muted);margin-top:2px}.lkinfo-link b{font-size:22px}.lkinfo-empty{padding:24px 14px;text-align:center;color:var(--muted);border:1px dashed var(--line);border-radius:14px}.lkinfo-active{display:flex;align-items:center;gap:9px;padding:11px;margin-bottom:13px;border:1px solid color-mix(in srgb,var(--accent) 35%,var(--line));border-radius:14px;background:color-mix(in srgb,var(--accent) 7%,var(--card));font-weight:850}.lkinfo-active input{width:20px;height:20px;accent-color:var(--accent)}.lkinfo-add-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.lkinfo-add-grid .btn{padding:9px 7px;font-size:11px}.lkinfo-draft-list{display:grid;gap:9px;margin:12px 0}.lkinfo-draft-block{border:1px solid var(--line);border-radius:14px;background:color-mix(in srgb,var(--accent) 2%,var(--card));overflow:hidden}.lkinfo-draft-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 9px;border-bottom:1px solid var(--line);font-size:11px;font-weight:900}.lkinfo-draft-head button{border:0;background:transparent;color:var(--muted);font-weight:900;padding:5px}.lkinfo-drag{font-size:17px;color:var(--muted);cursor:grab;margin-right:5px}.lkinfo-draft-body{display:grid;gap:7px;padding:9px}.lkinfo-draft-body input,.lkinfo-draft-body textarea{width:100%;border:1px solid var(--line);border-radius:11px;background:var(--card);color:var(--ink);padding:10px;font:inherit}.lkinfo-draft-body textarea{min-height:78px;resize:vertical}.lkinfo-publish-note{margin-top:12px}.lkinfo-publish-note code{font-size:11px}.lkaw-dev-platform-info{grid-column:1/-1}.protocol-lotkeys-info-btn.has-unread::after{content:'';position:absolute;right:-2px;top:-2px;width:9px;height:9px;border-radius:999px;background:#ef4444;border:2px solid currentColor;box-sizing:content-box}
@media(max-width:560px){.lkinfo-add-grid{grid-template-columns:1fr 1fr}.lkinfo-heading{font-size:18px}.lkinfo-text{font-size:13px}.lkinfo-summary{font-size:14px}}
`;document.head.appendChild(style);
}
function init(){
  installStyles();paintButtons();
  const observer=new MutationObserver(paintButtons);observer.observe(document.body,{childList:true,subtree:true});
  fetchCurrent().catch(()=>{});
  setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine!==false)fetchCurrent().catch(()=>{})},120000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&navigator.onLine!==false)fetchCurrent().catch(()=>{})});
}

window.LotKeysPlatformInfo={version:VERSION,open,openEditor,refresh:fetchCurrent,bindHeaderButton:paintButtons,current:()=>normalizeInfo(current||{})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
