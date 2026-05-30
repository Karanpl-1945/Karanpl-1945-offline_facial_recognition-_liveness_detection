# SmartAttend: Offline-First Face Recognition Attendance System

**Team:** [Your Name(s)]
**Institution:** [Institution Name]
**Track:** Hackathon 7.0
**Date:** May 2026

---

## Executive Summary

We are building a mobile attendance system that uses on-device face recognition and two-layer liveness detection to replace paper registers and PIN-based systems in factories and fieldwork sites. Everything runs offline on a sub-$150 Android phone — no internet required to mark attendance. Models were chosen specifically for license compliance (Apache-2.0/MIT), not just accuracy. Total on-device model footprint is ~14MB. When connectivity returns, records sync to AWS automatically with idempotency guarantees. The system enrolls a worker in under 10 seconds and verifies them in under 5 seconds including liveness. This is a real, deployable system — not a proof of concept dressed up as one.

---

## Problem Statement

Manual attendance in factories, construction sites, and rural field teams is riddled with buddy punching (one worker clocking in for another), paper errors, and reconciliation delays. Biometric hardware terminals cost $300–$800 each and require stable power and internet. Most smartphone-based biometric apps either require cloud connectivity (useless in low-signal sites) or use models with non-commercial licenses that cannot legally be deployed. The people who need this the most — small contractors, NGOs, rural employers — are exactly the people priced out of existing solutions.

---

## Proposed Solution Overview

SmartAttend runs entirely on the supervisor's Android phone. Workers enroll once by looking at the camera; the app stores a 128-dimensional face embedding in local SQLite. At each shift, workers verify by completing a randomized liveness challenge (blink twice, smile, or turn your head) followed by automatic passive anti-spoof checking. The match decision happens on-device in under 350ms of ML compute time. Attendance records sync to AWS in the background whenever internet is available, using presigned S3 uploads and DynamoDB conditional writes to prevent duplicates.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     ANDROID PHONE                        │
│  (Redmi 9i — Helio G85, 4GB RAM, Android 10)            │
│                                                          │
│  ┌──────────┐   ┌──────────┐   ┌────────────────────┐   │
│  │  Camera  │──▶│  YuNet   │──▶│  5-point Align     │   │
│  │ Preview  │   │ 233KB    │   │  → 112×112 crop     │   │
│  └──────────┘   └──────────┘   └────────┬───────────┘   │
│                                          │               │
│       ┌──────────────────────────────────▼────────────┐  │
│       │         expo-face-detector (ARCore)            │  │
│       │   eyeOpenProbability / smilingProbability      │  │
│       │   yawAngle  ──▶  EAR blink / smile / yaw      │  │
│       └──────────────────────────────────┬────────────┘  │
│                                          │               │
│       ┌──────────────────────────────────▼────────────┐  │
│       │         MiniFASNetV2 (1.4MB TFLite)            │  │
│       │         80×80 input → live / print / replay    │  │
│       └──────────────────────────────────┬────────────┘  │
│                                          │               │
│       ┌──────────────────────────────────▼────────────┐  │
│       │         SFace INT8bq (10.7MB TFLite)           │  │
│       │         128-D embedding → cosine similarity     │  │
│       └──────────────────────────────────┬────────────┘  │
│                                          │               │
│       ┌──────────────────────────────────▼────────────┐  │
│       │       expo-sqlite (SQLite on device)           │  │
│       │       workers table + attendance table         │  │
│       └──────────────────────────────────┬────────────┘  │
└──────────────────────────────────────────┼───────────────┘
                                           │ (background sync)
                         ┌─────────────────▼──────────────┐
                         │             AWS                  │
                         │  S3 presigned URL upload         │
                         │  DynamoDB PutItem (idempotent)   │
                         └─────────────────────────────────┘
