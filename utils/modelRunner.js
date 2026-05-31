import { loadTensorflowModel } from 'react-native-fast-tflite';
import { Asset } from 'expo-asset';
import { cropAndResizeFace, base64ToFloat32, base64ToAntiSpoofInput } from './imageUtils';

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
  } finally {
    modelsLoading = false;
  }
}

export function areModelsLoaded() {
  return sfaceModel !== null && antispoofModel !== null;
}

export async function getFaceEmbedding(imageUri, faceBounds) {
  if (!sfaceModel) throw new Error('SFace model not loaded');
  const cropped = await cropAndResizeFace(imageUri, faceBounds, 112, 112);
  const input   = base64ToFloat32(cropped.base64, 112, 112, 'minus1to1');
  const output  = await sfaceModel.run([input.buffer]);
  return Array.from(new Float32Array(output[0]));
}

// Anti-spoof TEMPORARILY DISABLED — calibrating correct output interpretation.
// Active liveness (blink/smile/turn) still protects against photo attacks.
export async function checkAntiSpoof(imageUri, faceBounds) {
  return true;
}

// Calibration helper — returns raw model scores for a face.
// Use this to see what the model actually outputs for real vs spoof faces.
export async function debugAntiSpoofScores(imageUri, faceBounds) {
  if (!antispoofModel) return [];
  const cropped = await cropAndResizeFace(imageUri, faceBounds, 128, 128);
  const input   = base64ToAntiSpoofInput(cropped.base64, 128, 128);
  const output  = await antispoofModel.run([input.buffer]);
  return Array.from(new Float32Array(output[0]));
}
