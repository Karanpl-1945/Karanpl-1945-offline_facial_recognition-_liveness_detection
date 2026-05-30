import * as ImageManipulator from 'expo-image-manipulator';
import { Buffer } from 'buffer';
import jpeg from 'jpeg-js';

// Crop face region from photo and resize to target dimensions
export async function cropAndResizeFace(imageUri, bounds, targetW, targetH) {
  const { origin, size } = bounds;

  // Add 20% padding around face
  const pad = 0.20;
  const x   = Math.max(0, origin.x - size.width  * pad);
  const y   = Math.max(0, origin.y - size.height * pad);
  const w   = size.width  * (1 + 2 * pad);
  const h   = size.height * (1 + 2 * pad);

  return await ImageManipulator.manipulateAsync(
    imageUri,
    [
      { crop: { originX: Math.round(x), originY: Math.round(y), width: Math.round(w), height: Math.round(h) } },
      { resize: { width: targetW, height: targetH } },
    ],
    { base64: true, format: ImageManipulator.SaveFormat.JPEG, compress: 1 }
  );
}

// Convert base64 JPEG to Float32Array for TFLite input
// normMode:
//   'minus1to1' → (pixel/127.5) - 1  ← SFace
//   '0to1'      → pixel/255           ← anti-spoof
export function base64ToFloat32(base64, width, height, normMode = 'minus1to1') {
  const buf     = Buffer.from(base64, 'base64');
  const decoded = jpeg.decode(buf, { useTArray: true });
  const { data } = decoded; // RGBA

  const float32 = new Float32Array(width * height * 3);

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];

    if (normMode === 'minus1to1') {
      float32[i * 3]     = (r / 127.5) - 1;
      float32[i * 3 + 1] = (g / 127.5) - 1;
      float32[i * 3 + 2] = (b / 127.5) - 1;
    } else {
      float32[i * 3]     = r / 255;
      float32[i * 3 + 1] = g / 255;
      float32[i * 3 + 2] = b / 255;
    }
  }

  return float32;
}
