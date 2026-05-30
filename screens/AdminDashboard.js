import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getWorkerCount, getAllWorkers, getTodayAttendance } from '../utils/storage';
import { syncAllPending } from '../utils/sync';

export default function AdminDashboard({ onNavigate }) {
  const [workerCount, setWorkerCount] = useState(0);
  const [todayRecords, setTodayRecords] = useState([]);
  const [absentCount, setAbsentCount]   = useState(0);
  const [syncing, setSyncing]           = useState(false);
  const [syncMsg, setSyncMsg]           = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [wc, workers, today] = await Promise.all([
        getWorkerCount(),
        getAllWorkers(),
        getTodayAttendance(),
      ]);
      setWorkerCount(wc);
      setTodayRecords(today);
      const presentIds = today.map(r => r.worker_id);
      setAbsentCount(workers.filter(w => !presentIds.includes(w.id)).length);
    } catch (_) {}
  }

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('Syncing...');
    try {
      const { synced, failed } = await syncAllPending();
      setSyncMsg(`✅ ${synced} synced${failed > 0 ? `, ${failed} failed` : ''}`);
      loadData();
    } catch (e) {
      setSyncMsg('❌ Sync failed: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  const presentCount = todayRecords.length;
  const attendancePct = workerCount > 0 ? Math.round((presentCount / workerCount) * 100) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <TouchableOpacity onPress={() => onNavigate('home')}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Stats cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderColor: '#1a73e8' }]}>
          <Text style={styles.statNum}>{workerCount}</Text>
          <Text style={styles.statLabel}>Total Workers</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#0f9d58' }]}>
          <Text style={[styles.statNum, { color: '#0f9d58' }]}>{presentCount}</Text>
          <Text style={styles.statLabel}>Present Today</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#e53935' }]}>
          <Text style={[styles.statNum, { color: '#e53935' }]}>{absentCount}</Text>
          <Text style={styles.statLabel}>Absent Today</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#f9a825' }]}>
          <Text style={[styles.statNum, { color: '#f9a825' }]}>{attendancePct}%</Text>
          <Text style={styles.statLabel}>Attendance</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onNavigate('enroll')}>
          <Text style={styles.actionIcon}>👤</Text>
          <Text style={styles.actionText}>Enroll Worker</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onNavigate('records')}>
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionText}>View Records</Text>
        </TouchableOpacity>
      </View>

      {/* Sync button */}
      <TouchableOpacity
        style={[styles.syncBtn, syncing && styles.syncBtnDisabled]}
        onPress={handleSync}
        disabled={syncing}
      >
        <Text style={styles.syncText}>{syncing ? 'Syncing...' : '☁️  Sync to AWS'}</Text>
      </TouchableOpacity>
      {syncMsg ? <Text style={styles.syncMsg}>{syncMsg}</Text> : null}

      {/* Today's attendance list */}
      <Text style={styles.sectionTitle}>Today's Check-ins</Text>

      {todayRecords.length === 0 ? (
        <Text style={styles.emptyText}>No check-ins yet today</Text>
      ) : (
        todayRecords.map((record, i) => (
          <View key={i} style={styles.recordRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{record.worker_name?.[0]?.toUpperCase()}</Text>
            </View>
            <View style={styles.recordInfo}>
              <Text style={styles.recordName}>{record.worker_name}</Text>
              <Text style={styles.recordTime}>
                {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <View style={styles.presentBadge}>
              <Text style={styles.presentText}>Present</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0a0a0a' },
  content:      { padding: 20, paddingBottom: 40 },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 10 },
  title:        { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  logout:       { color: '#e53935', fontSize: 14 },
  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard:     { flex: 1, minWidth: '45%', backgroundColor: '#111', borderRadius: 14, padding: 16, borderWidth: 1, alignItems: 'center' },
  statNum:      { fontSize: 28, fontWeight: 'bold', color: '#1a73e8' },
  statLabel:    { fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' },
  actions:      { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionBtn:    { flex: 1, backgroundColor: '#111', borderRadius: 14, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  actionIcon:   { fontSize: 28, marginBottom: 8 },
  actionText:   { color: '#fff', fontSize: 14, fontWeight: '600' },
  syncBtn:      { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1a73e8', marginBottom: 8 },
  syncBtnDisabled: { opacity: 0.5 },
  syncText:     { color: '#1a73e8', fontSize: 15, fontWeight: '600' },
  syncMsg:      { color: '#0f9d58', textAlign: 'center', marginBottom: 16, fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 12, marginTop: 8 },
  emptyText:    { color: '#555', textAlign: 'center', padding: 20 },
  recordRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 12, padding: 14, marginBottom: 10 },
  avatar:       { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1a73e8', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText:   { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  recordInfo:   { flex: 1 },
  recordName:   { color: '#fff', fontSize: 15, fontWeight: '600' },
  recordTime:   { color: '#666', fontSize: 13, marginTop: 2 },
  presentBadge: { backgroundColor: '#0f2d1e', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  presentText:  { color: '#0f9d58', fontSize: 12, fontWeight: '600' },
});
