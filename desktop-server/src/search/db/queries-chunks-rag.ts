import path from 'path';
import type Database from 'better-sqlite3';
import type { ParsedImport, ParsedSymbol } from '../indexer/symbol-parser.js';
import { parseImports } from '../indexer/symbol-parser.js';
import { buildFileChunksFromSymbols, type FileChunk } from '../indexer/chunk-indexer.js';
import { resolveImports } from '../indexer/import-resolver.js';
import { deleteImportsForFile, upsertImports } from './queries-import-graph.js';
import { cleanFtsTerm, ragQuery, type RagHit, type RagQueryResult } from './queries.js';
import { DEFAULT_IGNORED_PATHS } from '../indexer/exemptions.js';
import { indexFileIntelligenceFast } from '../indexer/intelligence-router.js';
import { indexTypeScriptDeepEdges, isTypeScriptExtension } from '../indexer/ts-morph-indexer.js';
import { shouldSkipDeepGraphIndexing } from '../indexer/exemptions.js';
import type { GraphStatus } from '../graph-status.js';
import { detectBoundaries } from '../indexer/boundaries.js';
import { isMakefile } from '../indexer/makefile-indexer.js';
import type { FileIntelligence, IndexedEdge, IndexedSymbol } from '../indexer/language-indexer.js';
import { languageForExtension } from '../indexer/language-indexer.js';
import { makeQualifiedName, signatureHash } from '../graph/graph-types.js';
import { buildStructuralDigest } from './queries-graph.js';
import { detachInboundEdgesBeforeReindex } from '../indexer/stale-edge-sweep.js';
import { countChunks, type SymbolRow } from './queries-chunks-structure.js';

export type ChunkRagHit = RagHit & {
  line_start: number;
  line_end: number;
  symbol_name: string | null;
  chunk_id: number;
};

function chunkCountOrFileCount(db: Database.Database): number {
  const chunkCnt = countChunks(db);
  if (chunkCnt > 0) return chunkCnt;
  const row = db.prepare<[], { cnt: number }>('SELECT COUNT(*) AS cnt FROM file_index').get();
  return row?.cnt ?? 0;
}

/**
 * FTS5 search over symbol-bounded chunks. Falls back to file-level hits when no chunks indexed.
 */
