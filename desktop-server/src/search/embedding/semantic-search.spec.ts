import { describe, expect, it } from 'vitest';
import { filterBySimilarityCutoff, paginateSemanticHits } from './semantic-search.js';

describe('semantic-search pagination', () => {
  it('filters by dynamic similarity cutoff', () => {
    const scored = [
      { id: 'a', score: 0.9 },
      { id: 'b', score: 0.82 },
      { id: 'c', score: 0.4 },
    ];
    const kept = filterBySimilarityCutoff(scored);
    expect(kept.map((h) => h.id)).toEqual(['a', 'b']);
  });

  it('paginates without a global hard cap', () => {
    const scored = Array.from({ length: 30 }, (_, i) => ({
      id: `hit-${i}`,
      score: 0.9 - i * 0.01,
    }));
    const page0 = paginateSemanticHits(scored, 0, 8);
    expect(page0.hits).toHaveLength(8);
    expect(page0.has_more).toBe(true);
    expect(page0.relevant_total).toBeGreaterThan(8);

    const lastPage = Math.floor((page0.relevant_total - 1) / 8);
    const pageN = paginateSemanticHits(scored, lastPage, 8);
    expect(pageN.has_more).toBe(false);
  });
});
