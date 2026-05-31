import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import HomeScreen   from './screens/HomeScreen';
import AttendScreen from './screens/AttendScreen';
import EnrollScreen from './screens/EnrollScreen';
import DebugScreen  from './screens/DebugScreen';
import { initDB } from './utils/storage';
import { syncAllPending } from './utils/sync';

export default function App() {
  const [screen, setScreen]   = useState('home');
  const [dbReady, setDbReady] = useState(false);

  // Initialize database FIRST before any screen renders
  useEffect(() => {
    initDB()
      .then(() => setDbReady(true))
      .catch(() => setDbReady(true)); // show app even if DB fails
  }, []);

  // Auto-sync on startup + whenever internet becomes available
  useEffect(() => {
    syncAllPending().catch(() => {});
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        syncAllPending().catch(() => {});
      }
    });
    return () => unsubscribe();
  }, []);

  // Show loading screen until DB is ready
  if (!dbReady) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Starting...</Text>
      </View>
    );
  }

  switch (screen) {
    case 'attend': return <AttendScreen onNavigate={setScreen} />;
    case 'enroll': return <EnrollScreen onNavigate={setScreen} />;
    case 'debug':  return <DebugScreen  onNavigate={setScreen} />;
    default:       return <HomeScreen   onNavigate={setScreen} />;
  }
}

const styles = StyleSheet.create({
  loading:     { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#666', fontSize: 16 },
});
