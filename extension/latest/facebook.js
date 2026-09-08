(() => {
  // A Facebook tab can outlive an extension reload. Use a generation token rather than a permanent
  // singleton flag so a fresh content-script context can replace the stale one on the same tab.
  const scriptGeneration = (Number(window.__lotKeysFacebookAssistantGeneration)||0)+1;
  window.__lotKeysFacebookAssistantGeneration = scriptGeneration;
  const isCurrentGeneration = () => Number(window.__lotKeysFacebookAssistantGeneration)===scriptGeneration;
  const extensionContextAlive = () => { try { return !!chrome?.runtime?.id; } catch { return false; } };
  const safeRuntimeUrl = path => { try { return extensionContextAlive()?chrome.runtime.getURL(path):''; } catch { return ''; } };
  const safeStorageGet = async keys => { try { return extensionContextAlive() ? (await chrome.storage.local.get(keys)) : {}; } catch { return {}; } };
  const safeStorageSet = async value => { try { if(!extensionContextAlive())return false; await chrome.storage.local.set(value); return true; } catch { return false; } };
  const safeRuntimeMessage = async payload => { try { if(!extensionContextAlive())throw new Error('LotKeys Helper was updated. Reconnecting to Facebook…'); return await chrome.runtime.sendMessage(payload); } catch(err) { throw new Error(String(err?.message||err)); } };
  let activeListingId = '';
  let fillFinished = false;

  const wait = ms => new Promise(r=>setTimeout(r,ms));

  // Always-available Marketplace dock. Uses the same assistant UI and collapses to an edge tab.
  const DOCK_ID='lotkeys-facebook-dock';
  let lastMarketplaceUrl='';
  const isMarketplace=()=>/^\/marketplace(?:\/|$)/i.test(location.pathname);
  async function ensureAssistantDock({fresh=false}={}){
    if(!isCurrentGeneration()||!extensionContextAlive())return;
    let host=document.getElementById(DOCK_ID);
    if(!isMarketplace()){if(host)host.style.display='none';return}
    if(fresh&&host){host.remove();host=null}
    if(host){host.style.display='block';return}
    host=document.createElement('div');host.id=DOCK_ID;
    host.style.cssText='all:initial;position:fixed;top:72px;right:0;height:calc(100vh - 92px);z-index:2147483647;display:block;pointer-events:none;';
    const shadow=host.attachShadow({mode:'open'});
    shadow.innerHTML=`<style>
      :host{all:initial}.dock{position:relative;height:100%;width:min(524px,calc(100vw - 20px));transition:width .18s ease;pointer-events:none}.dock.collapsed{width:30px}
      iframe{position:absolute;right:0;top:0;width:min(510px,calc(100vw - 34px));height:100%;border:1px solid rgba(17,24,39,.18);border-right:0;border-radius:16px 0 0 16px;background:#f4f5f7;box-shadow:-8px 10px 30px rgba(17,24,39,.18);pointer-events:auto}
      .dock.collapsed iframe{display:none}.toggle{position:absolute;left:-30px;top:42%;width:30px;height:56px;border:1px solid rgba(17,24,39,.18);border-right:0;border-radius:12px 0 0 12px;background:#fff;color:#111827;font:800 22px/1 system-ui;box-shadow:-5px 6px 18px rgba(17,24,39,.14);cursor:pointer;pointer-events:auto}
      .dock.collapsed .toggle{left:0}.toggle:hover{background:#f3f4f6}
    </style><div class="dock"><button class="toggle" type="button" title="Collapse LotKeys" aria-label="Collapse LotKeys">›</button><iframe title="LotKeys Facebook Assistant"></iframe></div>`;
    const dock=shadow.querySelector('.dock'),toggle=shadow.querySelector('.toggle'),frame=shadow.querySelector('iframe');
    const frameUrl=safeRuntimeUrl('sidepanel.html?embedded=1');if(!frameUrl)return;frame.src=frameUrl;
    const pref=await safeStorageGet('lotkeysAssistantCollapsed');
    const setCollapsed=collapsed=>{if(!isCurrentGeneration())return;dock.classList.toggle('collapsed',!!collapsed);toggle.textContent=collapsed?'‹':'›';toggle.title=collapsed?'Open LotKeys':'Collapse LotKeys';toggle.setAttribute('aria-label',toggle.title);safeStorageSet({lotkeysAssistantCollapsed:!!collapsed});};
    setCollapsed(!!pref.lotkeysAssistantCollapsed);
    toggle.addEventListener('click',()=>setCollapsed(!dock.classList.contains('collapsed')));
    document.documentElement.appendChild(host);
  }
  let marketplaceWatchTimer=0;
  function watchMarketplaceRoute(){
    if(!isCurrentGeneration()||!extensionContextAlive()){if(marketplaceWatchTimer)clearInterval(marketplaceWatchTimer);marketplaceWatchTimer=0;return}
    const current=location.href;if(current!==lastMarketplaceUrl){lastMarketplaceUrl=current;ensureAssistantDock().catch(()=>{})}
  }
  ensureAssistantDock({fresh:true}).catch(()=>{});marketplaceWatchTimer=setInterval(watchMarketplaceRoute,800);
  const norm = s => String(s||'').replace(/\s+/g,' ').trim().toLowerCase();
  const labelNorm = s => norm(s).replace(/\s*\*+$/,'').replace(/\s*:\s*$/,'').replace(/\s*\(optional\)\s*$/,'').trim();
  const visible = el => !!(el && el.getClientRects().length && getComputedStyle(el).visibility!=='hidden' && getComputedStyle(el).display!=='none');
  const textOf = el => String(el?.innerText||el?.textContent||'').replace(/\s+/g,' ').trim();
  const nativeSet = (el,value) => {
    if(!el)return;
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto,'value')?.set;
    if(setter) setter.call(el,String(value)); else el.value=String(value);
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  };
  const selectorForKind = kinds => kinds==='textarea'?'textarea':kinds==='input'?'input:not([type=file])':kinds==='dropdown'?'[role=combobox],select,input[aria-haspopup],button[aria-haspopup]':kinds==='file'?'input[type=file]':'input:not([type=file]),textarea,[role=combobox],select,button[aria-haspopup]';
  const metadataMatches = (el,wanted) => {
    const vals=[el.getAttribute('aria-label'),el.getAttribute('placeholder'),el.getAttribute('name'),el.getAttribute('data-testid')].map(labelNorm).filter(Boolean);
    return vals.some(v=>wanted.includes(v));
  };
  const candidatesForLabel = labels => {
    const wanted=labels.map(labelNorm);
    const out=[];
    document.querySelectorAll('label,span,div,p').forEach(el=>{
      if(!visible(el))return;
      const t=labelNorm(textOf(el));if(!t||t.length>55)return;
      if(wanted.includes(t))out.push(el);
    });
    return out;
  };
  const nearestControl = (labelEl,kinds='any',labels=[]) => {
    const wanted=labels.map(labelNorm);
    if(labelEl?.tagName==='LABEL'&&labelEl.htmlFor){const el=document.getElementById(labelEl.htmlFor);if(el&&visible(el)&&el.matches(selectorForKind(kinds)))return el}
    let node=labelEl;
    for(let i=0;i<6&&node;i++,node=node.parentElement){
      const list=[...node.querySelectorAll(selectorForKind(kinds))].filter(visible);
      const direct=list.find(x=>metadataMatches(x,wanted));if(direct)return direct;
      if(list.length===1)return list[0];
      // Never guess the first control when a Facebook container holds several fields.
    }
    return null;
  };
  const findControl = (labels,kinds='any') => {
    const wanted=labels.map(labelNorm),selector=selectorForKind(kinds);
    const direct=[...document.querySelectorAll(selector)].filter(visible).find(el=>metadataMatches(el,wanted));
    if(direct)return direct;
    for(const labelEl of candidatesForLabel(labels)){const c=nearestControl(labelEl,kinds,labels);if(c)return c}
    return null;
  };
  const labelsForKey = key => ({vehicleType:['Vehicle type'],photos:['Photos','Add photos'],year:['Year'],make:['Make'],model:['Model'],mileage:['Mileage','Odometer','Mileage (optional)'],price:['Price'],bodyStyle:['Body style','Body Style'],description:['Description'],location:['Location'],exteriorColor:['Exterior color','Exterior Color'],interiorColor:['Interior color','Interior Color'],condition:['Vehicle condition','Condition'],fuelType:['Fuel type','Fuel Type']}[String(key||'')]||[]);
  function controlForKey(key){
    key=String(key||'');
    if(key==='photos')return [...document.querySelectorAll('input[type=file]')].find(x=>String(x.accept||'').toLowerCase().includes('image'))||null;
    if(key==='description')return findControl(labelsForKey(key),'textarea');
    if(['price','mileage','model'].includes(key))return findControl(labelsForKey(key),'input');
    if(key==='location')return findControl(labelsForKey(key),'dropdown')||findControl(labelsForKey(key),'input');
    return findControl(labelsForKey(key),'dropdown')||findControl(labelsForKey(key),'any');
  }
  function clearManualHighlights(){document.querySelectorAll('[data-lotkeys-manual-field]').forEach(el=>{el.style.outline='';el.style.outlineOffset='';el.style.boxShadow='';el.removeAttribute('data-lotkeys-manual-field')})}
  function clearManualHighlight(key){document.querySelectorAll('[data-lotkeys-manual-field]').forEach(el=>{if(String(el.getAttribute('data-lotkeys-manual-field')||'')!==String(key||''))return;el.style.outline='';el.style.outlineOffset='';el.style.boxShadow='';el.removeAttribute('data-lotkeys-manual-field')})}
  function highlightManualField(key){const el=controlForKey(key);if(!el)return false;el.setAttribute('data-lotkeys-manual-field',String(key));el.style.outline='3px solid #f59e0b';el.style.outlineOffset='3px';el.style.boxShadow='0 0 0 7px rgba(245,158,11,.20)';return true}
  async function jumpToField(key){const el=controlForKey(key);if(!el)return {ok:false,error:'Facebook field not found'};el.scrollIntoView({block:'center',behavior:'smooth'});try{el.focus({preventScroll:true})}catch{};highlightManualField(key);await wait(80);return {ok:true,key}}
  async function waitForControl(key,timeout=1000){const until=Date.now()+timeout;let el;while(Date.now()<until){el=controlForKey(key);if(el)return el;await wait(70)}return null}
  async function ensureVehicleForSale(){
    if(controlForKey('vehicleType'))return true;
    const options=[...document.querySelectorAll('button,[role=button],div')].filter(visible);
    const card=options.find(el=>/^vehicle for sale$/i.test(textOf(el)))||options.find(el=>/vehicle for sale/i.test(textOf(el))&&textOf(el).length<80);
    if(!card)return false;
    card.click();
    return !!(await waitForControl('vehicleType',1800));
  }
  async function setTextKey(key,value,{required=false}={}){
    if(value===''||value==null)return required?{status:'manual',reason:'blank in LotKeys'}:{status:'skipped',reason:'blank in LotKeys'};
    const el=await waitForControl(key,550);if(!el)return {status:'manual',reason:'field not found'};
    el.scrollIntoView({block:'center',behavior:'instant'});try{el.focus({preventScroll:true})}catch{};nativeSet(el,value);await wait(35);el.dispatchEvent(new Event('blur',{bubbles:true}));
    const current=String(el.value??'').replace(/[^0-9A-Za-z]+/g,'').toLowerCase(),wanted=String(value).replace(/[^0-9A-Za-z]+/g,'').toLowerCase();
    return (!wanted||current.includes(wanted)||wanted.includes(current))?{status:'done'}:{status:'manual',reason:'Facebook did not keep the value'};
  }
  const optionElements = () => [...document.querySelectorAll('[role=option],[role=menuitem],[role=menuitemradio],[role=radio],option')].filter(visible);
  async function chooseVisibleOption(desired,aliases=[],timeout=650){
    const wants=[desired,...aliases].filter(Boolean).map(labelNorm),until=Date.now()+timeout;
    while(Date.now()<until){
      const options=optionElements();
      let match=options.find(el=>wants.includes(labelNorm(textOf(el)||el.value)));
      if(!match)match=options.find(el=>{const t=labelNorm(textOf(el)||el.value);return t&&wants.some(w=>t.startsWith(w)||w.startsWith(t))});
      if(match){match.scrollIntoView({block:'nearest'});if(match.tagName==='OPTION'){const sel=match.parentElement;nativeSet(sel,match.value)}else match.click();await wait(70);return true}
      await wait(65);
    }
    return false;
  }
  async function selectDropdownKey(key,desired,aliases=[],{required=false,waitMs=650}={}){
    if(!desired)return required?{status:'manual',reason:'blank in LotKeys'}:{status:'skipped',reason:'blank in LotKeys'};
    const el=await waitForControl(key,waitMs);if(!el)return {status:'manual',reason:'dropdown not found'};
    el.scrollIntoView({block:'center',behavior:'instant'});
    if(el instanceof HTMLSelectElement){const opts=[...el.options],wants=[desired,...aliases].map(labelNorm),opt=opts.find(o=>wants.includes(labelNorm(o.textContent)))||opts.find(o=>wants.some(w=>labelNorm(o.textContent).startsWith(w)));if(opt){nativeSet(el,opt.value);return {status:'done'}}}
    el.click();await wait(90);
    if(await chooseVisibleOption(String(desired),aliases,600))return {status:'done'};
    if(el instanceof HTMLInputElement){nativeSet(el,desired);await wait(100);if(await chooseVisibleOption(String(desired),aliases,520))return {status:'done'}}
    try{document.body.click()}catch{}
    return {status:'manual',reason:`option “${desired}” not found`};
  }
  async function fillLocation(listing){
    const desired=String(listing.location||listing.locationPostalCode||listing.locationName||'').trim();
    if(!desired)return {status:'skipped',reason:'blank in LotKeys'};
    const el=await waitForControl('location',500);if(!el)return {status:'manual',reason:'Location field not found'};
    el.scrollIntoView({block:'center',behavior:'instant'});el.click();await wait(70);
    if(el instanceof HTMLInputElement){nativeSet(el,desired);await wait(110);if(await chooseVisibleOption(desired,[listing.locationName,listing.locationPostalCode,listing.locationAddress],520))return {status:'done'};return {status:'manual',reason:'Location suggestion needs review'}}
    if(await chooseVisibleOption(desired,[listing.locationName,listing.locationPostalCode,listing.locationAddress],520))return {status:'done'};
    return {status:'manual',reason:'Location option not found'};
  }
  function bodyStyleAliases(style){
    const s=norm(style),m={
      'suv':['SUV','Sport Utility Vehicle','Crossover'],
      'crossover':['Crossover','SUV'],
      'truck':['Truck','Pickup Truck','Pickup'],
      'pickup':['Pickup Truck','Pickup','Truck'],
      'sedan':['Sedan'],
      'coupe':['Coupe'],
      'hatchback':['Hatchback'],
      'wagon':['Wagon','Station Wagon'],
      'convertible':['Convertible'],
      'van':['Van','Minivan'],
      'minivan':['Minivan','Van']
    };return m[s]||[style];
  }
  const FACEBOOK_COLORS=['Black','Blue','Brown','Gold','Green','Gray','Pink','Purple','Red','Silver','Orange','White','Yellow','Charcoal','Off white','Tan','Beige','Burgundy','Turquoise','Other'];
  function facebookColor(value){
    const raw=String(value||'').trim();if(!raw)return '';
    const s=labelNorm(raw),legacy={'grey':'Gray','offwhite':'Off white','off white':'Off white','off-white':'Off white'};
    return FACEBOOK_COLORS.find(x=>labelNorm(x)===s)||legacy[s]||'Other';
  }
  function facebookCondition(value){
    const s=norm(value);if(!s)return '';
    if(s.includes('excellent'))return 'Excellent';
    if(s.includes('very good')||s==='verygood')return 'Very good';
    if(s==='good'||s.endsWith(' good'))return 'Good';
    if(s.includes('fair'))return 'Fair';
    if(s.includes('poor'))return 'Poor';
    return '';
  }
  async function fetchPhoto(listingId,index,photoId=''){
    const res=await safeRuntimeMessage({type:'GET_PHOTO',listingId,photoIndex:index,photoId:String(photoId||'')});
    if(!res?.ok)throw new Error(res?.error||'Could not retrieve photo from LotKeys.');
    return res.photo;
  }
  function dataUrlToFile(dataUrl,name,type){
    const [head,data]=String(dataUrl).split(',');
    const mime=type||head.match(/data:([^;]+)/)?.[1]||'image/jpeg';
    const bin=atob(data),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    return new File([bytes],name||'LotKeys-photo.jpg',{type:mime});
  }
  async function findPhotoInput(){
    let input=[...document.querySelectorAll('input[type=file]')].find(x=>String(x.accept||'').toLowerCase().includes('image'));
    if(input)return input;
    const add=[...document.querySelectorAll('button,[role=button],div')].filter(visible).find(el=>/^add photos?$/i.test(textOf(el))||/add photos/i.test(textOf(el)));
    if(add){add.click();await wait(350);input=[...document.querySelectorAll('input[type=file]')].find(x=>String(x.accept||'').toLowerCase().includes('image'))||document.querySelector('input[type=file]')}
    return input||null;
  }
  async function addPhotos(listing){
    const count=Math.min(20,Number(listing.photoCount||0));
    if(!count)return {status:'manual',reason:'no LotKeys photos selected'};
    const input=await findPhotoInput();if(!input)return {status:'manual',reason:'Facebook photo input not found'};
    const loaded=new Array(count);let cursor=0,firstError=null;
    async function worker(){while(true){const i=cursor++;if(i>=count)return;try{const p=await fetchPhoto(listing.id,i,(listing.photoIds||[])[i]||'');if(!p?.dataUrl)throw new Error(p?.error||'Photo unavailable');loaded[i]=p}catch(err){console.warn('LotKeys photo '+(i+1),err);firstError=firstError||{i,err}}}}
    await Promise.all(Array.from({length:Math.min(3,count)},()=>worker()));
    if(firstError)return {status:'manual',reason:`photo ${firstError.i+1} could not be loaded: ${firstError.err?.message||firstError.err}`,loaded:loaded.filter(Boolean).length};
    const dt=new DataTransfer();loaded.forEach(p=>dt.items.add(dataUrlToFile(p.dataUrl,p.name,p.type)));
    input.files=dt.files;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));await wait(180);
    return {status:'done',loaded:count};
  }
  async function fill(listing){
    activeListingId=String(listing.id||'');fillFinished=false;clearManualHighlights();await ensureVehicleForSale();
    const steps=[];const record=(key,label,result)=>{steps.push({key,label,...result});return result};
    // Facebook top-to-bottom order, with Photos moved up front so their transfer can finish early.
    record('vehicleType','1. Vehicle type',await selectDropdownKey('vehicleType','Car/Truck',['Car / Truck','Car or Truck','Car & Truck'],{required:true,waitMs:1100}));
    record('photos','2. Photos',await addPhotos(listing));
    record('year','3. Year',await selectDropdownKey('year',listing.year,[String(listing.year)],{required:true}));
    record('make','4. Make',await selectDropdownKey('make',listing.make,[listing.make],{required:true}));
    // Make must be accepted first because Facebook rebuilds the Model options from it.
    await wait(120);
    record('model','5. Model',await setTextKey('model',listing.model,{required:true}));
    record('mileage','6. Mileage',await setTextKey('mileage',listing.odometer===''?'':Math.trunc(Number(listing.odometer)),{required:true}));
    record('price','7. Price',await setTextKey('price',listing.price===''?'':Math.trunc(Number(listing.price)),{required:true}));
    record('bodyStyle','8. Body Style',await selectDropdownKey('bodyStyle',listing.bodyStyle,bodyStyleAliases(listing.bodyStyle),{required:true}));
    record('description','9. Description',await setTextKey('description',listing.description,{required:true}));
    // Location uses its own exact control path so Description can never be written into it.
    record('location','Location',await fillLocation(listing));
    const exteriorColor=facebookColor(listing.exteriorColor),interiorColor=facebookColor(listing.interiorColor);
    record('exteriorColor','Exterior color',exteriorColor?await selectDropdownKey('exteriorColor',exteriorColor,[exteriorColor]):{status:'skipped',reason:'blank in LotKeys'});
    record('interiorColor','Interior color',interiorColor?await selectDropdownKey('interiorColor',interiorColor,[interiorColor]):{status:'skipped',reason:'blank in LotKeys'});
    const condition=facebookCondition(listing.vehicleCondition);
    record('condition','Vehicle condition',condition?await selectDropdownKey('condition',condition,[condition]):{status:'skipped',reason:listing.vehicleCondition?'LotKeys condition does not map to Facebook':'blank in LotKeys'});
    record('fuelType','Fuel type',await selectDropdownKey('fuelType',listing.fuelType,[listing.fuelType]));
    const manualKeys=steps.filter(s=>s.status==='manual').map(s=>s.key);manualKeys.forEach(highlightManualField);
    fillFinished=true;
    return {ok:true,listingId:activeListingId,steps,manualKeys,needsManual:manualKeys.length,done:steps.filter(s=>s.status==='done').length};
  }



  function fieldState(key){
    key=String(key||'');const el=controlForKey(key);if(!el)return {found:false,filled:false,value:''};
    if(key==='photos'){
      const count=Number(el.files?.length||0);return {found:true,filled:count>0,value:count?`${count} photo${count===1?'':'s'}`:''};
    }
    if(el instanceof HTMLInputElement||el instanceof HTMLTextAreaElement){
      const value=String(el.value||'').trim();return {found:true,filled:!!value,value};
    }
    if(el instanceof HTMLSelectElement){
      const opt=el.selectedOptions?.[0],value=String(opt?.textContent||el.value||'').trim(),t=labelNorm(value),labels=labelsForKey(key).map(labelNorm);
      const blank=!t||labels.includes(t)||/^(select|choose|pick)(\s|$)/i.test(value);return {found:true,filled:!blank,value:blank?'':value};
    }
    const labels=labelsForKey(key).map(labelNorm),values=[el.getAttribute('aria-valuetext'),el.getAttribute('data-value'),textOf(el)].map(x=>String(x||'').trim()).filter(Boolean);
    for(const value of values){const t=labelNorm(value);if(!t||labels.includes(t))continue;if(/^(select|choose|pick|enter)(\s|$)/i.test(value)&&labels.some(l=>t.includes(l)))continue;if(/^(select|choose|pick)$/i.test(value))continue;return {found:true,filled:true,value}}
    return {found:true,filled:false,value:''};
  }
  async function inspectFields(keys=[]){
    const fields={};for(const key of [...new Set((keys||[]).map(String).filter(Boolean))]){const state=fieldState(key);fields[key]=state;if(state.filled)clearManualHighlight(key);else if(state.found)highlightManualField(key)}
    return {ok:true,fields};
  }

  async function retryField(key,listing){
    key=String(key||'');listing=listing||{};let result;
    if(key==='vehicleType')result=await selectDropdownKey('vehicleType','Car/Truck',['Car / Truck','Car or Truck','Car & Truck'],{required:true,waitMs:1100});
    else if(key==='photos')result=await addPhotos(listing);
    else if(key==='year')result=await selectDropdownKey('year',listing.year,[String(listing.year)],{required:true});
    else if(key==='make')result=await selectDropdownKey('make',listing.make,[listing.make],{required:true});
    else if(key==='model')result=await setTextKey('model',listing.model,{required:true});
    else if(key==='mileage')result=await setTextKey('mileage',listing.odometer===''?'':Math.trunc(Number(listing.odometer)),{required:true});
    else if(key==='price')result=await setTextKey('price',listing.price===''?'':Math.trunc(Number(listing.price)),{required:true});
    else if(key==='bodyStyle')result=await selectDropdownKey('bodyStyle',listing.bodyStyle,bodyStyleAliases(listing.bodyStyle),{required:true});
    else if(key==='description')result=await setTextKey('description',listing.description,{required:true});
    else if(key==='location')result=await fillLocation(listing);
    else if(key==='exteriorColor'){const c=facebookColor(listing.exteriorColor);result=c?await selectDropdownKey('exteriorColor',c,[c]):{status:'skipped',reason:'blank in LotKeys'}}
    else if(key==='interiorColor'){const c=facebookColor(listing.interiorColor);result=c?await selectDropdownKey('interiorColor',c,[c]):{status:'skipped',reason:'blank in LotKeys'}}
    else if(key==='condition'){const c=facebookCondition(listing.vehicleCondition);result=c?await selectDropdownKey('condition',c,[c]):{status:'skipped',reason:listing.vehicleCondition?'LotKeys condition does not map to Facebook':'blank in LotKeys'}}
    else if(key==='fuelType')result=await selectDropdownKey('fuelType',listing.fuelType,[listing.fuelType]);
    else return {ok:false,error:'Unknown Facebook field'};
    if(result?.status==='done'||result?.status==='skipped')clearManualHighlight(key);else highlightManualField(key);
    return {ok:true,key,result};
  }

  document.addEventListener('click',e=>{
    if(!fillFinished||!activeListingId)return;
    const btn=e.target?.closest?.('button,[role=button]');if(!btn)return;
    if(/^next$/i.test(textOf(btn))){safeRuntimeMessage({type:'FACEBOOK_NEXT_CLICKED',listingId:activeListingId,at:Date.now()}).catch(()=>{});}
  },true);

  if(extensionContextAlive()){
    try{chrome.runtime.onMessage.addListener((msg,sender,sendResponse)=>{
      if(!isCurrentGeneration())return;
      if(msg?.type==='LOTKEYS_PING'){sendResponse({ok:true,version:'0.1.13'});return}
      if(msg?.type==='LOTKEYS_JUMP_TO_FIELD'){jumpToField(msg.key).then(sendResponse).catch(err=>sendResponse({ok:false,error:String(err?.message||err)}));return true;}
      if(msg?.type==='LOTKEYS_RETRY_FIELD'){retryField(msg.key,msg.listing||{}).then(sendResponse).catch(err=>sendResponse({ok:false,error:String(err?.message||err)}));return true;}
      if(msg?.type==='LOTKEYS_CHECK_FIELDS'){inspectFields(msg.keys||[]).then(sendResponse).catch(err=>sendResponse({ok:false,error:String(err?.message||err)}));return true;}
      if(msg?.type==='LOTKEYS_FILL_FACEBOOK'){
        fill(msg.listing||{}).then(sendResponse).catch(err=>sendResponse({ok:false,error:String(err?.message||err)}));return true;
      }
    });}catch{}
  }
})();
