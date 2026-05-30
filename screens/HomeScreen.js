import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// HomeScreen — first screen the user sees
// Two buttons: Enroll a new worker, or Take Attendance
export default function HomeScreen({ onNavigate }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Face Attend</Text>
      <Text style={styles.subtitle}>Offline Attendance System</Text>

      <TouchableOpacity
        style={[styles.button, styles.enrollButton]}
        onPress={() => onNavigate('enroll')}
      >
        <Text style={styles.buttonText}>Enroll New Worker</Text>
        <Text style={styles.buttonSubText}>Register a face for the first time</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.attendButton]}
        onPress={() => onNavigate('attend')}
      >
        <Text style={styles.buttonText}>Take Attendance</Text>
        <Text style={styles.buttonSubText}>Mark attendance with face scan</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.syncButton]}
        onPress={() => onNavigate('sync')}
      >
        <Text style={styles.buttonText}>Sync Records</Text>
        <Text style={styles.buttonSubText}>Upload to cloud when online</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 50,
  },
  button: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  enrollButton: { backgroundColor: '#1a73e8' },
  attendButton: { backgroundColor: '#0f9d58' },
  syncButton:   { backgroundColor: '#333' },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSubText: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
  },
});
