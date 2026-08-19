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
  detachInboundEdgesBeforeReindex(db, filePath);
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

function symbolInsertParams(
  filePath: string,
  sym: {
    kind: string;
    name: string;
    line_start: number;
    line_end: number;
    signature: string;
    confidence: string;
    language: string;
  },
  now = Date.now(),
) {
  return {
    path: filePath,
    kind: sym.kind,
    name: sym.name,
    line_start: sym.line_start,
    line_end: sym.line_end,
    signature: sym.signature,
    confidence: sym.confidence,
    language: sym.language,
    qualified_name: makeQualifiedName(filePath, sym.name),
    signature_hash: signatureHash(sym.signature),
    last_analyzed_at: now,
  };
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
    INSERT INTO symbol_index (path, kind, name, line_start, line_end, signature, confidence, language, qualified_name, signature_hash, last_analyzed_at)
    VALUES (@path, @kind, @name, @line_start, @line_end, @signature, @confidence, @language, @qualified_name, @signature_hash, @last_analyzed_at)
  `);
  const insertFts = db.prepare(`
    INSERT INTO symbol_search (name, signature, kind, path, symbol_id)
    VALUES (@name, @signature, @kind, @path, @symbol_id)
  `);
  const insertEdge = db.prepare(`
    INSERT INTO symbol_edges (from_symbol_id, to_symbol_id, to_name, to_path, kind, line, confidence, stale)
    VALUES (@from_symbol_id, @to_symbol_id, @to_name, @to_path, @kind, @line, @confidence, 0)
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

    const result = insertSymbol.run(
      symbolInsertParams(targetPath, {
        kind: 'module',
        name: '__module__',
        line_start: 1,
        line_end: 1,
        signature: path.basename(targetPath),
        confidence: 'high',
        language,
      }, now),
    );
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

  const lookupGlobalSymbolId = (targetPath: string, targetName: string): number | null => {
    const shortName = targetName.includes('.') ? targetName.split('.').pop()! : targetName;
    const row = db
      .prepare(
        `SELECT id FROM symbol_index
         WHERE path = ? AND name = ? AND kind NOT IN ('import', 'module')
         ORDER BY line_start LIMIT 1`,
      )
      .get(targetPath, shortName) as { id: number } | undefined;
    return row?.id ?? null;
  };

  const now = Date.now();

  db.transaction(() => {
    for (const sym of symbols) {
      const result = insertSymbol.run(
        symbolInsertParams(filePath, {
          kind: sym.kind,
          name: sym.name,
          line_start: sym.lineStart,
          line_end: sym.lineEnd,
          signature: sym.signature,
          confidence: sym.confidence,
          language,
        }, now),
      );
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
      const result = insertSymbol.run(
        symbolInsertParams(filePath, {
          kind: 'module',
          name: '__module__',
          line_start: 1,
          line_end: 1,
          signature: path.basename(filePath),
          confidence: 'high',
          language,
        }, now),
      );
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
      if (edge.toPath) {
        toId = lookupGlobalSymbolId(edge.toPath, edge.toName);
      }
      if (!toId && !edge.toPath) {
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

function resolveGraphStatus(filePath: string, extension: string): GraphStatus {
  const ext = extension.toLowerCase().replace(/^\./, '');
  if (!isTypeScriptExtension(ext)) return 'complete';
  if (shouldSkipDeepGraphIndexing(filePath)) return 'skipped';
  return 'pending';
}

function setFileGraphStatus(db: Database.Database, filePath: string, status: GraphStatus): void {
  const now = Date.now();
  db.prepare(
    `UPDATE file_index SET graph_status = ?, graph_indexed_at = CASE WHEN ? IN ('complete', 'skipped') THEN ? ELSE graph_indexed_at END WHERE path = ?`,
  ).run(status, status, now, filePath);
}

/** Insert deep ts-morph edges for a file whose symbols already exist. */
function insertDeepEdgesForFile(
  db: Database.Database,
  filePath: string,
  content: string,
  extension: string,
): number {
  const ext = extension.toLowerCase().replace(/^\./, '');
  if (!isTypeScriptExtension(ext)) return 0;

  const edges = indexTypeScriptDeepEdges(filePath, content);
  db.prepare(
    `DELETE FROM symbol_edges WHERE from_symbol_id IN (SELECT id FROM symbol_index WHERE path = ?)`,
  ).run(filePath);

  const symbols = db
    .prepare(
      `SELECT id, kind, name, line_start, line_end FROM symbol_index WHERE path = ?`,
    )
    .all(filePath) as Array<{
    id: number;
    kind: string;
    name: string;
    line_start: number;
    line_end: number;
  }>;

  const idByKey = new Map<string, number>();
  for (const sym of symbols) {
    idByKey.set(symbolKey(sym.kind, sym.name, sym.line_start), sym.id);
  }

  const findSymbolId = (name: string, line: number): number | null => {
    for (const sym of symbols) {
      if (sym.name === name && sym.line_start === line) return sym.id;
    }
    for (const sym of symbols) {
      if (sym.name === name) return sym.id;
    }
    return null;
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

  const lookupGlobalSymbolId = (targetPath: string, targetName: string): number | null => {
    const shortName = targetName.includes('.') ? targetName.split('.').pop()! : targetName;
    const row = db
      .prepare(
        `SELECT id FROM symbol_index
         WHERE path = ? AND name = ? AND kind NOT IN ('import', 'module')
         ORDER BY line_start LIMIT 1`,
      )
      .get(targetPath, shortName) as { id: number } | undefined;
    return row?.id ?? null;
  };

  const ensureModuleSymbol = (targetPath: string): number => {
    const existing = db
      .prepare(
        `SELECT id FROM symbol_index WHERE path = ? AND name = '__module__' AND kind = 'module' LIMIT 1`,
      )
      .get(targetPath) as { id: number } | undefined;
    if (existing) return existing.id;
    const language = languageForExtension(path.extname(targetPath).replace(/^\./, ''));
    const result = db
      .prepare(
        `INSERT INTO symbol_index (path, kind, name, line_start, line_end, signature, confidence, language, qualified_name, signature_hash, last_analyzed_at)
         VALUES (@path, @kind, @name, @line_start, @line_end, @signature, @confidence, @language, @qualified_name, @signature_hash, @last_analyzed_at)`,
      )
      .run(
        symbolInsertParams(targetPath, {
          kind: 'module',
          name: '__module__',
          line_start: 1,
          line_end: 1,
          signature: path.basename(targetPath),
          confidence: 'high',
          language,
        }),
      );
    return Number(result.lastInsertRowid);
  };

  const insertEdge = db.prepare(`
    INSERT INTO symbol_edges (from_symbol_id, to_symbol_id, to_name, to_path, kind, line, confidence, stale)
    VALUES (@from_symbol_id, @to_symbol_id, @to_name, @to_path, @kind, @line, @confidence, 0)
  `);

  let moduleId = findSymbolId('__module__', 1);
  let inserted = 0;

  db.transaction(() => {
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
        inserted++;
        continue;
      }

      let fromId = findSymbolId(edge.fromName, edge.fromLine);
      if (!fromId && edge.fromName === '__module__') fromId = moduleId;
      if (!fromId && edge.fromName === '__translation_unit__') fromId = moduleId;
      if (!fromId) fromId = findSymbolId(edge.fromName, edge.fromLine) ?? moduleId;
      if (!fromId) continue;

      let toId: number | null = null;
      if (edge.toPath) {
        toId = lookupGlobalSymbolId(edge.toPath, edge.toName);
      }
      if (!toId && !edge.toPath) {
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
      inserted++;
    }
  })();

  return inserted;
}

/** Background worker: build deep ts-morph graph edges for one file. */
export async function upsertDeepGraph(db: Database.Database, filePath: string): Promise<void> {
  const row = db
    .prepare(`SELECT content, extension FROM file_index WHERE path = ?`)
    .get(filePath) as { content: string; extension: string | null } | undefined;
  if (!row?.content) {
    setFileGraphStatus(db, filePath, 'error');
    return;
  }
  const ext = row.extension ?? path.extname(filePath).replace(/^\./, '');
  try {
    insertDeepEdgesForFile(db, filePath, row.content, ext);
    setFileGraphStatus(db, filePath, 'complete');
  } catch (err) {
    setFileGraphStatus(db, filePath, 'error');
    throw err;
  }
}

export function upsertFileStructure(
  db: Database.Database,
  filePath: string,
  content: string,
  extension: string,
  _modelsDir?: string,
): { symbolCount: number; chunkCount: number } | Promise<{ symbolCount: number; chunkCount: number }> {
  return upsertFileStructureAsync(db, filePath, content, extension);
}

async function upsertFileStructureAsync(
  db: Database.Database,
  filePath: string,
  content: string,
  extension: string,
): Promise<{ symbolCount: number; chunkCount: number }> {
  deleteFileStructure(db, filePath);

  let intelligence: FileIntelligence;
  try {
    intelligence = await indexFileIntelligenceFast(filePath, content, extension);
  } catch (err) {
    console.warn('[search] intelligence indexer failed for', filePath, err);
    throw err;
  }

  const symbols = intelligence.symbols;
  const fastEdges = isTypeScriptExtension(extension.toLowerCase().replace(/^\./, ''))
    ? []
    : intelligence.edges;
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
    fastEdges,
  );

  setFileGraphStatus(db, filePath, resolveGraphStatus(filePath, extension));

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

