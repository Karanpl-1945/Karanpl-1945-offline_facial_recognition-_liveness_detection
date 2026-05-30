import * as FaceDetector from 'expo-face-detector';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getFaceEmbedding, areModelsLoaded, loadModels } from '../utils/modelRunner';
import { saveWorker } from '../utils/storage';

export default function EnrollScreen({ onNavigate }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [workerName, setWorkerName]     = useState('');
  const [step, setStep]                 = useState('name');
  const [status, setStatus]             = useState('');
  const [faces, setFaces]               = useState([]);
  const cameraRef   = useRef(null);
  const scanningRef = useRef(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (step === 'camera') loadModels();
    return () => clearInterval(intervalRef.current);
  }, [step]);

  useEffect(() => {
    if (step !== 'camera' || !permission?.granted) return;
    intervalRef.current = setInterval(async () => {
      if (scanningRef.current || !cameraRef.current) return;
      scanningRef.current = true;
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.2, skipProcessing: true });
        const result = await FaceDetector.detectFacesAsync(photo.uri, {
          mode: FaceDetector.FaceDetectorMode.fast,
          detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
          runClassifications: FaceDetector.FaceDetectorClassifications.none,
        });
        setFaces(result.faces);
      } catch (_) {}
      finally { scanningRef.current = false; }
    }, 600);
    return () => clearInterval(intervalRef.current);
  }, [step, permission?.granted]);

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
            if (!workerName.trim()) { Alert.alert('Please enter a name'); return; }
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

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    if (faces.length === 0) {
      Alert.alert('No face detected', 'Please position your face clearly in the frame.');
      return;
    }
    if (!areModelsLoaded()) {
      setStatus('Loading AI models... please wait');
      await loadModels();
    }
    setStatus('Capturing face...');
    clearInterval(intervalRef.current);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false, quality: 0.8 });
      setStatus('Generating faceprint (128 numbers)...');
      const embedding = await getFaceEmbedding(photo.uri, faces[0].bounds);
      setStatus('Saving to database...');
      await saveWorker(workerName.trim(), embedding);
      Alert.alert(
        'Enrolled Successfully!',
        `${workerName.trim()} has been registered.\nFaceprint saved to device.`,
        [{ text: 'OK', onPress: () => onNavigate('home') }]
      );
    } catch (e) {
      setStatus('Error: ' + e.message);
    }
  };

  const faceDetected = faces.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enrolling: {workerName}</Text>
      <Text style={styles.instruction}>
        {faceDetected ? '✅ Face detected — tap Capture' : '👤 Position face in frame'}
      </Text>
      <CameraView ref={cameraRef} style={styles.camera} facing="front" />
      {status ? <Text style={styles.status}>{status}</Text> : null}
      <TouchableOpacity
        style={[styles.captureButton, !faceDetected && styles.buttonDisabled]}
        onPress={handleCapture}
      >
        <Text style={styles.buttonText}>Capture Face</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('home')}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0f0f0f', padding: 20, justifyContent: 'center' },
  title:          { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 16, textAlign: 'center' },
  label:          { color: '#ccc', fontSize: 16, marginBottom: 10 },
  instruction:    { color: '#aaa', fontSize: 14, textAlign: 'center', marginBottom: 10 },
  input:          { backgroundColor: '#1e1e1e', color: '#fff', padding: 14, borderRadius: 10, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  camera:         { width: '100%', height: 350, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  status:         { color: '#FFD700', textAlign: 'center', marginBottom: 10 },
  button:         { backgroundColor: '#1a73e8', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  captureButton:  { backgroundColor: '#0f9d58', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  buttonDisabled: { backgroundColor: '#444' },
  buttonText:     { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backButton:     { alignItems: 'center', marginTop: 8 },
  backText:       { color: '#888', fontSize: 14 },
});
