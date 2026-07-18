import fs from 'fs';
import path from 'path';
import type Database from 'better-sqlite3';
import { listSymbolsForFile, searchSymbolsByName } from './queries-chunks.js';
import { ragQueryHybrid } from '../embedding/hybrid-search.js';
import { cleanFtsTerm, type RagHit } from './queries.js';

export type FileOverview = {
  path: string;
  language: string | null;
  indexStatus: string | null;
  lastIndexed: number | null;
  isGenerated: boolean;
  symbols: Array<{
    kind: string;
    name: string;
    line: number;
    signature: string;
    confidence: string;
  }>;
  boundaries: Array<{
    line: number;
    type: string;
    label: string;
    confidence: string;
  }>;
};

export type SymbolDetail = {
  id: number;
  path: string;
  kind: string;
  name: string;
  line: number;
  signature: string;
  confidence: string;
  callers: EdgeRef[];
  callees: EdgeRef[];
  lastIndexed: number | null;
};

export type EdgeRef = {
  name: string;
  path: string;
  line: number | null;
  kind: string;
  confidence: string;
};

export type ContextResult = {
  query: string;
  type: 'file' | 'symbol' | 'keyword_match' | 'semantic_match' | 'not_found';
  overview?: FileOverview;
  source?: string;
  matches?: SymbolDetail[] | KeywordMatch[];
  note?: string;
  indexUpdatedAtMs?: number;
};

export type KeywordMatch = {
  path: string;
  name: string;
  kind: string;
  line: number;
  signature: string;
  score: number;
};

const MAX_CALLERS = 15;
const MAX_CALLEES = 15;
const MAX_KEYWORD = 5;
const MAX_SEMANTIC = 5;

function fileExists(input: string): boolean {
  try {
    return fs.statSync(input).isFile();
  } catch {
    return false;
  }
}

function lastIndexedForPath(db: Database.Database, filePath: string): number | null {
  const row = db
    .prepare('SELECT last_indexed FROM file_index WHERE path = ?')
    .get(filePath) as { last_indexed: number | null } | undefined;
  return row?.last_indexed ?? null;
}

export function getFileOverview(db: Database.Database, filePath: string): FileOverview {
  const meta = db
    .prepare(
      `SELECT language, index_status, last_indexed, is_generated
       FROM file_index WHERE path = ?`,
    )
    .get(filePath) as
    | { language: string | null; index_status: string | null; last_indexed: number | null; is_generated: number }
    | undefined;

  const symbols = listSymbolsForFile(db, filePath)
    .filter((s) => s.kind !== 'import')
    .map((s) => ({
      kind: s.kind,
      name: s.name,
      line: s.line_start,
      signature: s.signature,
      confidence: s.confidence ?? 'high',
    }));

  const boundaries = (
    db
      .prepare(
        `SELECT line, boundary_type, label, confidence
         FROM symbol_boundaries WHERE file_path = ?
         ORDER BY line`,
      )
      .all(filePath) as Array<{ line: number; boundary_type: string; label: string; confidence: string }>
  ).map((b) => ({
    line: b.line,
    type: b.boundary_type,
    label: b.label,
    confidence: b.confidence,
  }));

  return {
    path: filePath,
    language: meta?.language ?? null,
    indexStatus: meta?.index_status ?? null,
    lastIndexed: meta?.last_indexed ?? null,
    isGenerated: Boolean(meta?.is_generated),
    symbols,
    boundaries,
  };
}

function getSymbolRow(
  db: Database.Database,
  filePath: string,
  name: string,
): { id: number; kind: string; name: string; line_start: number; signature: string; confidence: string } | null {
  const rows = db
    .prepare(
      `SELECT id, kind, name, line_start, signature, confidence
       FROM symbol_index WHERE path = ? AND name = ? AND kind != 'import'
       ORDER BY line_start LIMIT 1`,
    )
    .all(filePath, name) as Array<{
    id: number;
    kind: string;
    name: string;
    line_start: number;
    signature: string;
    confidence: string;
  }>;
  return rows[0] ?? null;
}

