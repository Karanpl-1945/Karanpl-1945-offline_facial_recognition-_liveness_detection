import { loadTensorflowModel } from 'react-native-fast-tflite';
import { Asset } from 'expo-asset';
import * as ImageManipulator from 'expo-image-manipulator';
import { Buffer } from 'buffer';
import * as jpeg from 'jpeg-js';

// YuNet input size
const YUNET_W = 160;
const YUNET_H = 120;

let yunetModel = null;

export async function loadYuNet() {
  if (yunetModel) return;
  const asset = Asset.fromModule(require('../assets/models/yunet.tflite'));
  if (!asset.localUri) await asset.downloadAsync();
  yunetModel = await loadTensorflowModel({ url: asset.localUri }, []);
}

// Run YuNet on an image URI
// Returns best detected face: { bounds, landmarks: [leftEye, rightEye, nose, leftMouth, rightMouth] }
// Each landmark: { x, y } in original image coordinates
export async function detectFaceYuNet(imageUri, imageWidth, imageHeight) {
  if (!yunetModel) await loadYuNet();

  // Resize to YuNet input size (160×120)
  const resized = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: YUNET_W, height: YUNET_H } }],
    { base64: true, format: ImageManipulator.SaveFormat.JPEG, compress: 1 }
  );

  // Decode and convert to Float32 BGR (0-255) — YuNet expects BGR like OpenCV
  const buf     = Buffer.from(resized.base64, 'base64');
  const decoded = jpeg.decode(buf, { useTArray: true });
  const { data } = decoded;

  const input = new Float32Array(YUNET_H * YUNET_W * 3);
  for (let i = 0; i < YUNET_H * YUNET_W; i++) {
    input[i * 3]     = data[i * 4 + 2]; // B  ← note: BGR order
    input[i * 3 + 1] = data[i * 4 + 1]; // G
    input[i * 3 + 2] = data[i * 4];     // R
  }

  // Run YuNet inference
  const outputs = await yunetModel.run([input]);

  // Parse output — YuNet outputs detections as flat array
  // Each detection: [x, y, w, h, score, lm0x, lm0y, lm1x, lm1y, lm2x, lm2y, lm3x, lm3y, lm4x, lm4y]
  const detections = outputs[0];
  if (!detections || detections.length < 15) return null;

  // Find detection with highest confidence score
  let best = null;
  let bestScore = 0;
  const stride = 15;

  for (let i = 0; i < detections.length; i += stride) {
    const score = detections[i + 4];
    if (score > bestScore && score > 0.6) {
      bestScore = score;
      best = i;
    }
  }

  if (best === null) return null;

  // Scale factor from YuNet input size back to original image size
  const scaleX = imageWidth  / YUNET_W;
  const scaleY = imageHeight / YUNET_H;

  const x = detections[best]     * scaleX;
  const y = detections[best + 1] * scaleY;
  const w = detections[best + 2] * scaleX;
  const h = detections[best + 3] * scaleY;

  // 5 landmarks scaled back to original image
  const landmarks = [
    { x: detections[best + 5]  * scaleX, y: detections[best + 6]  * scaleY }, // left eye
    { x: detections[best + 7]  * scaleX, y: detections[best + 8]  * scaleY }, // right eye
    { x: detections[best + 9]  * scaleX, y: detections[best + 10] * scaleY }, // nose
    { x: detections[best + 11] * scaleX, y: detections[best + 12] * scaleY }, // left mouth
    { x: detections[best + 13] * scaleX, y: detections[best + 14] * scaleY }, // right mouth
  ];

  return {
    bounds: { origin: { x, y }, size: { width: w, height: h } },
    landmarks,
    score: bestScore,
  };
}
