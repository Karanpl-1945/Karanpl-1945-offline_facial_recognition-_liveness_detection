import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getWorkerCount, getTodayAttendance } from '../utils/storage';

export default function HomeScreen({ onNavigate }) {
  const [workerCount, setWorkerCount]   = useState(0);
  const [todayCount, setTodayCount]     = useState(0);

  // Reload stats every time this screen is shown
  useEffect(() => {
    async function loadStats() {
      try {
        const [wc, ta] = await Promise.all([getWorkerCount(), getTodayAttendance()]);
        setWorkerCount(wc);
        setTodayCount(ta.length);
      } catch (_) {}
    }
    loadStats();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RecogMe</Text>
      <Text style={styles.subtitle}>Offline Attendance System</Text>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{workerCount}</Text>
          <Text style={styles.statLabel}>Workers Enrolled</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{todayCount}</Text>
          <Text style={styles.statLabel}>Check-ins Today</Text>
        </View>
      </View>

      <TouchableOpacity style={[styles.button, styles.enrollButton]} onPress={() => onNavigate('enroll')}>
        <Text style={styles.buttonText}>Enroll New Worker</Text>
        <Text style={styles.buttonSubText}>Register a face for the first time</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.attendButton]} onPress={() => onNavigate('attend')}>
        <Text style={styles.buttonText}>Take Attendance</Text>
        <Text style={styles.buttonSubText}>Mark attendance with face scan</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.syncButton]} onPress={() => onNavigate('sync')}>
        <Text style={styles.buttonText}>Sync Records</Text>
        <Text style={styles.buttonSubText}>Upload to cloud when online</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0f0f0f', alignItems: 'center', justifyContent: 'center', padding: 20 },
  title:        { fontSize: 36, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  subtitle:     { fontSize: 14, color: '#888', marginBottom: 30 },
  statsRow:     { flexDirection: 'row', gap: 16, marginBottom: 30 },
  statBox:      { flex: 1, backgroundColor: '#1e1e1e', borderRadius: 12, padding: 16, alignItems: 'center' },
  statNumber:   { fontSize: 32, fontWeight: 'bold', color: '#1a73e8' },
  statLabel:    { fontSize: 12, color: '#888', marginTop: 4, textAlign: 'center' },
  button:       { width: '100%', padding: 20, borderRadius: 12, marginBottom: 16 },
  enrollButton: { backgroundColor: '#1a73e8' },
  attendButton: { backgroundColor: '#0f9d58' },
  syncButton:   { backgroundColor: '#333' },
  buttonText:   { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  buttonSubText:{ color: '#ccc', fontSize: 12, marginTop: 4 },
});
