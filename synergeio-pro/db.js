// =========================================================
//  Wrapper πάνω από IndexedDB - απλό key-value/store API
// =========================================================
window.DB = (function () {
  const DB_NAME = 'synergeio_pro';
  const DB_VERSION = 2;
  const STORES = ['customers', 'vehicles', 'services', 'settings', 'job_orders'];

  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        STORES.forEach((s) => {
          if (!db.objectStoreNames.contains(s)) {
            db.createObjectStore(s, { keyPath: 'id' });
          }
        });
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
    return dbPromise;
  }

  function tx(store, mode) {
    return open().then((db) => db.transaction(store, mode).objectStore(store));
  }

  function uuid() {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
  }

  async function add(store, item) {
    if (!item.id) item.id = uuid();
    // Preserve createdAt on update
    if (!item.createdAt) {
      try {
        const existing = await get(store, item.id);
        if (existing && existing.createdAt) item.createdAt = existing.createdAt;
      } catch (e) {}
    }
    if (!item.createdAt) item.createdAt = new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    const s = await tx(store, 'readwrite');
    return new Promise((resolve, reject) => {
      const r = s.put(item);
      r.onsuccess = () => resolve(item);
      r.onerror = () => reject(r.error);
    });
  }

  async function get(store, id) {
    const s = await tx(store, 'readonly');
    return new Promise((resolve, reject) => {
      const r = s.get(id);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  async function getAll(store) {
    const s = await tx(store, 'readonly');
    return new Promise((resolve, reject) => {
      const r = s.getAll();
      r.onsuccess = () => resolve(r.result || []);
      r.onerror = () => reject(r.error);
    });
  }

  async function remove(store, id) {
    const s = await tx(store, 'readwrite');
    return new Promise((resolve, reject) => {
      const r = s.delete(id);
      r.onsuccess = () => resolve(true);
      r.onerror = () => reject(r.error);
    });
  }

  async function clear(store) {
    const s = await tx(store, 'readwrite');
    return new Promise((resolve, reject) => {
      const r = s.clear();
      r.onsuccess = () => resolve(true);
      r.onerror = () => reject(r.error);
    });
  }

  // High level helpers
  async function getSetting(key, def) {
    const item = await get('settings', key);
    return item ? item.value : def;
  }
  async function setSetting(key, value) {
    return add('settings', { id: key, value });
  }
  async function getAllSettings() {
    const items = await getAll('settings');
    const out = {};
    items.forEach((i) => (out[i.id] = i.value));
    return out;
  }

  async function exportAll() {
    const out = {};
    for (const s of STORES) out[s] = await getAll(s);
    out.exportedAt = new Date().toISOString();
    out.version = DB_VERSION;
    return out;
  }

  async function importAll(data) {
    for (const s of STORES) {
      if (Array.isArray(data[s])) {
        await clear(s);
        for (const item of data[s]) await add(s, item);
      }
    }
  }

  async function resetAll() {
    for (const s of STORES) await clear(s);
  }

  return {
    open,
    add,
    get,
    getAll,
    remove,
    clear,
    getSetting,
    setSetting,
    getAllSettings,
    exportAll,
    importAll,
    resetAll,
  };
})();