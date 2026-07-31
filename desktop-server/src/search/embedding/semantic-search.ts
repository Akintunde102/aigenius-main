/**
 * Paginated semantic retrieval with dynamic similarity cutoff (no global hard cap).
 */

export type ScoredHit<T> = T & { score: number };

export type PaginatedSemanticResult<T> = {
  hits: T[];
  page: number;
  page_size: number;
  has_more: boolean;
  cutoff_score: number | null;
  relevant_total: number;
};

export type SimilarityCutoffOptions = {
  /** Keep hits with score >= bestScore * ratio (default 0.72). */
  minRelativeToBest?: number;
  /** Stop when score drops by more than this vs previous hit (default 0.12). */
  maxConsecutiveDrop?: number;
  /** Absolute floor — never return below this similarity (default 0.25). */
  minAbsoluteScore?: number;
};

const DEFAULT_CUTOFF: Required<SimilarityCutoffOptions> = {
  minRelativeToBest: 0.72,
  maxConsecutiveDrop: 0.12,
  minAbsoluteScore: 0.25,
};

/** Apply dynamic cutoff — returns all hits that still "make sense", ordered by score desc. */
export function filterBySimilarityCutoff<T>(
  scored: ScoredHit<T>[],
  options: SimilarityCutoffOptions = {},
): ScoredHit<T>[] {
  if (scored.length === 0) return [];
  const opts = { ...DEFAULT_CUTOFF, ...options };
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const best = sorted[0]!.score;
  const minScore = Math.max(opts.minAbsoluteScore, best * opts.minRelativeToBest);

  const kept: ScoredHit<T>[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const hit = sorted[i]!;
    if (hit.score < minScore) break;
    if (i > 0) {
      const drop = kept[kept.length - 1]!.score - hit.score;
      if (drop > opts.maxConsecutiveDrop) break;
    }
    kept.push(hit);
  }
  return kept;
}

/** Page into relevance-filtered hits. */
export function paginateSemanticHits<T>(
  scored: ScoredHit<T>[],
  page: number,
  pageSize: number,
  cutoffOptions?: SimilarityCutoffOptions,
): PaginatedSemanticResult<T> {
  const safePage = Math.max(0, page);
  const safeSize = Math.max(1, pageSize);
  const relevant = filterBySimilarityCutoff(scored, cutoffOptions);
  const start = safePage * safeSize;
  const end = start + safeSize;
  const pageHits = relevant.slice(start, end).map(({ score: _s, ...rest }) => rest as T);

  return {
    hits: pageHits,
    page: safePage,
    page_size: safeSize,
    has_more: end < relevant.length,
    cutoff_score: relevant[0]?.score ?? null,
    relevant_total: relevant.length,
  };
}
