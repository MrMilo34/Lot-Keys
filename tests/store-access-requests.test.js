'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Core=require('../lotkeys-store-requests.js');
const root='store-root-12345',other='other-root-12345',base='https://mrmilo34.github.io/Lot-Keys-TEST/?build=095046#lotkeys-phone=PRIVATE';
function fixture(options={}){
  const state={context:{rootId:root,account:'admin@example.com',adminLevel:2},proposals:new Map(),receipts:new Map(),permissions:[],provisioned:[],calls:[],share:true,blocked:false,registry:[{email:'admin@example.com',adminLevel:2,status:'active'}],...options};
  const row={fileId:root,proposalId:'request-1',requesterEmailAddress:'new@example.com',recipientEmailAddress:'new@example.com',rolesAndViews:[{role:'writer'}],requestMessage:'Join the team',createTime:'2026-11-10T20:00:00Z',...options.proposal};state.proposals.set(row.proposalId,row);
  const client=Core.createClient({
    context:async fresh=>{if(state.onContext)await state.onContext(fresh,state);return {...state.context}},
    readReceipts:async key=>JSON.parse(JSON.stringify(state.receipts.get(key)||[])),writeReceipts:async(key,value)=>state.receipts.set(key,JSON.parse(JSON.stringify(value))),blocked:async()=>state.blocked,
    provision:async account=>{if(state.provisionError)throw Error('Workspace temporarily unavailable');state.provisioned.push(account);},
    api:async(url,opts={})=>{
      state.calls.push({url,opts});if(state.onCall)await state.onCall(url,opts,state);
      const u=new URL(url);
      if(u.pathname==='/drive/v3/files'){assert.ok(u.searchParams.get('q').startsWith("'"+root+"' in parents"));return {files:[{id:'canonical-store-access'}]};}
      if(u.pathname.endsWith('/canonical-store-access'))return state.registryError?{}:{app:'LotKeys',recordType:'storeAccess',storeFolderId:root,accessUsers:state.registry};
      const tail=u.pathname.slice(u.pathname.indexOf('/files/')+7),parts=tail.split('/');assert.equal(parts[0],root,'Never address another Store');
      if(parts.length===1)return {id:root,capabilities:{canShare:state.share}};
      if(parts[1]==='permissions')return {permissions:state.permissions};
      if(parts.length===2)return state.page?state.page(u):{accessProposals:[...state.proposals.values()]};
      const id=decodeURIComponent(parts[2].replace(':resolve','')),current=state.proposals.get(id);
      if(opts.method==='POST'){
        if(!current)throw Object.assign(Error('Missing proposal'),{status:404});
        const body=JSON.parse(opts.body);assert.equal(body.sendNotification,false);if(body.action==='ACCEPT'){assert.deepEqual(body.role,['reader']);state.permissions.push({type:'user',emailAddress:current.recipientEmailAddress,role:'reader'});}state.proposals.delete(id);
        if(state.resolveError)throw Error('Connection lost after request');return {};
      }
      if(!current)throw Object.assign(Error('Missing proposal'),{status:404});return current;
    }
  });return {state,client,row,ctx:()=>({rootId:root,account:'admin@example.com'})};
}
test('invitations locate private Stores without copying bearer fragments or client query state',()=>{
  const link=Core.invitation({folderId:root,code:'LK-123',name:'My & Store'},base),u=new URL(link);
  assert.equal(u.hash,'');assert.equal(u.searchParams.has('build'),false);assert.equal(u.searchParams.get('joinStore'),root);
  assert.deepEqual(Core.target(link,base),{folderId:root,code:'LK-123',name:'My & Store'});
  assert.equal(Core.target(' inf-se034 ',base).code,'INF-SE034');
  assert.equal(Core.target('https://drive.google.com/drive/folders/'+root,base).folderId,root);
  assert.throws(()=>Core.target('https://evil.example/?joinStore='+root,base),/invitation/);
  assert.throws(()=>Core.target('https://mrmilo34.github.io/Other/?joinStore='+root,base),/invitation/);
  assert.throws(()=>Core.invitation({folderId:'../../other'},base),/invalid/);
  const request=new URL(Core.requestUrl({folderId:root},'New@Example.com'));assert.equal(request.hostname,'drive.google.com');assert.equal(request.searchParams.get('authuser'),'new@example.com');
});
test('Google pending proposals paginate and do not grant access merely by listing',async()=>{
  const f=fixture();f.state.page=u=>u.searchParams.has('pageToken')?{accessProposals:[{...f.row,proposalId:'request-2'}]}:{accessProposals:[f.row],nextPageToken:'page2'};
  const result=await f.client.list();assert.equal(result.requests.length,2);assert.equal(f.state.provisioned.length,0);assert.ok(f.state.calls.every(x=>!x.opts.method));
});
test('omitted empty proposal list is valid while malformed lists fail visibly',async()=>{
  const f=fixture();f.state.page=()=>({});assert.deepEqual((await f.client.list()).requests,[]);
  f.state.page=()=>({accessProposals:null});await assert.rejects(f.client.list({force:true}),/incomplete/);
});
test('a repeated page token cannot create an endless request refresh',async()=>{
  const f=fixture();f.state.page=()=>({accessProposals:[],nextPageToken:'repeat'});await assert.rejects(f.client.list(),/repeated/);assert.ok(f.state.calls.length<=3);
});
test('non-administrators cannot list or resolve requests',async()=>{
  const f=fixture();f.state.context.adminLevel=0;await assert.rejects(f.client.list(),/Administration/);await assert.rejects(f.client.resolve('request-1','approve',f.ctx()),/Administration/);assert.equal(f.state.calls.length,0);
});
test('an administrator without Google sharing capability is told they cannot review',async()=>{
  const f=fixture({share:false});assert.deepEqual(await f.client.list(),{canReview:false,requests:[]});assert.equal(f.state.calls.length,1);
});
test('approval grants Reader and provisions the exact Google recipient, never the requested writer role',async()=>{
  const f=fixture();const result=await f.client.resolve('request-1','approve',f.ctx());assert.equal(result.email,'new@example.com');assert.deepEqual(f.state.provisioned,[{email:'new@example.com',userName:''}]);assert.equal(f.state.permissions[0].role,'reader');assert.equal([...f.state.receipts.values()][0].length,0);
});
test('denial does not provision a user or change existing permissions',async()=>{
  const f=fixture();f.state.permissions.push({type:'user',emailAddress:'existing@example.com',role:'reader'});await f.client.resolve('request-1','deny',f.ctx());assert.equal(f.state.provisioned.length,0);assert.equal(f.state.permissions.length,1);
});
test('disabled accounts cannot be reactivated through a join request',async()=>{
  const f=fixture({blocked:true});await assert.rejects(f.client.resolve('request-1','approve',f.ctx()),/disabled/);assert.equal(f.state.permissions.length,0);assert.equal(f.state.provisioned.length,0);
});
test('a delegated request needs manual review rather than silently provisioning another email',async()=>{
  const f=fixture({proposal:{recipientEmailAddress:'someone-else@example.com'}});await assert.rejects(f.client.resolve('request-1','approve',f.ctx()),/self-service/);assert.equal(f.state.permissions.length,0);
});
test('a published-view proposal cannot approve access to the private Store',async()=>{
  const f=fixture({proposal:{rolesAndViews:[{role:'reader',view:'published'}]}});await assert.rejects(f.client.resolve('request-1','approve',f.ctx()),/self-service/);assert.equal(f.state.permissions.length,0);
});
test('cross-Store proposal replies are rejected before grants',async()=>{
  const f=fixture({proposal:{fileId:other}});await assert.rejects(f.client.list(),/invalid/);await assert.rejects(f.client.resolve('request-1','approve',f.ctx()),/invalid/);assert.equal(f.state.permissions.length,0);
});
test('stale UI Store/account and changed live identity cannot approve',async()=>{
  const f=fixture();await assert.rejects(f.client.resolve('request-1','approve',{...f.ctx(),rootId:other}),/changed/);
  f.state.onContext=(fresh,s)=>{if(fresh)s.context.account='other@example.com'};await assert.rejects(f.client.resolve('request-1','approve',f.ctx()),/changed/);assert.equal(f.state.calls.length,0);
});
test('switching Store while fetching the proposal cannot provision or resolve it',async()=>{
  const f=fixture();f.state.onCall=(url,opts,s)=>{if(new URL(url).pathname.endsWith('/request-1'))s.context.rootId=other};await assert.rejects(f.client.resolve('request-1','approve',f.ctx()),/changed/);assert.equal(f.state.permissions.length,0);
});
test('interrupted workspace provisioning is retained and retries without accepting another proposal',async()=>{
  const f=fixture({provisionError:true});await assert.rejects(f.client.resolve('request-1','approve',f.ctx()),/Workspace/);assert.equal(f.state.permissions.length,1);const pending=await f.client.list();assert.equal(pending.requests[0].kind,'setup');f.state.provisionError=false;await f.client.resolve('request-1','approve',f.ctx());assert.equal(f.state.provisioned.length,1);assert.equal(f.state.calls.filter(x=>x.opts.method==='POST').length,1);
});
test('an uncertain approval checks actual Google permission before provisioning',async()=>{
  const f=fixture({resolveError:true});await assert.rejects(f.client.resolve('request-1','approve',f.ctx()),/could not be confirmed/);assert.equal(f.state.provisioned.length,0);f.state.resolveError=false;await f.client.resolve('request-1','approve',f.ctx());assert.equal(f.state.provisioned.length,1);assert.equal(f.state.calls.filter(x=>x.opts.method==='POST').length,1);
});
test('an unresolved receipt without confirmed Google permission cannot grant Store membership',async()=>{
  const f=fixture({resolveError:true});await assert.rejects(f.client.resolve('request-1','approve',f.ctx()),/confirmed/);f.state.permissions=[];await assert.rejects(f.client.resolve('request-1','approve',f.ctx()),/no Store user/);assert.equal(f.state.provisioned.length,0);
});
test('duplicate approval clicks cannot race through workspace provisioning',async()=>{
  const f=fixture();let release;const latch=new Promise(r=>release=r);f.state.onCall=async url=>{if(new URL(url).pathname.endsWith('/request-1'))await latch};const first=f.client.resolve('request-1','approve',f.ctx());await new Promise(r=>setImmediate(r));await assert.rejects(f.client.resolve('request-1','approve',f.ctx()),/already/);release();await first;assert.equal(f.state.provisioned.length,1);
});
test('refresh cache expires, can be explicitly bypassed, and is never reused after account change',async()=>{
  const f=fixture();await f.client.list();const n=f.state.calls.length;await f.client.list();assert.equal(f.state.calls.length,n);await f.client.list({force:true});assert.ok(f.state.calls.length>n);const m=f.state.calls.length;f.state.context.account='another-admin@example.com';await f.client.list();assert.ok(f.state.calls.length>m);
});
test('actual app wiring puts requests in Reports and only opens Google request UI before approval',()=>{
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');assert.match(html,/Reports \/ Requests/);assert.match(html,/\$\{joinRequestsHtml\}/);assert.match(html,/Copy Store Invitation/);assert.match(html,/Opening Google does not submit the request/);assert.match(html,/error\.requestTarget=target/);assert.match(html,/resolveStoreJoinRequest\(button\.dataset\.requestId,button\.dataset\.action,\{rootId:ds\.storeFolderId,account:accountEmail\}\)/);
  const start=html.indexOf('  async function showStoreAccessRequest('),end=html.indexOf('  async function renderSettings()',start),dialog=html.slice(start,end);assert.doesNotMatch(dialog,/provisionStoreUser|setUserPermission|storeUsers/);assert.match(dialog,/Check approval/);
});

