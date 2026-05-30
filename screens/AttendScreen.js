import * as FaceDetector from 'expo-face-detector';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LivenessChecker from '../components/LivenessChecker';
import FaceBox from '../components/FaceBox';
import { getFaceEmbedding, checkAntiSpoof, loadModels, areModelsLoaded } from '../utils/modelRunner';
import { getAllWorkers, saveAttendance } from '../utils/storage';
import { findBestMatch } from '../utils/faceMatch';

export default function AttendScreen({ onNavigate }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [faces, setFaces]               = useState([]);
  const [livenessPass, setLivenessPass] = useState(false);
  const [status, setStatus]             = useState('');
  const [result, setResult]             = useState(null); // 'success' | 'spoof' | 'unknown'
  const [matchedName, setMatchedName]   = useState('');
  const cameraRef   = useRef(null);
  const scanningRef = useRef(false);
  const intervalRef = useRef(null);

  useEffect(() => { loadModels(); }, []);

  // Run face detection every 400ms for liveness checker
  useEffect(() => {
    if (!permission?.granted || livenessPass) return;
    intervalRef.current = setInterval(async () => {
      if (scanningRef.current || !cameraRef.current) return;
      scanningRef.current = true;
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.2, skipProcessing: true });
        const detected = await FaceDetector.detectFacesAsync(photo.uri, {
          mode: FaceDetector.FaceDetectorMode.fast,
          detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
          runClassifications: FaceDetector.FaceDetectorClassifications.all,
        });
        setFaces(detected.faces);
      } catch (_) {}
      finally { scanningRef.current = false; }
    }, 400);
    return () => clearInterval(intervalRef.current);
  }, [permission?.granted, livenessPass]);

  const handleLivenessPass = () => {
    clearInterval(intervalRef.current);
    setLivenessPass(true);
    setStatus('Liveness verified! Checking...');
    handleRecognition();
  };

  const handleRecognition = async () => {
    if (!cameraRef.current) return;
    try {
      if (!areModelsLoaded()) {
        setStatus('Loading AI models...');
        await loadModels();
      }

      // Capture high quality photo for recognition
      const photo = await cameraRef.current.takePictureAsync({ base64: false, quality: 0.8 });

      // Need face bounds — run one more detection on the high quality photo
      const detected = await FaceDetector.detectFacesAsync(photo.uri, {
        mode: FaceDetector.FaceDetectorMode.accurate,
        detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
        runClassifications: FaceDetector.FaceDetectorClassifications.none,
      });

      if (detected.faces.length === 0) {
        setStatus('No face found. Please try again.');
        setResult('unknown');
        return;
      }

      const faceBounds = detected.faces[0].bounds;

      // Layer 2: Passive anti-spoof check
      setStatus('Checking for spoof...');
      const isReal = await checkAntiSpoof(photo.uri, faceBounds);
      if (!isReal) {
        setStatus('⚠️ Spoof detected! Please use your real face.');
        setResult('spoof');
        return;
      }

      // Face recognition
      setStatus('Recognizing face...');
      const embedding = await getFaceEmbedding(photo.uri, faceBounds);
      const workers   = await getAllWorkers();

      if (workers.length === 0) {
        setStatus('No workers enrolled yet. Please enroll first.');
        setResult('unknown');
        return;
      }

      const match = findBestMatch(embedding, workers);

      if (!match) {
        setStatus('Unknown person — not in the system.');
        setResult('unknown');
        return;
      }

      // Save attendance record
      await saveAttendance(match.worker.id, match.worker.name);
      setMatchedName(match.worker.name);
      setStatus(`${match.worker.name} — Attendance Marked ✅`);
      setResult('success');

    } catch (e) {
      setStatus('Error: ' + e.message);
      setResult('unknown');
    }
  };

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera permission is required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mark Attendance</Text>

      <View style={styles.cameraWrapper}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front">
          {faces.map((face, i) => <FaceBox key={i} face={face} />)}
          {!livenessPass && <LivenessChecker faces={faces} onPass={handleLivenessPass} />}
        </CameraView>
      </View>

      {status ? (
        <Text style={[
          styles.status,
          result === 'success' ? styles.statusSuccess :
          result === 'spoof'   ? styles.statusSpoof   : styles.statusInfo
        ]}>
          {status}
        </Text>
      ) : null}

      {result === 'success' && (
        <TouchableOpacity style={styles.button} onPress={() => onNavigate('home')}>
          <Text style={styles.buttonText}>Done ✓</Text>
        </TouchableOpacity>
      )}

      {(result === 'spoof' || result === 'unknown') && (
        <TouchableOpacity style={styles.retryButton} onPress={() => {
          setLivenessPass(false);
          setResult(null);
          setStatus('');
          setFaces([]);
        }}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('home')}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#0f0f0f', padding: 20, justifyContent: 'center' },
  title:         { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 16, textAlign: 'center' },
  message:       { color: '#ccc', fontSize: 16, marginBottom: 20, textAlign: 'center' },
  cameraWrapper: { width: '100%', height: 400, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  camera:        { flex: 1 },
  status:        { textAlign: 'center', fontSize: 16, marginBottom: 16, padding: 12, borderRadius: 8 },
  statusSuccess: { color: '#0f9d58', backgroundColor: '#0f2d1e' },
  statusSpoof:   { color: '#ff4444', backgroundColor: '#2d0f0f' },
  statusInfo:    { color: '#FFD700', backgroundColor: '#2d2500' },
  button:        { backgroundColor: '#1a73e8', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  retryButton:   { backgroundColor: '#e8691a', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  buttonText:    { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backButton:    { alignItems: 'center', marginTop: 8 },
  backText:      { color: '#888', fontSize: 14 },
});
