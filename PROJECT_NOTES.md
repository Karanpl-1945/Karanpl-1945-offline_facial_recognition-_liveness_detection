# Hackathon 7.0 — Project Notes & Decisions

## What We Are Building
An offline face recognition + liveness detection attendance app for field workers.
- Works with NO internet
- Runs on mid-range Android phones
- AI models under 20MB total
- Recognition under 1 second
- Built in React Native (Expo)

---

## Device Being Used for Development
| Property | Value |
|---|---|
| Phone | Redmi 9i |
| Android Version | 10 |
| Processor | Helio G85 |
| RAM | 4GB |
| Expo Go SDK | 54 |

---

## Tech Stack
| Tool | Purpose |
|---|---|
| React Native (Expo SDK 54) | App framework |
| expo-camera | Camera access |
| expo-face-detector | Face detection + liveness signals |
| react-native-fast-tflite | Run AI models on device |
| AsyncStorage | Save data on phone (offline) |
| AWS (S3 + Lambda + DynamoDB) | Cloud sync when online |

---

## AI Models Chosen

### 1. Face Detection — YuNet
- **Source:** OpenCV Zoo
- **Size:** 0.2 MB
- **License:** MIT (commercial-safe)
- **Job:** Find the face in the camera frame, locate eye/nose/mouth positions (landmarks)
- **Why chosen:** Smallest detector that gives landmark points needed for face alignment

### 2. Face Recognition — SFace (INT8bq version)
- **Source:** OpenCV Zoo
- **Size:** 10.7 MB
- **License:** Apache-2.0 on the actual weights (commercial-safe)
- **Job:** Convert a face into 128 numbers (faceprint), compare numbers to identify a person
- **Accuracy:** 99.4% on LFW benchmark
- **Why chosen:** The ONLY mainstream high-accuracy recognizer with commercial-safe weights.
  EdgeFace, InsightFace, and most others are non-commercial — using them would
  disqualify the submission from the hackathon.
- **Important:** FP32 version is 38.7MB (too big). Must use INT8bq version (10.7MB).

### 3. Liveness Detection — Two Layers

#### Layer 1: Active Challenge-Response (PRIMARY)
- **Tool:** expo-face-detector (built into Expo, 0 extra MB)
- **License:** Apache-2.0 (commercial-safe)
- **Job:** Challenge the user to blink/smile/turn head — a photo cannot do this
- **How blink detection works:**
  ```
  Every camera frame → read eyeOpenProbability (0.0 to 1.0)
  If drops below 0.2  → eye closed (blink started)
  If rises above 0.7  → eye open (blink done)
  Count 2 full cycles → PASS
  ```
- **Other signals available:**
  - smilingProbability → 0.0 to 1.0
  - yawAngle → head turning left/right (true 3D cue, best anti-photo signal)
- **Challenge order must be RANDOMIZED** every session — defeats pre-recorded replay attacks

#### Layer 2: Passive Anti-Spoofing (BACKUP)
- **Tool:** MiniFASNetV2 (Silent-Face Anti-Spoofing)
- **Size:** 1.4 MB
- **License:** Apache-2.0 code (weights need retraining for production)
- **Job:** Single image check — real face or printed photo/screen?
- **Note:** Weights were trained on CelebA-Spoof (non-commercial dataset).
  For hackathon demo this is fine. For production, retrain on own dataset.

---

## Total Model Size Budget
| Model | Size |
|---|---|
| YuNet (detection) | 0.2 MB |
| SFace (recognition) | 10.7 MB |
| MiniFASNetV2 (anti-spoof) | 1.4 MB |
| MediaPipe / expo-face-detector | ~2.0 MB |
| **TOTAL** | **~14.3 MB** ✅ Under 20MB limit |

---

## How Face Recognition Works (Simple Explanation)

```
ENROLL (one time per worker):
  Worker looks at camera
  → YuNet finds face + landmarks
  → Align face to 112x112 pixels (eyes fixed in place)
  → SFace converts face to 128 numbers
  → Save those 128 numbers on phone (NOT the photo)

VERIFY (every attendance):
  Worker looks at camera
  → Same process → get 128 numbers
  → Compare to saved 128 numbers using cosine similarity
  → Score close to 1.0 = same person ✅
  → Score far from 1.0 = different person ❌
```

---

