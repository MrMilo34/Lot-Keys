/* Personal listing storage. Store IDs, rather than names, define isolation. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LotKeysListingStorage = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const FOLDER = 'application/vnd.google-apps.folder';
  const role = file => file.appProperties?.lotkeysRole || file.properties?.lotkeysRole;
  const copiedFrom = file => file.appProperties?.lotkeysCopiedFromId;
  const firstFolder = files => [...files].sort((a,b)=>String(a.createdTime||'').localeCompare(String(b.createdTime||''))||String(a.id).localeCompare(String(b.id)))[0];
  const jobs = new Map();

  // Only file identifiers and Drive URLs are rewritten; descriptions and other text stay intact.
  function remap(value, ids, key = '') {
    if (Array.isArray(value)) return value.map(item => remap(item, ids, key));
    if (value && typeof value === 'object') {
      if (typeof Blob !== 'undefined' && value instanceof Blob) return value;
      return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, remap(item, ids, name)]));
    }
    if (typeof value !== 'string') return value;
    if (/^(driveFileId|fileId|folderId|photosFolderId|profileFolderId)$/.test(key)) return ids[value] || value;
    if (/^(webViewLink|downloadUrl|url|src)$/.test(key) && /^https:\/\/drive\.google\.com\//.test(value)) {
      return value.replace(/(\/d\/|\/folders\/|[?&]id=)([A-Za-z0-9_-]+)/g, (all, prefix, id) => prefix + (ids[id] || id));
    }
    return value;
  }

  async function ensure(options) {
    const key = [options.personalRootId, options.storeId, options.userId].join('|');
    if (jobs.has(key)) return jobs.get(key);
    const job = build(options).finally(() => { if (jobs.get(key) === job) jobs.delete(key); });
    jobs.set(key, job);
    return job;
  }

  async function build({drive, personalRootId, storeId, storeName, userId, userName, legacyListingsId = '', legacyAssetsId = '', previousStoreFolderId = '', previousRootId = '', deletedIds = [], check = async () => {}}) {
    if (!personalRootId || !storeId || !userId) throw Error('Personal listing storage is missing its account or Store identity.');
    const deleted = new Set(deletedIds.map(String));
    const children = async id => { await check(); return drive.list(id); };
    const create = async (name, parent, tags) => { await check(); return drive.createFolder(name, parent, tags); };
    const rootChildren = await children(personalRootId);
    const storeMatch=file=>file.mimeType === FOLDER && role(file) === 'personalStoreListings' && file.appProperties?.lotkeysStoreId === storeId;
    let store = firstFolder(rootChildren.filter(storeMatch));
    if (previousStoreFolderId && previousRootId === personalRootId && (!store || store.id !== previousStoreFolderId)) throw Error('The personal Store listing folder is missing or has changed. Restore its original folder from Drive Trash before syncing.');
    if (previousStoreFolderId && previousRootId !== personalRootId) {
      const previous = await drive.get(previousStoreFolderId);
      if (!previous.parents?.includes(previousRootId) || previous.appProperties?.lotkeysStoreId !== storeId) throw Error('The previous personal Store folder could not be verified. No listings were moved.');
      if (store && store.id !== previous.id) throw Error('Both Account Storage locations contain this Store. Keep the current location until those listing folders are reconciled.');
      await check(); await drive.move(previous.id, previousRootId, personalRootId); store = previous;
    }
    if (!store){store=await create(storeName, personalRootId, {lotkeysRole:'personalStoreListings', lotkeysStoreId:storeId});store=firstFolder((await children(personalRootId)).filter(storeMatch))||store;}
    if (store.name !== storeName) { await check(); await drive.rename(store.id, storeName); }
    const storeChildren = await children(store.id);
    const markerFile = storeChildren.find(file => role(file) === 'personalListingMigration');
    const marker = markerFile ? await drive.readJson(markerFile.id) : null;
    if (marker?.complete && (!storeChildren.some(file=>file.id===marker.listingsId) || !storeChildren.some(file=>file.id===marker.listingAssetsId))) throw Error('A personal listing folder was removed. Restore it from Drive Trash before syncing; previous Store copies were left intact.');
    async function storageFolder(name, folderRole){const match=file=>file.mimeType===FOLDER&&role(file)===folderRole;let folder=firstFolder(storeChildren.filter(match));if(!folder){folder=await create(name,store.id,{lotkeysRole:folderRole,lotkeysUserName:userName});folder=firstFolder((await children(store.id)).filter(match))||folder;}return folder;}
    const listings=await storageFolder('Listings','userListings'),assets=await storageFolder('Listing Assets','userListingAssets');
    if (marker?.complete && marker.storeId === storeId && marker.legacyListingsId === legacyListingsId && marker.legacyAssetsId === legacyAssetsId) {
      await check();
      return {storeFolderId:store.id, listingsId:listings.id, listingAssetsId:assets.id, ids:marker.ids || {}};
    }
    const ids = {};
    // Registry IDs must belong to this approved user's Store workspace. Never copy another Store.
    const sourceFolder = async (id, expectedRole, expectedName) => {
      if (!id) return null;
      await check(); const file = await drive.get(id);
      if (file.trashed || file.mimeType !== FOLDER || !file.parents?.includes(userId)) throw Error('The previous listing folder is outside this Store workspace. Refresh Store access before continuing.');
      if(role(file)!==expectedRole&&file.name!==expectedName)throw Error('The previous listing folder type could not be verified. No listing records were copied.');
      return file;
    };
    const legacyAssets = await sourceFolder(legacyAssetsId,'userListingAssets','Listing Assets');
    const legacyListings = await sourceFolder(legacyListingsId,'userListings','Listings');
    async function copyTree(source, target) {
      ids[source.id] = target.id;
      const existing = await children(target.id);
      for (const file of await children(source.id)) {
        let copy = existing.find(item => copiedFrom(item) === file.id);
        const tags = {...file.appProperties, lotkeysCopiedFromId:file.id};
        if (!copy) {
          await check();
          copy = file.mimeType === FOLDER ? await create(file.name, target.id, tags) : await drive.copy(file.id, file.name, target.id, tags);
          existing.push(copy);
        }
        ids[file.id] = copy.id;
        if (file.mimeType === FOLDER) await copyTree(file, copy);
      }
    }
    // Copying is non-destructive and works when a dealership owns the original photos.
    if (legacyAssets) await copyTree(legacyAssets, assets);
    if (legacyListings) {
      ids[legacyListings.id] = listings.id;
      const existing = await children(listings.id);
      for (const file of await children(legacyListings.id)) {
        if (role(file) === 'userListingsIndex' || file.name === 'Listings Index.json' || file.mimeType === FOLDER || !/\.json$/i.test(file.name)) continue;
        const data = await drive.readJson(file.id);
        if (!data?.listingId || deleted.has(String(data.listingId))) continue;
        if (data.userName && String(data.userName).toLowerCase() !== String(userName).toLowerCase()) throw Error('A listing belongs to another user. Its personal storage was not changed.');
        let copy = existing.find(item => copiedFrom(item) === file.id || item.appProperties?.lotkeysListingId === String(data.listingId));
        if (!copy) {
          await check();
          copy = await drive.writeJson({name:file.name, parentId:listings.id, data:remap(data, ids), appProperties:{...file.appProperties,lotkeysRole:'marketplaceListing',lotkeysListingId:String(data.listingId),lotkeysUserName:userName,lotkeysCopiedFromId:file.id}});
          existing.push(copy);
        }
        ids[file.id] = copy.id;
      }
    }
    // The marker is written last. A failed copy resumes using source IDs, without duplicates.
    await check();
    await drive.writeJson({fileId:markerFile?.id || '', name:'Listing Storage.json', parentId:store.id, data:{schemaVersion:1,storeId,legacyListingsId,legacyAssetsId,listingsId:listings.id,listingAssetsId:assets.id,ids,complete:true}, appProperties:{lotkeysRole:'personalListingMigration'}});
    return {storeFolderId:store.id,listingsId:listings.id,listingAssetsId:assets.id,ids};
  }
  function summaries(entries) {
    const keys=['schemaVersion','listingId','userName','vehicleId','vehicleName','marketplaceTitle','year','make','model','price','status','facebookUrl','updatedAt','createdAt','postedAt'];
    return entries.map(entry=>Object.fromEntries(keys.filter(key=>Object.hasOwn(entry,key)).map(key=>[key,entry[key]])));
  }
  return {ensure, remap, summaries};
});
