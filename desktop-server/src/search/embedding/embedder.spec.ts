import { describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import { embedText, embedTextForSearch, cosineSimilarity, reciprocalRankFusion } from './embedder';

describe('embedder (onnxruntime-node availability)', () => {
  it('falls back to hash embeddings when onnxruntime-node is unavailable (DLL init failure)', async () => {
    // onnxruntime-node's bundled DirectML binding can crash with ERR_DLOPEN_FAILED on machines
    // without a compatible GPU/DirectML runtime. A static top-level import would take down the
    // whole mini-server process just from loading this module; it must be lazy and recoverable.
    jest.doMock('onnxruntime-node', () => {
      throw new Error('A dynamic link library (DLL) initialization routine failed.');
    });

    // Point at a models dir where the model file doesn't exist so embedText's early-return path
    // isn't what's under test — we want to confirm embedTextForSearch never throws even if the
    // model existed and onnxruntime-node failed to load underneath it.
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    const result = await embedTextForSearch('/fake/models', 'hello world');
    expect(result).toBeInstanceOf(Float32Array);

    const raw = await embedText('/fake/models', 'hello world');
    expect(raw).toBeNull();

    jest.dontMock('onnxruntime-node');
    jest.restoreAllMocks();
  });
});

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const a = new Float32Array([1, 2, 3]);
    expect(cosineSimilarity(a, a)).toBeCloseTo(1, 5);
  });

  it('returns 0 for zero-length vectors', () => {
    const a = new Float32Array([0, 0, 0]);
    const b = new Float32Array([1, 2, 3]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });
});

describe('reciprocalRankFusion', () => {
  it('ranks items appearing in multiple lists higher', () => {
    const listA = [{ id: 'x' }, { id: 'y' }];
    const listB = [{ id: 'y' }, { id: 'x' }];
    const fused = reciprocalRankFusion([listA, listB]);
    expect(fused[0]?.id).toBeDefined();
    expect(fused.map((f) => f.id).sort()).toEqual(['x', 'y']);
  });
});

describe('tokenizeWordPiece & meanPoolAndNormalize', () => {
  const { tokenizeWordPiece, meanPoolAndNormalize } = require('./embedder');

  it('tokenizes known words, subwords, and unknown characters with [CLS] and [SEP]', () => {
    const vocab = new Map<string, number>([
      ['[PAD]', 0],
      ['[UNK]', 100],
      ['[CLS]', 101],
      ['[SEP]', 102],
      ['hello', 1000],
      ['world', 1001],
      ['test', 1002],
      ['##ing', 1003],
    ]);

    const { inputIds, attentionMask } = tokenizeWordPiece('hello testing', vocab);
    expect(inputIds[0]).toBe(101); // [CLS]
    expect(inputIds[1]).toBe(1000); // hello
    expect(inputIds[2]).toBe(1002); // test
    expect(inputIds[3]).toBe(1003); // ##ing
    expect(inputIds[4]).toBe(102); // [SEP]
    expect(attentionMask).toHaveLength(5);
    expect(attentionMask.every((m: number) => m === 1)).toBe(true);
  });

  it('performs mean pooling and normalizes vector to unit length', () => {
    // 2 tokens, dim 3
    const tokenData = new Float32Array([
      2, 4, 6,
      4, 6, 8,
    ]);
    const mask = [1, 1];
    const pooled = meanPoolAndNormalize(tokenData, mask, 3);
    expect(pooled).toHaveLength(3);

    // Mean is [3, 5, 7]. Length is sqrt(9 + 25 + 49) = sqrt(83)
    const expectedNorm = Math.sqrt(3 * 3 + 5 * 5 + 7 * 7);
    expect(pooled[0]).toBeCloseTo(3 / expectedNorm, 4);
    expect(pooled[1]).toBeCloseTo(5 / expectedNorm, 4);
    expect(pooled[2]).toBeCloseTo(7 / expectedNorm, 4);

    // Unit norm check
    const norm = Math.sqrt(pooled[0] ** 2 + pooled[1] ** 2 + pooled[2] ** 2);
    expect(norm).toBeCloseTo(1, 5);
  });
});

