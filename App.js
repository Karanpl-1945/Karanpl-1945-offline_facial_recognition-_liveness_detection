import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import HomeScreen   from './screens/HomeScreen';
import AttendScreen from './screens/AttendScreen';
import EnrollScreen from './screens/EnrollScreen';
import DebugScreen  from './screens/DebugScreen';
import { syncAllPending } from './utils/sync';

export default function App() {
  const [screen, setScreen] = useState('home');

  // Auto-sync attendance records when internet becomes available
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        syncAllPending().catch(() => {});
      }
    });
    return () => unsubscribe();
  }, []);

  switch (screen) {
    case 'attend': return <AttendScreen onNavigate={setScreen} />;
    case 'enroll': return <EnrollScreen onNavigate={setScreen} />;
    case 'debug':  return <DebugScreen  onNavigate={setScreen} />;
    default:       return <HomeScreen   onNavigate={setScreen} />;
  }
}
