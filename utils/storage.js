import * as SQLite from 'expo-sqlite';

// storage.js — SQLite database for offline storage
// Handles thousands of workers and attendance records efficiently
//
// Tables:
//   workers    → enrolled workers + their face embeddings (128 numbers)
//   attendance → attendance records with sync status

let db = null;

// Open (or create) the database
async function getDB() {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('faceattend.db');
  await setupTables(db);
  return db;
}

// Create tables if they don't exist yet
async function setupTables(db) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workers (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      embedding   TEXT NOT NULL,
      enrolled_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id          TEXT PRIMARY KEY,
      worker_id   TEXT NOT NULL,
      worker_name TEXT NOT NULL,
      timestamp   TEXT NOT NULL,
      synced      INTEGER DEFAULT 0
    );
  `);
}

// ─── WORKERS ────────────────────────────────────────────────────────────────

// Save a new worker with their face embedding
export async function saveWorker(name, embedding) {
  const database = await getDB();
  const worker = {
    id:          Date.now().toString(),
    name:        name,
    embedding:   JSON.stringify(embedding),   // convert array to string for storage
    enrolled_at: new Date().toISOString(),
  };
  await database.runAsync(
    'INSERT INTO workers (id, name, embedding, enrolled_at) VALUES (?, ?, ?, ?)',
    [worker.id, worker.name, worker.embedding, worker.enrolled_at]
  );
  return { ...worker, embedding };
}

// Get all enrolled workers (with embedding parsed back to array)
export async function getAllWorkers() {
  const database = await getDB();
  const rows = await database.getAllAsync('SELECT * FROM workers ORDER BY name ASC');
  return rows.map(row => ({
    ...row,
    embedding: JSON.parse(row.embedding),   // convert string back to array
  }));
}

// Search workers by name (useful for large teams)
export async function searchWorkers(query) {
  const database = await getDB();
  const rows = await database.getAllAsync(
    'SELECT * FROM workers WHERE name LIKE ? ORDER BY name ASC',
    [`%${query}%`]
  );
  return rows.map(row => ({ ...row, embedding: JSON.parse(row.embedding) }));
}

// Delete a worker by ID
export async function deleteWorker(id) {
  const database = await getDB();
  await database.runAsync('DELETE FROM workers WHERE id = ?', [id]);
}

// Count total enrolled workers
export async function getWorkerCount() {
  const database = await getDB();
  const result = await database.getFirstAsync('SELECT COUNT(*) as count FROM workers');
  return result.count;
}

// ─── ATTENDANCE ─────────────────────────────────────────────────────────────

// Save a new attendance record
export async function saveAttendance(workerId, workerName) {
  const database = await getDB();
  const record = {
    id:          Date.now().toString(),
    worker_id:   workerId,
    worker_name: workerName,
    timestamp:   new Date().toISOString(),
    synced:      0,   // 0 = not synced, 1 = synced
  };
  await database.runAsync(
    'INSERT INTO attendance (id, worker_id, worker_name, timestamp, synced) VALUES (?, ?, ?, ?, ?)',
    [record.id, record.worker_id, record.worker_name, record.timestamp, record.synced]
  );
  return record;
}

// Get all attendance records
export async function getAllAttendance() {
  const database = await getDB();
  return await database.getAllAsync('SELECT * FROM attendance ORDER BY timestamp DESC');
}

// Get only records not yet uploaded to AWS
export async function getPendingAttendance() {
  const database = await getDB();
  return await database.getAllAsync('SELECT * FROM attendance WHERE synced = 0');
}

// Get today's attendance records
export async function getTodayAttendance() {
  const database = await getDB();
  const today = new Date().toISOString().split('T')[0];   // "2026-05-30"
  return await database.getAllAsync(
    "SELECT * FROM attendance WHERE timestamp LIKE ? ORDER BY timestamp DESC",
    [`${today}%`]
  );
}

// Mark a record as synced with AWS
export async function markAsSynced(recordId) {
  const database = await getDB();
  await database.runAsync('UPDATE attendance SET synced = 1 WHERE id = ?', [recordId]);
}

// Delete a record after confirmed AWS sync (purge from phone)
export async function deleteRecord(recordId) {
  const database = await getDB();
  await database.runAsync('DELETE FROM attendance WHERE id = ?', [recordId]);
}

// Count pending (unsynced) records
export async function getPendingCount() {
  const database = await getDB();
  const result = await database.getFirstAsync(
    'SELECT COUNT(*) as count FROM attendance WHERE synced = 0'
  );
  return result.count;
}

// ─── CLEAR ALL DATA ─────────────────────────────────────────────────────────

export async function clearAllData() {
  const database = await getDB();
  await database.execAsync('DELETE FROM workers; DELETE FROM attendance;');
}
