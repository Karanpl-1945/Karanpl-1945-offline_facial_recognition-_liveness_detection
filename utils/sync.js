// sync.js — Upload attendance records to AWS when online, then purge from phone
// Flow:
//   1. Check internet connection
//   2. Get all unsynced records from phone storage
//   3. Upload each record to AWS
//   4. ONLY after confirmed upload → delete from phone

import { getPendingAttendance, markAsSynced, deleteRecord } from './storage';

// Replace this with your actual AWS API Gateway URL
const AWS_API_URL = 'https://YOUR_API_GATEWAY_URL/attendance';

// Upload one record to AWS
async function uploadRecord(record) {
  const response = await fetch(AWS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id:         record.id,          // unique ID prevents duplicates
      workerId:   record.workerId,
      workerName: record.workerName,
      timestamp:  record.timestamp,
    }),
  });
  if (!response.ok) throw new Error('Upload failed');
  return true;
}

// Sync all pending records — call this when internet is available
export async function syncAllPending() {
  const pending = await getPendingAttendance();

  if (pending.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const record of pending) {
    try {
      await uploadRecord(record);
      // IMPORTANT: Only delete AFTER confirmed upload
      await deleteRecord(record.id);
      synced++;
    } catch (e) {
      // Upload failed (maybe no internet yet) — leave on phone, retry later
      failed++;
      console.log('Failed to sync record:', record.id, e.message);
    }
  }

  return { synced, failed };
}
