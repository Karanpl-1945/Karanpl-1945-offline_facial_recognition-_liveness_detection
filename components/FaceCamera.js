import { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Camera, useCameraDevice, usePhotoOutput } from 'react-native-vision-camera';
import { useFaceDetectorOutput } from 'react-native-vision-camera-face-detector';

// FaceCamera — Vision Camera with real-time face detection + photo capture
//
// Props:
//   onFacesDetected(faces) — called continuously (native, ~30fps) with Face[]
//   isActive               — whether the camera is running
//
// Ref method:
//   capture() → { uri, width, height }  — takes a high-quality still photo
//
// Each Face has: bounds{x,y,width,height}, leftEyeOpenProbability,
//                rightEyeOpenProbability, smilingProbability, yawAngle
const FaceCamera = forwardRef(function FaceCamera({ onFacesDetected, isActive = true }, ref) {
  const device = useCameraDevice('front');

  // Native face-detection output — runs at camera frame rate, no JS loop
  const faceOutput = useFaceDetectorOutput({
    onFacesDetected,
    onError: () => {},
    cameraFacing: 'front',
    performanceMode: 'fast',
    runClassifications: true, // enables eye-open + smiling probabilities
    runLandmarks: false,
    trackingEnabled: true,
  });

  // Photo output — used to capture a still frame for the SFace embedding
  const photoOutput = usePhotoOutput({ qualityPrioritization: 'balanced' });

  useImperativeHandle(ref, () => ({
    async capture() {
      const photo = await photoOutput.capturePhoto({}, {});
      const path  = await photo.saveToTemporaryFileAsync();
      const width  = photo.width;
      const height = photo.height;
      photo.dispose();
      const uri = path.startsWith('file://') ? path : `file://${path}`;
      return { uri, width, height };
    },
  }), [photoOutput]);

  if (device == null) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>No front camera found</Text>
      </View>
    );
  }

  return (
    <Camera
      style={StyleSheet.absoluteFill}
      device={device}
      isActive={isActive}
      outputs={[faceOutput, photoOutput]}
    />
  );
});

export default FaceCamera;

const styles = StyleSheet.create({
  fallback:     { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  fallbackText: { color: '#888' },
});
