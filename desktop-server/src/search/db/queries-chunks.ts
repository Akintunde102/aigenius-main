import path from 'path';
import type Database from 'better-sqlite3';
import type { ParsedImport, ParsedSymbol } from '../indexer/symbol-parser.js';
import { parseImports } from '../indexer/symbol-parser.js';
import { buildFileChunksFromSymbols, type FileChunk } from '../indexer/chunk-indexer.js';
import { resolveImports } from '../indexer/import-resolver.js';
import { deleteImportsForFile, upsertImports } from './queries-import-graph.js';
import { cleanFtsTerm, ragQuery, type RagHit, type RagQueryResult } from './queries.js';
import { DEFAULT_IGNORED_PATHS } from '../indexer/exemptions.js';
import { indexFileIntelligence } from '../indexer/intelligence-router.js';
import { detectBoundaries } from '../indexer/boundaries.js';
import { isMakefile } from '../indexer/makefile-indexer.js';
import type { IndexedEdge, IndexedSymbol } from '../indexer/language-indexer.js';

export type SymbolRow = {
  kind: string;
  name: string;
  line_start: number;
  line_end: number;
  signature: string;
  confidence?: string;
  language?: string;
};

/** Remove symbols + chunks + graph edges for a file (called before re-index or on delete). */
export function deleteFileStructure(db: Database.Database, filePath: string): void {
  db.prepare(
    'DELETE FROM symbol_search WHERE symbol_id IN (SELECT id FROM symbol_index WHERE path = ?)',
  ).run(filePath);
  db.prepare('DELETE FROM symbol_boundaries WHERE file_path = ?').run(filePath);
  db.prepare('DELETE FROM makefile_targets WHERE file_path = ?').run(filePath);
  deleteImportsForFile(db, filePath);
  db.prepare('DELETE FROM chunk_embeddings WHERE chunk_id IN (SELECT id FROM file_chunks WHERE path = ?)').run(filePath);
  db.prepare('DELETE FROM file_chunks WHERE path = ?').run(filePath);
  db.prepare('DELETE FROM symbol_index WHERE path = ?').run(filePath);
}

function symbolKey(kind: string, name: string, line: number): string {
  return `${kind}:${name}:${line}`;
}

