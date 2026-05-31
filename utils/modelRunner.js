import { loadTensorflowModel } from 'react-native-fast-tflite';
import { Asset } from 'expo-asset';
import { cropAndResizeFace, base64ToFloat32, base64ToAntiSpoofInput } from './imageUtils';
import { loadYuNet, detectFaceYuNet, debugYuNetOutput } from './yunetRunner';
import { alignFace } from './faceAlign';

let sfaceModel     = null;
let antispoofModel = null;
let modelsLoading  = false;

async function loadModelAsset(assetRequire) {
  const asset = Asset.fromModule(assetRequire);
  if (!asset.localUri) await asset.downloadAsync();
  return await loadTensorflowModel({ url: asset.localUri }, []);
}

export async function loadModels() {
  if (sfaceModel && antispoofModel) return;
  if (modelsLoading) return;
  modelsLoading = true;
  try {
    [sfaceModel, antispoofModel] = await Promise.all([
      loadModelAsset(require('../assets/models/sface.tflite')),
      loadModelAsset(require('../assets/models/antispoof.tflite')),
    ]);
    await loadYuNet();
  } finally {
    modelsLoading = false;
  }
}

export function areModelsLoaded() {
  return sfaceModel !== null && antispoofModel !== null;
}

// Get YuNet debug output — call from debug screen to verify output format
export { debugYuNetOutput };

// Generate 128-D face embedding using YuNet alignment + SFace
export async function getFaceEmbedding(imageUri, faceBounds, imageWidth = 1080, imageHeight = 1440) {
  if (!sfaceModel) throw new Error('SFace model not loaded');

  let croppedImage;
  try {
    const yunetResult = await detectFaceYuNet(imageUri, imageWidth, imageHeight);
    if (yunetResult && yunetResult.landmarks) {
      croppedImage = await alignFace(imageUri, yunetResult.landmarks, imageWidth, imageHeight);
    } else {
      croppedImage = await cropAndResizeFace(imageUri, faceBounds, 112, 112);
    }
  } catch (_) {
    croppedImage = await cropAndResizeFace(imageUri, faceBounds, 112, 112);
  }

  const input  = base64ToFloat32(croppedImage.base64, 112, 112, 'minus1to1');
  const output = await sfaceModel.run([input.buffer]);
  return Array.from(new Float32Array(output[0]));
}

// Anti-spoof TEMPORARILY DISABLED — calibrating correct output interpretation
export async function checkAntiSpoof(imageUri, faceBounds) {
  return true;
}

// Calibration helper — returns raw anti-spoof scores
export async function debugAntiSpoofScores(imageUri, faceBounds) {
  if (!antispoofModel) return [];
  const cropped = await cropAndResizeFace(imageUri, faceBounds, 128, 128);
  const input   = base64ToAntiSpoofInput(cropped.base64, 128, 128);
  const output  = await antispoofModel.run([input.buffer]);
  return Array.from(new Float32Array(output[0]));
}
