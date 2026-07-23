/** Phase 1 = searchable text; phase 2 = symbols, chunks, graph (embeddings deferred). */
export type IndexPhase = 'text' | 'structure';

export function normalizeIndexPhase(phase?: IndexPhase | null): IndexPhase {
  return phase === 'structure' ? 'structure' : 'text';
}