function edgesForSymbol(db: Database.Database, symbolId: number, direction: 'callers' | 'callees'): EdgeRef[] {
  if (direction === 'callers') {
    const rows = db
      .prepare(
        `SELECT e.kind, e.line, e.confidence, e.to_name,
                s.name AS from_name, s.path AS from_path
         FROM symbol_edges e
         JOIN symbol_index s ON e.from_symbol_id = s.id
         WHERE e.to_symbol_id = ?
            OR (e.to_name = (SELECT name FROM symbol_index WHERE id = ?) AND e.to_symbol_id IS NULL)
         ORDER BY s.path, e.line
         LIMIT ?`,
      )
      .all(symbolId, symbolId, MAX_CALLERS) as Array<{
      kind: string;
      line: number | null;
      confidence: string;
      from_name: string;
      from_path: string;
    }>;
    return rows.map((r) => ({
      name: r.from_name,
      path: r.from_path,
      line: r.line,
      kind: r.kind,
      confidence: r.confidence,
    }));
  }

  const rows = db
    .prepare(
      `SELECT e.kind, e.line, e.confidence, e.to_name, e.to_path,
              s.name AS from_name
       FROM symbol_edges e
       JOIN symbol_index s ON e.from_symbol_id = s.id
       WHERE e.from_symbol_id = ?
       ORDER BY e.kind, e.line
       LIMIT ?`,
    )
    .all(symbolId, MAX_CALLEES) as Array<{
    kind: string;
    line: number | null;
    confidence: string;
    to_name: string;
    to_path: string | null;
    from_name: string;
  }>;

  return rows.map((r) => ({
    name: r.to_name,
    path: r.to_path ?? '',
    line: r.line,
    kind: r.kind,
    confidence: r.confidence,
  }));
}

export function getSymbolDetail(
  db: Database.Database,
  filePath: string,
  name: string,
): SymbolDetail | null {
  const row = getSymbolRow(db, filePath, name);
  if (!row) return null;

  const totalCallers = (
    db.prepare('SELECT COUNT(*) AS c FROM symbol_edges WHERE to_symbol_id = ?').get(row.id) as { c: number }
  ).c;

  const callers = edgesForSymbol(db, row.id, 'callers');
  const callees = edgesForSymbol(db, row.id, 'callees');

  const detail: SymbolDetail = {
    id: row.id,
    path: filePath,
    kind: row.kind,
    name: row.name,
    line: row.line_start,
    signature: row.signature,
    confidence: row.confidence,
    callers,
    callees,
    lastIndexed: lastIndexedForPath(db, filePath),
  };

  if (totalCallers > MAX_CALLERS) {
    (detail as SymbolDetail & { callersNote?: string }).callersNote =
      `${totalCallers - MAX_CALLERS} more callers not shown`;
  }

  return detail;
}

export function findSymbolReferences(
  db: Database.Database,
  filePath: string,
  name: string,
  limit = MAX_CALLERS,
): { references: EdgeRef[]; total: number; note?: string } {
  const row = getSymbolRow(db, filePath, name);
  if (!row) return { references: [], total: 0 };

  const total = (
    db.prepare(
      `SELECT COUNT(*) AS c FROM symbol_edges e
       WHERE e.to_symbol_id = ? OR e.to_name = ?`,
    ).get(row.id, name) as { c: number }
  ).c;

  const refs = edgesForSymbol(db, row.id, 'callers').slice(0, limit);
  return {
    references: refs,
    total,
    note: total > limit ? `${total - limit} more references not shown` : undefined,
  };
}

export function traceCallChain(
  db: Database.Database,
  filePath: string,
  name: string,
  maxDepth = 4,
): { chain: string[]; truncated: boolean } {
  const chain: string[] = [];
  const visited = new Set<string>();
  let truncated = false;

  const walk = (fp: string, sym: string, depth: number): void => {
    const key = `${fp}:${sym}`;
    if (visited.has(key) || depth > maxDepth) {
      if (depth > maxDepth) truncated = true;
      return;
    }
    visited.add(key);
    chain.push(`${fp}:${sym}`);

    const detail = getSymbolDetail(db, fp, sym);
    if (!detail) return;
    for (const callee of detail.callees.slice(0, 5)) {
      if (callee.path) walk(callee.path, callee.name, depth + 1);
      else walk(fp, callee.name, depth + 1);
    }
  };

  walk(filePath, name, 0);
  return { chain, truncated };
}

export function searchSymbolsFts(
  db: Database.Database,
  query: string,
  pathPrefix = '',
  limit = MAX_KEYWORD,
): KeywordMatch[] {
  const safe = cleanFtsTerm(query);
  if (!safe) return [];

  const norm = pathPrefix ? path.normalize(pathPrefix) : '';
  const prefixFilter = norm ? 'AND path LIKE ? || \'%\'' : '';
  const params: unknown[] = [safe];
  if (norm) params.push(norm);
  params.push(limit);

  const rows = db
    .prepare(
      `SELECT symbol_id, path, kind, name, signature, -rank AS score
       FROM symbol_search
       WHERE symbol_search MATCH ?
       ${prefixFilter}
       ORDER BY rank
       LIMIT ?`,
    )
    .all(...params) as Array<{
    path: string;
    kind: string;
    name: string;
    signature: string;
    score: number;
  }>;

  return rows.map((r) => ({
    path: r.path,
    name: r.name,
    kind: r.kind,
    line: 0,
    signature: r.signature,
    score: r.score,
  }));
}

