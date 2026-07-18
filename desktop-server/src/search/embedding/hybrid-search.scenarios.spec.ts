import { describe, expect, it } from '@jest/globals';
import { reciprocalRankFusion, cosineSimilarity } from './embedder';
import { hashEmbedText } from './hash-embedder';

/**
 * Pure-logic scenarios for hybrid ranking (no SQLite).
 * DB-integrated hybrid paths live in code-intelligence.scenarios.spec.ts.
 */
describe('hybrid search scenarios (RRF + hash embeddings)', () => {
  it('Scenario H1 — chunk appearing in both FTS and vector lists wins RRF', () => {
    const fts = [
      { id: 'chunk:1', path: '/p/a.ts', name: 'a.ts', score: 1 },
      { id: 'chunk:2', path: '/p/b.ts', name: 'b.ts', score: 0.5 },
    ];
    const vec = [
      { id: 'chunk:2', path: '/p/b.ts', name: 'b.ts', score: 0.99 },
      { id: 'chunk:3', path: '/p/c.ts', name: 'c.ts', score: 0.8 },
    ];
    const fused = reciprocalRankFusion([fts, vec], 60);
    expect(fused[0]?.id).toBe('chunk:2');
    expect(fused.map((f) => ({ id: f.id, rrf: Number(f.rrfScore.toFixed(6)) }))).toMatchSnapshot();
  });

  it('Scenario H2 — semantically similar chunks score higher than unrelated text', () => {
    const auth = hashEmbedText('export function validateToken(jwt: string) { return true; }');
    const session = hashEmbedText('export function refreshSession(userId: string) { return token; }');
    const unrelated = hashEmbedText('const recipe = { flour: 2, sugar: 1 };');
    expect(cosineSimilarity(auth, session)).toBeGreaterThan(cosineSimilarity(auth, unrelated));
    expect({
      auth_vs_session: Number(cosineSimilarity(auth, session).toFixed(4)),
      auth_vs_recipe: Number(cosineSimilarity(auth, unrelated).toFixed(4)),
    }).toMatchSnapshot();
  });

  it('Scenario H3 — identical text yields cosine similarity 1', () => {
    const text = 'class UserService { run() {} }';
    const a = hashEmbedText(text);
    const b = hashEmbedText(text);
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });
});
