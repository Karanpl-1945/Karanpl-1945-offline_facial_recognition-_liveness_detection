import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen({ onNavigate }) {
  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.title}>RecogMe</Text>
        <Text style={styles.subtitle}>Offline Face Attendance</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.enrollButton]}
        onPress={() => onNavigate('enroll')}
        activeOpacity={0.85}
      >
        <Text style={styles.icon}>👤</Text>
        <Text style={styles.buttonText}>Register</Text>
        <Text style={styles.buttonSub}>Enroll a new worker</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.attendButton]}
        onPress={() => onNavigate('attend')}
        activeOpacity={0.85}
      >
        <Text style={styles.icon}>📷</Text>
        <Text style={styles.buttonText}>Take Attendance</Text>
        <Text style={styles.buttonSub}>Mark attendance with face scan</Text>
      </TouchableOpacity>

      <Text style={styles.offlineTag}>✦ 100% Works Offline</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', padding: 24 },
  header:       { alignItems: 'center', marginBottom: 60 },
  title:        { fontSize: 40, fontWeight: 'bold', color: '#ffffff', letterSpacing: 1 },
  subtitle:     { fontSize: 14, color: '#666', marginTop: 6 },
  button:       { width: '100%', borderRadius: 20, paddingVertical: 32, alignItems: 'center', marginBottom: 16 },
  enrollButton: { backgroundColor: '#1a73e8' },
  attendButton: { backgroundColor: '#0f9d58' },
  icon:         { fontSize: 36, marginBottom: 10 },
  buttonText:   { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  buttonSub:    { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
  offlineTag:   { marginTop: 40, fontSize: 12, color: '#444' },
});
