import { CameraView, useCameraPermissions } from 'expo-camera';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to use the camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="front" />
      <Text style={styles.label}>Face Attend - Camera Ready</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  message: { color: 'white', textAlign: 'center', margin: 20, fontSize: 16 },
  button: { backgroundColor: '#2196F3', padding: 15, margin: 20, borderRadius: 10 },
  buttonText: { color: 'white', textAlign: 'center', fontSize: 16 },
  label: { color: 'white', textAlign: 'center', padding: 10, fontSize: 14 },
});