export function ragQueryChunks(
  db: Database.Database,
  contentQuery = '',
  pathQuery = '',
  topK = 8,
  pathPrefix = '',
  extensions?: string[],
): RagQueryResult {
  const chunkTotal = countChunks(db);
  if (chunkTotal === 0) {
    return { hits: [], hit_count: 0, scanned_chunks: 0, index_updated_at_ms: 0, hint: 'No chunks indexed yet.' };
  }

  const norm = pathPrefix ? path.normalize(pathPrefix) : '';
  const normalizedExtensions = Array.isArray(extensions)
    ? extensions.map((e) => e.toLowerCase().replace(/^\./, '').trim()).filter(Boolean)
    : undefined;

  const prefixFilter = norm ? 'AND fc.path LIKE ? || \'%\'' : '';
  const extensionFilter =
    Array.isArray(normalizedExtensions) && normalizedExtensions.length > 0
      ? `AND fi.extension IN (${normalizedExtensions.map(() => '?').join(',')})`
      : '';
  const exemptionFilter = DEFAULT_IGNORED_PATHS.map(() => 'fc.path NOT LIKE ?').join(' AND ');
  const exemptionClause = exemptionFilter ? `AND (${exemptionFilter})` : '';

  const safeContentQuery = contentQuery ? cleanFtsTerm(contentQuery) : '';
  let rows: Array<{
    path: string;
    name: string;
    mtime: number;
    score: number;
    excerpt: string;
    line_start: number;
    line_end: number;
    symbol_name: string | null;
    chunk_id: number;
  }> = [];

  if (safeContentQuery) {
    const ftsMatch = `content:(${safeContentQuery})`;
    const stmt = db.prepare(`
      SELECT
        fc.path,
        fi.name,
        fi.mtime,
        -rank AS score,
        SUBSTR(fc.content, 1, 150) AS excerpt,
        fc.line_start,
        fc.line_end,
        fc.symbol_name,
        fc.id AS chunk_id
      FROM chunk_search
      JOIN file_chunks fc ON chunk_search.rowid = fc.id
      JOIN file_index fi ON fc.path = fi.path
      WHERE chunk_search MATCH ?
      ${prefixFilter}
      ${extensionFilter}
      ${exemptionClause}
      ORDER BY rank
      LIMIT ?
    `);
    const params: unknown[] = [ftsMatch];
    if (norm) params.push(norm);
    if (Array.isArray(normalizedExtensions) && normalizedExtensions.length > 0) {
      params.push(...normalizedExtensions);
    }
    DEFAULT_IGNORED_PATHS.forEach((p) => params.push(`%${path.sep}${p}${path.sep}%`));
    params.push(topK);
    rows = stmt.all(...params) as typeof rows;
  } else if (pathQuery) {
    const stmt = db.prepare(`
      SELECT
        fc.path,
        fi.name,
        fi.mtime,
        0 AS score,
        SUBSTR(fc.content, 1, 150) AS excerpt,
        fc.line_start,
        fc.line_end,
        fc.symbol_name,
        fc.id AS chunk_id
      FROM file_chunks fc
      JOIN file_index fi ON fc.path = fi.path
      WHERE LOWER(REPLACE(fc.path, CHAR(92), '/')) LIKE ?
      ${prefixFilter}
      ${extensionFilter}
      ${exemptionClause}
      ORDER BY fi.mtime DESC
      LIMIT ?
    `);
    const params: unknown[] = [`%${pathQuery.toLowerCase().replace(/\\/g, '/')}%`];
    if (norm) params.push(norm);
    if (Array.isArray(normalizedExtensions) && normalizedExtensions.length > 0) {
      params.push(...normalizedExtensions);
    }
    DEFAULT_IGNORED_PATHS.forEach((p) => params.push(`%${path.sep}${p}${path.sep}%`));
    params.push(topK);
    rows = stmt.all(...params) as typeof rows;
  }

  const statusRow = db.prepare<[], { last: number | null }>('SELECT MAX(mtime) AS last FROM file_index').get();

  return {
    hits: rows.map((r) => ({
      path: r.path,
      name: r.name,
      score: r.score,
      snippet: r.excerpt,
      mtime: r.mtime,
      line_start: r.line_start,
      line_end: r.line_end,
      symbol_name: r.symbol_name,
      chunk_id: r.chunk_id,
    })),
    hit_count: rows.length,
    scanned_chunks: chunkTotal,
    index_updated_at_ms: statusRow?.last ?? 0,
  };
}

/** Prefer chunk-level FTS; merge with file-level when chunk hits are sparse. */
export function ragQuerySmart(
  db: Database.Database,
  contentQuery = '',
  pathQuery = '',
  topK = 8,
  pathPrefix = '',
  extensions?: string[],
): RagQueryResult {
  const chunkTotal = countChunks(db);

  if (chunkTotal > 0 && (contentQuery || pathQuery)) {
    const chunkResult = ragQueryChunks(db, contentQuery, pathQuery, topK, pathPrefix, extensions);
    if (chunkResult.hit_count > 0) {
      return { ...chunkResult, scanned_chunks: chunkTotal };
    }
  }

  const fileResult = ragQuery(db, contentQuery, pathQuery, topK, pathPrefix, extensions);
  return {
    ...fileResult,
    scanned_chunks: chunkCountOrFileCount(db),
  };
}

export function formatSymbolOutline(path: string, symbols: SymbolRow[]): string {
  const lines = [`# ${path}`, ''];
  if (!symbols.length) {
    lines.push('_No symbols indexed for this file._');
    return lines.join('\n');
  }
  for (const s of symbols) {
    if (s.kind === 'import') {
      lines.push(`- import **${s.name}** @ line ${s.line_start} (${s.signature})`);
    } else {
      lines.push(`- ${s.kind} **${s.name}** @ lines ${s.line_start}–${s.line_end}`);
    }
  }
  return lines.join('\n');
}

/** Summarize indexed project structure for retrieval memory / prompt context. */
export function buildProjectArchitecture(
  db: Database.Database,
  rootPath: string,
  projectName: string,
): string {
  return buildStructuralDigest(db, rootPath, projectName);
}

export type { ParsedSymbol, ParsedImport, FileChunk };

