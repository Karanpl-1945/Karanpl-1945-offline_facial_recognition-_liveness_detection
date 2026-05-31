import * as FaceDetector from 'expo-face-detector';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import LivenessChecker from '../components/LivenessChecker';
import { getFaceEmbedding, checkAntiSpoof, areModelsLoaded, loadModels } from '../utils/modelRunner';
import { saveWorker, getAllWorkers } from '../utils/storage';
import { findBestMatch } from '../utils/faceMatch';

export default function EnrollScreen({ onNavigate }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [workerName, setWorkerName]     = useState('');
  const [step, setStep]                 = useState('name');
  const [faces, setFaces]               = useState([]);
  const [livenessPass, setLivenessPass] = useState(false);
  const [status, setStatus]             = useState('');
  const cameraRef   = useRef(null);
  const scanningRef = useRef(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (step === 'liveness') loadModels();
    return () => clearInterval(intervalRef.current);
  }, [step]);

  // Face detection loop — feeds liveness checker
  useEffect(() => {
    if (step !== 'liveness' || !permission?.granted || livenessPass) return;

    intervalRef.current = setInterval(async () => {
      if (scanningRef.current || !cameraRef.current) return;
      scanningRef.current = true;
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.2, skipProcessing: true });
        const result = await FaceDetector.detectFacesAsync(photo.uri, {
          mode: FaceDetector.FaceDetectorMode.fast,
          detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
          runClassifications: FaceDetector.FaceDetectorClassifications.all,
        });
        setFaces(result.faces);
      } catch (_) {}
      finally { scanningRef.current = false; }
    }, 400);

    return () => clearInterval(intervalRef.current);
  }, [step, permission?.granted, livenessPass]);

  const handleLivenessPass = () => {
    clearInterval(intervalRef.current);
    setLivenessPass(true);
    processRegistration();
  };

  const processRegistration = async () => {
    if (!cameraRef.current) return;
    setStep('processing');

    try {
      if (!areModelsLoaded()) {
        setStatus('Loading AI models...');
        await loadModels();
      }

      // Capture high quality photo
      setStatus('Capturing face...');
      const photo = await cameraRef.current.takePictureAsync({ base64: false, quality: 0.8 });

      // Get face bounds
      setStatus('Detecting face...');
      const detected = await FaceDetector.detectFacesAsync(photo.uri, {
        mode: FaceDetector.FaceDetectorMode.accurate,
        detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
        runClassifications: FaceDetector.FaceDetectorClassifications.none,
      });

      if (detected.faces.length === 0) {
        setStatus('No face detected. Please try again.');
        resetLiveness();
        return;
      }

      const faceBounds = detected.faces[0].bounds;

      // Anti-spoof check — reject printed photos or screens
      setStatus('Checking for spoof...');
      const isReal = await checkAntiSpoof(photo.uri, faceBounds);
      if (!isReal) {
        Alert.alert(
          '⚠️ Spoof Detected',
          'Please use your real face. Printed photos or screens are not allowed.',
          [{ text: 'Try Again', onPress: resetLiveness }]
        );
        return;
      }

      // Generate 128-D face embedding using SFace
      setStatus('Generating faceprint...');
      const embedding = await getFaceEmbedding(photo.uri, faceBounds);

      // Check if this face is already registered
      setStatus('Checking for duplicates...');
      const existingWorkers = await getAllWorkers();
      const duplicate = findBestMatch(embedding, existingWorkers);

      if (duplicate) {
        Alert.alert(
          'Already Registered',
          `This face is already registered as "${duplicate.worker.name}".`,
          [{ text: 'OK', onPress: () => onNavigate('home') }]
        );
        return;
      }

      // Save to local SQLite — embeddings never leave the device
      setStatus('Saving to device...');
      await saveWorker(workerName.trim(), embedding);

      Alert.alert(
        'Registered Successfully ✅',
        `"${workerName.trim()}" has been enrolled.\nFaceprint saved on this device.`,
        [{ text: 'OK', onPress: () => onNavigate('home') }]
      );

    } catch (e) {
      setStatus('Error: ' + e.message);
      resetLiveness();
    }
  };

  const resetLiveness = () => {
    setStep('liveness');
    setLivenessPass(false);
    setStatus('');
  };

  // ── Step 1: Enter name ───────────────────────────────────────────────────
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

  // ── Permission check ─────────────────────────────────────────────────────
  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Camera permission needed</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Step 2: Liveness + processing ───────────────────────────────────────
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {step === 'processing' ? 'Processing...' : `Hi, ${workerName}`}
      </Text>
      <Text style={styles.instruction}>
        {step === 'processing' ? status : 'Complete the liveness check to register'}
      </Text>

      <View style={styles.cameraWrapper}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front">
          {!livenessPass && step === 'liveness' && (
            <LivenessChecker faces={faces} onPass={handleLivenessPass} />
          )}
        </CameraView>
      </View>

      {step === 'processing' && (
        <Text style={styles.status}>{status}</Text>
      )}

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
  cameraWrapper: { width: '100%', height: 400, borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  camera:        { flex: 1 },
  status:        { color: '#FFD700', textAlign: 'center', marginBottom: 12, fontSize: 14 },
  primaryBtn:    { backgroundColor: '#1a73e8', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  primaryBtnText:{ color: '#fff', fontSize: 17, fontWeight: 'bold' },
  backBtn:       { alignItems: 'center', marginTop: 12 },
  backText:      { color: '#555', fontSize: 14 },
});
