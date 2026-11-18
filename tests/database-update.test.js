'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
function temporaryDB(){
  const start=html.indexOf('const DB = (() => {'),ctx={window:{},console:{warn:()=>{}}};
  vm.createContext(ctx);vm.runInContext(html.slice(start,html.indexOf('</script>',start))+'\nglobalThis.database=DB;',ctx);return ctx.database;
}
test('conditional database updates preserve a newer edit and return the retained record',async()=>{
  const db=temporaryDB();await db.put('vehicles',{id:'v',updatedAt:200,price:48000,syncStatus:'pending'});
  const retained=await db.update('vehicles','v',row=>row.updatedAt===17?{...row,price:49990}:undefined);
  assert.equal(retained.price,48000);assert.equal((await db.get('vehicles','v')).syncStatus,'pending');
  const updated=await db.update('vehicles','v',row=>({...row,price:47000}));assert.equal(updated.price,47000);assert.equal((await db.get('vehicles','v')).price,47000);
});
test('invalid and asynchronous database updates cannot commit a replacement record',async()=>{
  const db=temporaryDB();await db.put('vehicles',{id:'v',price:48000});
  await assert.rejects(db.update('vehicles','v',()=>({id:'wrong',price:1})),/Invalid atomic record update/);
  await assert.rejects(db.update('vehicles','v',async row=>({...row,price:1})),/Invalid atomic record update/);
  assert.equal((await db.get('vehicles','v')).price,48000);assert.equal(await db.get('vehicles','wrong'),undefined);
});
test('a skipped late database update cannot resurrect a deleted Vehicle',async()=>{
  const db=temporaryDB();await db.put('vehicles',{id:'v'});await db.del('vehicles','v');
  assert.equal(await db.update('vehicles','v',row=>row?{...row,price:1}:undefined),undefined);
  assert.equal(await db.get('vehicles','v'),undefined);
});
