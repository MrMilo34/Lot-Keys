(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LotKeysCompare=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const MAX_ROWS=2000,MAX_TEXT=2*1024*1024,ROLE='comparisonReportV1',DOC_MIME='application/vnd.google-apps.document';
  const sources=[{id:'autotrader',name:'AutoTrader.ca',url:'https://www.autotrader.ca/',note:'Open source / manual entry or authorized export only. Automated collection is unavailable.'},{id:'cargurus',name:'CarGurus',url:'https://www.cargurus.ca/',note:'Open source / manual entry or authorized export only. No live integration is connected.'},{id:'dealer',name:'Dealership website',url:'',note:'Open a supplied page, then enter facts or import an export you are permitted to use.'},{id:'licensed',name:'Licensed feed export',url:'',note:'Import your authorized CSV or JSON export. No remote feed connection is configured.'},{id:'other',name:'Other source',url:'',note:'Manual entry or permitted CSV / JSON import.'}];
  const clean=v=>String(v??'').trim().slice(0,2000);
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function safeUrl(value){try{const u=new URL(clean(value));return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
  function number(value){if(value==null||clean(value)==='')return null;const s=clean(value).replace(/^(?:CAD\s*|C\$\s*|\$\s*)/i,'').replace(/,/g,'');return /^\d+(?:\.\d{1,2})?$/.test(s)&&Number.isFinite(+s)?+s:null;}
  function timestamp(value){if(value==null||clean(value)==='')return '';const n=typeof value==='number'?value:Date.parse(value);return Number.isFinite(n)&&n>0?new Date(n).toISOString():'';}
  function normalize(raw={},source={},now=Date.now(),staleHours=24){
    const flags=[],year=clean(raw.year),vin=clean(raw.vin).toUpperCase(),currency=clean(raw.currency||'CAD').toUpperCase();
    const row={price:number(raw.price),year:/^(19|20)\d{2}$/.test(year)?year:'',make:clean(raw.make),model:clean(raw.model),trim:clean(raw.trim),stock:clean(raw.stock??raw.stockNumber),generation:clean(raw.generation??raw.generationId),body:clean(raw.body??raw.bodyStyle??raw.bodyType),vin:/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)?vin:'',kilometres:number(raw.kilometres??raw.kilometers??raw.km??raw.odometer),url:safeUrl(raw.url||raw.originalListingUrl),observedAt:timestamp(raw.observedAt??raw.checkedAt??raw.updatedAt),currency,source:clean(source.name||source.kind||'Manual'),sourceUrl:safeUrl(source.url),target:source.target===true,inventory:source.inventory===true,flags};
    if(currency!=='CAD'){row.price=null;flags.push('Non-CAD price excluded; no currency conversion');}
    if(!clean(raw.currency))flags.push('Currency assumed CAD; verify');
    if(row.price===0){row.price=null;flags.push('Zero price needs review');}
    const unit=clean(raw.unit||raw.odometerUnit||'KM').toUpperCase();
    if(row.kilometres!=null&&['MI','MILES'].includes(unit)){row.kilometres=Math.round(row.kilometres*1.609344);flags.push('Mileage converted from miles');}
    else if(!['KM','KMS','KILOMETRES','KILOMETERS'].includes(unit)){row.kilometres=null;flags.push('Odometer unit unknown');}
    for(const key of ['price','year','make','model','trim','generation','body','stock','kilometres'])if(row[key]==null||row[key]==='')flags.push(`Unknown ${key}`);
    if(!row.vin)flags.push(vin?'Invalid VIN; not deduplicated':'VIN unknown; not deduplicated');
    if(!row.url)flags.push('Listing link unavailable');
    if(!row.observedAt)flags.push('Checked date unknown; freshness unverified');
    else if(Date.parse(row.observedAt)>now+300000)flags.push('Checked date is in the future; verify');
    else if(now-Date.parse(row.observedAt)>staleHours*3600000)flags.push(`Stale: older than ${staleHours} hours`);
    if(row.inventory)flags.push('Inventory timestamp records a saved edit; online status is not verified');
    row.observations=[{source:row.source,url:row.url||row.sourceUrl,observedAt:row.observedAt,price:row.price,kilometres:row.kilometres}];
    return row;
  }
  const alias={generationid:'generation',bodystyle:'body',bodytype:'body',stocknumber:'stock',stockno:'stock',stock:'stock',stocknum:'stock',kms:'kilometres',km:'kilometres',kilometers:'kilometres',kilometres:'kilometres',listingurl:'url',originallistingurl:'url',checkedat:'observedAt',observedat:'observedAt',updatedat:'observedAt',odometerunit:'unit'};
  function csv(text){
    const rows=[];let row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(!cell||quoted)quoted=!quoted;else throw new Error('Unexpected quote in CSV');}
      else if(!quoted&&(c===','||c==='\t'||c==='\n'||c==='\r')){row.push(cell);cell='';if(c!==','&&c!=='\t'){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(x=>x.trim()))rows.push(row);row=[];if(rows.length>MAX_ROWS+1)throw new Error('Import is limited to 2,000 rows');}}else cell+=c;}
    if(quoted)throw new Error('CSV has an unclosed quote');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
    const headers=(rows.shift()||[]).map(x=>{const k=x.toLowerCase().replace(/[^a-z0-9]/g,'');return alias[k]||k;});
    if(!headers.includes('price')||!headers.includes('model'))throw new Error('Include a header row with at least price and model');
    if(new Set(headers).size!==headers.length)throw new Error('CSV has duplicate column names');
    return rows.map((r,i)=>{if(r.length>headers.length)throw new Error(`CSV row ${i+2} has too many columns; quote prices containing commas`);return Object.fromEntries(headers.map((h,j)=>[h,r[j]??'']));});
  }
  function parseImport(text){text=String(text||'').replace(/^\uFEFF/,'').trim();if(text.length>MAX_TEXT)throw new Error('Import is limited to 2 MB');if(!text)return [];
    let rows;if(/^[\[{]/.test(text)){const data=JSON.parse(text);rows=Array.isArray(data)?data:data.rows;if(!Array.isArray(rows))throw new Error('JSON must be an array of vehicle rows or {"rows": [...]}');}
    else rows=csv(text);if(rows.length>MAX_ROWS)throw new Error('Import is limited to 2,000 rows');
    if(rows.some(r=>!r||typeof r!=='object'||Array.isArray(r)))throw new Error('Every imported row must be a vehicle object');return rows;
  }
  // Only explicit source facts establish a match. A nearby model year does not
  // establish a generation, and missing trim/body information stays unverified.
  const factKey=value=>clean(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  function matchVehicle(row,target){
    const reasons=[],conflicts=[];
    for(const key of ['make','model','generation','body','trim']){
      if(!factKey(row[key])||!factKey(target[key]))reasons.push(`${key[0].toUpperCase()+key.slice(1)} unknown; verify against target`);
      else if(factKey(row[key])!==factKey(target[key])){if(key==='trim')reasons.push('Different trim from target; compare equipment and price');else conflicts.push(`Different ${key} from target`);}
    }
    if(!row.year||!target.year)reasons.push('Year unknown; verify');
    else if(row.year!==target.year)reasons.push('Different year from target; generation must be verified');
    const status=conflicts.length?'excluded':reasons.some(r=>/unknown/.test(r))?'possible':reasons.some(r=>r.startsWith('Different trim'))?'variant':'matched';
    return {status,reasons:[...conflicts,...reasons]};
  }
  function canonicalListingUrl(value){
    const safe=safeUrl(value);if(!safe)return '';
    const u=new URL(safe);u.hash='';
    for(const key of [...u.searchParams.keys()])if(/^utm_/i.test(key)||/^(fbclid|gclid|msclkid)$/i.test(key))u.searchParams.delete(key);
    u.searchParams.sort();return u.href;
  }
  function deduplicate(rows){
    const byVin=new Map(),byUrl=new Map(),ambiguousUrls=new Set(),out=[];
    for(const row of rows){
      const url=canonicalListingUrl(row.url),urlMatch=url&&!ambiguousUrls.has(url)&&byUrl.get(url);
      const conflict=urlMatch&&row.vin&&urlMatch.vin&&row.vin!==urlMatch.vin;
      if(conflict){ambiguousUrls.add(url);row.flags.push('Conflicting VIN at the same listing URL; kept separate');urlMatch.flags.push('Conflicting VIN at the same listing URL; kept separate');}
      const sameStock=urlMatch&&factKey(row.stock)&&factKey(row.stock)===factKey(urlMatch.stock);
      const differentFacts=urlMatch&&['year','make','model','trim','body','generation'].some(key=>factKey(row[key])&&factKey(urlMatch[key])&&factKey(row[key])!==factKey(urlMatch[key]));
      if(differentFacts){ambiguousUrls.add(url);row.flags.push('Conflicting vehicle facts at the same listing URL; kept separate');urlMatch.flags.push('Conflicting vehicle facts at the same listing URL; kept separate');}
      const old=(row.vin&&byVin.get(row.vin))||(!conflict&&!differentFacts&&sameStock&&urlMatch);
      if(!old){out.push(row);if(row.vin)byVin.set(row.vin,row);if(url)byUrl.set(url,row);continue;}
      const preferred=old.target?old:row.target?row:old.inventory?old:row.inventory?row:(Date.parse(row.observedAt)||0)>(Date.parse(old.observedAt)||0)?row:old;
      const sameVin=old.vin&&old.vin===row.vin;
      const merged={...preferred,target:old.target||row.target,inventory:old.inventory||row.inventory,observations:[...old.observations,...row.observations],flags:[...new Set([...old.flags,...row.flags,sameVin?'Same VIN combined':'Same listing URL combined'])]};
      for(const key of ['price','year','make','model','trim','generation','body','stock','kilometres'])if(old[key]!==row[key]&&old[key]!=null&&old[key]!==''&&row[key]!=null&&row[key]!=='')merged.flags.push(`Conflicting ${key}; verify sources`);
      out[out.indexOf(old)]=merged;
      for(const map of [byVin,byUrl])for(const [key,value] of map)if(value===old)map.set(key,merged);
      if(row.vin)byVin.set(row.vin,merged);if(url)byUrl.set(url,merged);
    }
    return out;
  }
  const sortPrice=(a,b)=>(a.price??Infinity)-(b.price??Infinity)||Number(b.target)-Number(a.target)||a.stock.localeCompare(b.stock);
  function compare(inputs,{target=null,inventory=[],staleHours=24,now=Date.now(),runId=''}={}){
    const rows=[],coverage=[],targets=(target?[target]:inventory).map(v=>normalize(v,{name:'Our Inventory',inventory:true,target:!!target},now,staleHours));
    rows.push(...targets);
    for(const input of inputs){const imported=parseImport(input.text);if(rows.length+imported.length>MAX_ROWS)throw new Error('A comparison is limited to 2,000 total vehicles across all sources and Inventory');coverage.push({name:clean(input.name||input.kind),url:safeUrl(input.url),rows:imported.length,status:imported.length?'User-supplied data; not live verified':'No data supplied; source not searched'});for(const raw of imported)rows.push(normalize(raw,{name:input.name||input.kind,url:input.url},now,staleHours));}
    if(!coverage.some(c=>c.rows))throw new Error('Add at least one comparison row from a source. Opening a source does not search it.');
    const included=[],excluded=[];
    for(const row of deduplicate(rows)){
      if(row.inventory)row.match={status:row.target?'target':'inventory',reasons:['Our Inventory reference; online availability is unverified']};
      else if(!targets.length)row.match={status:'unassessed',reasons:['No Inventory target available; comparability unverified']};
      else{
        const checks=targets.map(t=>({target:t,match:matchVehicle(row,t)}));
        const best=checks.find(x=>x.match.status==='matched')||checks.find(x=>x.match.status==='variant')||checks.find(x=>x.match.status==='possible')||checks[0];
        row.match={...best.match,stocks:checks.filter(x=>x.match.status===best.match.status).map(x=>x.target.stock).filter(Boolean)};
        row.flags.push(...row.match.reasons);
      }
      if(target&&row.price!=null&&targets[0].price!=null)row.priceDifference=row.price-targets[0].price;
      (row.match.status==='excluded'?excluded:included).push(row);
    }
    included.sort(sortPrice);excluded.sort(sortPrice);
    return {schema:2,runId:runId||`${now}-${Math.random().toString(36).slice(2)}`,generatedAt:new Date(now).toISOString(),staleHours,coverage,rows:included,excluded,
      matchingPolicy:'Known make/model/generation/body conflicts are excluded. Different trims stay included with equipment/price differences labelled. Missing facts are possible matches, never confirmed. Model year alone does not establish generation. All supplied prices are retained; no cheaper/higher-price cutoff is applied.'};
  }
  const price=v=>v==null?'Unknown price':new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:2}).format(v);
  const title=r=>[r.year,r.make,r.model,r.trim].filter(Boolean).join(' ')||'Unknown vehicle';
  const mileage=r=>r.kilometres==null?'Unknown mileage':`${r.kilometres.toLocaleString('en-CA')} km`;
  const matchLabel=r=>({matched:'Comparable from supplied facts',variant:'Comparable — different trim; review equipment and price',possible:'Possible match — review differences or missing facts',excluded:'Excluded — conflicting vehicle facts',target:'Selected target',inventory:'Our Inventory reference',unassessed:'Comparability unverified'}[r.match?.status]||'Comparability unverified');
  const priceDifference=r=>r.priceDifference==null||r.target?'':r.priceDifference===0?'Same price as target':`${price(Math.abs(r.priceDifference))} ${r.priceDifference<0?'lower':'higher'} than target`;
  const resultLine=r=>`${r.target?'⭐ ':''}${price(r.price)} - ${title(r)} - ${r.stock||'Stock unknown'} · ${mileage(r)}`;
  function lineList(rows){return `<ol class="compare-lines">${rows.map(r=>`<li class="compare-row ${r.target?'compare-target':''}"><div class="compare-result-line">${r.target?'<span aria-label="Selected target">⭐</span> ':''}<strong>${escape(price(r.price))}</strong> - ${escape(title(r))} - ${r.url?`<a href="${escape(safeUrl(r.url))}" target="_blank" rel="noopener noreferrer">${escape(r.stock||'Stock unknown')}</a>`:escape(r.stock||'Stock unknown')}<span class="compare-mileage"> · ${escape(mileage(r))}</span></div><div class="compare-match">${escape(matchLabel(r))}${priceDifference(r)?` · ${escape(priceDifference(r))}`:''}${r.match?.stocks?.length?` · Target stock: ${escape(r.match.stocks.join(', '))}`:''}</div><details class="compare-row-details"><summary>Source &amp; vehicle details${r.flags.length?` · ${r.flags.length} checks`:''}</summary><div>${escape(r.source)} · VIN ${escape(r.vin||'unknown')} · Generation ${escape(r.generation||'unknown')} · Body ${escape(r.body||'unknown')}</div>${r.flags.length?`<div>${escape(r.flags.join(' · '))}</div>`:''}${r.observations.map(o=>`<div>${escape(o.source)} · ${escape(o.observedAt||'Checked date unknown')} · ${escape(price(o.price))}${safeUrl(o.url)?` · <a href="${escape(safeUrl(o.url))}" target="_blank" rel="noopener noreferrer">Source</a>`:''}</div>`).join('')}</details></li>`).join('')}</ol>`;}
  // Keep the existing entry point for persisted reports and callers.
  function table(report){return `<div class="compare-results-list"><p class="help">Price ascending · CAD · unknown prices last · ⭐ selected target</p>${report.matchingPolicy?`<p class="help">${escape(report.matchingPolicy)}</p>`:''}${lineList(report.rows)}${report.excluded?.length?`<details class="compare-excluded"><summary>Excluded mismatches (${report.excluded.length})</summary>${lineList(report.excluded)}</details>`:''}</div>`;}
  function shareText(report){
    const lines=['LotKeys — Latest Comparison',`Generated: ${report.generatedAt}`,'Manual/imported source data; no automatic website search.','Prices: CAD, ascending. ⭐ selected target. Unknown facts remain unverified.'];
    if(report.matchingPolicy)lines.push(report.matchingPolicy);
    for(const row of report.rows){lines.push('',resultLine(row),matchLabel(row)+(priceDifference(row)?` · ${priceDifference(row)}`:''));for(const o of row.observations)lines.push(`Source: ${o.source} · checked ${o.observedAt||'unknown'}${safeUrl(o.url)?' · '+safeUrl(o.url):''}`);if(row.flags.length)lines.push('Review: '+row.flags.join('; '));}
    if(report.excluded?.length){lines.push('',`Excluded mismatches (${report.excluded.length})`);for(const row of report.excluded){lines.push(resultLine(row),...row.match.reasons);for(const o of row.observations)lines.push(`Source: ${o.source} · checked ${o.observedAt||'unknown'}${safeUrl(o.url)?' · '+safeUrl(o.url):''}`);}}
    return lines.join('\n');
  }
  function documentBody(report){
    let text=`LotKeys — Latest Comparison\nComparison ID: ${report.runId}\nGenerated: ${report.generatedAt}\nPrices: CAD, ascending. ⭐ selected target. Unknown fields stay unverified. Freshness threshold: ${report.staleHours} hours.\nOnly supplied rows were compared; no online inventory search was performed.\n${report.matchingPolicy||''}\n\nSource inputs\n`;
    const links=[];function appendLink(label,url){const start=text.length+1;text+=label;if(safeUrl(url))links.push({startIndex:start,endIndex:start+label.length,url:safeUrl(url)});}
    for(const c of report.coverage){text+=`${c.name}: ${c.rows} rows — ${c.status}\n`;if(c.url){appendLink(c.url,c.url);text+='\n';}}
    function appendRow(r){text+=`${r.target?'⭐ ':''}${price(r.price)} - ${title(r)} - `;appendLink(r.stock||'Stock unknown',r.url);text+=` · ${mileage(r)}\n${matchLabel(r)}${priceDifference(r)?' · '+priceDifference(r):''}\nVIN: ${r.vin||'Unknown'} · Generation: ${r.generation||'Unknown'} · Body: ${r.body||'Unknown'}\n`;
      for(const o of r.observations){text+=`Source: ${o.source} · checked ${o.observedAt||'unknown'} · ${price(o.price)}\n`;if(o.url){appendLink(o.url,o.url);text+='\n';}}
      if(r.flags.length)text+=`Review: ${r.flags.join('; ')}\n`;text+='\n';}
    text+='\nComparison results\n';for(const r of report.rows)appendRow(r);
    if(report.excluded?.length){text+=`\nExcluded mismatches (${report.excluded.length})\n`;for(const r of report.excluded)appendRow(r);}
    return {text,links};
  }
  function docText(doc){let text='';function walk(elements){for(const el of elements||[]){for(const p of el.paragraph?.elements||[])text+=p.textRun?.content||'';for(const row of el.table?.tableRows||[])for(const cell of row.tableCells||[])walk(cell.content);}}walk(doc.body?.content);return text;}
  function documentRequests(doc,report){if(!doc.revisionId)throw new Error('Document revision unavailable; previous comparison was not replaced');const content=doc.body?.content||[],end=content.at(-1)?.endIndex||1;const body=documentBody(report),requests=[];
    if(end>2)requests.push({deleteContentRange:{range:{startIndex:1,endIndex:end-1}}});
    requests.push({insertText:{location:{index:1},text:body.text}});
    for(const link of body.links)requests.push({updateTextStyle:{range:{startIndex:link.startIndex,endIndex:link.endIndex},textStyle:{link:{url:link.url}},fields:'link'}});
    return {requests,writeControl:{requiredRevisionId:doc.revisionId}};
  }
  function scopeKey(c){return JSON.stringify([c.account,c.sub,c.store,c.root]);}
  const scopeQueues=new Map();
  async function coordinate(key,task){
    if(typeof navigator!=='undefined'&&navigator.locks?.request)return navigator.locks.request('lotkeys-compare:'+key,{mode:'exclusive'},task);
    const previous=scopeQueues.get(key)||Promise.resolve();let release;const next=new Promise(resolve=>{release=resolve});scopeQueues.set(key,next);await previous;
    try{return await task()}finally{release();if(scopeQueues.get(key)===next)scopeQueues.delete(key);}
  }
  function generationMatches(a,b){return scopeKey(a)===scopeKey(b)&&(a.epoch??0)===(b.epoch??0);}
  function reportTime(doc){return Date.parse(docText(doc).match(/^Generated: (.+)$/m)?.[1]||'')||0;}
  function createDriveStore(io){
    let busy=false;
    async function guard(c){if(!generationMatches(c,await io.context()))throw new Error('Google account, Store or Account Storage changed. Reopen Compare.');}
    async function call(c,url,options={}){await guard(c);const r=await io.request(c,url,options);await guard(c);return r;}
    const base='https://www.googleapis.com/drive/v3/files';
    async function metadata(c,id){try{return await call(c,`${base}/${encodeURIComponent(id)}?supportsAllDrives=true&fields=id,name,mimeType,parents,appProperties,trashed,createdTime`);}catch(e){if(e.status===404)return null;throw e;}}
    function validate(c,f){if(!f||f.trashed||f.mimeType!==DOC_MIME||!f.parents?.includes(c.root)||f.appProperties?.lotkeysRole!==ROLE||f.appProperties?.comparisonAccount!==c.account||f.appProperties?.comparisonStore!==c.store)throw new Error('Comparison document identity changed; no file was overwritten.');}
    async function resolve(c){
      const q=`'${c.root.replace(/['\\]/g,'\\$&')}' in parents and trashed = false and appProperties has { key='lotkeysRole' and value='${ROLE}' }`;
      const result=await call(c,`${base}?q=${encodeURIComponent(q)}&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=1000&fields=files(id,name,mimeType,parents,appProperties,trashed,createdTime),nextPageToken`);
      if(result.nextPageToken)throw new Error('Too many comparison files; review Account Storage.');
      const matches=(result.files||[]).filter(f=>f.appProperties?.comparisonAccount===c.account&&f.appProperties?.comparisonStore===c.store);
      for(const f of matches)validate(c,f);
      if(matches.length<2)return matches[0]||null;
      // First creation cannot be made globally unique by Drive's list/create API.
      // Across devices, retain every raced copy and reuse the newest valid report.
      // Google Docs revision guards still arbitrate writes to the chosen document.
      const candidates=[];for(const f of matches){const doc=await call(c,`https://docs.googleapis.com/v1/documents/${encodeURIComponent(f.id)}`);candidates.push({file:f,time:reportTime(doc)});}
      candidates.sort((a,b)=>b.time-a.time||String(a.file.createdTime||'').localeCompare(String(b.file.createdTime||''))||a.file.id.localeCompare(b.file.id));
      return {...candidates[0].file,comparisonWarning:`${matches.length} comparison documents found after overlapping saves. All copies were retained; this link uses the newest completed report.`};
    }
    async function load(expectedContext=null){const c=expectedContext||await io.context();await guard(c);if(!c.account||!c.root)return null;const f=await resolve(c);if(!f)return null;const doc=await call(c,`https://docs.googleapis.com/v1/documents/${encodeURIComponent(f.id)}`);return {fileId:f.id,url:`https://docs.google.com/document/d/${encodeURIComponent(f.id)}/edit`,text:docText(doc),warning:f.comparisonWarning||''};}
    async function save(report,expectedContext=null){if(busy)throw new Error('A comparison save is already running');busy=true;try{const c=expectedContext||await io.context();await guard(c);return await coordinate(scopeKey(c),async()=>{await guard(c);if(!c.account||!c.root||!c.store)throw new Error('Connect your Store and choose your existing LotKeys Account Storage before saving.');
      const folder=await metadata(c,c.root);if(!folder||folder.trashed||folder.mimeType!=='application/vnd.google-apps.folder')throw new Error('Existing Account Storage is unavailable; previous report kept.');
      const key=`lotkeysCompareCreateV1:${scopeKey(c)}`;let f=await resolve(c);
      if(!f){if(await io.setting(key,false))throw new Error('An earlier document creation has an uncertain outcome. Retry after Drive finishes indexing; no second document was created.');await guard(c);await io.setSetting(key,true);await guard(c);
        try{f=await call(c,base+'?supportsAllDrives=true&fields=id,name,mimeType,parents,appProperties,trashed,createdTime',{method:'POST',body:{name:'LotKeys — Latest Comparison (Temporary)',mimeType:DOC_MIME,parents:[c.root],appProperties:{lotkeysRole:ROLE,comparisonAccount:c.account,comparisonStore:c.store}}});}
        catch(e){if(e.status>=400&&e.status<500&&![408,409,429].includes(e.status))await io.setSetting(key,false);throw e;}}
      f=await resolve(c)||f;validate(c,f);const docUrl=`https://docs.googleapis.com/v1/documents/${encodeURIComponent(f.id)}`,doc=await call(c,docUrl);if(reportTime(doc)>Date.parse(report.generatedAt))throw new Error('A newer comparison is already saved. Open the latest document before replacing it.');const body=documentRequests(doc,report);
      try{await call(c,docUrl+':batchUpdate',{method:'POST',body});}
      catch(error){if(error.status>=400&&error.status<500)throw error;const checked=await call(c,docUrl);if(!docText(checked).includes(`Comparison ID: ${report.runId}\n`))throw new Error('Save outcome unconfirmed; previous local report kept. Reopen or retry to check Drive.');}
      const verified=await call(c,docUrl);if(!docText(verified).includes(`Comparison ID: ${report.runId}\n`))throw new Error('Drive has a different comparison revision. New results remain local; reopen the latest document.');await guard(c);await io.setSetting(key,false);
      return {fileId:f.id,url:`https://docs.google.com/document/d/${encodeURIComponent(f.id)}/edit`,text:docText(verified),runId:report.runId,warning:f.comparisonWarning||''};
    });}finally{busy=false;}}
    return {load,save,guard};
  }
  return {sources,escape,safeUrl,number,timestamp,normalize,parseImport,matchVehicle,canonicalListingUrl,compare,price,title,mileage,resultLine,shareText,table,documentBody,documentRequests,docText,scopeKey,generationMatches,createDriveStore};
});
