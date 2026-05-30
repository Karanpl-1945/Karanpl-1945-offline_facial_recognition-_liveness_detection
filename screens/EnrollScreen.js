import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, TextInput, Alert } from 'react-native';

// EnrollScreen — Register a new worker's face
// Step 1: Enter worker name
// Step 2: Look at camera
// Step 3: Capture face → save faceprint to phone
export default function EnrollScreen({ onNavigate }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [workerName, setWorkerName] = useState('');
  const [step, setStep] = useState('name'); // 'name' or 'camera'
  const [status, setStatus] = useState('');
  const cameraRef = useRef(null);

  // Step 1: User types name and taps Continue
  if (step === 'name') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Enroll New Worker</Text>
        <Text style={styles.label}>Enter Worker Name:</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Rahul Kumar"
          placeholderTextColor="#888"
          value={workerName}
          onChangeText={setWorkerName}
        />
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            if (workerName.trim() === '') {
              Alert.alert('Please enter a name');
              return;
            }
            setStep('camera');
          }}
        >
          <Text style={styles.buttonText}>Continue to Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('home')}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Handle camera permission
  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Camera permission needed</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 2: Camera is open, user looks at it
  const handleCapture = async () => {
    if (!cameraRef.current) return;
    setStatus('Capturing...');
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      setStatus('Face captured! Saving...');
      // TODO Day 3: Send photo to SFace model → get 128 numbers → save to storage
      // For now: just confirm capture worked
      setTimeout(() => {
        Alert.alert(
          'Success!',
          `${workerName} has been enrolled.`,
          [{ text: 'OK', onPress: () => onNavigate('home') }]
        );
      }, 500);
    } catch (e) {
      setStatus('Error capturing. Try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enrolling: {workerName}</Text>
      <Text style={styles.instruction}>Position your face in the frame and tap Capture</Text>
      <CameraView ref={cameraRef} style={styles.camera} facing="front" />
      {status ? <Text style={styles.status}>{status}</Text> : null}
      <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
        <Text style={styles.buttonText}>Capture Face</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('home')}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' },
  label: { color: '#ccc', fontSize: 16, marginBottom: 10 },
  instruction: { color: '#aaa', fontSize: 14, textAlign: 'center', marginBottom: 10 },
  input: {
    backgroundColor: '#1e1e1e', color: '#fff', padding: 14,
    borderRadius: 10, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#333',
  },
  camera: { width: '100%', height: 350, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  status: { color: '#FFD700', textAlign: 'center', marginBottom: 10 },
  button: { backgroundColor: '#1a73e8', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  captureButton: { backgroundColor: '#0f9d58', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backButton: { alignItems: 'center', marginTop: 8 },
  backText: { color: '#888', fontSize: 14 },
});
