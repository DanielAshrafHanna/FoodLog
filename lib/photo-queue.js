const DB_NAME = "foodlog-photo-queue-v1";
const STORE_NAME = "items";

export function createMemoryPhotoStore(seed = []) {
  const items = new Map(seed.map((item) => [item.id, item]));
  return {
    async put(item) {
      items.set(item.id, item);
      return item;
    },
    async list(scope = {}) {
      return [...items.values()].filter((item) => matchesScope(item, scope));
    },
    async remove(id) {
      items.delete(id);
    },
    async clear() {
      items.clear();
    }
  };
}

function matchesScope(item, scope) {
  if (!scope || Object.keys(scope).length === 0) return true;
  return Object.entries(scope).every(([key, value]) => {
    if (value == null || value === "") return true;
    return String(item[key] ?? "") === String(value);
  });
}

function openDatabase(indexedDB = globalThis.indexedDB) {
  if (!indexedDB) throw new Error("This browser cannot keep photos on the device.");
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open the photo queue."));
  });
}

export function createIndexedDbPhotoStore(indexedDB = globalThis.indexedDB) {
  return {
    async put(item) {
      const database = await openDatabase(indexedDB);
      await new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      database.close();
      return item;
    },
    async list(scope = {}) {
      const database = await openDatabase(indexedDB);
      const items = await new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, "readonly");
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result ?? []);
        request.onerror = () => reject(request.error);
      });
      database.close();
      return items.filter((item) => matchesScope(item, scope));
    },
    async remove(id) {
      const database = await openDatabase(indexedDB);
      await new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      database.close();
    },
    async clear() {
      const database = await openDatabase(indexedDB);
      await new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      database.close();
    }
  };
}

export function queuedPhotoRecord({
  id,
  file,
  kind,
  restaurantId = "",
  dishId = "",
  path = "",
  thumbPath = ""
}) {
  return {
    id,
    file,
    kind,
    restaurantId,
    dishId,
    path,
    thumbPath,
    name: file?.name ?? "photo.jpg",
    type: file?.type ?? "image/jpeg",
    queuedAt: Date.now()
  };
}
