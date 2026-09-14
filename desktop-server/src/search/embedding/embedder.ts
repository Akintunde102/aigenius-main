/**
 * Local ONNX text embeddings for hybrid search.
 * Model: all-MiniLM-L6-v2.onnx (place in models/ — optional).
 */
import fs from 'fs';
import path from 'path';
import type * as OrtTypes from 'onnxruntime-node';
import { hashEmbedText, HASH_EMBED_DIM } from './hash-embedder.js';

const EMBED_DIM = HASH_EMBED_DIM;
let cachedSession: OrtTypes.InferenceSession | null = null;
let modelChecked = false;

/**
 * `onnxruntime-node`'s bundled DirectML binding calls dlopen() as soon as the module is
 * evaluated — even before InferenceSession.create() runs. On machines where the DirectML/D3D12
 * device probing in its DllMain fails (no compatible GPU, remote desktop session, outdated GPU
 * driver), that dlopen crashes the *entire* process with ERR_DLOPEN_FAILED, taking down the
 * mini-server even though embeddings are a purely optional feature (falls back to hash
 * embeddings below). A static top-level import would make that unrecoverable; load it lazily
 * and behind a try/catch instead.
 */
let ortModule: typeof OrtTypes | null | undefined;

async function loadOrt(): Promise<typeof OrtTypes | null> {
  if (ortModule !== undefined) return ortModule;
  try {
    ortModule = await import('onnxruntime-node');
  } catch (err) {
    console.warn('[embedding] onnxruntime-node unavailable — hybrid search falls back to hash embeddings:', err);
    ortModule = null;
  }
  return ortModule;
}

export function embeddingModelPath(modelsDir: string): string {
  return path.join(modelsDir, 'all-MiniLM-L6-v2.onnx');
}

export function isEmbeddingAvailable(modelsDir: string): boolean {
  return fs.existsSync(embeddingModelPath(modelsDir));
}

async function loadSession(modelsDir: string): Promise<OrtTypes.InferenceSession> {
  if (cachedSession) return cachedSession;
  const modelPath = embeddingModelPath(modelsDir);
  if (!fs.existsSync(modelPath)) {
    throw new Error(`Embedding model not found at ${modelPath}`);
  }
  const ort = await loadOrt();
  if (!ort) {
    throw new Error('onnxruntime-node unavailable');
  }
  cachedSession = await ort.InferenceSession.create(modelPath, {
    executionProviders: ['cpu'],
  });
  return cachedSession;
}

/** Simple whitespace tokenization + mean pooling placeholder until full tokenizer is bundled. */
function tokenizeSimple(text: string, maxTokens = 128): number[] {
  const words = text.toLowerCase().split(/\W+/).filter(Boolean).slice(0, maxTokens);
  const ids: number[] = [];
  for (const w of words) {
    let h = 0;
    for (let i = 0; i < w.length; i++) h = (h * 31 + w.charCodeAt(i)) >>> 0;
    ids.push((h % 30_000) + 1);
  }
  if (ids.length === 0) ids.push(1);
  return ids;
}

export async function embedText(modelsDir: string, text: string): Promise<Float32Array | null> {
  if (!isEmbeddingAvailable(modelsDir)) return null;
  try {
    const ort = await loadOrt();
    if (!ort) return null;
    const session = await loadSession(modelsDir);
    const inputIds = tokenizeSimple(text);
    const attentionMask = inputIds.map(() => 1);
    const inputTensor = new ort.Tensor(
      'int64',
      BigInt64Array.from(inputIds.map(BigInt)),
      [1, inputIds.length],
    );
    const maskTensor = new ort.Tensor(
      'int64',
      BigInt64Array.from(attentionMask.map(BigInt)),
      [1, attentionMask.length],
    );
    const inputNames = session.inputNames;
    const feeds: Record<string, OrtTypes.Tensor> = {};
    if (inputNames.includes('input_ids')) feeds.input_ids = inputTensor;
    if (inputNames.includes('attention_mask')) feeds.attention_mask = maskTensor;
    const outputs = await session.run(feeds);
    const first = outputs[session.outputNames[0]!];
    if (!first || !(first.data instanceof Float32Array)) return null;
    const data = first.data as Float32Array;
    if (data.length === EMBED_DIM) return data;
    const out = new Float32Array(EMBED_DIM);
    const step = Math.max(1, Math.floor(data.length / EMBED_DIM));
    for (let i = 0; i < EMBED_DIM; i++) out[i] = data[i * step] ?? 0;
    return out;
  } catch (err) {
    if (!modelChecked) {
      modelChecked = true;
      console.warn('[embedding] ONNX embed failed (hybrid search disabled):', err);
    }
    return null;
  }
}

/** ONNX when model present; otherwise deterministic hash embedding (always returns a vector). */
export async function embedTextForSearch(modelsDir: string, text: string): Promise<Float32Array> {
  const trimmed = text.trim();
  if (!trimmed) return hashEmbedText(' ');
  const onnx = await embedText(modelsDir, trimmed);
  return onnx ?? hashEmbedText(trimmed);
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}

/** Reciprocal rank fusion for two ranked lists. */
export function reciprocalRankFusion<T extends { id: string }>(
  lists: Array<Array<T & { score?: number }>>,
  k = 60,
): Array<T & { rrfScore: number }> {
  const scores = new Map<string, number>();
  const items = new Map<string, T>();
  for (const list of lists) {
    list.forEach((item, rank) => {
      scores.set(item.id, (scores.get(item.id) ?? 0) + 1 / (k + rank + 1));
      items.set(item.id, item);
    });
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, rrfScore]) => ({ ...items.get(id)!, rrfScore }));
}
