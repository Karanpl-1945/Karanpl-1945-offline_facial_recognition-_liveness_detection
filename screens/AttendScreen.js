import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LivenessChecker from '../components/LivenessChecker';
import FaceBox from '../components/FaceBox';

// AttendScreen — Mark attendance with face + liveness check
// Flow:
//   1. Camera opens → face detection runs every frame
//   2. LivenessChecker watches eye blinks → PASS after 2 blinks
//   3. Camera captures photo → SFace model identifies worker
//   4. Attendance saved to SQLite

export default function AttendScreen({ onNavigate }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [faces, setFaces]               = useState([]);
  const [livenessPass, setLivenessPass] = useState(false);
  const [status, setStatus]             = useState('');
  const [result, setResult]             = useState(null);
  const cameraRef = useRef(null);

  // Called every frame by CameraView with detected faces
  const handleFacesDetected = ({ faces }) => {
    setFaces(faces);
  };

  // Called by LivenessChecker when blinks are complete
  const handleLivenessPass = () => {
    setLivenessPass(true);
    setStatus('Liveness verified! Recognizing...');
    handleCapture();
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.6,
      });
      setStatus('Matching face...');
      // TODO Day 3: Pass photo to SFace model → get 128 numbers → findBestMatch()
      // Simulated result for now:
      setTimeout(() => {
        setResult('success');
        setStatus('Rahul Kumar — Attendance Marked ✅');
      }, 1000);
    } catch (e) {
      setStatus('Error capturing. Please try again.');
    }
  };

  // ── Permission handling ──────────────────────────────────────────────────
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

  // ── Main UI ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mark Attendance</Text>

      <View style={styles.cameraWrapper}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
          onFacesDetected={handleFacesDetected}
          faceDetectorSettings={{
            mode: 'fast',
            detectLandmarks: 'all',
            runClassifications: 'all',  // gives eyeOpenProbability + smilingProbability
            minDetectionInterval: 100,  // check every 100ms
            tracking: true,
          }}
        >
          {/* Green box around detected face */}
          {faces.map((face, i) => (
            <FaceBox key={i} face={face} />
          ))}

          {/* Blink challenge overlay — hidden after liveness passes */}
          {!livenessPass && (
            <LivenessChecker faces={faces} onPass={handleLivenessPass} />
          )}
        </CameraView>
      </View>

      {/* Status message */}
      {status ? (
        <Text style={[
          styles.status,
          result === 'success' ? styles.statusSuccess : styles.statusInfo
        ]}>
          {status}
        </Text>
      ) : null}

      {/* Show Done button after successful match */}
      {result === 'success' && (
        <TouchableOpacity style={styles.button} onPress={() => onNavigate('home')}>
          <Text style={styles.buttonText}>Done ✓</Text>
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
  statusInfo:    { color: '#FFD700', backgroundColor: '#2d2500' },
  button:        { backgroundColor: '#1a73e8', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  buttonText:    { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backButton:    { alignItems: 'center', marginTop: 8 },
  backText:      { color: '#888', fontSize: 14 },
});
