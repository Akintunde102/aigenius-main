/** Deterministic 384-dim embedding without ONNX (enables hybrid search out of the box). */
export const HASH_EMBED_DIM = 384;

export function hashEmbedText(text: string): Float32Array {
  const vec = new Float32Array(HASH_EMBED_DIM);
  const tokens = text.toLowerCase().split(/\W+/).filter((t) => t.length > 1);
  for (const tok of tokens) {
    let h = 2166136261;
    for (let i = 0; i < tok.length; i++) {
      h ^= tok.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const idx = Math.abs(h) % HASH_EMBED_DIM;
    const sign = (h & 1) === 0 ? 1 : -1;
    vec[idx]! += sign;
  }
  let norm = 0;
  for (let i = 0; i < HASH_EMBED_DIM; i++) norm += vec[i]! * vec[i]!;
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < HASH_EMBED_DIM; i++) vec[i]! /= norm;
  return vec;
}

export function vectorToBlob(vec: Float32Array): Buffer {
  return Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
}

export function blobToVector(blob: Buffer): Float32Array {
  const copy = new Float32Array(blob.byteLength / 4);
  for (let i = 0; i < copy.length; i++) {
    copy[i] = blob.readFloatLE(i * 4);
  }
  return copy;
}
