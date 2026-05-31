import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const BLINK_CLOSE  = 0.2;
const BLINK_OPEN   = 0.7;
const SMILE_THRESH = 0.7;
const YAW_THRESH   = 15;

const CHALLENGES = ['blink', 'smile', 'turn'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function LivenessChecker({ faces, onPass }) {
  const [order]      = useState(() => shuffle(CHALLENGES));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [done, setDone] = useState(false);
  const eyeWasClosed = useRef(false);
  const hasPassed    = useRef(false);

  const currentChallenge = order[currentIdx];

  useEffect(() => {
    if (hasPassed.current || done) return;
    if (!faces || faces.length === 0) return;

    const face    = faces[0];
    const leftEye = face.leftEyeOpenProbability  ?? 1;
    const rightEye= face.rightEyeOpenProbability ?? 1;
    const avgEye  = (leftEye + rightEye) / 2;
    const smile   = face.smilingProbability ?? 0;
    const yaw     = face.yawAngle ?? 0;

    let passed = false;

    if (currentChallenge === 'blink') {
      if (avgEye < BLINK_CLOSE && !eyeWasClosed.current) {
        eyeWasClosed.current = true;
      } else if (avgEye > BLINK_OPEN && eyeWasClosed.current) {
        eyeWasClosed.current = false;
        passed = true;
      }
    } else if (currentChallenge === 'smile') {
      if (smile > SMILE_THRESH) passed = true;
    } else if (currentChallenge === 'turn') {
      if (Math.abs(yaw) > YAW_THRESH) passed = true;
    }

    if (passed) {
      eyeWasClosed.current = false;
      const nextIdx = currentIdx + 1;
      if (nextIdx >= order.length) {
        hasPassed.current = true;
        setDone(true);
        setTimeout(() => onPass(), 500);
      } else {
        setCurrentIdx(nextIdx);
      }
    }
  }, [faces]);

  const getInstruction = () => {
    if (done) return '✅ Liveness Verified!';
    switch (currentChallenge) {
      case 'blink': return '👁  Blink once';
      case 'smile': return '😊  Smile';
      case 'turn':  return '↔️  Turn head slightly';
      default:      return '';
    }
  };

  return (
    <View style={styles.overlay}>
      <Text style={styles.instruction}>{getInstruction()}</Text>
      <View style={styles.dotsRow}>
        {order.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < currentIdx || done ? styles.dotDone  :
              i === currentIdx       ? styles.dotActive :
                                       styles.dotEmpty
            ]}
          />
        ))}
      </View>
      <Text style={styles.step}>
        {done ? 'Done!' : `Step ${currentIdx + 1} of ${order.length}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay:     { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', padding: 20, alignItems: 'center' },
  instruction: { color: '#FFD700', fontSize: 20, fontWeight: 'bold', marginBottom: 14 },
  dotsRow:     { flexDirection: 'row', gap: 12, marginBottom: 8 },
  dot:         { width: 14, height: 14, borderRadius: 7 },
  dotDone:     { backgroundColor: '#0f9d58' },
  dotActive:   { backgroundColor: '#FFD700' },
  dotEmpty:    { backgroundColor: '#444' },
  step:        { color: '#888', fontSize: 12 },
});
