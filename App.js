import { useState } from 'react';
import HomeScreen    from './screens/HomeScreen';
import EnrollScreen  from './screens/EnrollScreen';
import AttendScreen  from './screens/AttendScreen';

// App.js — Entry point
// Controls which screen is shown using simple state-based navigation
// screen can be: 'home', 'enroll', 'attend'

export default function App() {
  const [screen, setScreen] = useState('home');

  if (screen === 'enroll') return <EnrollScreen onNavigate={setScreen} />;
  if (screen === 'attend') return <AttendScreen onNavigate={setScreen} />;
  return <HomeScreen onNavigate={setScreen} />;
}
