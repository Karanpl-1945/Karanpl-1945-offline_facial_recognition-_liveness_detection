import { StyleSheet, View } from 'react-native';

// FaceBox — draws a green box around a detected face
// Props:
//   face   — Vision Camera face object with bounds: { x, y, width, height }
//   scaleX — scale factor X (camera buffer vs screen)
//   scaleY — scale factor Y
export default function FaceBox({ face, scaleX = 1, scaleY = 1 }) {
  if (!face || !face.bounds) return null;

  const { x, y, width, height } = face.bounds;

  return (
    <View
      style={[
        styles.box,
        {
          left:   x * scaleX,
          top:    y * scaleY,
          width:  width  * scaleX,
          height: height * scaleY,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#00FF88',
    borderRadius: 4,
  },
});
