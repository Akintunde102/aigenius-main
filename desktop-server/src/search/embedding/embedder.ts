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

type VocabMap = Map<string, number>;
let cachedVocab: { dir: string; vocab: VocabMap } | null = null;
let vocabNoticeLogged = false;

export function loadVocab(modelsDir: string): VocabMap | null {
  if (cachedVocab && cachedVocab.dir === modelsDir) return cachedVocab.vocab;
  const vocabPath = path.join(modelsDir, 'vocab.txt');

  try {
    if (!fs.existsSync(vocabPath)) return null;
    const raw = fs.readFileSync(vocabPath, 'utf8');
    const lines = raw.split(/\r?\n/);
    const vocab = new Map<string, number>();
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (line) vocab.set(line, i);
    }
    cachedVocab = { dir: modelsDir, vocab };
    return vocab;
  } catch {
    return null;
  }
}

/**
 * Standard WordPiece tokenization for Bert / MiniLM.
 * [CLS] = 101, [SEP] = 102, [UNK] = 100.
 */
export function tokenizeWordPiece(
  text: string,
  vocab: VocabMap,
  maxTokens = 128,
): { inputIds: number[]; attentionMask: number[] } {
  const clsId = vocab.get('[CLS]') ?? 101;
  const sepId = vocab.get('[SEP]') ?? 102;
  const unkId = vocab.get('[UNK]') ?? 100;

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' $& ')
    .split(/\s+/)
    .filter(Boolean);

  const tokens: number[] = [clsId];

  for (const word of words) {
    if (tokens.length >= maxTokens - 1) break;

    if (vocab.has(word)) {
      tokens.push(vocab.get(word)!);
      continue;
    }

    let isBad = false;
    let start = 0;
    const subTokens: number[] = [];
    while (start < word.length) {
      let end = word.length;
      let curSubStrId: number | null = null;

      while (start < end) {
        let substr = word.slice(start, end);
        if (start > 0) substr = `##${substr}`;
        if (vocab.has(substr)) {
          curSubStrId = vocab.get(substr)!;
          break;
        }
        end--;
      }

      if (curSubStrId === null) {
        isBad = true;
        break;
      }

      subTokens.push(curSubStrId);
      start = end;
    }

    if (isBad) {
      tokens.push(unkId);
    } else {
      for (const st of subTokens) {
        if (tokens.length >= maxTokens - 1) break;
        tokens.push(st);
      }
    }
  }

  tokens.push(sepId);

  const inputIds = tokens.slice(0, maxTokens);
  const attentionMask = inputIds.map(() => 1);

  return { inputIds, attentionMask };
}

/**
 * Mean pooling across token representations where attention_mask is 1,
 * followed by L2 unit normalization.
 */
export function meanPoolAndNormalize(
  data: Float32Array,
  attentionMask: number[],
  dim = EMBED_DIM,
): Float32Array {
  const seqLen = attentionMask.length;
  const out = new Float32Array(dim);
  let maskSum = 0;

  for (let t = 0; t < seqLen; t++) {
    if (attentionMask[t] === 1) {
      maskSum++;
      const offset = t * dim;
      for (let d = 0; d < dim; d++) {
        out[d] += data[offset + d] ?? 0;
      }
    }
  }

  if (maskSum > 0) {
    for (let d = 0; d < dim; d++) {
      out[d] /= maskSum;
    }
  }

  let norm = 0;
  for (let d = 0; d < dim; d++) norm += out[d] * out[d];
  norm = Math.sqrt(norm) || 1;
  for (let d = 0; d < dim; d++) out[d] /= norm;

  return out;
}

export async function embedText(modelsDir: string, text: string): Promise<Float32Array | null> {
  if (!isEmbeddingAvailable(modelsDir)) return null;

  const vocab = loadVocab(modelsDir);
  if (!vocab) {
    if (!vocabNoticeLogged) {
      vocabNoticeLogged = true;
      console.info(
        `[embedding] ONNX model found at ${embeddingModelPath(modelsDir)}, but no vocab.txt in ${modelsDir} — hybrid search uses deterministic hash embeddings.`,
      );
    }
    return null;
  }

  try {
    const ort = await loadOrt();
    if (!ort) return null;
    const session = await loadSession(modelsDir);

    const { inputIds, attentionMask } = tokenizeWordPiece(text, vocab, 128);

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
    if (inputNames.includes('token_type_ids')) {
      feeds.token_type_ids = new ort.Tensor(
        'int64',
        new BigInt64Array(inputIds.length),
        [1, inputIds.length],
      );
    }

    const outputs = await session.run(feeds);
    const first = outputs[session.outputNames[0]!];
    if (!first || !(first.data instanceof Float32Array)) return null;

    const data = first.data as Float32Array;
    return meanPoolAndNormalize(data, attentionMask, EMBED_DIM);
  } catch (err) {
    if (!modelChecked) {
      modelChecked = true;
      console.warn('[embedding] ONNX embed failed (hybrid search falls back to hash embeddings):', err);
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
