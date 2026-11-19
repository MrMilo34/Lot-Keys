(function(root){
  'use strict';
  const C=root.LotKeysCompare,E=C.escape;
  const template='price,year,make,model,trim,generation,body,stock,kilometres,vin,url,observedAt,currency\n';
  const blank=()=>({kind:'autotrader',name:'AutoTrader.ca',url:'https://www.autotrader.ca/',text:''});
  // A page can disappear while imports, IndexedDB writes or a Drive save finish.
  // Retire the old owner before loading another view; drain its writes first.
  let activeView=null,completedSave=null;
  const writes=new Map();
  root.addEventListener('lotkeys-compare-scope-change',()=>{completedSave=null;activeView?.invalidate?.();});
  function serializeWrite(key,task){
    const next=(writes.get(key)||Promise.resolve()).catch(()=>{}).then(task);
    writes.set(key,next);
    next.finally(()=>{if(writes.get(key)===next)writes.delete(key);}).catch(()=>{});
    return next;
  }
  async function mount(api){
    const view={disposed:false},previous=activeView;activeView=view;
    const mounting=()=>activeView===view&&!view.disposed&&api.host.isConnected;
    view.dispose=()=>{view.disposed=true;return Promise.resolve(false);};
    view.invalidate=()=>{view.disposed=true;api.host.replaceChildren();};
    let recovered=null;
    try{await previous?.dispose?.(true);}catch(error){recovered=previous?.snapshot?.();api.toast('Comparison draft save needs retry: '+error.message);}
    if(!mounting())return;
    const context=await api.context(),scope=C.scopeKey(context),key=`lotkeysCompareV1:${scope}`;
    await (writes.get(key)||Promise.resolve()).catch(()=>{});
    if(!mounting())return;
    let resultGeneration=0;
    let data=(recovered&&C.generationMatches(context,recovered.context)?recovered.data:await api.setting(key,null))||{sources:[blank()],saved:null,pending:null,targetId:'',staleHours:24},epoch=0,busy=false,timer=null,remote=null,loadError='';
    if(!mounting()||!C.generationMatches(context,await api.context())||!mounting())return;
    if(!Array.isArray(data.sources)||!data.sources.length)data.sources=[blank()];
    let panel=api.host,sourceHost=null,resultHost=null,editor=null,editorForm=null,driveChecked=false,closeHandler=null,observer=null,scopeInvalidated=false;
    const owns=()=>!view.disposed&&activeView===view&&panel.isConnected;
    const ownsEditor=()=>editorForm?.isConnected&&editor?.contains(editorForm);
    const valid=async token=>owns()&&token===epoch&&C.generationMatches(context,await api.context())&&owns()&&token===epoch;
    async function persist(){const token=epoch,snapshot=structuredClone(data);return serializeWrite(key,async()=>{if(!await valid(token)||!owns())return false;await api.setSetting(key,snapshot);return valid(token);});}
    view.snapshot=()=>({context,data:structuredClone(data)});
    let retirement=null;
    view.dispose=(flush=false)=>{
      if(view.disposed)return retirement;
      const snapshot=structuredClone(data);view.disposed=true;epoch++;clearTimeout(timer);
      root.removeEventListener('lotkeys-compare-scope-change',invalidated);observer?.disconnect();
      if(closeHandler)api.modal.removeEventListener('close',closeHandler);
      if(ownsEditor()&&api.modal.open)api.modal.close();editor=null;editorForm=null;sourceHost=null;resultHost=null;
      retirement=flush?serializeWrite(key,async()=>{if(scopeInvalidated||!C.generationMatches(context,await api.context()))return false;await api.setSetting(key,snapshot);return true;}):Promise.resolve(false);
      return retirement;
    };
    async function acceptReceipt(receipt){
      const token=epoch;
      if(!receipt||!await valid(token)||!C.generationMatches(context,receipt.context)||data.pending?.report.runId!==receipt.report.runId)return;
      // Change report state in this view, preserving its current source/target edits.
      data.saved={...receipt.saved,report:receipt.report};data.pending=null;remote=receipt.saved;driveChecked=true;resultGeneration++;
      await persist();if(!await valid(token))return;paintLatest();
    }
    view.acceptReceipt=acceptReceipt;
    async function recordReceipt(saved,report){
      if(!C.generationMatches(context,await api.context()))return;
      completedSave={context,report,saved};
      await activeView?.acceptReceipt?.(completedSave);
    }
    function queuePersist(){clearTimeout(timer);timer=setTimeout(()=>persist().catch(e=>api.toast(e.message)),350);}
    const status=()=>data.pending?'<span class="compare-status warning">New results are local — Drive save pending</span>':data.saved?`<span class="compare-status">${driveChecked&&remote?'Saved to Drive':'Last saved link on this device; Drive not yet verified'}</span>`:remote?'<span class="compare-status">Previous Drive document available</span>':'<span class="compare-status">No comparison saved yet</span>';
    function latest(){const saved=data.saved||remote,report=data.pending?.report||data.saved?.report,old=report&&Date.now()-Date.parse(report.generatedAt)>Number(report.staleHours||24)*3600000;
      return `<div class="compare-latest"><strong>Latest comparison</strong>${status()}${saved?.warning?`<p class="notice warning">${E(saved.warning)}</p>`:''}${loadError?`<div class="help">${E(loadError)}</div>`:''}${saved?.url?`<div class="actions"><a class="btn ghost" href="${E(C.safeUrl(saved.url))}" target="_blank" rel="noopener noreferrer">Open ${data.pending?'previous saved':'comparison'} document</a><button class="btn ghost compare-copy" type="button">Copy document URL</button></div><div class="help">The link keeps the document’s existing access. Copying it does not grant access.</div>`:''}${data.pending?'<button type="button" class="btn primary compare-retry">Retry Drive save</button>':''}${old?'<p class="notice warning">These results are stale. Check source dates and run a new comparison.</p>':''}${report?`<button class="btn ghost compare-copy-results" type="button">Copy results</button><p class="help">Generated ${E(report.generatedAt)} · ${report.rows.length} vehicles · ${data.pending?'local results':'saved results'}</p>${C.table(report)}`:remote?.text?`<details><summary>Previous document preview</summary><pre class="compare-doc-preview">${E(remote.text.slice(0,18000))}</pre></details>`:'<p class="help">Run a comparison to see results here. The next successful save reuses only this Store’s comparison document in your existing LotKeys Account Storage.</p>'}</div>`;
    }
    async function copyText(text,message,host){
      if(!await valid(epoch))return;
      try{await navigator.clipboard.writeText(text);api.toast(message);}
      catch{const input=document.createElement('textarea');input.readOnly=true;input.className='compare-copy-fallback';input.value=text;host.append(input);input.focus();input.select();api.toast('Select and copy the text');}
    }
    function bindLatest(host){
      host.querySelector('.compare-copy')?.addEventListener('click',()=>copyText((data.saved||remote).url,'Document URL copied',host));
      host.querySelector('.compare-copy-results')?.addEventListener('click',()=>copyText(C.shareText(data.pending?.report||data.saved.report),'Comparison results copied',host));
      host.querySelector('.compare-retry')?.addEventListener('click',savePending);
    }
    function paintLatest(){if(resultHost?.isConnected){resultHost.innerHTML=latest();bindLatest(resultHost);}const home=panel.querySelector('.compare-home-latest');if(home){home.innerHTML=latest();bindLatest(home);}}
    function paintSources(){if(!sourceHost?.isConnected)return;sourceHost.innerHTML=data.sources.map((s,i)=>{const spec=C.sources.find(x=>x.id===s.kind)||C.sources.at(-1);return `<section class="compare-source info-web-card" data-source="${i}"><div class="compare-source-head"><strong>Source ${i+1}</strong><button class="btn ghost" data-remove="${i}" type="button" aria-label="Remove source ${i+1}">Remove</button></div><div class="form-grid"><div class="field"><label for="compare-kind-${i}">System</label><select id="compare-kind-${i}" data-key="kind">${C.sources.map(o=>`<option value="${o.id}" ${s.kind===o.id?'selected':''}>${E(o.name)}</option>`).join('')}</select></div><div class="field"><label for="compare-name-${i}">Source name</label><input id="compare-name-${i}" data-key="name" value="${E(s.name)}" maxlength="100"></div><div class="field full"><label for="compare-url-${i}">Source page URL</label><input type="url" id="compare-url-${i}" data-key="url" value="${E(s.url)}" placeholder="https://…"><div class="compare-open-wrap">${C.safeUrl(s.url)?`<a class="btn ghost" href="${E(C.safeUrl(s.url))}" target="_blank" rel="noopener noreferrer">Open source</a>`:''}</div><p class="help compare-source-note">${E(spec.note)}</p></div><div class="field full"><label for="compare-text-${i}">Manual rows or authorized export (CSV / JSON)</label><textarea rows="4" id="compare-text-${i}" data-key="text" spellcheck="false" placeholder="${E(template)}">${E(s.text).replace(/\n/g,'&#10;')}</textarea><div class="actions"><label class="btn ghost">Import CSV / JSON<input type="file" data-import="${i}" accept=".csv,.tsv,.json,text/csv,application/json" hidden></label><button class="btn ghost" data-header="${i}" type="button">Add CSV header</button></div><div class="help">Columns: price, year, make, model, trim, generation, body, stock, kilometres, vin, url, observedAt, currency. Use an ISO checked date with timezone. Unknowns stay blank; quote prices containing commas. Import only data you may use.</div></div></div></section>`;}).join('');
      sourceHost.querySelectorAll('[data-source]').forEach(card=>{const i=+card.dataset.source;card.querySelectorAll('[data-key]').forEach(input=>{input.addEventListener('input',()=>{data.sources[i][input.dataset.key]=input.value;queuePersist();if(input.dataset.key==='url'){const wrap=card.querySelector('.compare-open-wrap'),url=C.safeUrl(input.value);wrap.innerHTML=url?`<a class="btn ghost" href="${E(url)}" target="_blank" rel="noopener noreferrer">Open source</a>`:'';}});if(input.dataset.key==='kind')input.addEventListener('change',()=>{const spec=C.sources.find(x=>x.id===input.value);Object.assign(data.sources[i],{name:spec.name,url:spec.url});queuePersist();paintSources();});});
        card.querySelector('[data-remove]').onclick=()=>{data.sources.splice(i,1);queuePersist();paintSources();};
        card.querySelector('[data-header]').onclick=()=>{if(!data.sources[i].text.trim())data.sources[i].text=template;queuePersist();paintSources();};
        card.querySelector('[data-import]').onchange=async e=>{const token=epoch,source=data.sources[i],file=e.target.files[0];if(!file)return;if(file.size>2*1024*1024){api.toast('Import is limited to 2 MB');return;}try{const text=await file.text();C.parseImport(text);if(!await valid(token)||!data.sources.includes(source))return;source.text=text;await persist();if(!await valid(token))return;paintSources();api.toast('Export imported; review before comparing');}catch(err){if(await valid(token))api.toast(err.message);}};
      });setBusy(busy);
    }
    function setBusy(value){busy=value;for(const host of [sourceHost,ownsEditor()?editor:null])host?.querySelectorAll('input,select,textarea,button').forEach(x=>{if(!x.classList.contains('close'))x.disabled=value;});panel.querySelectorAll('.compare-add,.compare-open,.compare-retry').forEach(x=>x.disabled=value);resultHost?.querySelectorAll('.compare-retry').forEach(x=>x.disabled=value);}
    function error(message){const el=editor?.querySelector('.compare-error')||panel.querySelector('.compare-error');if(el){el.textContent=message;el.hidden=false;}else api.toast(message);}
    async function savePending(){if(busy||!data.pending)return;const token=epoch,report=structuredClone(data.pending.report);resultGeneration++;setBusy(true);try{await persist();if(!await valid(token))return;const saved=await api.save(report,context);await recordReceipt(saved,report);if(await valid(token))api.toast('Comparison document saved');}catch(err){if(await valid(token)){error(`Drive save failed: ${err.message} New results remain on this device; the previous saved link is retained.`);paintLatest();}}finally{if(await valid(token))setBusy(false);}}
    async function run(){if(busy||!owns()||!ownsEditor())return;const token=epoch,form=editor.querySelector('form'),v=Object.fromEntries(new FormData(form));setBusy(true);try{if(!await valid(token))return;const inventory=await api.vehicles();if(!await valid(token))return;
        const target=v.targetId?{...v,vin:v.vin,observedAt:v.observedAt,odometerUnit:'KM',currency:'CAD'}:null;
        if(target&&!target.make&&!target.model)throw new Error('Choose an Inventory target or enter target vehicle details.');
        const report=C.compare(data.sources,{target,inventory:target?[]:inventory.map(x=>({...x,currency:'CAD'})),staleHours:+v.staleHours||24});
        resultGeneration++;data.targetId=v.targetId;data.staleHours=+v.staleHours;data.pending={report};await persist();if(!await valid(token))return;paintLatest();setBusy(false);await savePending();
      }catch(err){if(await valid(token))error(`Comparison was not replaced: ${err.message}`);}finally{if(await valid(token))setBusy(false);}}
    async function open(){const token=epoch;if(!await valid(token))return;await persist();if(!await valid(token))return;const inventory=await api.vehicles();if(!await valid(token))return;
      sourceHost?.replaceChildren();api.modalBody.innerHTML=`<div class="modal-head"><div><div class="eyebrow">INVENTORY COMPARISON · MANUAL/IMPORT PILOT</div><h2>Compare Our Inventory Online</h2></div><button type="button" class="close" aria-label="Close comparison">×</button></div><form id="compare-form"><div class="form-grid"><div class="field full"><label for="compare-target">Inventory target</label><select name="targetId" id="compare-target"><option value="">All cached Inventory + supplied source rows</option><option value="manual">Enter target manually</option>${inventory.map(v=>`<option value="${E(v.id)}">${E(v.name||[v.year,v.make,v.model,v.stock].filter(Boolean).join(' '))}</option>`).join('')}</select><div class="help">A selected target is starred. Known make, model, generation or body conflicts are excluded. Different trims stay included and labelled; unknown facts stay possible matches. Year alone never proves generation. No source is searched automatically.</div></div><div class="field full"><label>Vehicle Profile Name (comparison only)</label><input id="compare-profile-name" readonly></div>${[['year','Year'],['make','Make'],['model','Model'],['trim','Trim'],['generation','Generation (if known)'],['body','Body style (if known)'],['price','Price (CAD)'],['kilometres','Kilometres'],['stock','Stock number'],['vin','VIN'],['url','Vehicle listing URL'],['observedAt','Last checked (ISO date + timezone)']].map(([name,label])=>`<div class="field"><label for="compare-target-${name}">${label}</label><input id="compare-target-${name}" name="${name}" ${['price','kilometres'].includes(name)?'inputmode="decimal"':''} ${name==='url'?'type="url"':''}></div>`).join('')}<div class="field full"><label for="compare-stale">Flag source data older than</label><select id="compare-stale" name="staleHours"><option value="24">24 hours</option><option value="72">3 days</option><option value="168">7 days</option></select></div></div><div class="compare-source-intro info-photo-card"><strong>Comparison sources</strong><p>Manual/import-only TEST pilot. Open a source to review it yourself, or import a permitted export. AutoTrader and CarGurus have no live connection here. LotKeys Drive sign-in/renewal and physical-phone behavior remain unverified; copy your results while testing.</p></div><div class="compare-sources"></div><button class="btn ghost compare-add" type="button">+ Add Source</button><div class="compare-results"></div><div class="notice warning compare-error" role="alert" hidden></div><div class="actions"><button class="btn primary" type="submit">Compare &amp; Save Latest</button></div><p class="help">This compares the supplied rows and cached Inventory. It does not edit Vehicle Profiles or verify current online availability. A successful save replaces only the dedicated temporary comparison document. Nothing is sent automatically.</p></form>`;
      editor=api.modalBody;sourceHost=editor.querySelector('.compare-sources');resultHost=editor.querySelector('.compare-results');const form=editor.querySelector('form'),target=form.elements.targetId;editorForm=form;
      function updateName(){const values=new FormData(form);editor.querySelector('#compare-profile-name').value=[values.get('year'),values.get('make'),values.get('model'),values.get('trim')].filter(Boolean).join(' ')+(values.get('stock')?' - '+values.get('stock'):'');}
      function fill(){const found=inventory.find(v=>String(v.id)===target.value);for(const name of ['year','make','model','trim','generation','body','price','kilometres','stock','vin','url','observedAt']){let value=found?.[name]??'';if(name==='generation')value=found?.generation??found?.generationId??'';if(name==='body')value=found?.body??found?.bodyStyle??found?.bodyType??'';if(name==='kilometres'&&found)value=C.normalize(found,{name:'Our Inventory'}).kilometres??'';if(name==='url')value=found?.originalListingUrl||'';if(name==='observedAt')value=C.timestamp(found?.updatedAt);form.elements[name].value=value;}updateName();}
      target.value=inventory.some(v=>String(v.id)===data.targetId)||data.targetId==='manual'?data.targetId:'';form.elements.staleHours.value=data.staleHours||24;fill();if(data.targetDraft?.targetId===target.value){for(const [name,value] of Object.entries(data.targetDraft))if(form.elements[name])form.elements[name].value=value;updateName();}target.onchange=()=>{data.targetId=target.value;data.targetDraft=null;fill();queuePersist();};form.oninput=()=>{updateName();data.targetDraft=Object.fromEntries(new FormData(form));queuePersist();};form.onsubmit=e=>{e.preventDefault();run();};editor.querySelector('.compare-add').onclick=()=>{data.sources.push(blank());queuePersist();paintSources();};
      function close(){if(!owns())return;clearTimeout(timer);persist().catch(console.warn);editor=null;editorForm=null;sourceHost=panel.querySelector('.compare-sources');resultHost=null;paintSources();paintLatest();}
      editor.querySelector('.close').onclick=()=>api.modal.close();closeHandler=close;api.modal.addEventListener('close',closeHandler,{once:true});paintSources();paintLatest();if(!api.modal.open)api.modal.showModal();
    }
    panel.innerHTML=`<details class="card compare-panel"><summary><strong>Compare · TEST pilot</strong><span class="small muted">Manual/import only</span></summary><div class="compare-panel-body"><p class="help compare-pilot-note"><strong>Manual/import-only TEST pilot.</strong> Automatic website search is not connected. LotKeys Google Drive sign-in/renewal and physical-phone behavior remain unverified. If Drive saving fails, results remain on this device; copy your results while testing.</p><div class="compare-sources"></div><button type="button" class="btn ghost compare-add">+ Add Source</button><div class="compare-home-latest"></div><div class="notice warning compare-error" role="alert" hidden></div><button type="button" class="btn primary compare-open">Compare Our Inventory Online</button><p class="help">Manual / imported comparisons. No live marketplace search is connected.</p></div></details>`;
    sourceHost=panel.querySelector('.compare-sources');panel.querySelector('.compare-add').onclick=()=>{data.sources.push(blank());queuePersist();paintSources();};panel.querySelector('.compare-open').onclick=()=>open().catch(e=>api.toast(e.message));paintSources();paintLatest();
    function invalidated(){scopeInvalidated=true;view.dispose(false);panel.replaceChildren();}
    view.invalidate=invalidated;root.addEventListener('lotkeys-compare-scope-change',invalidated);
    observer=new MutationObserver(()=>{if(!panel.isConnected)view.dispose(true).catch(error=>api.toast('Comparison draft save needs retry: '+error.message));});observer.observe(document.body,{childList:true,subtree:true});
    await acceptReceipt(completedSave);
    if(context.account&&context.root){const token=epoch,loadGeneration=resultGeneration;api.load(context).then(async result=>{if(!await valid(token)||!panel.isConnected||loadGeneration!==resultGeneration)return;remote=result;driveChecked=true;if(result&&data.pending&&result.text.includes(`Comparison ID: ${data.pending.report.runId}\n`)){await acceptReceipt({context,report:structuredClone(data.pending.report),saved:{...result,runId:data.pending.report.runId}});return;}if(result&&data.saved&&(data.saved.fileId!==result.fileId||(data.saved.runId&&!result.text.includes(`Comparison ID: ${data.saved.runId}\n`)))){data.saved=null;await persist();}else if(result&&data.saved){data.saved.warning=result.warning||'';}paintLatest();}).catch(async err=>{if(await valid(token)&&loadGeneration===resultGeneration){loadError=`Drive document could not be checked: ${err.message}`;paintLatest();}});}
  }
  root.LotKeysCompareUI={mount};
})(window);
