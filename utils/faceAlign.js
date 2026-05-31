import * as ImageManipulator from 'expo-image-manipulator';

// Canonical eye positions for 112×112 SFace input
// These are the standard positions SFace was trained on
const CANONICAL_LEFT_EYE  = { x: 38.29, y: 51.70 };
const CANONICAL_RIGHT_EYE = { x: 73.53, y: 51.50 };

// Align face using left eye + right eye landmarks
// Steps:
//   1. Calculate head tilt angle from eye line
//   2. Rotate image to make eyes horizontal
//   3. Crop face region centered between eyes
//   4. Resize to 112×112 for SFace
export async function alignFace(imageUri, landmarks, imageWidth, imageHeight) {
  const leftEye  = landmarks[0]; // { x, y }
  const rightEye = landmarks[1]; // { x, y }

  // Step 1: Calculate rotation angle
  const dx    = rightEye.x - leftEye.x;
  const dy    = rightEye.y - leftEye.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Step 2: Rotate image to level the eyes
  let uri = imageUri;
  if (Math.abs(angle) > 2) {  // only rotate if tilt > 2 degrees
    const rotated = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ rotate: -angle }],
      { format: ImageManipulator.SaveFormat.JPEG, compress: 1 }
    );
    uri = rotated.uri;
  }

  // Step 3: Calculate crop bounds
  // Eye center is the anchor point
  const eyeCenterX = (leftEye.x + rightEye.x) / 2;
  const eyeCenterY = (leftEye.y + rightEye.y) / 2;

  // Eye distance in image
  const eyeDist = Math.sqrt(dx * dx + dy * dy);

  // Canonical eye distance in 112×112
  const canonicalEyeDist = CANONICAL_RIGHT_EYE.x - CANONICAL_LEFT_EYE.x; // ~35px

  // Scale factor: how many pixels in image = 1 pixel in 112×112
  const scale = eyeDist / canonicalEyeDist;

  // Face crop size in original image
  const cropSize = Math.round(112 * scale);

  // Crop origin: center crop on eye midpoint, offset by canonical position
  const canonicalCenterX = (CANONICAL_LEFT_EYE.x + CANONICAL_RIGHT_EYE.x) / 2; // ~55.9
  const canonicalCenterY = (CANONICAL_LEFT_EYE.y + CANONICAL_RIGHT_EYE.y) / 2; // ~51.6

  const cropX = Math.round(eyeCenterX - canonicalCenterX * scale);
  const cropY = Math.round(eyeCenterY - canonicalCenterY * scale);

  // Clamp to image bounds
  const safeX = Math.max(0, Math.min(cropX, imageWidth  - cropSize));
  const safeY = Math.max(0, Math.min(cropY, imageHeight - cropSize));
  const safeSize = Math.min(cropSize, imageWidth - safeX, imageHeight - safeY);

  // Step 4: Crop + resize to 112×112
  return await ImageManipulator.manipulateAsync(
    uri,
    [
      { crop: { originX: safeX, originY: safeY, width: safeSize, height: safeSize } },
      { resize: { width: 112, height: 112 } },
    ],
    { base64: true, format: ImageManipulator.SaveFormat.JPEG, compress: 1 }
  );
}
