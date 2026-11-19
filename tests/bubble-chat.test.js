'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function messagingFixture(){
  const values=new Map(),opened=[];
  const DB={get:async(_store,id)=>values.has(id)?{id,value:values.get(id)}:null,put:async(_store,row)=>{values.set(row.id,row.value);return row}};
  const window={LotKeysMessagingBridge:{DB,DriveSync:{}},LotKeysHub:{openDeviceBubble:async(id,options)=>{opened.push({id,options});return true}}};
  const document={readyState:'loading',addEventListener(){}};
  const context={window,document,console,TextEncoder,TextDecoder,setTimeout,clearTimeout};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../lotkeys-messaging.js'),'utf8'),context,{filename:'lotkeys-messaging.js'});
  return{messaging:window.LotKeysMessaging,values,opened};
}

test('Bubble Chat chooses the last reply across Device and LotKeys, not a newer incoming chat',async()=>{
  const{messaging,values,opened}=messagingFixture();
  await messaging.rememberReply('device','smsmms-17','phone-a',100);
  values.set('lotkeysMessagingLastConversationV1','unrelated-incoming-chat');
  assert.equal(await messaging.openLastBubble(),true);
  assert.deepEqual(opened.map(x=>x.id),['smsmms-17']);
  assert.equal(opened[0].options.deviceKey,'phone-a');

  await messaging.rememberReply('lotkeys','chat-4','',200);
  await messaging.rememberReply('device','smsmms-17','phone-a',150);
  assert.equal(values.get('lotkeysBubbleLastReplyV1').source,'lotkeys');
  assert.equal(values.get('lotkeysBubbleLastReplyV1').id,'chat-4');

  await messaging.rememberReply('device','smsmms-22','phone-a',300);
  assert.equal(await messaging.openLastBubble(),true);
  assert.deepEqual(opened.map(x=>x.id),['smsmms-17','smsmms-22']);
});
