import { useState } from 'react';
import HomeScreen        from './screens/HomeScreen';
import AttendScreen      from './screens/AttendScreen';
import EnrollScreen      from './screens/EnrollScreen';
import AdminLoginScreen  from './screens/AdminLoginScreen';
import AdminDashboard    from './screens/AdminDashboard';
import RecordsScreen     from './screens/RecordsScreen';

export default function App() {
  const [screen, setScreen] = useState('home');

  const navigate = (s) => setScreen(s);

  switch (screen) {
    case 'attend':       return <AttendScreen     onNavigate={navigate} />;
    case 'enroll':       return <EnrollScreen     onNavigate={navigate} />;
    case 'adminLogin':   return <AdminLoginScreen onNavigate={navigate} />;
    case 'adminDash':    return <AdminDashboard   onNavigate={navigate} />;
    case 'records':      return <RecordsScreen    onNavigate={navigate} />;
    default:             return <HomeScreen       onNavigate={navigate} />;
  }
}
