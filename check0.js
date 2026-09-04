
const DB = (() => {
  const DB_NAME = 'autolister-v1';
  const VERSION = 1;
  const STORES = ['vehicles','listings','locations','analytics','settings'];
  let db = null;
  let useMemory = false;
  const memory = Object.fromEntries(STORES.map(n => [n, new Map()]));

  function openIndexedDB(){
    return new Promise((resolve,reject)=>{
      try {
        if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'));
        if(db) return resolve(db);
        const req=indexedDB.open(DB_NAME,VERSION);
        req.onupgradeneeded=()=>{
          const d=req.result;
          STORES.forEach(name=>{
            if(!d.objectStoreNames.contains(name)){
              const s=d.createObjectStore(name,{keyPath:'id'});
              if(name==='analytics') s.createIndex('listingId','listingId',{unique:false});
              if(name==='listings') s.createIndex('vehicleId','vehicleId',{unique:false});
            }
          });
        };
        req.onsuccess=()=>{db=req.result;resolve(db)};
        req.onerror=()=>reject(req.error || new Error('IndexedDB failed'));
        req.onblocked=()=>reject(new Error('IndexedDB blocked'));
      } catch(err) { reject(err); }
    });
  }

  async function open(){
    if(useMemory) return null;
    try { return await openIndexedDB(); }
    catch(err){
      console.warn('LotKeys: IndexedDB unavailable in this local-file mode; using temporary in-memory storage.', err);
      useMemory=true;
      return null;
    }
  }

  async function store(name,mode='readonly'){
    const d=await open();
    if(useMemory) return null;
    return d.transaction(name,mode).objectStore(name);
  }

  async function all(name){
    await open();
    if(useMemory) return Array.from(memory[name].values());
    return new Promise(async(res,rej)=>{const r=(await store(name)).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
  }
  async function get(name,id){
    await open();
    if(useMemory) return memory[name].get(id);
    return new Promise(async(res,rej)=>{const r=(await store(name)).get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
  }
  async function put(name,value){
    await open();
    if(useMemory){memory[name].set(value.id,value);return value;}
    return new Promise(async(res,rej)=>{const r=(await store(name,'readwrite')).put(value);r.onsuccess=()=>res(value);r.onerror=()=>rej(r.error)});
  }
  async function del(name,id){
    await open();
    if(useMemory){memory[name].delete(id);return;}
    return new Promise(async(res,rej)=>{const r=(await store(name,'readwrite')).delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)});
  }
  async function clear(name){
    await open();
    if(useMemory){memory[name].clear();return;}
    return new Promise(async(res,rej)=>{const r=(await store(name,'readwrite')).clear();r.onsuccess=()=>res();r.onerror=()=>rej(r.error)});
  }
  async function byIndex(name,index,key){
    await open();
    if(useMemory){
      return Array.from(memory[name].values()).filter(v=>v && v[index]===key);
    }
    return new Promise(async(res,rej)=>{const s=await store(name);const r=s.index(index).getAll(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
  }
  function isTemporary(){ return useMemory; }
  return {open,all,get,put,del,clear,byIndex,isTemporary};
})();
  