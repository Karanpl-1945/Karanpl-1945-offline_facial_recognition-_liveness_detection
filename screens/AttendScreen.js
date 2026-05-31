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
  const [result, setResult]             = useState(null); // 'success'|'spoof'|'unknown'
  const [matchedName, setMatchedName]   = useState('');
  const cameraRef   = useRef(null);
  const scanningRef = useRef(false);
  const intervalRef = useRef(null);

  useEffect(() => { loadModels(); }, []);

  // Face detection loop — feeds liveness checker
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
    processAttendance();
  };

  const processAttendance = async () => {
    if (!cameraRef.current) return;

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
        setResult('unknown');
        return;
      }

      const faceBounds = detected.faces[0].bounds;

      // Anti-spoof check — reject printed photos or screens
      setStatus('Checking for spoof...');
      const isReal = await checkAntiSpoof(photo.uri, faceBounds);
      if (!isReal) {
        setStatus('⚠️ Spoof detected! Use your real face.');
        setResult('spoof');
        return;
      }

      // Generate 128-D face embedding
      setStatus('Recognizing face...');
      const embedding = await getFaceEmbedding(photo.uri, faceBounds);

      // Find matching worker
      const workers = await getAllWorkers();
      if (workers.length === 0) {
        setStatus('No workers registered yet. Please register first.');
        setResult('unknown');
        return;
      }

      const match = findBestMatch(embedding, workers);

      if (!match) {
        setStatus('Face not registered. Please register first.');
        setResult('unknown');
        return;
      }

      // Save attendance record to local SQLite
      await saveAttendance(match.worker.id, match.worker.name);
      setMatchedName(match.worker.name);
      setResult('success');

    } catch (e) {
      setStatus('Error: ' + e.message);
      setResult('unknown');
    }
  };

  const handleRetry = () => {
    setLivenessPass(false);
    setResult(null);
    setStatus('');
    setFaces([]);
  };

  // ── Permission check ─────────────────────────────────────────────────────
  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera permission is required</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Success screen ───────────────────────────────────────────────────────
  if (result === 'success') {
    return (
      <View style={styles.container}>
        <View style={styles.successBox}>
          <Text style={styles.successTick}>✅</Text>
          <Text style={styles.successTitle}>Attendance Marked!</Text>
          <Text style={styles.successName}>{matchedName}</Text>
          <Text style={styles.successTime}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => onNavigate('home')}>
          <Text style={styles.primaryBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Camera + liveness screen ─────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Take Attendance</Text>

      <View style={styles.cameraWrapper}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front">
          {faces.map((face, i) => <FaceBox key={i} face={face} />)}
          {!livenessPass && (
            <LivenessChecker faces={faces} onPass={handleLivenessPass} />
          )}
        </CameraView>
      </View>

      {status ? (
        <Text style={[
          styles.status,
          result === 'spoof'   ? styles.statusRed  :
          result === 'unknown' ? styles.statusAmber : styles.statusYellow
        ]}>
          {status}
        </Text>
      ) : null}

      {(result === 'spoof' || result === 'unknown') && (
        <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
          <Text style={styles.primaryBtnText}>Try Again</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('home')}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0a0a0a', padding: 24, justifyContent: 'center' },
  title:        { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 16 },
  message:      { color: '#aaa', fontSize: 16, textAlign: 'center', marginBottom: 20 },
  cameraWrapper:{ width: '100%', height: 420, borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  camera:       { flex: 1 },
  status:       { textAlign: 'center', fontSize: 15, marginBottom: 16, padding: 12, borderRadius: 10 },
  statusYellow: { color: '#FFD700', backgroundColor: '#2d2500' },
  statusRed:    { color: '#ff4444', backgroundColor: '#2d0f0f' },
  statusAmber:  { color: '#FFA500', backgroundColor: '#2d1a00' },
  primaryBtn:   { backgroundColor: '#1a73e8', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  primaryBtnText:{ color: '#fff', fontSize: 17, fontWeight: 'bold' },
  retryBtn:     { backgroundColor: '#e8691a', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  backBtn:      { alignItems: 'center', marginTop: 8 },
  backText:     { color: '#555', fontSize: 14 },
  // Success screen
  successBox:   { alignItems: 'center', marginBottom: 48 },
  successTick:  { fontSize: 72, marginBottom: 16 },
  successTitle: { fontSize: 26, fontWeight: 'bold', color: '#0f9d58', marginBottom: 12 },
  successName:  { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  successTime:  { fontSize: 18, color: '#666' },
});
