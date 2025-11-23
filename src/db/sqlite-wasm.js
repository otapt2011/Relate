/* ES module wrapper for sql.js (SQLite WASM) + IndexedDB persistence,
   plus a helper to import assets/users.json into the users table.

   Usage (client):
     npm install sql.js
     import DB from './src/db/sqlite-wasm.js';
     await DB.init({ locateFile: f => '/path/to/sql-wasm.wasm' });
     await DB.openFromIndexedDB();                   // loads existing DB or creates fresh
     const schema = await fetch('/src/db/schema.sql').then(r=>r.text());
     DB.execSchema(schema);                          // safe to run repeatedly
     await DB.importUsersFromRepoJSON('/assets/users.json'); // imports JSON into users table
     await DB.saveToIndexedDB();                     // persist DB to IndexedDB
     // Query:
     const rows = DB.query('SELECT * FROM users WHERE username = ?', ['sarsro']);
*/

import initSqlJs from 'sql.js';

const DEFAULT_IDB_DB = 'relate_sqlite_store';
const DEFAULT_IDB_STORE = 'databases';
const DEFAULT_IDB_KEY = 'relate_sqlite_v1';

let SQL = null;      // sql.js runtime
let db = null;       // sql.js Database instance

export async function init(wasmConfig = {}) {
  if (SQL) return SQL;
  SQL = await initSqlJs(wasmConfig);
  return SQL;
}

function uid(prefix = '') {
  return prefix + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

/* IndexedDB helpers to persist a Uint8Array under a single key */
function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DEFAULT_IDB_DB, 1);
    req.onupgradeneeded = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains(DEFAULT_IDB_STORE)) {
        idb.createObjectStore(DEFAULT_IDB_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key = DEFAULT_IDB_KEY) {
  const idb = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction([DEFAULT_IDB_STORE], 'readonly');
    const store = tx.objectStore(DEFAULT_IDB_STORE);
    const r = store.get(key);
    r.onsuccess = () => resolve(r.result ? r.result.value : null);
    r.onerror = () => reject(r.error);
  });
}

async function idbPut(key = DEFAULT_IDB_KEY, value) {
  const idb = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction([DEFAULT_IDB_STORE], 'readwrite');
    const store = tx.objectStore(DEFAULT_IDB_STORE);
    const r = store.put({ key, value });
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

/* Open the in-memory sql.js DB from an optional Uint8Array previously exported.
   If bytes is null, create a fresh DB instance.
*/
export async function openFromBytes(bytes = null) {
  if (!SQL) throw new Error('Call init() before opening the DB');
  if (bytes) {
    const uint8 = (bytes instanceof Uint8Array) ? bytes : new Uint8Array(bytes);
    db = new SQL.Database(uint8);
  } else {
    db = new SQL.Database();
  }
  return db;
}

/* Load DB from IndexedDB (if present) or create a new DB. */
export async function openFromIndexedDB(key = DEFAULT_IDB_KEY) {
  const bytes = await idbGet(key);
  if (bytes) {
    await openFromBytes(bytes);
  } else {
    await openFromBytes(null);
  }
  return db;
}

/* Save current in-memory DB to IndexedDB */
export async function saveToIndexedDB(key = DEFAULT_IDB_KEY) {
  if (!db) throw new Error('DB not opened');
  const bytes = db.export(); // Uint8Array
  await idbPut(key, bytes);
}

/* Export DB as Uint8Array for download */
export function exportBinary() {
  if (!db) throw new Error('DB not opened');
  return db.export();
}

/* Import a binary (Uint8Array) into memory (replaces current in-memory DB) */
export async function importBinary(bytes) {
  await openFromBytes(bytes);
}

/* Run non-select statements */
export function run(sql, params = []) {
  if (!db) throw new Error('DB not opened');
  db.run(sql, params);
}

/* Query and return array of objects */
export function query(sql, params = []) {
  if (!db) throw new Error('DB not opened');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/* Execute schema SQL string (may contain multiple statements) */
export function execSchema(schemaSql) {
  if (!db) throw new Error('DB not opened');
  db.run(schemaSql);
}

/* Convenience helper: add a user row */
export function addUser(u) {
  const id = u.id || uid('u_');
  const created = u.created_at || new Date().toISOString();
  const updated = new Date().toISOString();
  const sql = `INSERT OR REPLACE INTO users (id, nickname, username, avatar, relationship, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
  db.run(sql, [id, u.nickname || null, u.username || null, u.avatar || null, u.relationship || null, created, updated]);
  return { ...u, id, createdAt: created, updatedAt: updated };
}

/* Import a JSON file (URL) with the same structure as assets/users.json and insert into users.
   - url: path to JSON file (e.g., '/assets/users.json' or relative).
   - options.merge (default true): if false, clears users table before import.
*/
export async function importUsersFromRepoJSON(url = '/assets/users.json', { merge = true } = {}) {
  if (!db) throw new Error('DB not opened');
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error('Failed to fetch users JSON: ' + res.status);
  const arr = await res.json();
  if (!Array.isArray(arr)) throw new Error('Expected JSON array');
  // Optionally clear table
  if (!merge) db.run('DELETE FROM users');
  // Prepared statement for bulk insert
  const insert = db.prepare(`INSERT OR IGNORE INTO users (id, nickname, username, avatar, relationship, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const now = new Date().toISOString();
  for (const item of arr) {
    const id = item.id || uid('u_');
    insert.bind([id, item.nickname || null, item.username || null, item.avatar || null, item.relationship || null, now, now]);
    try {
      insert.step();
    } catch (e) {
      // ignore single-row failures (e.g., unique constraint), continue
      console.warn('row insert failed', item, e);
    } finally {
      insert.reset();
    }
  }
  insert.free();
  return arr.length;
}

export default {
  init,
  openFromIndexedDB,
  openFromBytes,
  importBinary,
  exportBinary,
  saveToIndexedDB,
  execSchema,
  run,
  query,
  addUser,
  importUsersFromRepoJSON,
};