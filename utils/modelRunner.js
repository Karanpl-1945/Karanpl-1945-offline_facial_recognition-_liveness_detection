import { loadTensorflowModel } from 'react-native-fast-tflite';
import { cropAndResizeFace, base64ToFloat32 } from './imageUtils';

let sfaceModel     = null;
let antispoofModel = null;
let modelsLoading  = false;

export async function loadModels() {
  if (sfaceModel && antispoofModel) return;
  if (modelsLoading) return;
  modelsLoading = true;
  try {
    [sfaceModel, antispoofModel] = await Promise.all([
      loadTensorflowModel(require('../assets/models/sface.tflite')),
      loadTensorflowModel(require('../assets/models/antispoof.tflite')),
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
  const output  = await sfaceModel.run([input]);
  return Array.from(output[0]);
}

export async function checkAntiSpoof(imageUri, faceBounds) {
  if (!antispoofModel) return true;
  const cropped = await cropAndResizeFace(imageUri, faceBounds, 128, 128);
  const input   = base64ToFloat32(cropped.base64, 128, 128, '0to1');
  const output  = await antispoofModel.run([input]);
  return output[0][0] > 0.5;
}
