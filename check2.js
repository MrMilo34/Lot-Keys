
const PhotoInfo = (()=>{
  let loadPromise=null;
  const CURRENT_YEAR=new Date().getFullYear();
  const MAKES={
    'ACURA':'Acura','ALFA ROMEO':'Alfa Romeo','AUDI':'Audi','BMW':'BMW','BUICK':'Buick','CADILLAC':'Cadillac',
    'CHEVROLET':'Chevrolet','CHEVY':'Chevrolet','CHRYSLER':'Chrysler','DODGE':'Dodge','FIAT':'Fiat','FORD':'Ford',
    'GENESIS':'Genesis','GMC':'GMC','HONDA':'Honda','HYUNDAI':'Hyundai','INFI':'Infiniti','INFINITI':'Infiniti',
    'JAGUAR':'Jaguar','JEEP':'Jeep','KIA':'Kia','LAND ROVER':'Land Rover','LEXUS':'Lexus','LINCOLN':'Lincoln',
    'MAZDA':'Mazda','MERCEDES':'Mercedes-Benz','MERCEDES-BENZ':'Mercedes-Benz','MINI':'MINI','MITSUBISHI':'Mitsubishi',
    'NISSAN':'Nissan','PORSCHE':'Porsche','RAM':'Ram','SUBARU':'Subaru','TESLA':'Tesla','TOYOTA':'Toyota',
    'VOLKSWAGEN':'Volkswagen','VW':'Volkswagen','VOLVO':'Volvo','INFI':'Infiniti'
  };
  function clean(s){return String(s||'').replace(/[|]/g,'I').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/\r/g,'').trim()}
  function normalizeVin(v){return clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'')}
  function validVin(v){return /^[A-HJ-NPR-Z0-9]{17}$/.test(v)}
  function normalizeYear(y){
    let n=Number(String(y||'').replace(/\D/g,'')); if(!n)return'';
    if(n<100)n=n<=((CURRENT_YEAR+2)%100)?2000+n:1900+n;
    return n>=1980&&n<=CURRENT_YEAR+2?String(n):'';
  }
  function makeValue(raw){
    const u=clean(raw).toUpperCase().replace(/[^A-Z -]/g,' ').replace(/\s+/g,' ').trim();
    if(MAKES[u])return MAKES[u];
    for(const [k,v] of Object.entries(MAKES)) if(u===k || u.startsWith(k+' ')) return v;
    return '';
  }
  function add(out,key,value,confidence='suggested',reason=''){
    value=String(value??'').trim(); if(!value)return;
    const prev=out[key];
    if(!prev || (prev.confidence!=='high' && confidence==='high')) out[key]={value,confidence,reason};
  }
  function modelValue(raw){
    return clean(raw).replace(/[©®™]+/g,'').replace(/\s+(?:IN\s+STOCK|PRICE|STK|STOCK|VIN)\b.*$/i,'').replace(/[|:;,.\-]+$/g,'').replace(/\s+/g,' ').trim();
  }
  function flattenLayoutLines(blocks,imageIndex=0){
    const rows=[];
    for(const block of blocks||[]) for(const para of block.paragraphs||[]) for(const line of para.lines||[]){
      const text=clean(line.text || (line.words||[]).map(w=>w.text||'').join(' '));
      if(!text)continue;
      const b=line.bbox||{};
      rows.push({text,bbox:{x0:+b.x0||0,y0:+b.y0||0,x1:+b.x1||0,y1:+b.y1||0},imageIndex});
    }
    return rows;
  }
  function headingParts(line){
    const text=clean(line);const m=text.match(/\b((?:19|20)\d{2})\s+(.+)$/i);if(!m)return null;
    const year=normalizeYear(m[1]);if(!year)return null;
    const rest=clean(m[2]);const upper=rest.toUpperCase().replace(/[^A-Z0-9 -]/g,' ').replace(/\s+/g,' ').trim();
    const makeKeys=Object.keys(MAKES).sort((a,b)=>b.length-a.length);
    for(const k of makeKeys){
      const rx=new RegExp('^'+k.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')+'(?:\\s+|$)','i');
      if(!rx.test(upper))continue;
      const mk=MAKES[k];
      // Use the same number of leading words from the original OCR line so punctuation/case is preserved in model.
      const makeWordCount=k.trim().split(/\s+/).length;
      const originalWords=rest.split(/\s+/);
      const model=modelValue(originalWords.slice(makeWordCount).join(' '));
      if(model)return {year,make:mk,model};
    }
    return null;
  }
  function groupedVehicleHeader(layoutLines,plainLines=[]){
    const candidates=[];
    for(const row of layoutLines||[]){
      const parts=headingParts(row.text);if(!parts)continue;
      const u=row.text.toUpperCase();
      if(/AVAILABLE\s+AT|DEALER|REFERENCE\s+LINKS|CREATED\s*:/i.test(u))continue;
      const same=(layoutLines||[]).filter(x=>x.imageIndex===row.imageIndex);
      const pageBottom=Math.max(1,...same.map(x=>x.bbox?.y1||0));
      const cy=((row.bbox?.y0||0)+(row.bbox?.y1||0))/2;
      const nearby=same.filter(x=>x!==row && Math.abs((((x.bbox?.y0||0)+(x.bbox?.y1||0))/2)-cy) <= Math.max(180,pageBottom*.22));
      const evidence=nearby.filter(x=>/(?:STK|STOCK)\s*(?:#|NO\.?|NUMBER)?\s*[:#-]?\s*[A-Z0-9-]{3,16}|(?:VIN|VIN\s*#)\s*[:#-]?\s*[A-HJ-NPR-Z0-9 -]{15,25}/i.test(x.text));
      let score=10+(evidence.length?12:0);
      if(parts.make==='Infiniti' && /INFINITI\s+(?:SOUTH|NORTH|WEST|EAST)|GO\s+INFINITI/i.test(u))score-=20;
      candidates.push({row,parts,score,evidence});
    }
    // Text-only fallback when block/layout output is unavailable.
    if(!candidates.length){
      for(let i=0;i<plainLines.length;i++){
        const parts=headingParts(plainLines[i]);if(!parts)continue;
        const u=plainLines[i].toUpperCase();if(/AVAILABLE\s+AT|DEALER|REFERENCE\s+LINKS|CREATED\s*:/i.test(u))continue;
        const around=plainLines.slice(Math.max(0,i-3),i+5).join(' ');
        const evidence=/(?:STK|STOCK)\s*(?:#|NO\.?|NUMBER)?\s*[:#-]?\s*[A-Z0-9-]{3,16}|(?:VIN|VIN\s*#)\s*[:#-]?\s*[A-HJ-NPR-Z0-9 -]{15,25}/i.test(around);
        candidates.push({parts,score:10+(evidence?10:0),evidence:evidence?[true]:[]});
      }
    }
    candidates.sort((a,b)=>b.score-a.score);return candidates[0]||null;
  }
  function parse(text, barcodeValues=[], layoutLines=[]){
    const out={}; const raw=clean(text); const upper=raw.toUpperCase(); const lines=raw.split(/\n+/).map(x=>x.trim()).filter(Boolean);
    // First priority: a coherent Year + Make + Model header, reinforced by nearby STK/VIN.
    // This prevents dealership branding or unrelated dates elsewhere on a screenshot from winning.
    const grouped=groupedVehicleHeader(layoutLines,lines);
    if(grouped){
      const conf=grouped.evidence?.length?'high':'suggested';
      add(out,'year',grouped.parts.year,conf,'Grouped Year / Make / Model header');
      add(out,'make',grouped.parts.make,conf,'Grouped Year / Make / Model header');
      add(out,'model',grouped.parts.model,conf,'Grouped Year / Make / Model header');
    }
    for(const b of barcodeValues||[]){const v=normalizeVin(b); if(validVin(v)) add(out,'vin',v,'high','17-character VIN from barcode');}
    const vinCandidates=(upper.match(/[A-HJ-NPR-Z0-9]{17}/g)||[]);
    for(const v of vinCandidates) if(validVin(v)) add(out,'vin',v,'high','17-character VIN');

    // Prefer the actual sale / Your Price before generic price labels.
    const preferredPrice=raw.match(/(?:YOUR\s+PRICE|SALE\s+PRICE)\D{0,14}\$?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,6})/i);
    if(preferredPrice)add(out,'price',preferredPrice[1].replace(/,/g,''),'high','Your/Sale price');

    for(const line of lines){
      const u=line.toUpperCase();
      let m=u.match(/(?:VIN|VIN\s*#|VEHICLE\s*IDENTIFICATION(?:\s*NUMBER)?)\s*[:#-]?\s*([A-Z0-9 -]{17,25})/);
      if(m){const v=normalizeVin(m[1]); if(validVin(v)) add(out,'vin',v,'high','Labeled VIN');}
      m=u.match(/(?:STK|STOCK)(?:\s*(?:#|NO\.?|NUMBER))?\s*[:#-]?\s*([A-Z0-9-]{3,16})/);
      if(m) add(out,'stock',m[1].replace(/[^A-Z0-9-]/g,''),'high','Labeled stock number');
      m=u.match(/\bYEAR\s*[:#-]?\s*(\d{2}|\d{4})\b/);
      if(m){const y=normalizeYear(m[1]); if(y)add(out,'year',y,'high','Labeled year');}
      m=u.match(/\bMAKE\s*[:#-]?\s*([A-Z][A-Z -]{1,20})/);
      if(m){const mk=makeValue(m[1]); if(mk)add(out,'make',mk,'high','Labeled make');}
      m=u.match(/\bMODEL\s*[:#-]?\s*([A-Z0-9][A-Z0-9 .+\/\-©®™]{0,35})/);
      if(m){const val=modelValue(m[1].replace(/\s+(MAKE|YEAR|VIN|STK|STOCK)\b.*$/,'').trim());if(val)add(out,'model',val,'high','Labeled model');}
      if(!out.price){m=line.match(/(?:PRICE)\D{0,12}\$?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,6})/i);if(m)add(out,'price',m[1].replace(/,/g,''),'suggested','Price found near price label');}
      m=line.match(/(?:ODOMETER|MILEAGE)\D{0,12}([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{1,6})\s*(KM|KMS|MI|MILES)?/i);
      if(m){add(out,'odometer',m[1].replace(/,/g,''),'high','Labeled odometer');if(m[2])add(out,'odometerUnit',/^MI/i.test(m[2])?'MI':'KM','high','Odometer unit');}
    }
    // Secondary heading pass is still local/coherent; do it before any page-wide fallbacks.
    if((!out.model || !out.make || !out.year)){
      for(const line of lines){
        const parts=headingParts(line);if(!parts)continue;
        if(!out.year)add(out,'year',parts.year,'suggested','Vehicle heading');
        if(!out.make)add(out,'make',parts.make,'suggested','Vehicle heading');
        if(!out.model)add(out,'model',parts.model,'suggested','Vehicle heading');
        break;
      }
    }
    // Odometer is allowed to live elsewhere on the page, as it often does on dealership sites.
    if(!out.odometer){
      const m=raw.match(/\b([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,6})\s*(KM|KMS|MI|MILES)\b/i);
      if(m){add(out,'odometer',m[1].replace(/,/g,''),'suggested','Distance found elsewhere in image');add(out,'odometerUnit',/^MI/i.test(m[2])?'MI':'KM','suggested','Distance unit');}
    }
    if(!out.price){const m=raw.match(/\$\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,6})/);if(m)add(out,'price',m[1].replace(/,/g,''),'suggested','Dollar amount found in image');}
    // Avoid grabbing a dealership brand as Make. Only use a page-wide make fallback on a line
    // that is not obviously store/location branding and that also contains a plausible model/year context.
    if(!out.make){
      for(const line of lines){
        if(/AVAILABLE\s+AT|GO\s+INFINITI|INFINITI\s+(?:SOUTH|NORTH|WEST|EAST)|REFERENCE\s+LINKS|DEALER/i.test(line))continue;
        const parts=headingParts(line);if(parts){add(out,'make',parts.make,'suggested','Make from vehicle heading');if(!out.year)add(out,'year',parts.year,'suggested','Year from vehicle heading');if(!out.model)add(out,'model',parts.model,'suggested','Model from vehicle heading');break;}
      }
    }
    if(!out.stock){
      outer: for(const line of lines){
        const tokens=line.toUpperCase().match(/\b[A-Z0-9-]{5,12}\b/g)||[];
        for(const c of tokens){
          if(validVin(c)||/^(?:19|20)\d{2}$/.test(c)||/^(KM|KMS|MI|MILES)$/i.test(c))continue;
          if(/^(?=.*[A-Z])(?=.*\d)[A-Z0-9-]+$/.test(c)){add(out,'stock',c,'suggested','Possible dealer stock number');break outer;}
        }
      }
    }
    return out;
  }
  async function loadTesseract(){
    if(window.Tesseract)return window.Tesseract;
    if(loadPromise)return loadPromise;
    loadPromise=new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';s.async=true;
      s.onload=()=>resolve(window.Tesseract);s.onerror=()=>reject(new Error('Could not load the on-device OCR engine. Check your internet connection.'));
      document.head.appendChild(s);
    });
    return loadPromise;
  }
  async function barcodeValues(file){
    if(!('BarcodeDetector' in window))return[];
    try{
      const detector=new BarcodeDetector({formats:['code_128','code_39','code_93','codabar','ean_13','ean_8','itf','upc_a','upc_e','qr_code']});
      const bmp=await createImageBitmap(file);const codes=await detector.detect(bmp);bmp.close?.();return codes.map(x=>x.rawValue).filter(Boolean);
    }catch{return[]}
  }
  async function enhancedOcrImage(file){
    try{
      const bmp=await createImageBitmap(file);const maxW=2200;const scale=Math.max(1,Math.min(2.2,maxW/bmp.width));
      const c=document.createElement('canvas');c.width=Math.round(bmp.width*scale);c.height=Math.round(bmp.height*scale);
      const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(bmp,0,0,c.width,c.height);bmp.close?.();
      const img=x.getImageData(0,0,c.width,c.height),d=img.data;
      for(let i=0;i<d.length;i+=4){const g=Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2]);const v=Math.max(0,Math.min(255,(g-128)*1.55+128));d[i]=d[i+1]=d[i+2]=v;}
      x.putImageData(img,0,0);return c;
    }catch{return file}
  }
  async function scan(files,onProgress=()=>{}){
    files=[...files];if(!files.length)throw new Error('Choose at least one photo.');
    const T=await loadTesseract();let worker=null;let allText='',barcodes=[],layoutLines=[];
    try{
      worker=await T.createWorker('eng',T.OEM?.LSTM_ONLY??1,{logger:m=>{if(m?.status)onProgress({stage:m.status,progress:m.progress??0})}});
      await worker.setParameters?.({preserve_interword_spaces:'1',user_defined_dpi:'300'}).catch?.(()=>{});
      for(let i=0;i<files.length;i++){
        onProgress({stage:`Reading photo ${i+1} of ${files.length}`,progress:i/files.length});
        barcodes.push(...await barcodeValues(files[i]));
        const r=await worker.recognize(files[i],{}, {text:true,blocks:true});
        allText+=(r?.data?.text||'')+'\n';layoutLines.push(...flattenLayoutLines(r?.data?.blocks||[],i));
        const first=parse(allText,barcodes,layoutLines);
        if(i===files.length-1 && (Object.keys(first).length<4 || !first.vin || !first.stock)){
          onProgress({stage:'Trying enhanced key-tag / label read',progress:.92});
          const enhanced=await enhancedOcrImage(files[i]);
          if(enhanced!==files[i]){const r2=await worker.recognize(enhanced,{}, {text:true,blocks:true});allText+=(r2?.data?.text||'')+'\n';layoutLines.push(...flattenLayoutLines(r2?.data?.blocks||[],i));}
        }
      }
      onProgress({stage:'Finding grouped vehicle information',progress:1});
      return {fields:parse(allText,barcodes,layoutLines),rawText:allText.trim(),barcodes};
    }finally{if(worker)await worker.terminate().catch(()=>{});}
  }
  return {scan};
})();
