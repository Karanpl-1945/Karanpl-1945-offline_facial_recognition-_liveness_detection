import { loadTensorflowModel } from 'react-native-fast-tflite';
import { cropAndResizeFace, base64ToFloat32 } from './imageUtils';
import { loadYuNet, detectFaceYuNet } from './yunetRunner';
import { alignFace } from './faceAlign';

let sfaceModel     = null;
let antispoofModel = null;
let modelsLoading  = false;

// Load SFace + AntiSpoof + YuNet models
export async function loadModels() {
  if (sfaceModel && antispoofModel) return;
  if (modelsLoading) return;
  modelsLoading = true;
  try {
    [sfaceModel, antispoofModel] = await Promise.all([
      loadTensorflowModel(require('../assets/models/sface.tflite')),
      loadTensorflowModel(require('../assets/models/antispoof.tflite')),
    ]);
    await loadYuNet(); // load YuNet separately
  } finally {
    modelsLoading = false;
  }
}

export function areModelsLoaded() {
  return sfaceModel !== null && antispoofModel !== null;
}

// Generate 128-D face embedding using YuNet alignment + SFace
// Pipeline:
//   1. YuNet → detect face + 5 landmarks
//   2. faceAlign → rotate + crop to 112×112 using landmarks
//   3. SFace → generate 128 numbers from aligned face
export async function getFaceEmbedding(imageUri, faceBoundsFromExpo, imageWidth = 1080, imageHeight = 1440) {
  if (!sfaceModel) throw new Error('SFace model not loaded');

  let croppedImage;

  try {
    // Try YuNet detection + alignment first
    const yunetResult = await detectFaceYuNet(imageUri, imageWidth, imageHeight);

    if (yunetResult && yunetResult.landmarks) {
      // Use YuNet landmarks for precise alignment
      croppedImage = await alignFace(imageUri, yunetResult.landmarks, imageWidth, imageHeight);
    } else {
      // Fallback to expo-face-detector bounds if YuNet fails
      croppedImage = await cropAndResizeFace(imageUri, faceBoundsFromExpo, 112, 112);
    }
  } catch (_) {
    // Fallback to expo bounds if YuNet throws
    croppedImage = await cropAndResizeFace(imageUri, faceBoundsFromExpo, 112, 112);
  }

  const input  = base64ToFloat32(croppedImage.base64, 112, 112, 'minus1to1');
  const output = await sfaceModel.run([input]);
  return Array.from(output[0]);
}

// Passive anti-spoof check using AntiSpoof MN3
export async function checkAntiSpoof(imageUri, faceBounds) {
  if (!antispoofModel) return true;
  const cropped = await cropAndResizeFace(imageUri, faceBounds, 128, 128);
  const input   = base64ToFloat32(cropped.base64, 128, 128, '0to1');
  const output  = await antispoofModel.run([input]);
  return output[0][0] > 0.5;
}