export function listBoundaries(
  db: Database.Database,
  pathPrefix = '',
  boundaryType?: string,
  limit = 40,
): Array<{ filePath: string; line: number; type: string; label: string; confidence: string }> {
  const norm = pathPrefix ? path.normalize(pathPrefix) : '';
  const filters: string[] = [];
  const params: unknown[] = [];
  if (norm) {
    filters.push('file_path LIKE ? || \'%\'');
    params.push(norm);
  }
  if (boundaryType) {
    filters.push('boundary_type = ?');
    params.push(boundaryType);
  }
  params.push(limit);
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const rows = db
    .prepare(
      `SELECT file_path, line, boundary_type, label, confidence
       FROM symbol_boundaries ${where}
       ORDER BY file_path, line LIMIT ?`,
    )
    .all(...params) as Array<{
    file_path: string;
    line: number;
    boundary_type: string;
    label: string;
    confidence: string;
  }>;

  return rows.map((r) => ({
    filePath: r.file_path,
    line: r.line,
    type: r.boundary_type,
    label: r.label,
    confidence: r.confidence,
  }));
}

export function getMakefileTargets(
  db: Database.Database,
  filePath: string,
): Array<{ target: string; prerequisites: string[]; line: number }> {
  const rows = db
    .prepare(
      `SELECT target, prerequisites, line FROM makefile_targets
       WHERE file_path = ? ORDER BY line`,
    )
    .all(filePath) as Array<{ target: string; prerequisites: string; line: number }>;

  return rows.map((r) => ({
    target: r.target,
    prerequisites: r.prerequisites.split(/\s+/).filter(Boolean),
    line: r.line,
  }));
}

export async function getContext(
  db: Database.Database,
  modelsDir: string,
  input: string,
  opts: { includeSource?: boolean; pathPrefix?: string; activeFile?: string } = {},
): Promise<ContextResult> {
  const trimmed = input.trim();
  const pathPrefix = opts.pathPrefix ?? '';
  const statusRow = db.prepare('SELECT MAX(last_indexed) AS last FROM file_index').get() as {
    last: number | null;
  };

  if (fileExists(trimmed)) {
    const result: ContextResult = {
      query: trimmed,
      type: 'file',
      overview: getFileOverview(db, trimmed),
      indexUpdatedAtMs: statusRow?.last ?? 0,
    };
    if (opts.includeSource) {
      result.source = fs.readFileSync(trimmed, 'utf8');
    }
    return result;
  }

  const pathSymbol = trimmed.match(/^(.+):([A-Za-z_$][\w$]*)$/);
  if (pathSymbol) {
    const [, fp, sym] = pathSymbol;
    const detail = getSymbolDetail(db, fp!, sym!);
    if (detail) {
      return {
        query: trimmed,
        type: 'symbol',
        matches: [detail],
        indexUpdatedAtMs: statusRow?.last ?? 0,
      };
    }
  }

  let exact = searchSymbolsByName(db, trimmed, pathPrefix, 20);
  if (opts.activeFile) {
    exact = [
      ...exact.filter((s) => s.path === opts.activeFile),
      ...exact.filter((s) => s.path !== opts.activeFile),
    ];
  }

  if (exact.length === 1) {
    const s = exact[0]!;
    const detail = getSymbolDetail(db, s.path, s.name);
    if (detail) {
      return { query: trimmed, type: 'symbol', matches: [detail], indexUpdatedAtMs: statusRow?.last ?? 0 };
    }
  }

  if (exact.length > 1) {
    const matches = exact.slice(0, 5).map((s) => getSymbolDetail(db, s.path, s.name)).filter(Boolean) as SymbolDetail[];
    return {
      query: trimmed,
      type: 'symbol',
      matches,
      note: exact.length > 5 ? `${exact.length - 5} more symbols not shown — use path:symbol to disambiguate` : undefined,
      indexUpdatedAtMs: statusRow?.last ?? 0,
    };
  }

  const keyword = searchSymbolsFts(db, trimmed, pathPrefix, MAX_KEYWORD);
  if (keyword.length) {
    return {
      query: trimmed,
      type: 'keyword_match',
      matches: keyword,
      indexUpdatedAtMs: statusRow?.last ?? 0,
    };
  }

  const semantic = await ragQueryHybrid(db, modelsDir, trimmed, '', MAX_SEMANTIC, pathPrefix);
  if (semantic.hit_count > 0) {
    return {
      query: trimmed,
      type: 'semantic_match',
      matches: semantic.hits.map((h) => {
        const hit = h as RagHit & { symbol_name?: string; line_start?: number };
        return {
          path: hit.path,
          name: hit.symbol_name ?? hit.name,
          kind: 'chunk',
          line: hit.line_start ?? 0,
          signature: hit.snippet,
          score: hit.score,
        };
      }),
      indexUpdatedAtMs: semantic.index_updated_at_ms,
    };
  }

  return { query: trimmed, type: 'not_found', indexUpdatedAtMs: statusRow?.last ?? 0 };
}