const vm=require('node:vm');
function connectionFixture(options={}){
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8'),start=html.indexOf('  async function findStoreByCode(input){'),end=html.indexOf('  let storeJoinClient;',start);
  const state={fail:null,...options},ctx=vm.createContext({window:{LotKeysStoreRequests:Core},location:{href:base},FOLDER_MIME:'folder',
    driveGet:async id=>{if(state.fail)throw state.fail;return {id,name:'Private Store',mimeType:'folder'}},
    findChildByAppProperty:async()=>({id:'access-json'}),findChildByName:async()=>null,
    fetchFileBlob:async()=>({text:async()=>JSON.stringify({storeFolderId:root,storeCode:'LK-123',accessUsers:[],publicUsers:[]})}),mergeStoreDirectoryUsers:()=>[],
    findAccessibleStoreByCode:async code=>{if(state.fail)throw state.fail;return {code,root:{id:root},name:'Private Store'}},
    publicStoreDirectory:async()=>[{code:'LK-123',driveFolderId:root,storeName:'Private Store'}]
  });vm.runInContext(html.slice(start,end),ctx);return {state,connect:ctx.findStoreByCode};
}
test('actual private invitation connection offers Google Request access on permission denial',async()=>{
  const f=connectionFixture({fail:Object.assign(Error('Not shared'),{status:403})}),link=Core.invitation({folderId:root,code:'LK-123'},base);
  await assert.rejects(f.connect(link),error=>error.requestTarget.folderId===root);
});
test('actual invitation connection uses the Store access record and rejects a mismatched code',async()=>{
  const f=connectionFixture(),link=Core.invitation({folderId:root,code:'LK-123'},base);assert.equal((await f.connect(link)).root.id,root);
  await assert.rejects(f.connect(Core.invitation({folderId:root,code:'LK-OTHER'},base)),error=>!error.requestTarget&&/does not match/.test(error.message));
});
test('authorization and network failures never pretend a Store access request is needed',async()=>{
  const link=Core.invitation({folderId:root,code:'LK-123'},base);
  for(const fail of [Object.assign(Error('Sign in'),{code:'AUTH_REQUIRED',status:401}),Object.assign(Error('Service unavailable'),{status:503})]){const f=connectionFixture({fail});await assert.rejects(f.connect(link),error=>!error.requestTarget);}
});
test('known Store Codes can request private access while existing connected Store Codes still work',async()=>{
  const f=connectionFixture();assert.equal((await f.connect('LK-123')).root.id,root);f.state.fail=Object.assign(Error('Access needed'),{code:'STORE_ACCESS_REQUIRED'});await assert.rejects(f.connect('LK-123'),error=>error.requestTarget.folderId===root);
});

test('a locally cached administrator role cannot override a demotion in the current Store access record',async()=>{
  const f=fixture({registry:[{email:'admin@example.com',adminLevel:0,status:'active'}]});await assert.rejects(f.client.resolve('request-1','approve',f.ctx()),/current Store record/);assert.equal(f.state.permissions.length,0);assert.equal(f.state.provisioned.length,0);
});
test('missing authoritative Store records fail closed before any approval',async()=>{
  const f=fixture({registryError:true});await assert.rejects(f.client.resolve('request-1','approve',f.ctx()),/Store access record/);assert.equal(f.state.permissions.length,0);
});
test('fresh Store records block disabled recipients even when local cached membership says active',async()=>{
  const f=fixture();f.state.registry.push({email:'new@example.com',adminLevel:0,status:'disabled'});await assert.rejects(f.client.resolve('request-1','approve',f.ctx()),/disabled/);assert.equal(f.state.permissions.length,0);
});
