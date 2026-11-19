'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const PC=require('../lotkeys-phone-core.js');
const phone=fs.readFileSync(require('node:path').join(__dirname,'..','lotkeys-phone.js'),'utf8');
const hub=fs.readFileSync(require('node:path').join(__dirname,'..','lotkeys-hub.js'),'utf8');
function sender({native=false,connected=true,reply}={}){
  const calls=[],context={state:{nativeStatus:native?{}:null},randomId:()=> 'stable_request_123',connected:()=>connected,event(){},request:async(op,payload)=>{calls.push({op,payload});return reply(payload)},nativeCall:async(url,options)=>{const payload=JSON.parse(options.body);calls.push({url,payload});return reply(payload)},waitForSendReceipt:async()=>{throw Error('A completed receipt must not be polled')}};
  const source=phone.slice(phone.indexOf('  async function send({'),phone.indexOf('  async function sendMedia('));vm.runInNewContext(source,context);return{send:context.send,calls};
}
test('missing PC confirmation remains unconfirmed and status checks reuse the carrier request ID',async()=>{
  let attempt=0;const p=sender({reply:payload=>{if(!attempt++)throw Error('Timeout');return {phase:'sent',requestId:payload.requestId}}});
  const first=await p.send({threadId:'thread',address:'test',text:'fixture'});assert.equal(first.phase,'unconfirmed');assert.match(first.error,/Check status/);
  const checked=await p.send({threadId:'thread',address:'test',text:'fixture',requestId:first.requestId});assert.equal(checked.phase,'sent');assert.equal(p.calls[0].payload.requestId,p.calls[1].payload.requestId);
});
test('the native SMS permission error is retained without polling it away',async()=>{
  const p=sender({native:true,reply:()=>({phase:'failed',error:'Allow SMS sending in the LotKeys Android setup.'})});
  const receipt=await p.send({threadId:'thread',address:'test',text:'fixture'});assert.equal(receipt.phase,'failed');assert.match(receipt.error,/Allow SMS sending/);assert.equal(PC.smsSendOutcome(receipt).action,'retry');
});
test('a disconnected preflight submits no request',async()=>{
  const p=sender({connected:false});await assert.rejects(p.send({threadId:'thread',text:'fixture'}),/Nothing was sent/);assert.equal(p.calls.length,0);
});
test('unknown, partly sent and submission-error receipts never offer a new-send Retry',()=>{
  for(const receipt of [{phase:'unconfirmed'},{phase:'failed',error:'SMS failed or was only partly sent. Check the phone before retrying.'},{phase:'failed',error:'The phone could not submit this SMS. Check the phone before retrying.'}]){
    const outcome=PC.smsSendOutcome(receipt);assert.equal(outcome.state,'unconfirmed');assert.equal(outcome.action,'check');assert.ok(outcome.error);
  }
  assert.equal(PC.smsSendOutcome({phase:'sending'}).action,'check');assert.equal(PC.smsSendOutcome({phase:'sent'}).action,'');
});
test('explicit pre-submission errors permit retry with a fresh request',()=>{
  for(const error of ['Allow Messages access in the LotKeys Android setup.','Choose the default SMS SIM in Android Settings first.','The phone recipient changed. Refresh the conversation before sending.'])assert.equal(PC.smsSendOutcome({phase:'failed',error}).action,'retry');
});
test('Bubble Chat retains unconfirmed receipts and checks the original send',async()=>{
  const calls=[],locals=new Map(),context={PC,deviceHistoryGeneration:0,deviceBubbleSent:locals,currentDeviceKey:()=> 'device',P:{status:()=>({connected:true}),send:async payload=>{calls.push(payload);return {requestId:'bubble_request_123',phase:calls.length===1?'unconfirmed':'sent',error:calls.length===1?'Check phone':''}}},H:{uid:()=> 'local'},M:{rememberReply:async()=>{}},Date};
  const source=hub.slice(hub.indexOf('async function sendDeviceBubbleText('),hub.indexOf('function paintDeviceBubble('));vm.runInNewContext(source,context);
  const first=await context.sendDeviceBubbleText('thread',{address:'fixture'},'device','Test message');assert.equal(first.state,'unconfirmed');assert.equal(locals.get('thread').length,1);
  const second=await context.sendDeviceBubbleText('thread',{address:'fixture'},'device','Test message');assert.equal(calls[1].requestId,'bubble_request_123');assert.equal(second.state,'sent');assert.equal(locals.get('thread').length,1);
});
test('full chat checks an unconfirmed receipt with the original ID and retries a preflight failure with a fresh ID',async()=>{
  const calls=[],context={PC,deviceHistoryGeneration:0,initialHistoryKey:'device',deviceHistoryKey:()=> 'device',currentDeviceKey:()=> 'device',threadId:'thread',row:{address:'fixture'},deviceBubbleSent:new Map(),P:{send:async payload=>{calls.push(payload);return {requestId:payload.requestId||'fresh_request_123',phase:'sent'}}},M:{rememberReply:async()=>{}},Date,draw(){},toast(){}};
  const source=hub.slice(hub.lastIndexOf('  const sendText=async message=>'),hub.indexOf("  $('#hub-device-compose',root).onsubmit",hub.lastIndexOf('  const sendText=async message=>')));
  vm.runInNewContext(source+';globalThis.sendText=sendText',context);
  const unknown={id:'local',text:'Test',at:Date.now(),state:'unconfirmed',action:'check',requestId:'original_request_123'};
  await context.sendText(unknown);assert.equal(calls[0].requestId,'original_request_123');assert.equal(unknown.state,'sent');assert.equal(unknown.checking,false);
  const failed={id:'failed',text:'Test',at:Date.now(),state:'failed',action:'retry',requestId:'failed_request_123'};
  await context.sendText(failed);assert.equal(calls[1].requestId,undefined);assert.equal(failed.requestId,'fresh_request_123');
});
test('full chat rejects phone swaps and expired receipt checks before requesting a send',async()=>{
  let key='other',calls=0;const context={PC,deviceHistoryGeneration:0,initialHistoryKey:'device',deviceHistoryKey:()=>key,currentDeviceKey:()=>key,threadId:'thread',row:{},deviceBubbleSent:new Map(),P:{send:async()=>{calls++}},M:{},Date,draw(){},toast(){}};
  const source=hub.slice(hub.lastIndexOf('  const sendText=async message=>'),hub.indexOf("  $('#hub-device-compose',root).onsubmit",hub.lastIndexOf('  const sendText=async message=>')));
  vm.runInNewContext(source+';globalThis.sendText=sendText',context);
  const message={text:'Test',at:Date.now()-2*24*60*60*1000,requestId:'old_request_123',action:'check'};
  await context.sendText(message);assert.equal(calls,0);key='device';await context.sendText(message);assert.equal(calls,0);assert.equal(message.action,'');assert.match(message.error,/too old/);
});
test('the actual full-chat renderer shows the error and Check status, without labelling it Failed',()=>{
  const box={innerHTML:'',scrollHeight:100,scrollTop:0},context={messages:[{id:'local',text:'Test',at:1,local:true,outgoing:true,transport:'SMS',state:'unconfirmed',label:'Not confirmed',error:'Phone reply timed out',action:'check'}],SMART_MESSAGE_LIMIT:5,root:{},hasMore:false,row:{transport:'SMS'},e:String,when:()=>'',H:{isPhotoAttachment:()=>false},$:()=>box,$$:()=>[],bindOlderTrigger(){},bindDeviceMediaSaves(){},bindSmartOptions(){},enhanceDeviceMedia(){},historyScrollArmed:false,lastHistoryScrollTop:0};
  const start=hub.lastIndexOf('  const draw=({bottom=false'),end=hub.indexOf('  const liveChatIsCurrent=',start);
  vm.runInNewContext(hub.slice(start,end)+';draw()',context);
  assert.match(box.innerHTML,/Not confirmed/);assert.match(box.innerHTML,/Phone reply timed out/);assert.match(box.innerHTML,/Check status/);assert.doesNotMatch(box.innerHTML,/! Failed|>Retry</);
});
test('a late Bubble Chat send cannot repopulate receipts after privacy clearing',async()=>{
  let resolve;const pending=new Promise(yes=>{resolve=yes}),locals=new Map(),context={PC,deviceHistoryGeneration:0,deviceBubbleSent:locals,currentDeviceKey:()=> 'device',P:{status:()=>({connected:true}),send:()=>pending},H:{uid:()=> 'local'},M:{rememberReply:async()=>{}},Date};
  const source=hub.slice(hub.indexOf('async function sendDeviceBubbleText('),hub.indexOf('function paintDeviceBubble('));vm.runInNewContext(source,context);
  const send=context.sendDeviceBubbleText('thread',{address:'fixture'},'device','Test');context.deviceHistoryGeneration++;locals.clear();resolve({phase:'sent',requestId:'request_123'});
  await assert.rejects(send,/connection changed/);assert.equal(locals.size,0);
});
test('a late full-chat send cannot repopulate receipts after privacy clearing',async()=>{
  let resolve;const pending=new Promise(yes=>{resolve=yes}),locals=new Map(),context={PC,deviceHistoryGeneration:0,initialHistoryKey:'device',deviceHistoryKey:()=> 'device',currentDeviceKey:()=> 'device',threadId:'thread',row:{address:'fixture'},deviceBubbleSent:locals,P:{send:()=>pending},M:{rememberReply:async()=>{}},Date,draw(){},toast(){}};
  const source=hub.slice(hub.lastIndexOf('  const sendText=async message=>'),hub.indexOf("  $('#hub-device-compose',root).onsubmit",hub.lastIndexOf('  const sendText=async message=>')));vm.runInNewContext(source+';globalThis.sendText=sendText',context);
  const send=context.sendText({id:'local',text:'Test',at:Date.now()});context.deviceHistoryGeneration++;locals.clear();resolve({phase:'sent',requestId:'request_123'});await send;assert.equal(locals.size,0);
});
test('the actual phone connection panel separates saved pairing, active connection and SMS permission',async()=>{
  const source=hub.slice(hub.indexOf('async function phoneStatusDetails('),hub.indexOf('function paintRows('));
  for(const connected of [false,true]){
    let shown='';const status={role:'phone',native:true,nativeLinked:true,relayReady:true,paired:true,pairedCount:1,connected,capabilities:{smsSend:false},coverage:{level:'amber',label:'SMS/MMS live',detail:'History ready'}};
    const context={S:{pending:async()=>0},P:{status:()=>status},e:String,phonePrimaryLabel:()=> 'Details',bindConnectionStatus(){},modal:(_,html)=>{shown=html;return{}},$:()=>null,action(){}};
    vm.runInNewContext(source,context);await context.phoneStatusDetails();
    assert.match(shown,connected?/id="hub-connected-pcs">🖥️ Connected/:/id="hub-connected-pcs">🖥️ Paired/);assert.match(shown,/SMS sending permission:<\/strong> Off/);
  }
});