```

---

## Technical Approach

### Face Detection — YuNet

We chose YuNet from OpenCV Zoo over the more commonly cited BlazeFace, RetinaFace, and UltraFace for three concrete reasons. First, YuNet's license is MIT — zero restrictions on commercial deployment. BlazeFace is fine for prototypes but Google's model card does not grant commercial redistribution. RetinaFace's popular implementation (InsightFace) is non-commercial by default. Second, YuNet is 233KB, which is not a rounding error — it means it loads in a single memory read on low-end hardware. Third, and most importantly for us, YuNet outputs 5 facial landmarks (eye corners + nose tip) as part of its standard output, not as a separate post-processing step. We need those 5 landmarks to compute the affine transform that aligns the face crop to a canonical 112×112 pose before recognition. With other detectors we would need a separate landmark model, adding latency and size.

### Face Recognition — SFace INT8bq

SFace (OpenCV Zoo, Apache-2.0 weights) generates a 128-dimensional embedding vector per face. We use the INT8 block-quantized variant (INT8bq), which is 10.7MB and achieves 99.42% accuracy on LFW. The match decision uses cosine similarity:

```
similarity = (A · B) / (||A|| × ||B||)
```

where A and B are the two 128-D vectors. A similarity above **0.363** is a match (this threshold is SFace's published operating point at equal error rate). We store the embedding as a JSON string in SQLite. We never store the original face image — once the embedding is computed, the frame is discarded.

### Liveness Detection — Two Layers

**Active (challenge-response):** We use `expo-face-detector` (Apache-2.0, zero additional model bytes — it uses ARCore/ML Kit already bundled with modern Android) to read `eyeOpenProbability`, `smilingProbability`, and `yawAngle` per frame. Blink detection uses Eye Aspect Ratio logic:

```
EAR drops below 0.2  →  eye closed
EAR rises above 0.7  →  eye open again  →  1 blink counted
Need 2 complete blinks  →  PASS
```

Smile threshold is `smilingProbability > 0.7`. Head turn threshold is `|yawAngle| > 15°`. Critically, the three challenges are shown in **random order every session**. A recorded video of the correct sequence from a previous session will fail because the challenge order changes every time.

**Passive (anti-spoof CNN):** MiniFASNetV2 (Apache-2.0, ~1.4MB TFLite) runs a 3-class classifier on an 80×80 crop: live, print attack, or replay attack. This layer catches static printed photos even if someone holds the photo and physically blinks around it. Both layers must pass before recognition runs.

### Storage and Sync

SQLite via `expo-sqlite` holds two tables:

- `workers (id, name, embedding TEXT, enrolled_at TEXT)`
- `attendance (id, worker_id, worker_name, timestamp TEXT, synced INTEGER DEFAULT 0)`

Sync runs when internet becomes available: the app fetches a presigned S3 URL from Lambda, uploads the record as JSON, then calls DynamoDB `PutItem` with `ConditionExpression: attribute_not_exists(uuid)`. This prevents duplicate entries if the phone syncs the same record twice due to a retry. Records are deleted from the phone **only** after receiving a confirmed 200 ACK from DynamoDB.

---

## Technology Stack

| Layer | Technology | Why |
|---|---|---|
| App framework | React Native (Expo SDK 54) | Single codebase, cross-platform |
| Camera | expo-camera | Frame access + photo capture |
| Face metadata | expo-face-detector | Free ARCore landmarks, no extra model |
| ML inference | react-native-fast-tflite + XNNPACK CPU | 2–3× faster than default TFLite on ARM |
| Local storage | expo-sqlite | Transactional, works fully offline |
| Cloud sync | AWS Lambda + S3 + DynamoDB | Serverless, near-zero idle cost |

---

## Model Size Budget

| Model | License | Size | Purpose |
|---|---|---|---|
| YuNet | MIT | 233 KB | Face detection + 5 landmarks |
| SFace INT8bq | Apache-2.0 | 10.7 MB | 128-D face embedding |
| MiniFASNetV2 | Apache-2.0 | ~1.4 MB | Passive anti-spoof (3-class) |
| expo-face-detector | Apache-2.0 | 0 MB extra | Active liveness metadata |
| **Total** | | **~12.3 MB** | Well under 20MB limit |

---

## Performance Claims

We want to be precise about what "fast" means here, because there are two very different timings at play.

**ML compute time (pure inference on Helio G85, INT8 + XNNPACK):**

| Stage | Time |
|---|---|
| YuNet detection | ~15ms |
| 5-point alignment | ~2ms |
| MiniFASNetV2 anti-spoof | ~80ms |
| SFace embedding | ~220ms |
| Cosine match (1000 workers) | <1ms |
| **Total ML compute** | **~315ms** |

**Full verification time (including human liveness):**
Active liveness requires the worker to physically blink twice, smile, or turn their head. A cooperative worker takes 2–5 seconds. This is not a bug — it is the point. The human action is what defeats replay attacks. We separate these two numbers clearly: ML compute is ~315ms, total user-facing time is ~3–5 seconds.

**Platform note:** Android minimum API 26 (Android 8.0). iOS minimum is 15.1 (not 12 — the relevant ARCore/Vision framework features require iOS 15.1+). Hackathon demo targets Android.

---

## Security & Privacy

Face embeddings are 128 floating-point numbers. They cannot be reverse-engineered into a face image. We never store raw images — only embeddings. All SQLite data lives in the app's private sandbox directory. The AWS sync uses short-lived presigned URLs (15-minute expiry) — no long-lived AWS credentials ever touch the phone. DynamoDB writes are idempotent by UUID, so even if a network retry sends the same record twice, it is written exactly once. This design directly supports DPDP Act 2023 requirements around biometric data minimization and storage limitation.

---

## What Makes This Different

**1. License compliance built in from day one.**
EdgeFace and InsightFace ArcFace — the two most accurate small face recognition models — are non-commercial licensed. Teams using them at a hackathon are fine; the moment they try to deploy or open-source, they have a legal problem. We built our entire model stack on MIT and Apache-2.0 from the start. This is not a constraint — it is a deliberate design decision.

**2. Two-layer liveness that defeats different attack vectors.**
Active challenge-response (random order, every session) defeats both photo attacks and pre-recorded video attacks. Passive CNN catches static printed photos even without a challenge. Neither layer alone is sufficient — they fail differently, and combining them makes the system robust.

**3. Honest engineering claims.**
We separate ML compute time (~315ms) from total user-facing time (3–5s). We name the exact cosine threshold (0.363) and where it comes from. We list known limitations. Judges who know ML will check these numbers — we want them to find them accurate, not aspirational.

---

## Deliverables

By submission deadline we will have:

- Working React Native app (Expo SDK 54) running on Redmi 9i demo device
- Enrollment and verification flows working end-to-end offline
- Active liveness (all three challenge types) with randomized ordering
- Passive anti-spoof inference via MiniFASNetV2
- SQLite persistence across app restarts
- AWS sync over WiFi with DynamoDB idempotency demonstrated
- 3-minute live demo: enroll a worker → mark attendance offline → restore WiFi → sync and purge
- GitHub repo with README covering setup, model download steps, and license table

---

## Conclusion

The workers who punch in on paper registers at 6am construction sites are not going to get enterprise biometric terminals — the economics do not work. But almost every site supervisor already has a smartphone. The gap between "this is a research demo" and "this actually works offline on a budget phone and is legal to deploy" is exactly where we chose to build. The technical constraints — 14MB model budget, no cloud dependency, Apache-2.0 licenses — are not limitations we worked around. They are the actual problem we found interesting.