function persistIntelligenceGraph(
  db: Database.Database,
  filePath: string,
  content: string,
  extension: string,
  language: string,
  symbols: IndexedSymbol[],
  edges: IndexedEdge[],
): void {
  const idByKey = new Map<string, number>();
  const insertSymbol = db.prepare(`
    INSERT INTO symbol_index (path, kind, name, line_start, line_end, signature, confidence, language)
    VALUES (@path, @kind, @name, @line_start, @line_end, @signature, @confidence, @language)
  `);
  const insertFts = db.prepare(`
    INSERT INTO symbol_search (name, signature, kind, path, symbol_id)
    VALUES (@name, @signature, @kind, @path, @symbol_id)
  `);
  const insertEdge = db.prepare(`
    INSERT INTO symbol_edges (from_symbol_id, to_symbol_id, to_name, to_path, kind, line, confidence)
    VALUES (@from_symbol_id, @to_symbol_id, @to_name, @to_path, @kind, @line, @confidence)
  `);
  const insertBoundary = db.prepare(`
    INSERT INTO symbol_boundaries (symbol_id, file_path, line, boundary_type, label, confidence)
    VALUES (@symbol_id, @file_path, @line, @boundary_type, @label, @confidence)
  `);
  const insertMakeTarget = db.prepare(`
    INSERT OR REPLACE INTO makefile_targets (file_path, target, prerequisites, line)
    VALUES (@file_path, @target, @prerequisites, @line)
  `);

  const findSymbolId = (name: string, line: number): number | null => {
    for (const sym of symbols) {
      if (sym.name === name && sym.lineStart === line) {
        return idByKey.get(symbolKey(sym.kind, sym.name, sym.lineStart)) ?? null;
      }
    }
    for (const sym of symbols) {
      if (sym.name === name) {
        return idByKey.get(symbolKey(sym.kind, sym.name, sym.lineStart)) ?? null;
      }
    }
    return null;
  };

  const ensureModuleSymbol = (targetPath: string): number => {
    const existing = db
      .prepare(
        `SELECT id FROM symbol_index WHERE path = ? AND name = '__module__' AND kind = 'module' LIMIT 1`,
      )
      .get(targetPath) as { id: number } | undefined;
    if (existing) return existing.id;

    const result = insertSymbol.run({
      path: targetPath,
      kind: 'module',
      name: '__module__',
      line_start: 1,
      line_end: 1,
      signature: path.basename(targetPath),
      confidence: 'high',
      language,
    });
    return Number(result.lastInsertRowid);
  };

  const findEnclosingSymbolId = (targetPath: string, line: number): number | null => {
    const row = db
      .prepare(
        `SELECT id FROM symbol_index
         WHERE path = ? AND line_start <= ? AND line_end >= ?
           AND kind NOT IN ('import', 'module')
         ORDER BY (line_end - line_start) ASC
         LIMIT 1`,
      )
      .get(targetPath, line, line) as { id: number } | undefined;
    return row?.id ?? null;
  };

  db.transaction(() => {
    for (const sym of symbols) {
      const result = insertSymbol.run({
        path: filePath,
        kind: sym.kind,
        name: sym.name,
        line_start: sym.lineStart,
        line_end: sym.lineEnd,
        signature: sym.signature,
        confidence: sym.confidence,
        language,
      });
      const symbolId = Number(result.lastInsertRowid);
      idByKey.set(symbolKey(sym.kind, sym.name, sym.lineStart), symbolId);
      insertFts.run({
        name: sym.name,
        signature: sym.signature,
        kind: sym.kind,
        path: filePath,
        symbol_id: symbolId,
      });
    }

    const moduleLine = symbols[0]?.lineStart ?? 1;
    let moduleId = findSymbolId('__module__', moduleLine);
    if (!moduleId && edges.some((e) => e.fromName === '__module__')) {
      const result = insertSymbol.run({
        path: filePath,
        kind: 'module',
        name: '__module__',
        line_start: 1,
        line_end: 1,
        signature: path.basename(filePath),
        confidence: 'high',
        language,
      });
      moduleId = Number(result.lastInsertRowid);
      idByKey.set(symbolKey('module', '__module__', 1), moduleId);
    }

    for (const edge of edges) {
      if (edge.fromName === '__external__' && edge.toPath) {
        const toId = findSymbolId(edge.toName, edge.fromLine);
        if (!toId) continue;
        const callerLine = edge.line ?? 1;
        const callerSymId = findEnclosingSymbolId(edge.toPath, callerLine);
        const fromId = callerSymId ?? ensureModuleSymbol(edge.toPath);
        insertEdge.run({
          from_symbol_id: fromId,
          to_symbol_id: toId,
          to_name: edge.toName,
          to_path: null,
          kind: 'references',
          line: callerLine,
          confidence: edge.confidence,
        });
        continue;
      }

      let fromId = findSymbolId(edge.fromName, edge.fromLine);
      if (!fromId && edge.fromName === '__module__') fromId = moduleId;
      if (!fromId && edge.fromName === '__translation_unit__') fromId = moduleId;
      if (!fromId) {
        fromId = findSymbolId(edge.fromName, edge.fromLine) ?? moduleId;
      }
      if (!fromId) continue;

      let toId: number | null = null;
      if (!edge.toPath) {
        toId = findSymbolId(edge.toName, edge.line ?? 0);
      }

      insertEdge.run({
        from_symbol_id: fromId,
        to_symbol_id: toId,
        to_name: edge.toName,
        to_path: edge.toPath ?? null,
        kind: edge.kind,
        line: edge.line ?? null,
        confidence: edge.confidence,
      });
    }

    const boundaries = detectBoundaries(content, extension);
    for (const b of boundaries) {
      const sym = symbols.find((s) => b.line >= s.lineStart && b.line <= s.lineEnd);
      const symbolId = sym
        ? idByKey.get(symbolKey(sym.kind, sym.name, sym.lineStart)) ?? null
        : null;
      insertBoundary.run({
        symbol_id: symbolId,
        file_path: filePath,
        line: b.line,
        boundary_type: b.boundaryType,
        label: b.label,
        confidence: b.confidence,
      });
    }

    if (isMakefile(filePath, extension)) {
      for (const sym of symbols.filter((s) => s.kind === 'make_target')) {
        const prereqs = sym.signature.replace(/^depends:\s*/, '');
        insertMakeTarget.run({
          file_path: filePath,
          target: sym.name,
          prerequisites: prereqs,
          line: sym.lineStart,
        });
      }
    }
  })();
}

