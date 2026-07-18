import { describe, expect, it } from '@jest/globals';
import { hashEmbedText, blobToVector, vectorToBlob } from './hash-embedder';
import { cosineSimilarity, reciprocalRankFusion } from './embedder';

describe('hashEmbedText', () => {
  it('returns normalized 384-dim vector', () => {
    const v = hashEmbedText('hello world');
    expect(v.length).toBe(384);
    let norm = 0;
    for (let i = 0; i < v.length; i++) norm += v[i]! * v[i]!;
    expect(norm).toBeCloseTo(1, 5);
  });

  it('round-trips through blob storage', () => {
    const v = hashEmbedText('function foo() {}');
    const restored = blobToVector(vectorToBlob(v));
    expect(cosineSimilarity(v, restored)).toBeCloseTo(1, 5);
  });
});

describe('reciprocalRankFusion', () => {
  it('merges two ranked lists', () => {
    const a = [{ id: 'x', path: '/a' }, { id: 'y', path: '/b' }];
    const b = [{ id: 'y', path: '/b' }, { id: 'z', path: '/c' }];
    const fused = reciprocalRankFusion([a, b]);
    expect(fused[0]?.id).toBe('y');
  });
});
