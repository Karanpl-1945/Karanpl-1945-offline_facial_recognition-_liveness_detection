import { useEffect, useState } from 'react';
import HomeScreen   from './screens/HomeScreen';
import AttendScreen from './screens/AttendScreen';
import EnrollScreen from './screens/EnrollScreen';
import { syncAllPending } from './utils/sync';

export default function App() {
  const [screen, setScreen] = useState('home');

  // Auto-sync attendance records when internet is available
  useEffect(() => {
    try {
      const NetInfo = require('@react-native-community/netinfo').default;
      const unsubscribe = NetInfo.addEventListener(state => {
        if (state.isConnected && state.isInternetReachable) {
          syncAllPending().catch(() => {});
        }
      });
      return () => unsubscribe();
    } catch (_) {}
  }, []);

  switch (screen) {
    case 'attend': return <AttendScreen onNavigate={setScreen} />;
    case 'enroll': return <EnrollScreen onNavigate={setScreen} />;
    default:       return <HomeScreen   onNavigate={setScreen} />;
  }
}
