import { loadTensorflowModel } from 'react-native-fast-tflite';
import { Asset } from 'expo-asset';
import { cropAndResizeFace, base64ToFloat32 } from './imageUtils';
import { loadYuNet, detectFaceYuNet } from './yunetRunner';
import { alignFace } from './faceAlign';

let sfaceModel     = null;
let antispoofModel = null;
let modelsLoading  = false;

// Copy .tflite asset from APK bundle to local filesystem and load it
async function loadModelAsset(assetRequire) {
  const [asset] = await Asset.loadAsync(assetRequire);
  return await loadTensorflowModel({ uri: asset.localUri });
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

export async function getFaceEmbedding(imageUri, faceBoundsFromExpo, imageWidth = 1080, imageHeight = 1440) {
  if (!sfaceModel) throw new Error('SFace model not loaded');

  let croppedImage;
  try {
    const yunetResult = await detectFaceYuNet(imageUri, imageWidth, imageHeight);
    if (yunetResult && yunetResult.landmarks) {
      croppedImage = await alignFace(imageUri, yunetResult.landmarks, imageWidth, imageHeight);
    } else {
      croppedImage = await cropAndResizeFace(imageUri, faceBoundsFromExpo, 112, 112);
    }
  } catch (_) {
    croppedImage = await cropAndResizeFace(imageUri, faceBoundsFromExpo, 112, 112);
  }

  const input  = base64ToFloat32(croppedImage.base64, 112, 112, 'minus1to1');
  const output = await sfaceModel.run([input]);
  return Array.from(output[0]);
}

export async function checkAntiSpoof(imageUri, faceBounds) {
  if (!antispoofModel) return true;
  const cropped = await cropAndResizeFace(imageUri, faceBounds, 128, 128);
  const input   = base64ToFloat32(cropped.base64, 128, 128, '0to1');
  const output  = await antispoofModel.run([input]);
  return output[0][0] > 0.5;
}
