import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getAllWorkers, getAllAttendance, clearAllData } from '../utils/storage';
import { debugYuNetOutput, loadYuNet } from '../utils/yunetRunner';
import * as ImageManipulator from 'expo-image-manipulator';

export default function DebugScreen({ onNavigate }) {
  const [workers, setWorkers]       = useState([]);
  const [records, setRecords]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [yunetInfo, setYunetInfo]   = useState(null);
  const [yunetTesting, setYunetTesting] = useState(false);

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

  useEffect(() => { load(); }, []);

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete ALL registered workers and attendance records. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All', style: 'destructive',
          onPress: async () => { await clearAllData(); await load(); }
        }
      ]
    );
  };

  // Test YuNet — creates a small blank image and runs model to see real output format
  const testYuNet = async () => {
    setYunetTesting(true);
    setYunetInfo(null);
    try {
      await loadYuNet();
      // Create a tiny test image (solid gray 160×120)
      const testImg = await ImageManipulator.manipulateAsync(
        'https://via.placeholder.com/160x120/808080/808080.jpg',
        [],
        { base64: false, format: ImageManipulator.SaveFormat.JPEG }
      );
      const results = await debugYuNetOutput(testImg.uri);
      setYunetInfo(results);
    } catch (e) {
      setYunetInfo([{ error: e.message }]);
    } finally {
      setYunetTesting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('home')}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Database Viewer</Text>
        <TouchableOpacity onPress={handleClearAll}>
          <Text style={styles.clearBtn}>🗑 Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* YuNet output verification */}
      <TouchableOpacity
        style={styles.yunetBtn}
        onPress={testYuNet}
        disabled={yunetTesting}
      >
        <Text style={styles.yunetBtnText}>
          {yunetTesting ? 'Testing YuNet...' : '🔍 Test YuNet Output Format'}
        </Text>
      </TouchableOpacity>

      {yunetInfo && yunetInfo.map((t, i) => (
        <View key={i} style={styles.yunetCard}>
          {t.error ? (
            <Text style={styles.yunetError}>Error: {t.error}</Text>
          ) : (
            <>
              <Text style={styles.yunetTitle}>Tensor {t.tensor}: {t.length} values</Text>
              <Text style={styles.yunetVals}>{t.first20.join(', ')}</Text>
            </>
          )}
        </View>
      ))}

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
  clearBtn:     { color: '#e53935', fontSize: 13 },
  yunetBtn:     { backgroundColor: '#1a2d1a', borderWidth: 1, borderColor: '#0f9d58', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12 },
  yunetBtnText: { color: '#0f9d58', fontSize: 14, fontWeight: '600' },
  yunetCard:    { backgroundColor: '#111', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#0f9d58' },
  yunetTitle:   { color: '#0f9d58', fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  yunetVals:    { color: '#888', fontSize: 11, lineHeight: 18 },
  yunetError:   { color: '#e53935', fontSize: 12 },
  info:         { color: '#666', textAlign: 'center', padding: 20 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#1a73e8', marginBottom: 10 },
  empty:        { color: '#555', fontSize: 13, marginBottom: 16 },
  card:         { backgroundColor: '#111', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#222' },
  cardName:     { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  cardSub:      { color: '#888', fontSize: 12, marginTop: 2 },
});
