// A simple key-value store using IndexedDB, wrapped with the 'idb' library.
import { openDB } from 'idb';

const DB_NAME = 'app-crypto-storage';
const STORE_NAME = 'key-store';
const DB_VERSION = 1;

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME);
    }
  },
});

/**
 * Retrieves a value from the key-value store.
 * @param {string} key The key of the item to retrieve.
 * @returns {Promise<any>} The stored value, or undefined if not found.
 */
export async function get(key) {
  return (await dbPromise).get(STORE_NAME, key);
}

/**
 * Sets a value in the key-value store.
 * @param {string} key The key of the item to set.
 * @param {any} val The value to store.
 * @returns {Promise<IDBValidKey>}
 */
export async function set(key, val) {
  return (await dbPromise).put(STORE_NAME, val, key);
}

/**
 * Deletes a value from the key-value store.
 * @param {string} key The key of the item to delete.
 * @returns {Promise<void>}
 */
export async function del(key) {
  return (await dbPromise).delete(STORE_NAME, key);
}
