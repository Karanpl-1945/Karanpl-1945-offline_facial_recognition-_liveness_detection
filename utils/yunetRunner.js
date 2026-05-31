import { loadTensorflowModel } from 'react-native-fast-tflite';
import { Asset } from 'expo-asset';
import * as ImageManipulator from 'expo-image-manipulator';
import { Buffer } from 'buffer';
import * as jpeg from 'jpeg-js';

const YUNET_W = 160;
const YUNET_H = 120;

let yunetModel = null;

export async function loadYuNet() {
  if (yunetModel) return;
  const asset = Asset.fromModule(require('../assets/models/yunet.tflite'));
  if (!asset.localUri) await asset.downloadAsync();
  yunetModel = await loadTensorflowModel({ url: asset.localUri }, []);
}

// Run YuNet and return raw output for verification
// Call this first to see the real output format
export async function debugYuNetOutput(imageUri) {
  if (!yunetModel) await loadYuNet();

  const resized = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: YUNET_W, height: YUNET_H } }],
    { base64: true, format: ImageManipulator.SaveFormat.JPEG, compress: 1 }
  );

  const buf     = Buffer.from(resized.base64, 'base64');
  const decoded = jpeg.decode(buf, { useTArray: true });
  const { data } = decoded;

  const input = new Float32Array(YUNET_H * YUNET_W * 3);
  for (let i = 0; i < YUNET_H * YUNET_W; i++) {
    input[i * 3]     = data[i * 4 + 2]; // B
    input[i * 3 + 1] = data[i * 4 + 1]; // G
    input[i * 3 + 2] = data[i * 4];     // R
  }

  const outputs = await yunetModel.run([input.buffer]);

  // Return debug info — shape + first 20 values of each tensor
  return outputs.map((buf, i) => {
    const arr = new Float32Array(buf);
    return {
      tensor: i,
      length: arr.length,
      first20: Array.from(arr.slice(0, 20)).map(v => v.toFixed(4)),
    };
  });
}

// Run YuNet face detection — returns landmarks for alignment
// Returns: { landmarks: [{x,y}, ...] } or null
export async function detectFaceYuNet(imageUri, imageWidth, imageHeight) {
  if (!yunetModel) await loadYuNet();

  const resized = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: YUNET_W, height: YUNET_H } }],
    { base64: true, format: ImageManipulator.SaveFormat.JPEG, compress: 1 }
  );

  const buf     = Buffer.from(resized.base64, 'base64');
  const decoded = jpeg.decode(buf, { useTArray: true });
  const { data } = decoded;

  const input = new Float32Array(YUNET_H * YUNET_W * 3);
  for (let i = 0; i < YUNET_H * YUNET_W; i++) {
    input[i * 3]     = data[i * 4 + 2];
    input[i * 3 + 1] = data[i * 4 + 1];
    input[i * 3 + 2] = data[i * 4];
  }

  const outputs = await yunetModel.run([input.buffer]);
  const detections = new Float32Array(outputs[0]);

  if (!detections || detections.length < 15) return null;

  // Find best detection (highest confidence)
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

  const scaleX = imageWidth  / YUNET_W;
  const scaleY = imageHeight / YUNET_H;

  const landmarks = [
    { x: detections[best + 5]  * scaleX, y: detections[best + 6]  * scaleY },
    { x: detections[best + 7]  * scaleX, y: detections[best + 8]  * scaleY },
    { x: detections[best + 9]  * scaleX, y: detections[best + 10] * scaleY },
    { x: detections[best + 11] * scaleX, y: detections[best + 12] * scaleY },
    { x: detections[best + 13] * scaleX, y: detections[best + 14] * scaleY },
  ];

  return { landmarks, score: bestScore };
}
