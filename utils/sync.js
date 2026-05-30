import { getPendingAttendance, markAsSynced, deleteRecord, getAllAttendance } from './storage';

const AWS_API_URL = 'https://YOUR_API_GATEWAY_URL/attendance';

async function uploadRecord(record) {
  const response = await fetch(AWS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id:         record.id,
      workerId:   record.worker_id,
      workerName: record.worker_name,
      timestamp:  record.timestamp,
    }),
  });
  if (!response.ok) throw new Error('Upload failed');
  return true;
}

// Sync all pending records to AWS
export async function syncAllPending() {
  const pending = await getPendingAttendance();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const record of pending) {
    try {
      await uploadRecord(record);
      await markAsSynced(record.id); // mark synced but KEEP on phone
      synced++;
    } catch (e) {
      failed++;
    }
  }

  // Purge records older than 30 days that are already synced
  await purgeOldRecords();

  return { synced, failed };
}

// Delete synced records older than 30 days from phone
async function purgeOldRecords() {
  const all = await getAllAttendance();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  for (const record of all) {
    if (record.synced === 1 && new Date(record.timestamp) < cutoff) {
      await deleteRecord(record.id);
    }
  }
}
