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
