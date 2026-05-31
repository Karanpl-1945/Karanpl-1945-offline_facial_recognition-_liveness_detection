import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useCameraPermission } from 'react-native-vision-camera';
import { useImageFaceDetector } from 'react-native-vision-camera-face-detector';
import FaceCamera from '../components/FaceCamera';
import LivenessChecker from '../components/LivenessChecker';
import { getFaceEmbedding, checkAntiSpoof, areModelsLoaded, loadModels } from '../utils/modelRunner';
import { saveWorker, getAllWorkers } from '../utils/storage';
import { findBestMatch } from '../utils/faceMatch';

export default function EnrollScreen({ onNavigate }) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [workerName, setWorkerName]     = useState('');
  const [step, setStep]                 = useState('name'); // name | liveness | processing
  const [faces, setFaces]               = useState([]);
  const [livenessPass, setLivenessPass] = useState(false);
  const [status, setStatus]             = useState('');
  const camRef = useRef(null);

  // Detector for finding the face inside a captured still photo
  const imageDetector = useImageFaceDetector({ performanceMode: 'accurate' });

  const handleLivenessPass = () => {
    setLivenessPass(true);
    processRegistration();
  };

  const processRegistration = async () => {
    setStep('processing');
    try {
      if (!areModelsLoaded()) {
        setStatus('Loading AI models...');
        await loadModels();
      }

      setStatus('Capturing face...');
      const photo = await camRef.current.capture(); // { uri, width, height }

      setStatus('Detecting face...');
      const detected = imageDetector.detectFaces(photo.uri);
      if (!detected || detected.length === 0) {
        Alert.alert('No face found', 'Please try again.', [{ text: 'Retry', onPress: reset }]);
        return;
      }
      const bounds = detected[0].bounds;

      setStatus('Checking for spoof...');
      const isReal = await checkAntiSpoof(photo.uri, bounds);
      if (!isReal) {
        Alert.alert('⚠️ Spoof Detected', 'Use your real face. Photos/screens are not allowed.', [{ text: 'Retry', onPress: reset }]);
        return;
      }

      setStatus('Generating faceprint...');
      const embedding = await getFaceEmbedding(photo.uri, bounds, photo.width, photo.height);

      setStatus('Checking for duplicates...');
      const existing = await getAllWorkers();
      const dup = findBestMatch(embedding, existing);
      if (dup) {
        Alert.alert('Already Registered', `This face is already registered as "${dup.worker.name}".`, [{ text: 'OK', onPress: () => onNavigate('home') }]);
        return;
      }

      setStatus('Saving to device...');
      await saveWorker(workerName.trim(), embedding);
      Alert.alert('Registered Successfully ✅', `"${workerName.trim()}" enrolled.\nFaceprint saved on this device.`, [{ text: 'OK', onPress: () => onNavigate('home') }]);

    } catch (e) {
      Alert.alert('Error', e.message, [{ text: 'Retry', onPress: reset }]);
    }
  };

  const reset = () => {
    setStep('liveness');
    setLivenessPass(false);
    setStatus('');
    setFaces([]);
  };

  // ── Step 1: name ──────────────────────────────────────────────────────────
  if (step === 'name') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Register Worker</Text>
        <Text style={styles.label}>Enter Full Name:</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Rahul Kumar"
          placeholderTextColor="#555"
          value={workerName}
          onChangeText={setWorkerName}
        />
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => {
            if (!workerName.trim()) { Alert.alert('Please enter a name'); return; }
            if (!hasPermission) { requestPermission(); return; }
            setStep('liveness');
          }}
        >
          <Text style={styles.primaryBtnText}>Continue →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('home')}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Camera permission needed</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Step 2: liveness + processing ─────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{step === 'processing' ? 'Processing...' : `Hi, ${workerName}`}</Text>
      <Text style={styles.instruction}>
        {step === 'processing' ? status : 'Complete the liveness check to register'}
      </Text>

      <View style={styles.cameraWrapper}>
        <FaceCamera
          ref={camRef}
          isActive={step === 'liveness' || step === 'processing'}
          onFacesDetected={setFaces}
        />
        {!livenessPass && step === 'liveness' && (
          <LivenessChecker faces={faces} onPass={handleLivenessPass} />
        )}
      </View>

      {step === 'processing' && <Text style={styles.status}>{status}</Text>}

      <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('home')}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#0a0a0a', padding: 24, justifyContent: 'center' },
  title:         { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  instruction:   { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  label:         { color: '#aaa', fontSize: 15, marginBottom: 10 },
  input:         { backgroundColor: '#1a1a1a', color: '#fff', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#2a2a2a' },
  cameraWrapper: { width: '100%', height: 420, borderRadius: 16, overflow: 'hidden', marginBottom: 16, backgroundColor: '#000' },
  status:        { color: '#FFD700', textAlign: 'center', marginBottom: 12, fontSize: 14 },
  primaryBtn:    { backgroundColor: '#1a73e8', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  primaryBtnText:{ color: '#fff', fontSize: 17, fontWeight: 'bold' },
  backBtn:       { alignItems: 'center', marginTop: 12 },
  backText:      { color: '#555', fontSize: 14 },
});
