import { StyleSheet, Text, View } from 'react-native';

// FaceGuide — an oval overlay that tells the user where to place their face.
// Keeps the face centered + consistently sized, which improves recognition
// and avoids the crop hitting the image edge.
//
// Props:
//   active  — true when a face is detected (turns the oval green)
//   hint    — optional text shown under the oval
export default function FaceGuide({ active = false, hint = '' }) {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={[styles.oval, active ? styles.ovalActive : styles.ovalIdle]} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oval: {
    width: 210,
    height: 280,
    borderRadius: 140,   // >= half of height → clean vertical ellipse
    borderWidth: 4,
  },
  ovalIdle:   { borderColor: 'rgba(255,255,255,0.6)', borderStyle: 'dashed' },
  ovalActive: { borderColor: '#0f9d58' },
  hint: {
    position: 'absolute',
    bottom: 70,
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
  },
});