## How Liveness Detection Works (Simple Explanation)

```
App shows challenge: "Blink twice"
  → Watch eyeOpenProbability every frame
  → Detect 2 full blink cycles within 4 seconds
  → PASS → proceed to face recognition

App shows challenge: "Smile"
  → Watch smilingProbability
  → Goes above 0.7 → PASS

App shows challenge: "Turn head slightly"
  → Watch yawAngle
  → Goes beyond ±15 degrees → PASS

IMPORTANT: Challenges are shown in RANDOM ORDER every session.
This means a pre-recorded video cannot fool the app.
```

---

## 3 Critical Findings (Things Other Teams Will Miss)

### 1. Licensing Is the #1 Disqualifier
Most accurate tiny models are NON-COMMERCIAL:
- ❌ EdgeFace — CC BY-NC-SA 4.0 (non-commercial)
- ❌ InsightFace buffalo_* — non-commercial weights
- ❌ Anything trained on MS-Celeb-1M, Glint360K, WebFace260M — non-commercial
- ❌ CelebA-Spoof dataset — non-commercial

Safe choices:
- ✅ SFace — Apache-2.0 weights
- ✅ YuNet — MIT
- ✅ expo-face-detector / MediaPipe — Apache-2.0
- ✅ MiniFASNet CODE — Apache-2.0 (weights need retraining)

### 2. The "Under 1 Second" Claim Needs Two Numbers
- Per-pass ML compute (detect + recognize): **120–350ms** ✅
- Full active liveness challenge (blink/smile): **2–5 seconds** (human reaction time)
- NEVER quote one number for both — judges will notice

### 3. iOS 12+ Is Not Achievable
- React Native itself requires iOS 15.1+ on current toolchain (RN 0.76+)
- For demo: Android only is fine
- In presentation: say "iOS 15.1+ supported, Android 8.0+"

---

## App Flow

```
Worker opens app
       ↓
  HOME SCREEN
  [Enroll New Worker]  [Take Attendance]
       ↓                      ↓
ENROLL SCREEN          ATTEND SCREEN
- Enter worker name    - Liveness check (blink)
- Look at camera       - Face recognized?
- Save faceprint       - Attendance saved offline
                       - Syncs to AWS when online
                       - Deletes from phone after sync
```

---

## Folder Structure

```
FaceAttend/
├── App.js                    ← entry point, controls which screen shows
├── screens/
│   ├── HomeScreen.js         ← welcome screen, two buttons
│   ├── EnrollScreen.js       ← register a worker's face
│   └── AttendScreen.js       ← daily attendance + liveness check
├── components/
│   ├── LivenessChecker.js    ← blink/smile detection logic
│   └── FaceBox.js            ← draws box around face on camera
├── utils/
│   ├── storage.js            ← save/load data on phone
│   └── faceMatch.js          ← compare faces (cosine similarity)
└── assets/
    └── models/               ← AI model files go here (YuNet, SFace)
```

---

## AWS Sync & Purge Flow

```
Offline: Save attendance to phone (encrypted SQLite)
           ↓
Online:  POST to AWS Lambda → get S3 upload URL
           ↓
         Upload attendance record to S3
           ↓
         DynamoDB confirms record saved (idempotent — no duplicates)
           ↓
         ONLY THEN: delete record from phone
```
Rule: NEVER delete from phone before confirmed upload. 
Zero-network zones may be offline for days.

---

## Evaluation Criteria & How to Score

| Criteria | Marks | How to Score |
|---|---|---|
| Innovation | 30 | Two-layer liveness, crypto-purge, Indian lighting robustness |
| Feasibility | 30 | Live demo on real phone in airplane mode + real benchmark numbers |
| Scalability | 20 | Embedding model = add workers without retraining, serverless AWS |
| Presentation | 20 | Show REJECTIONS (photo/screen rejected), FAR/FRR numbers, pipeline diagram |

---

## Setup Status
- [x] Node.js v20.20.2 installed
- [x] Expo SDK 54 project created
- [x] App running on Redmi 9i via Expo Go
- [x] App.js updated with camera code
- [ ] Folder structure created
- [ ] expo-camera + expo-face-detector installed
- [ ] Face detection working
- [ ] Liveness check working
- [ ] SFace model integrated
- [ ] Storage working
- [ ] AWS sync working
- [ ] Presentation done
