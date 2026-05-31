import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getAllWorkers, getAllAttendance } from '../utils/storage';

export default function DebugScreen({ onNavigate }) {
  const [workers, setWorkers] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [w, r] = await Promise.all([getAllWorkers(), getAllAttendance()]);
        setWorkers(w);
        setRecords(r);
      } catch (e) {
        console.log('DB error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('home')}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Database Viewer</Text>
        <View style={{ width: 50 }} />
      </View>

      {loading ? <Text style={styles.info}>Loading...</Text> : (
        <>
          <Text style={styles.sectionTitle}>Registered Workers ({workers.length})</Text>
          {workers.length === 0 ? (
            <Text style={styles.empty}>No workers registered yet</Text>
          ) : (
            workers.map((w, i) => (
              <View key={i} style={styles.card}>
                <Text style={styles.cardName}>{w.name}</Text>
                <Text style={styles.cardSub}>ID: {w.id}</Text>
                <Text style={styles.cardSub}>Enrolled: {new Date(w.enrolled_at).toLocaleString()}</Text>
                <Text style={styles.cardSub}>
                  Embedding: [{w.embedding?.slice(0, 4).map(n => n.toFixed(3)).join(', ')}...] ({w.embedding?.length} numbers)
                </Text>
              </View>
            ))
          )}

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Attendance Records ({records.length})</Text>
          {records.length === 0 ? (
            <Text style={styles.empty}>No attendance records yet</Text>
          ) : (
            records.map((r, i) => (
              <View key={i} style={styles.card}>
                <Text style={styles.cardName}>{r.worker_name}</Text>
                <Text style={styles.cardSub}>Time: {new Date(r.timestamp).toLocaleString()}</Text>
                <Text style={[styles.cardSub, { color: r.synced ? '#0f9d58' : '#FFA500' }]}>
                  Status: {r.synced ? 'Synced to AWS ✅' : 'Pending sync ⏳'}
                </Text>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0a0a0a' },
  content:      { padding: 20, paddingBottom: 40 },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  back:         { color: '#1a73e8', fontSize: 15 },
  title:        { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  info:         { color: '#666', textAlign: 'center', padding: 20 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#1a73e8', marginBottom: 10 },
  empty:        { color: '#555', fontSize: 13, marginBottom: 16 },
  card:         { backgroundColor: '#111', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#222' },
  cardName:     { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  cardSub:      { color: '#888', fontSize: 12, marginTop: 2 },
});
