import path from 'path';
import type Database from 'better-sqlite3';
import type { RagQueryResult } from '../db/queries.js';
import { ragQueryChunks } from '../db/queries-chunks.js';
import { cosineSimilarity, embedTextForSearch, reciprocalRankFusion } from './embedder.js';
import { blobToVector } from './hash-embedder.js';
import { countEmbeddings } from './chunk-embeddings.js';
import { DEFAULT_IGNORED_PATHS } from '../indexer/exemptions.js';

type HybridHit = {
  id: string;
  path: string;
  name: string;
  mtime: number;
  snippet: string;
  line_start: number;
  line_end: number;
  symbol_name: string | null;
  chunk_id: number;
  score: number;
};

function vectorSearchChunks(
  db: Database.Database,
  queryVec: Float32Array,
  topK: number,
  pathPrefix: string,
  extensions?: string[],
): HybridHit[] {
  const norm = pathPrefix ? path.normalize(pathPrefix) : '';
  const prefixFilter = norm ? 'AND fc.path LIKE ? || \'%\'' : '';
  const normalizedExtensions = Array.isArray(extensions)
    ? extensions.map((e) => e.toLowerCase().replace(/^\./, '').trim()).filter(Boolean)
    : undefined;
  const extensionFilter =
    Array.isArray(normalizedExtensions) && normalizedExtensions.length > 0
      ? `AND fi.extension IN (${normalizedExtensions.map(() => '?').join(',')})`
      : '';
  const exemptionFilter = DEFAULT_IGNORED_PATHS.map(() => 'fc.path NOT LIKE ?').join(' AND ');
  const exemptionClause = exemptionFilter ? `AND (${exemptionFilter})` : '';

  const stmt = db.prepare(`
    SELECT fc.id AS chunk_id, fc.path, fc.content, fc.line_start, fc.line_end, fc.symbol_name,
           fi.name, fi.mtime, ce.vector
    FROM file_chunks fc
    JOIN chunk_embeddings ce ON ce.chunk_id = fc.id
    JOIN file_index fi ON fc.path = fi.path
    WHERE 1=1 ${prefixFilter} ${extensionFilter} ${exemptionClause}
  `);

  const params: unknown[] = [];
  if (norm) params.push(norm);
  if (Array.isArray(normalizedExtensions) && normalizedExtensions.length > 0) {
    params.push(...normalizedExtensions);
  }
  DEFAULT_IGNORED_PATHS.forEach((p) => params.push(`%${path.sep}${p}${path.sep}%`));

  const rows = stmt.all(...params) as Array<{
    chunk_id: number;
    path: string;
    content: string;
    line_start: number;
    line_end: number;
    symbol_name: string | null;
    name: string;
    mtime: number;
    vector: Buffer;
  }>;

  const scored = rows.map((r) => {
    const vec = blobToVector(r.vector);
    const sim = cosineSimilarity(queryVec, vec);
    return {
      id: `chunk:${r.chunk_id}`,
      path: r.path,
      name: r.name,
      mtime: r.mtime,
      snippet: r.content.slice(0, 150),
      line_start: r.line_start,
      line_end: r.line_end,
      symbol_name: r.symbol_name,
      chunk_id: r.chunk_id,
      score: sim,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/**
 * Hybrid retrieval: FTS chunk search + vector similarity fused via RRF.
 */
export async function ragQueryHybrid(
  db: Database.Database,
  modelsDir: string,
  contentQuery = '',
  pathQuery = '',
  topK = 8,
  pathPrefix = '',
  extensions?: string[],
): Promise<RagQueryResult> {
  const embeddingCount = countEmbeddings(db);

  if (!contentQuery.trim() || embeddingCount === 0) {
    const { ragQuerySmart } = await import('../db/queries-chunks.js');
    return ragQuerySmart(db, contentQuery, pathQuery, topK, pathPrefix, extensions);
  }

  const ftsResult = ragQueryChunks(db, contentQuery, pathQuery, topK * 2, pathPrefix, extensions);
  const queryVec = await embedTextForSearch(modelsDir, contentQuery);
  if (!queryVec) {
    const { ragQuerySmart } = await import('../db/queries-chunks.js');
    return ragQuerySmart(db, contentQuery, pathQuery, topK, pathPrefix, extensions);
  }

  const vectorHits = vectorSearchChunks(db, queryVec, topK * 2, pathPrefix, extensions);

  const ftsList = ftsResult.hits.map((h, i) => ({
    id: `chunk:${(h as { chunk_id?: number }).chunk_id ?? i}`,
    path: h.path,
    name: h.name,
    mtime: h.mtime,
    snippet: h.snippet,
    line_start: (h as { line_start?: number }).line_start ?? 1,
    line_end: (h as { line_end?: number }).line_end ?? 1,
    symbol_name: (h as { symbol_name?: string | null }).symbol_name ?? null,
    chunk_id: (h as { chunk_id?: number }).chunk_id ?? i,
    score: h.score,
  }));

  const fused = reciprocalRankFusion([ftsList, vectorHits], 60).slice(0, topK);

  const statusRow = db.prepare<[], { last: number | null }>('SELECT MAX(mtime) AS last FROM file_index').get();
  const chunkTotal = db.prepare<[], { cnt: number }>('SELECT COUNT(*) AS cnt FROM file_chunks').get()?.cnt ?? 0;

  return {
    hits: fused.map((h) => ({
      path: h.path,
      name: h.name,
      score: h.rrfScore,
      snippet: h.snippet,
      mtime: h.mtime,
      line_start: h.line_start,
      line_end: h.line_end,
      symbol_name: h.symbol_name,
      chunk_id: h.chunk_id,
      hybrid: true,
    })),
    hit_count: fused.length,
    scanned_chunks: chunkTotal,
    index_updated_at_ms: statusRow?.last ?? 0,
  };
}
