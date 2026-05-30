import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen({ onNavigate }) {
  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.title}>RecogMe</Text>
        <Text style={styles.subtitle}>Offline Face Attendance</Text>
      </View>

      {/* Worker button — big, prominent */}
      <TouchableOpacity
        style={styles.attendButton}
        onPress={() => onNavigate('attend')}
        activeOpacity={0.85}
      >
        <Text style={styles.attendIcon}>📷</Text>
        <Text style={styles.attendText}>Mark Attendance</Text>
        <Text style={styles.attendSub}>Scan your face to check in</Text>
      </TouchableOpacity>

      {/* Admin button — smaller, at bottom */}
      <TouchableOpacity
        style={styles.adminButton}
        onPress={() => onNavigate('adminLogin')}
        activeOpacity={0.85}
      >
        <Text style={styles.adminText}>🔐  Admin Login</Text>
      </TouchableOpacity>

      <Text style={styles.offlineTag}>✦ 100% Works Offline</Text>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
  },
  attendButton: {
    width: '100%',
    backgroundColor: '#1a73e8',
    borderRadius: 20,
    paddingVertical: 36,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#1a73e8',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  attendIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  attendText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  attendSub: {
    fontSize: 13,
    color: '#cce0ff',
    marginTop: 6,
  },
  adminButton: {
    width: '100%',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  adminText: {
    fontSize: 16,
    color: '#aaa',
  },
  offlineTag: {
    marginTop: 32,
    fontSize: 12,
    color: '#444',
  },
});
