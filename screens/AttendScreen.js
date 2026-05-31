import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCameraPermission } from 'react-native-vision-camera';
import { useImageFaceDetector } from 'react-native-vision-camera-face-detector';
import FaceCamera from '../components/FaceCamera';
import LivenessChecker from '../components/LivenessChecker';
import { getFaceEmbedding, checkAntiSpoof, loadModels, areModelsLoaded } from '../utils/modelRunner';
import { getAllWorkers, saveAttendance } from '../utils/storage';
import { findBestMatch } from '../utils/faceMatch';

export default function AttendScreen({ onNavigate }) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [faces, setFaces]               = useState([]);
  const [livenessPass, setLivenessPass] = useState(false);
  const [status, setStatus]             = useState('');
  const [result, setResult]             = useState(null); // success | spoof | unknown
  const [matchedName, setMatchedName]   = useState('');
  const [timeTaken, setTimeTaken]       = useState(0);
  const camRef    = useRef(null);
  const startTime = useRef(null);

  const imageDetector = useImageFaceDetector({ performanceMode: 'accurate' });

  const handleLivenessPass = () => {
    setLivenessPass(true);
    setStatus('Liveness verified! Checking...');
    processAttendance();
  };

  const processAttendance = async () => {
    startTime.current = Date.now();
    try {
      if (!areModelsLoaded()) {
        setStatus('Loading AI models...');
        await loadModels();
      }

      setStatus('Capturing face...');
      const photo = await camRef.current.capture();

      setStatus('Detecting face...');
      const detected = imageDetector.detectFaces(photo.uri);
      if (!detected || detected.length === 0) {
        setStatus('No face found. Please try again.');
        setResult('unknown');
        return;
      }
      const bounds = detected[0].bounds;

      setStatus('Checking for spoof...');
      const isReal = await checkAntiSpoof(photo.uri, bounds);
      if (!isReal) {
        setStatus('⚠️ Spoof detected! Use your real face.');
        setResult('spoof');
        return;
      }

      setStatus('Recognizing face...');
      const embedding = await getFaceEmbedding(photo.uri, bounds, photo.width, photo.height);

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

      await saveAttendance(match.worker.id, match.worker.name);
      setMatchedName(match.worker.name);
      setTimeTaken(((Date.now() - startTime.current) / 1000).toFixed(2));
      setResult('success');

    } catch (e) {
      Alert.alert('Error', e.message, [{ text: 'Try Again', onPress: handleRetry }]);
      setResult('unknown');
    }
  };

  const handleRetry = () => {
    setLivenessPass(false);
    setResult(null);
    setStatus('');
    setFaces([]);
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera permission is required</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('home')}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Success screen ────────────────────────────────────────────────────────
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
          <Text style={styles.successSpeed}>⚡ Recognized in {timeTaken}s</Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => onNavigate('home')}>
          <Text style={styles.primaryBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Camera + liveness ─────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Take Attendance</Text>

      <View style={styles.cameraWrapper}>
        <FaceCamera
          ref={camRef}
          isActive={true}
          onFacesDetected={livenessPass ? () => {} : setFaces}
        />
        {!livenessPass && <LivenessChecker faces={faces} onPass={handleLivenessPass} />}
      </View>

      {status ? (
        <Text style={[
          styles.status,
          result === 'spoof'   ? styles.statusRed   :
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
  cameraWrapper:{ width: '100%', height: 440, borderRadius: 16, overflow: 'hidden', marginBottom: 16, backgroundColor: '#000' },
  status:       { textAlign: 'center', fontSize: 15, marginBottom: 16, padding: 12, borderRadius: 10 },
  statusYellow: { color: '#FFD700', backgroundColor: '#2d2500' },
  statusRed:    { color: '#ff4444', backgroundColor: '#2d0f0f' },
  statusAmber:  { color: '#FFA500', backgroundColor: '#2d1a00' },
  primaryBtn:   { backgroundColor: '#1a73e8', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  primaryBtnText:{ color: '#fff', fontSize: 17, fontWeight: 'bold' },
  retryBtn:     { backgroundColor: '#e8691a', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  backBtn:      { alignItems: 'center', marginTop: 8 },
  backText:     { color: '#555', fontSize: 14 },
  successBox:   { alignItems: 'center', marginBottom: 48 },
  successTick:  { fontSize: 72, marginBottom: 16 },
  successTitle: { fontSize: 26, fontWeight: 'bold', color: '#0f9d58', marginBottom: 12 },
  successName:  { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  successTime:  { fontSize: 18, color: '#666' },
  successSpeed: { fontSize: 13, color: '#1a73e8', marginTop: 10 },
});
