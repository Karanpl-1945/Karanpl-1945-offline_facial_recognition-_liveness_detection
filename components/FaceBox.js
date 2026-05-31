import { StyleSheet, View } from 'react-native';

// FaceBox — draws a green box around a detected face
// Props:
//   face   — face object from expo-face-detector (has bounds: { origin, size })
//   scaleX — how much to scale X (camera preview vs screen size)
//   scaleY — how much to scale Y
export default function FaceBox({ face, scaleX = 1, scaleY = 1 }) {
  if (!face) return null;

  const { origin, size } = face.bounds;

  return (
    <View
      style={[
        styles.box,
        {
          left:   origin.x * scaleX,
          top:    origin.y * scaleY,
          width:  size.width  * scaleX,
          height: size.height * scaleY,
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
