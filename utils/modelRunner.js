import { loadTensorflowModel } from 'react-native-fast-tflite';
import { Asset } from 'expo-asset';
import { cropAndResizeFace, base64ToFloat32, base64ToAntiSpoofInput } from './imageUtils';

let sfaceModel     = null;
let antispoofModel = null;
let modelsLoading  = false;

// Copy .tflite asset from APK bundle to local filesystem and load it
// Note: loadTensorflowModel REQUIRES a second `delegates` arg ([] = default CPU)
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

// Generate 128-D face embedding from a photo using SFace
// faceBounds: expo-face-detector bounds { origin:{x,y}, size:{width,height} }
// NOTE: YuNet alignment is temporarily bypassed — using direct crop for
// reliability while we verify the core pipeline. Re-add alignment later.
export async function getFaceEmbedding(imageUri, faceBounds) {
  if (!sfaceModel) throw new Error('SFace model not loaded');
  const cropped = await cropAndResizeFace(imageUri, faceBounds, 112, 112);
  const input   = base64ToFloat32(cropped.base64, 112, 112, 'minus1to1');
  // run() takes ArrayBuffer[] and returns ArrayBuffer[]
  const output  = await sfaceModel.run([input.buffer]);
  return Array.from(new Float32Array(output[0]));
}

// Passive anti-spoof check (real face vs printed photo / screen).
// anti-spoof-mn3: BGR + mean/scale preprocessing, output [real, spoof].
// Use argmax (real vs spoof) rather than a fixed threshold.
export async function checkAntiSpoof(imageUri, faceBounds) {
  if (!antispoofModel) return true;
  const cropped = await cropAndResizeFace(imageUri, faceBounds, 128, 128);
  const input   = base64ToAntiSpoofInput(cropped.base64, 128, 128);
  const output  = await antispoofModel.run([input.buffer]);
  const scores  = new Float32Array(output[0]);
  const real    = scores[0];   // index 0 = real person (per model card)
  const spoof   = scores[1];   // index 1 = spoof
  return real >= spoof;
}
