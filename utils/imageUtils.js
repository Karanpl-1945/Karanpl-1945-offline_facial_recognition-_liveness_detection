import * as ImageManipulator from 'expo-image-manipulator';
import { Buffer } from 'buffer';
import * as jpeg from 'jpeg-js';

// Crop face region from photo and resize to target dimensions
export async function cropAndResizeFace(imageUri, bounds, targetW, targetH) {
  const { origin, size } = bounds;

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

// Normalize brightness of a base64 JPEG image
// Too dark (< 60)  → boost brightness up
// Too bright (> 200) → reduce brightness down
// Normal (60-200) → no change
// Target: 128 (middle of 0-255 range)
export function normalizeBrightness(base64, width, height) {
  try {
    const buf     = Buffer.from(base64, 'base64');
    const decoded = jpeg.decode(buf, { useTArray: true });
    const { data } = decoded;

    // Calculate average brightness (luminance)
    let total = 0;
    const pixels = width * height;
    for (let i = 0; i < pixels * 4; i += 4) {
      total += (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
    }
    const avg = total / pixels;

    // Already in normal range — return as-is
    if (avg >= 60 && avg <= 200) return base64;

    // Correction factor: bring average toward 128
    const factor = Math.max(0.4, Math.min(3.0, 128 / avg));

    // Apply pixel-level brightness correction
    const corrected = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i += 4) {
      corrected[i]   = Math.min(255, Math.round(data[i]   * factor)); // R
      corrected[i+1] = Math.min(255, Math.round(data[i+1] * factor)); // G
      corrected[i+2] = Math.min(255, Math.round(data[i+2] * factor)); // B
      corrected[i+3] = data[i+3];                                      // A
    }

    // Re-encode as JPEG base64
    const encoded = jpeg.encode({ data: corrected, width, height }, 90);
    return Buffer.from(encoded.data).toString('base64');

  } catch (_) {
    return base64; // if anything fails, use original
  }
}

// Convert base64 JPEG to Float32Array for TFLite input
// Applies brightness normalization automatically before conversion
// normMode:
//   'minus1to1' → (pixel/127.5) - 1  ← SFace
//   '0to1'      → pixel/255           ← anti-spoof
export function base64ToFloat32(base64, width, height, normMode = 'minus1to1') {
  // Auto-normalize brightness before inference
  const normalized = normalizeBrightness(base64, width, height);

  const buf     = Buffer.from(normalized, 'base64');
  const decoded = jpeg.decode(buf, { useTArray: true });
  const { data } = decoded;

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
