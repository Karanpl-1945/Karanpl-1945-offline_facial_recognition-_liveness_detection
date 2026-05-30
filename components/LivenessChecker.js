import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// LivenessChecker — detects blink using eyeOpenProbability
//
// How it works:
//   Parent camera sends face data every frame via the `faces` prop
//   We read eyeOpenProbability from the face (0.0 = closed, 1.0 = open)
//   open → close → open = 1 blink
//   2 blinks = PASS → calls onPass()
//
// Props:
//   faces  — array of face objects from CameraView onFacesDetected
//   onPass — called when liveness is confirmed

const BLINK_CLOSE_THRESHOLD = 0.2; // below this = eye closed
const BLINK_OPEN_THRESHOLD  = 0.7; // above this = eye open
const BLINKS_REQUIRED       = 2;   // blinks needed to pass

export default function LivenessChecker({ faces, onPass }) {
  const [blinkCount, setBlinkCount]     = useState(0);
  const [challenge, setChallenge]       = useState('👁  Blink twice to continue');
  const eyeWasClosed = useRef(false);
  const hasPassed    = useRef(false);

  useEffect(() => {
    if (hasPassed.current) return;
    if (!faces || faces.length === 0) return;

    const face    = faces[0];
    const leftEye = face.leftEyeOpenProbability  ?? 1;
    const rightEye= face.rightEyeOpenProbability ?? 1;
    const avgEye  = (leftEye + rightEye) / 2;

    if (avgEye < BLINK_CLOSE_THRESHOLD && !eyeWasClosed.current) {
      // Eye just closed
      eyeWasClosed.current = true;

    } else if (avgEye > BLINK_OPEN_THRESHOLD && eyeWasClosed.current) {
      // Eye just opened after closing = 1 full blink
      eyeWasClosed.current = false;

      setBlinkCount(prev => {
        const newCount = prev + 1;
        if (newCount >= BLINKS_REQUIRED) {
          hasPassed.current = true;
          setChallenge('✅ Liveness Verified!');
          setTimeout(() => onPass(), 600);
        }
        return newCount;
      });
    }
  }, [faces]);

  return (
    <View style={styles.overlay}>
      <Text style={styles.challengeText}>{challenge}</Text>
      <View style={styles.dotsRow}>
        {Array.from({ length: BLINKS_REQUIRED }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i < blinkCount ? styles.dotFilled : styles.dotEmpty]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: 18,
    alignItems: 'center',
  },
  challengeText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    width: 16, height: 16, borderRadius: 8,
  },
  dotFilled: { backgroundColor: '#0f9d58' },
  dotEmpty:  { backgroundColor: '#555' },
});
