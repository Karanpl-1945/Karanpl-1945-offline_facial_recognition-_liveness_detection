import * as FaceDetector from 'expo-face-detector';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LivenessChecker from '../components/LivenessChecker';
import FaceBox from '../components/FaceBox';

export default function AttendScreen({ onNavigate }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [faces, setFaces]               = useState([]);
  const [livenessPass, setLivenessPass] = useState(false);
  const [status, setStatus]             = useState('');
  const [result, setResult]             = useState(null);
  const cameraRef  = useRef(null);
  const scanningRef = useRef(false);
  const intervalRef = useRef(null);

  // Take a photo every 400ms and run face detection on it
  useEffect(() => {
    if (!permission?.granted || livenessPass) return;

    intervalRef.current = setInterval(async () => {
      if (scanningRef.current || !cameraRef.current) return;
      scanningRef.current = true;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.2,
          skipProcessing: true,
          base64: false,
        });
        const detected = await FaceDetector.detectFacesAsync(photo.uri, {
          mode: FaceDetector.FaceDetectorMode.fast,
          detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
          runClassifications: FaceDetector.FaceDetectorClassifications.all,
        });
        setFaces(detected.faces);
      } catch (_) {
        // ignore frame errors
      } finally {
        scanningRef.current = false;
      }
    }, 400);

    return () => clearInterval(intervalRef.current);
  }, [permission?.granted, livenessPass]);

  const handleLivenessPass = () => {
    clearInterval(intervalRef.current);
    setLivenessPass(true);
    setStatus('Liveness verified! Recognizing...');
    handleCapture();
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.6 });
      setStatus('Matching face...');
      // TODO: Pass photo to SFace model → get 128 numbers → findBestMatch()
      setTimeout(() => {
        setResult('success');
        setStatus('Rahul Kumar — Attendance Marked ✅');
      }, 1000);
    } catch (e) {
      setStatus('Error capturing. Please try again.');
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
          {faces.map((face, i) => (
            <FaceBox key={i} face={face} />
          ))}
          {!livenessPass && (
            <LivenessChecker faces={faces} onPass={handleLivenessPass} />
          )}
        </CameraView>
      </View>

      {status ? (
        <Text style={[
          styles.status,
          result === 'success' ? styles.statusSuccess : styles.statusInfo
        ]}>
          {status}
        </Text>
      ) : null}

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
