import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getAllAttendance, getAllWorkers } from '../utils/storage';

export default function RecordsScreen({ onNavigate }) {
  const [records, setRecords]   = useState([]);
  const [workers, setWorkers]   = useState([]);
  const [filter, setFilter]     = useState('today'); // 'today' | 'all'
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [all, ws] = await Promise.all([getAllAttendance(), getAllWorkers()]);
        setRecords(all);
        setWorkers(ws);
      } catch (_) {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const filtered = filter === 'today'
    ? records.filter(r => r.timestamp?.startsWith(today))
    : records;

  // Workers absent today
  const todayRecords   = records.filter(r => r.timestamp?.startsWith(today));
  const presentIds     = todayRecords.map(r => r.worker_id);
  const absentWorkers  = workers.filter(w => !presentIds.includes(w.id));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('adminDash')}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Attendance Records</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Filter tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, filter === 'today' && styles.tabActive]}
          onPress={() => setFilter('today')}
        >
          <Text style={[styles.tabText, filter === 'today' && styles.tabTextActive]}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filter === 'all' && styles.tabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.tabText, filter === 'all' && styles.tabTextActive]}>All Records</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text style={styles.emptyText}>Loading...</Text>
      ) : (
        <>
          {/* Present workers */}
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>No records found</Text>
          ) : (
            filtered.map((record, i) => (
              <View key={i} style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{record.worker_name?.[0]?.toUpperCase()}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{record.worker_name}</Text>
                  <Text style={styles.time}>
                    {new Date(record.timestamp).toLocaleDateString()} — {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={[styles.badge, record.synced ? styles.badgeSynced : styles.badgePending]}>
                  <Text style={styles.badgeText}>{record.synced ? 'Synced' : 'Pending'}</Text>
                </View>
              </View>
            ))
          )}

          {/* Absent workers (today only) */}
          {filter === 'today' && absentWorkers.length > 0 && (
            <>
              <Text style={styles.absentTitle}>Absent Today</Text>
              {absentWorkers.map((worker, i) => (
                <View key={i} style={[styles.row, styles.rowAbsent]}>
                  <View style={[styles.avatar, styles.avatarAbsent]}>
                    <Text style={styles.avatarText}>{worker.name?.[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{worker.name}</Text>
                    <Text style={styles.time}>Not checked in</Text>
                  </View>
                  <View style={styles.badgeAbsent}>
                    <Text style={styles.badgeAbsentText}>Absent</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0a0a0a' },
  content:         { padding: 20, paddingBottom: 40 },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  back:            { color: '#1a73e8', fontSize: 15 },
  title:           { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  tabs:            { flexDirection: 'row', gap: 10, marginBottom: 20 },
  tab:             { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#111', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  tabActive:       { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
  tabText:         { color: '#666', fontSize: 14, fontWeight: '600' },
  tabTextActive:   { color: '#fff' },
  emptyText:       { color: '#555', textAlign: 'center', padding: 30 },
  row:             { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 12, padding: 14, marginBottom: 10 },
  rowAbsent:       { backgroundColor: '#1a0a0a' },
  avatar:          { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1a73e8', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarAbsent:    { backgroundColor: '#4a1a1a' },
  avatarText:      { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  info:            { flex: 1 },
  name:            { color: '#fff', fontSize: 15, fontWeight: '600' },
  time:            { color: '#666', fontSize: 12, marginTop: 2 },
  badge:           { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeSynced:     { backgroundColor: '#0f2d1e' },
  badgePending:    { backgroundColor: '#2d2500' },
  badgeText:       { fontSize: 11, fontWeight: '600', color: '#0f9d58' },
  absentTitle:     { fontSize: 14, fontWeight: 'bold', color: '#e53935', marginTop: 16, marginBottom: 10 },
  badgeAbsent:     { backgroundColor: '#2d0f0f', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeAbsentText: { color: '#e53935', fontSize: 11, fontWeight: '600' },
});
