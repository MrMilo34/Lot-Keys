/* Separate, owner-run Apps Script deployment. No Store Processor or chat content. */
function wakeCanonical(v) {
  for (const key of ['id','deviceId','browserId','nonce','sessionId']) if (!/^[A-Za-z0-9_-]{16,100}$/.test(v[key] || '')) throw Error('Invalid request');
  if (!Number.isSafeInteger(Number(v.issuedAt))) throw Error('Invalid request');
  return ['lotkeys-wake-v1',v.id,v.deviceId,v.browserId,v.nonce,String(v.issuedAt),v.sessionId].join('\n');
}
function wakeEqual(a,b) { a=String(a||'');b=String(b||'');let n=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)n|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return n===0; }
function doPost(event) {
  let result={ok:false};const lock=LockService.getScriptLock();
  try {
    if(!event?.postData?.contents||event.postData.contents.length>12000)throw Error('Invalid request');
    const v=JSON.parse(event.postData.contents),props=PropertiesService.getScriptProperties();
    if(!lock.tryLock(3000))throw Error('Try later');
    const now=Date.now();
    if(v.action==='register') {
      const enrollment=props.getProperty('LOTKEYS_ENROLLMENT_KEY');
      if(!enrollment||enrollment.length<43||!wakeEqual(v.enrollmentKey,enrollment))throw Error('Not authorized');
      const g=v.grant;
      if(!g||!/^[A-Za-z0-9_-]{43}$/.test(g.secret||'')||!/^[A-Za-z0-9_-]{16,100}$/.test(g.id||'')||!/^[A-Za-z0-9_-]{16,100}$/.test(g.deviceId||'')||!/^[A-Za-z0-9_-]{16,100}$/.test(g.browserId||'')||!g.token||String(g.token).length>4096||!Number.isSafeInteger(g.expiresAt)||g.expiresAt<=now||g.expiresAt>now+8*86400000)throw Error('Invalid grant');
      const grants=Object.keys(props.getProperties()).filter(key=>key.startsWith('g:'));
      for(const key of grants){try{if(JSON.parse(props.getProperty(key)).expiresAt<now)props.deleteProperty(key)}catch{props.deleteProperty(key)}}
      if(!props.getProperty('g:'+g.id)&&Object.keys(props.getProperties()).filter(key=>key.startsWith('g:')).length>=50)throw Error('Grant limit');
      props.setProperty('g:'+g.id,JSON.stringify({...g,nonce:'',lastWake:0}));result={ok:true};
    } else if(v.action==='revoke') {
      const enrollment=props.getProperty('LOTKEYS_ENROLLMENT_KEY');
      if(!enrollment||!wakeEqual(v.enrollmentKey,enrollment)||!/^[A-Za-z0-9_-]{16,100}$/.test(v.id||''))throw Error('Not authorized');
      props.deleteProperty('g:'+v.id);result={ok:true};
    } else if(v.action==='wake') {
      const raw=props.getProperty('g:'+v.id);if(!raw)throw Error('Not authorized');const g=JSON.parse(raw);
      if(g.expiresAt<=now||g.deviceId!==v.deviceId||g.browserId!==v.browserId||Math.abs(now-Number(v.issuedAt))>60000)throw Error('Expired request');
      const signature=Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(Utilities.newBlob(wakeCanonical(v)).getBytes(),Utilities.base64DecodeWebSafe(g.secret))).replace(/=+$/,'');
      if(!wakeEqual(signature,v.signature)||g.nonce===v.nonce||Number(v.issuedAt)<=Number(g.lastIssuedAt||0))throw Error('Not authorized');
      if(now-Number(g.lastWake||0)<10000)throw Error('Try later');
      const budget=JSON.parse(props.getProperty('wake-budget')||'{}'),day=new Date(now).toISOString().slice(0,10);
      if(budget.day!==day){budget.day=day;budget.count=0}if(Number(budget.count)>=1000)throw Error('Daily wake limit');
      g.nonce=v.nonce;g.lastWake=now;g.lastIssuedAt=Number(v.issuedAt);props.setProperty('g:'+v.id,JSON.stringify(g));props.setProperty('wake-budget',JSON.stringify({day,count:Number(budget.count||0)+1}));
      const project=props.getProperty('LOTKEYS_FIREBASE_PROJECT_ID');if(!/^[a-z][a-z0-9-]{4,60}$/.test(project||''))throw Error('Project missing');
      const data={};for(const key of ['id','deviceId','browserId','nonce','sessionId','issuedAt','signature'])data[key]=String(v[key]);
      const reply=UrlFetchApp.fetch('https://fcm.googleapis.com/v1/projects/'+project+'/messages:send',{
        method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},muteHttpExceptions:true,
        payload:JSON.stringify({message:{token:g.token,data,android:{priority:'HIGH',ttl:'60s',collapse_key:'lotkeys-pc-wake'}}})
      });
      result={ok:reply.getResponseCode()>=200&&reply.getResponseCode()<300};
      // Never echo FCM tokens, credentials or provider error bodies to the caller.
    }
  }catch{result={ok:false}}
  finally{if(lock.hasLock())lock.releaseLock()}
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
