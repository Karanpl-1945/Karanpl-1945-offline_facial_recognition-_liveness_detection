// faceMatch.js — Compare two face embeddings to check if same person
// An embedding is an array of 128 numbers produced by the SFace model
// We use cosine similarity: score close to 1.0 = same person

// THRESHOLD: if similarity >= this value, we say it's a match
// Lower = stricter (fewer false accepts, more false rejects)
// Higher = looser (more false accepts, fewer false rejects)
// 0.363 is the recommended value for SFace model
const MATCH_THRESHOLD = 0.363;

// Calculate cosine similarity between two 128-number arrays
// Returns a value between -1 and 1 (we expect 0.3 to 1.0 for faces)
export function cosineSimilarity(embeddingA, embeddingB) {
  if (!embeddingA || !embeddingB) return 0;
  if (embeddingA.length !== embeddingB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < embeddingA.length; i++) {
    dotProduct += embeddingA[i] * embeddingB[i];
    normA += embeddingA[i] * embeddingA[i];
    normB += embeddingB[i] * embeddingB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Check if two embeddings are the same person
export function isSamePerson(embeddingA, embeddingB) {
  const score = cosineSimilarity(embeddingA, embeddingB);
  return score >= MATCH_THRESHOLD;
}

// Find the best matching worker from a list of enrolled workers
// Returns: { worker, score } or null if no match found
// workers = array of { id, name, embedding } from storage.js
export function findBestMatch(probeEmbedding, enrolledWorkers) {
  if (!probeEmbedding || !enrolledWorkers || enrolledWorkers.length === 0) {
    return null;
  }

  let bestMatch = null;
  let bestScore = -1;

  for (const worker of enrolledWorkers) {
    if (!worker.embedding) continue;
    const score = cosineSimilarity(probeEmbedding, worker.embedding);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = worker;
    }
  }

  // Only return a match if score is above threshold
  if (bestScore >= MATCH_THRESHOLD) {
    return { worker: bestMatch, score: bestScore };
  }

  return null; // no match found
}

export { MATCH_THRESHOLD };