export function upsertFileStructure(
  db: Database.Database,
  filePath: string,
  content: string,
  extension: string,
  modelsDir?: string,
): { symbolCount: number; chunkCount: number } | Promise<{ symbolCount: number; chunkCount: number }> {
  return upsertFileStructureAsync(db, filePath, content, extension, modelsDir);
}

async function upsertFileStructureAsync(
  db: Database.Database,
  filePath: string,
  content: string,
  extension: string,
  modelsDir?: string,
): Promise<{ symbolCount: number; chunkCount: number }> {
  deleteFileStructure(db, filePath);

  let intelligence;
  try {
    intelligence = await indexFileIntelligence(filePath, content, extension);
  } catch (err) {
    console.warn('[search] intelligence indexer failed for', filePath, err);
    throw err;
  }

  const symbols = intelligence.symbols;
  const imports = parseImports(content, extension);
  const resolvedImports = resolveImports(filePath, imports);
  deleteImportsForFile(db, filePath);
  upsertImports(
    db,
    resolvedImports.map((r) => ({
      importerPath: r.importerPath,
      importedPath: r.importedPath,
      moduleSpec: r.moduleSpec,
      line: r.line,
      isRelative: r.isRelative,
    })),
  );

  persistIntelligenceGraph(
    db,
    filePath,
    content,
    extension,
    intelligence.language,
    symbols,
    intelligence.edges,
  );

  const insertImportSymbol = db.prepare(`
    INSERT INTO symbol_index (path, kind, name, line_start, line_end, signature, confidence, language)
    VALUES (@path, @kind, @name, @line_start, @line_end, @signature, @confidence, @language)
  `);

  db.transaction(() => {
    for (const imp of imports) {
      insertImportSymbol.run({
        path: filePath,
        kind: 'import',
        name: imp.module,
        line_start: imp.line,
        line_end: imp.line,
        signature: imp.isRelative ? 'relative' : 'absolute',
        confidence: intelligence.language === 'typescript' ? 'high' : 'heuristic',
        language: intelligence.language,
      });
    }
  })();

  const chunkSymbols: ParsedSymbol[] = symbols.map((s) => ({
    kind: s.kind,
    name: s.name,
    lineStart: s.lineStart,
    lineEnd: s.lineEnd,
    signature: s.signature,
  }));

  const chunks = buildFileChunksFromSymbols(content, extension, chunkSymbols);
  const insertChunk = db.prepare(`
    INSERT INTO file_chunks (path, chunk_index, line_start, line_end, symbol_name, content)
    VALUES (@path, @chunk_index, @line_start, @line_end, @symbol_name, @content)
  `);

  db.transaction(() => {
    for (const chunk of chunks) {
      insertChunk.run({
        path: filePath,
        chunk_index: chunk.chunkIndex,
        line_start: chunk.lineStart,
        line_end: chunk.lineEnd,
        symbol_name: chunk.symbolName,
        content: chunk.content,
      });
    }
  })();

  if (modelsDir && chunks.length > 0) {
    try {
      const { embedChunksForFile } = await import('../embedding/chunk-embeddings.js');
      await embedChunksForFile(db, filePath, modelsDir);
    } catch (err) {
      console.warn('[search] chunk embed error for', filePath, err);
    }
  }

  return { symbolCount: symbols.length + imports.length, chunkCount: chunks.length };
}

export function listSymbolsForFile(db: Database.Database, filePath: string): SymbolRow[] {
  return db
    .prepare<[string], SymbolRow>(
      `SELECT kind, name, line_start, line_end, signature
       FROM symbol_index WHERE path = ?
       ORDER BY line_start, name`,
    )
    .all(filePath);
}

export function searchSymbolsByName(
  db: Database.Database,
  name: string,
  pathPrefix = '',
  limit = 40,
): Array<SymbolRow & { path: string }> {
  const norm = pathPrefix ? path.normalize(pathPrefix) : '';
  const prefixFilter = norm ? 'AND path LIKE ? || \'%\'' : '';
  const stmt = db.prepare(`
    SELECT path, kind, name, line_start, line_end, signature
    FROM symbol_index
    WHERE name LIKE ? ESCAPE '\\'
    ${prefixFilter}
    ORDER BY path, line_start
    LIMIT ?
  `);
  const escaped = name.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  const params: unknown[] = [`%${escaped}%`];
  if (norm) params.push(norm);
  params.push(limit);
  return stmt.all(...params) as Array<SymbolRow & { path: string }>;
}

export function countChunks(db: Database.Database): number {
  const row = db.prepare<[], { cnt: number }>('SELECT COUNT(*) AS cnt FROM file_chunks').get();
  return row?.cnt ?? 0;
}

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
  const norm = path.normalize(rootPath);
  const fileCount = (
    db.prepare(`SELECT COUNT(*) AS cnt FROM file_index WHERE path LIKE ? || '%'`).get(norm) as
      | { cnt: number }
      | undefined
  )?.cnt ?? 0;

  const chunkCount = (
    db.prepare(`SELECT COUNT(*) AS cnt FROM file_chunks WHERE path LIKE ? || '%'`).get(norm) as
      | { cnt: number }
      | undefined
  )?.cnt ?? 0;

  const topSymbols = db
    .prepare(
      `SELECT kind, name, path, line_start
       FROM symbol_index
       WHERE path LIKE ? || '%' AND kind != 'import'
       ORDER BY kind, name
       LIMIT 60`,
    )
    .all(norm) as Array<{ kind: string; name: string; path: string; line_start: number }>;

  const extensions = db
    .prepare(
      `SELECT extension, COUNT(*) AS cnt
       FROM file_index WHERE path LIKE ? || '%' AND extension IS NOT NULL AND extension != ''
       GROUP BY extension ORDER BY cnt DESC LIMIT 12`,
    )
    .all(norm) as Array<{ extension: string; cnt: number }>;

  const lines = [
    `# Project architecture: ${projectName}`,
    '',
    `- Root: \`${norm}\``,
    `- Indexed files: ${fileCount}`,
    `- Search chunks: ${chunkCount}`,
    '',
  ];

  if (extensions.length) {
    lines.push('## File types', '');
    for (const e of extensions) {
      lines.push(`- .${e.extension}: ${e.cnt} files`);
    }
    lines.push('');
  }

  if (topSymbols.length) {
    lines.push('## Key symbols (sample)', '');
    for (const s of topSymbols) {
      const rel = path.relative(norm, s.path).replace(/\\/g, '/');
      lines.push(`- ${s.kind} \`${s.name}\` — ${rel}:${s.line_start}`);
    }
  } else {
    lines.push('_Re-index the project to populate symbol graph._');
  }

  return lines.join('\n');
}

export type { ParsedSymbol, ParsedImport, FileChunk };
