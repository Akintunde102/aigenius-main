import path from 'path';
import type Database from 'better-sqlite3';
import { computeBlastRadius } from './queries-import-graph.js';
import {
  makeQualifiedName,
  meetsMinConfidence,
  normalizeConfidence,
  parseQualifiedName,
  type GraphConfidence,
  type SymbolChangeType,
  type TypeFlowDirection,
} from '../graph/graph-types.js';

export type GraphHit = {
  qualifiedName: string;
  path: string;
  name: string;
  line: number | null;
  lineEnd: number | null;
  kind: string;
  edgeType: string;
  confidence: GraphConfidence;
  depth: number;
};

export type CallersResult = {
  qualifiedName: string;
  callers: GraphHit[];
  total: number;
  truncated: boolean;
};

export type BlastRadiusResult = {
  qualifiedName: string;
  changeType: SymbolChangeType;
  hits: GraphHit[];
  importDependents: string[];
  summary: string;
};

export type TypeFlowResult = {
  typeName: string;
  direction: TypeFlowDirection;
  flows: GraphHit[];
};

const MAX_HITS = 80;
const DIGEST_MAX_CHARS = 3200;

function resolveSymbol(
  db: Database.Database,
  qualifiedName: string,
  pathPrefix = '',
): { id: number; path: string; name: string; line: number; lineEnd: number; kind: string } | null {
  const parsed = parseQualifiedName(qualifiedName);
  if (!parsed) return null;

  let filePath = parsed.path;
  if (!path.isAbsolute(filePath) && pathPrefix) {
    filePath = path.normalize(path.join(pathPrefix, filePath));
  }

  const row = db
    .prepare(
      `SELECT id, path, name, line_start, line_end, kind
       FROM symbol_index
       WHERE path = ? AND name = ? AND kind NOT IN ('import', 'module')
       ORDER BY line_start LIMIT 1`,
    )
    .get(filePath, parsed.name) as
    | { id: number; path: string; name: string; line_start: number; line_end: number; kind: string }
    | undefined;

  if (row) {
    return {
      id: row.id,
      path: row.path,
      name: row.name,
      line: row.line_start,
      lineEnd: row.line_end,
      kind: row.kind,
    };
  }

  if (parsed.name.includes('.')) {
    const short = parsed.name.split('.').pop()!;
    const alt = db
      .prepare(
        `SELECT id, path, name, line_start, line_end, kind
         FROM symbol_index
         WHERE path = ? AND name = ? AND kind NOT IN ('import', 'module')
         ORDER BY line_start LIMIT 1`,
      )
      .get(filePath, short) as
      | { id: number; path: string; name: string; line_start: number; line_end: number; kind: string }
      | undefined;
    if (alt) {
      return {
        id: alt.id,
        path: alt.path,
        name: alt.name,
        line: alt.line_start,
        lineEnd: alt.line_end,
        kind: alt.kind,
      };
    }
  }

  return null;
}

function rowToHit(
  row: {
    path: string;
    name: string;
    line: number | null;
    line_end?: number | null;
    kind: string;
    edge_kind: string;
    confidence: string;
    depth: number;
  },
): GraphHit {
  return {
    qualifiedName: makeQualifiedName(row.path, row.name),
    path: row.path,
    name: row.name,
    line: row.line,
    lineEnd: row.line_end ?? null,
    kind: row.kind,
    edgeType: row.edge_kind,
    confidence: normalizeConfidence(row.confidence),
    depth: row.depth,
  };
}

export function findCallers(
  db: Database.Database,
  qualifiedName: string,
  opts: {
    maxDepth?: number;
    minConfidence?: GraphConfidence;
    pathPrefix?: string;
    limit?: number;
  } = {},
): CallersResult {
  const maxDepth = opts.maxDepth ?? 1;
  const minConf = opts.minConfidence ?? 'static-heuristic';
  const limit = opts.limit ?? MAX_HITS;
  const sym = resolveSymbol(db, qualifiedName, opts.pathPrefix);
  if (!sym) {
    return { qualifiedName, callers: [], total: 0, truncated: false };
  }

  const qn = makeQualifiedName(sym.path, sym.name);
  const visited = new Set<number>();
  const hits: GraphHit[] = [];
  let frontier = [sym.id];

  for (let depth = 1; depth <= maxDepth && frontier.length; depth++) {
    const next: number[] = [];
    for (const targetId of frontier) {
      const rows = db
        .prepare(
          `SELECT s.path, s.name, s.kind, s.line_start AS line, s.line_end AS line_end,
                  e.kind AS edge_kind, e.confidence, e.line AS edge_line
           FROM symbol_edges e
           JOIN symbol_index s ON e.from_symbol_id = s.id
           WHERE (e.to_symbol_id = ? OR (e.to_name = ? AND e.to_symbol_id IS NULL))
             AND e.kind IN ('calls', 'references', 'depends_on')
             AND (e.stale IS NULL OR e.stale = 0)`,
        )
        .all(targetId, sym.name) as Array<{
        path: string;
        name: string;
        kind: string;
        line: number;
        line_end: number;
        edge_kind: string;
        confidence: string;
        edge_line: number | null;
      }>;

      for (const r of rows) {
        if (!meetsMinConfidence(r.confidence, minConf)) continue;
        const callerRow = db
          .prepare('SELECT id FROM symbol_index WHERE path = ? AND name = ? AND line_start = ?')
          .get(r.path, r.name, r.line) as { id: number } | undefined;
        const callerId = callerRow?.id;
        if (callerId && visited.has(callerId)) continue;
        if (callerId) {
          visited.add(callerId);
          next.push(callerId);
        }
        hits.push(
          rowToHit({
            path: r.path,
            name: r.name,
            line: r.edge_line ?? r.line,
            line_end: r.line_end,
            kind: r.kind,
            edge_kind: r.edge_kind,
            confidence: r.confidence,
            depth,
          }),
        );
      }
    }
    frontier = next;
  }

  const total = hits.length;
  const truncated = total > limit;
  return {
    qualifiedName: qn,
    callers: hits.slice(0, limit),
    total,
    truncated,
  };
}

const BLAST_EDGE_TYPES: Record<SymbolChangeType, string[]> = {
  signature_change: ['calls', 'references', 'type_flows_into', 'depends_on', 'reads', 'writes'],
  removal: ['calls', 'references', 'type_flows_into', 'depends_on', 'reads', 'writes', 'extends', 'implements'],
  return_type_change: ['calls', 'type_flows_into', 'references', 'tested_by'],
};

export function symbolBlastRadius(
  db: Database.Database,
  qualifiedName: string,
  changeType: SymbolChangeType,
  opts: { pathPrefix?: string; maxDepth?: number } = {},
): BlastRadiusResult {
  const sym = resolveSymbol(db, qualifiedName, opts.pathPrefix);
  if (!sym) {
    return {
      qualifiedName,
      changeType,
      hits: [],
      importDependents: [],
      summary: 'Symbol not found in index.',
    };
  }

  const qn = makeQualifiedName(sym.path, sym.name);
  const edgeTypes = BLAST_EDGE_TYPES[changeType];
  const placeholders = edgeTypes.map(() => '?').join(',');
  const maxDepth = opts.maxDepth ?? 2;

  const directRows = db
    .prepare(
      `SELECT s.path, s.name, s.kind, s.line_start AS line, s.line_end,
              e.kind AS edge_kind, e.confidence, e.line AS edge_line
       FROM symbol_edges e
       JOIN symbol_index s ON e.from_symbol_id = s.id
       WHERE (e.to_symbol_id = ? OR (e.to_name = ? AND e.to_symbol_id IS NULL))
         AND e.kind IN (${placeholders})
         AND (e.stale IS NULL OR e.stale = 0)
       ORDER BY e.confidence DESC, s.path`,
    )
    .all(sym.id, sym.name, ...edgeTypes) as Array<{
    path: string;
    name: string;
    kind: string;
    line: number;
    line_end: number;
    edge_kind: string;
    confidence: string;
    edge_line: number | null;
  }>;

  const hits: GraphHit[] = directRows.map((r) =>
    rowToHit({
      path: r.path,
      name: r.name,
      line: r.edge_line ?? r.line,
      line_end: r.line_end,
      kind: r.kind,
      edge_kind: r.edge_kind,
      confidence: r.confidence,
      depth: 1,
    }),
  );

  if (maxDepth > 1 && changeType !== 'removal') {
    const callers = findCallers(db, qn, {
      maxDepth: maxDepth - 1,
      pathPrefix: opts.pathPrefix,
      limit: 40,
    });
    for (const c of callers.callers) {
      if (!hits.some((h) => h.qualifiedName === c.qualifiedName && h.edgeType === c.edgeType)) {
        hits.push({ ...c, depth: c.depth + 1 });
      }
    }
  }

  const importBlast = computeBlastRadius(db, [sym.path], opts.pathPrefix ?? '', 3);
  const importDependents = importBlast.impacted.map((r) => r.path);

  const certain = hits.filter((h) => h.confidence === 'static-certain').length;
  const heuristic = hits.filter((h) => h.confidence === 'static-heuristic').length;
  const inferred = hits.filter((h) => h.confidence === 'inferred').length;

  const summary = [
    `Blast radius for \`${qn}\` (${changeType}):`,
    `${hits.length} structural hits (${certain} static-certain, ${heuristic} static-heuristic, ${inferred} inferred)`,
    `${importDependents.length} import-dependent files`,
  ].join('\n');

  return {
    qualifiedName: qn,
    changeType,
    hits: hits.slice(0, MAX_HITS),
    importDependents,
    summary,
  };
}

export function typeFlowTrace(
  db: Database.Database,
  typeName: string,
  direction: TypeFlowDirection = 'both',
  opts: { pathPrefix?: string; limit?: number } = {},
): TypeFlowResult {
  const limit = opts.limit ?? MAX_HITS;
  const normPrefix = opts.pathPrefix ? path.normalize(opts.pathPrefix) : '';
  const prefixFilter = normPrefix ? "AND s.path LIKE ? || '%'" : '';
  const flows: GraphHit[] = [];

  const baseParams: unknown[] = [`%${typeName}%`];
  if (normPrefix) baseParams.push(normPrefix);

  if (direction === 'downstream' || direction === 'both') {
    const rows = db
      .prepare(
        `SELECT s.path, s.name, s.kind, s.line_start AS line, s.line_end,
                e.kind AS edge_kind, e.confidence, e.line AS edge_line
         FROM symbol_edges e
         JOIN symbol_index s ON e.from_symbol_id = s.id
         WHERE e.to_name LIKE ? AND e.kind IN ('type_flows_into', 'calls', 'reads')
           AND (e.stale IS NULL OR e.stale = 0)
           ${prefixFilter}
         ORDER BY s.path LIMIT ?`,
      )
      .all(...baseParams, limit) as Array<{
      path: string;
      name: string;
      kind: string;
      line: number;
      line_end: number;
      edge_kind: string;
      confidence: string;
      edge_line: number | null;
    }>;
    for (const r of rows) {
      flows.push(
        rowToHit({
          ...r,
          depth: 1,
        }),
      );
    }
  }

  if (direction === 'upstream' || direction === 'both') {
    const upstreamFilter = normPrefix ? "AND s.path LIKE ? || '%'" : '';
    const upstreamParams: unknown[] = [`%${typeName}%`];
    if (normPrefix) upstreamParams.push(normPrefix);
    upstreamParams.push(limit);
    const rows = db
      .prepare(
        `SELECT s.path, s.name, s.kind, s.line_start AS line, s.line_end,
                e.kind AS edge_kind, e.confidence, e.line AS edge_line
         FROM symbol_edges e
         JOIN symbol_index s ON e.to_symbol_id = s.id
         WHERE s.name LIKE ? AND e.kind IN ('type_flows_into', 'extends', 'implements')
           AND (e.stale IS NULL OR e.stale = 0)
           ${upstreamFilter}
         ORDER BY s.path LIMIT ?`,
      )
      .all(...upstreamParams) as Array<{
      path: string;
      name: string;
      kind: string;
      line: number;
      line_end: number;
      edge_kind: string;
      confidence: string;
      edge_line: number | null;
    }>;
    for (const r of rows) {
      if (!flows.some((f) => f.qualifiedName === makeQualifiedName(r.path, r.name))) {
        flows.push(rowToHit({ ...r, depth: 1 }));
      }
    }
  }

  return { typeName, direction, flows: flows.slice(0, limit) };
}

/** Bounded structural digest for system prompt injection. */
export function buildStructuralDigest(
  db: Database.Database,
  rootPath: string,
  projectName: string,
): string {
  const norm = path.normalize(rootPath);
  const fileCount = (
    db.prepare(
      `SELECT COUNT(*) AS cnt FROM file_index
       WHERE path LIKE ? || '%' AND (is_generated IS NULL OR is_generated = 0)`,
    ).get(norm) as { cnt: number } | undefined
  )?.cnt ?? 0;

  const lastIndexed = (
    db.prepare('SELECT MAX(last_indexed) AS last FROM file_index WHERE path LIKE ? || \'%\'').get(norm) as
      | { last: number | null }
      | undefined
  )?.last;

  const topDirs = db
    .prepare(
      `SELECT
         CASE
           WHEN instr(substr(replace(path, '\\', '/'), length(?) + 2), '/') > 0
           THEN substr(substr(replace(path, '\\', '/'), length(?) + 2),
                1, instr(substr(replace(path, '\\', '/'), length(?) + 2), '/') - 1)
           ELSE substr(replace(path, '\\', '/'), length(?) + 2)
         END AS dir,
         COUNT(*) AS cnt
       FROM file_index
       WHERE path LIKE ? || '%' AND (is_generated IS NULL OR is_generated = 0)
       GROUP BY dir
       HAVING dir != '' AND dir NOT LIKE '.%'
       ORDER BY cnt DESC
       LIMIT 8`,
    )
    .all(norm, norm, norm, norm, norm) as Array<{ dir: string; cnt: number }>;

  const hubs = db
    .prepare(
      `SELECT s.path, s.name, s.kind, s.line_start, COUNT(*) AS fan_in
       FROM symbol_edges e
       JOIN symbol_index s ON e.to_symbol_id = s.id
       WHERE s.path LIKE ? || '%' AND e.kind IN ('calls', 'references', 'type_flows_into')
         AND (e.stale IS NULL OR e.stale = 0)
       GROUP BY s.id
       ORDER BY fan_in DESC
       LIMIT 12`,
    )
    .all(norm) as Array<{ path: string; name: string; kind: string; line_start: number; fan_in: number }>;

  const boundaries = db
    .prepare(
      `SELECT file_path, line, boundary_type, label
       FROM symbol_boundaries
       WHERE file_path LIKE ? || '%'
       ORDER BY boundary_type, file_path
       LIMIT 10`,
    )
    .all(norm) as Array<{ file_path: string; line: number; boundary_type: string; label: string }>;

  const importSpine = db
    .prepare(
      `SELECT importer_path, imported_path, COUNT(*) AS cnt
       FROM import_index
       WHERE importer_path LIKE ? || '%' AND imported_path LIKE ? || '%'
       GROUP BY importer_path, imported_path
       ORDER BY cnt DESC
       LIMIT 8`,
    )
    .all(norm, norm) as Array<{ importer_path: string; imported_path: string; cnt: number }>;

  const lines: string[] = [
    `## Project structural map: ${projectName}`,
    '',
    `- Root: \`${norm.replace(/\\/g, '/')}\``,
    `- Indexed source files: ${fileCount}`,
    lastIndexed ? `- Last indexed: ${new Date(lastIndexed).toISOString()}` : '- Index: not yet populated',
    '',
    'Use `local_find_callers`, `local_symbol_blast_radius`, and `local_type_flow_trace` for precise graph queries.',
    '',
  ];

  if (topDirs.length) {
    lines.push('### Top-level areas', '');
    for (const d of topDirs) {
      lines.push(`- \`${d.dir}/\` — ${d.cnt} files`);
    }
    lines.push('');
  }

  if (boundaries.length) {
    lines.push('### Entry points (boundaries)', '');
    for (const b of boundaries) {
      const rel = path.relative(norm, b.file_path).replace(/\\/g, '/');
      lines.push(`- ${b.boundary_type} \`${b.label || rel}\` — ${rel}:${b.line}`);
    }
    lines.push('');
  }

  if (hubs.length) {
    lines.push('### Hub symbols (high fan-in — change carefully)', '');
    for (const h of hubs) {
      const rel = path.relative(norm, h.path).replace(/\\/g, '/');
      lines.push(`- ${h.kind} \`${h.name}\` — ${rel}:${h.line_start} (${h.fan_in} inbound edges)`);
    }
    lines.push('');
  }

  if (importSpine.length) {
    lines.push('### Import spine (frequent edges)', '');
    for (const e of importSpine) {
      const from = path.relative(norm, e.importer_path).replace(/\\/g, '/');
      const to = path.relative(norm, e.imported_path).replace(/\\/g, '/');
      lines.push(`- \`${from}\` → \`${to}\``);
    }
    lines.push('');
  }

  let digest = lines.join('\n');
  if (digest.length > DIGEST_MAX_CHARS) {
    digest = `${digest.slice(0, DIGEST_MAX_CHARS - 40)}\n\n… [digest truncated]`;
  }
  return digest;
}

export function formatCallersReport(result: CallersResult): string {
  if (!result.callers.length) {
    return `No callers found for \`${result.qualifiedName}\`.`;
  }
  const lines = result.callers.map(
    (c) =>
      `- [${c.confidence}] ${c.edgeType} ${c.qualifiedName}:${c.line ?? '?'} (${c.kind}, depth ${c.depth})`,
  );
  const suffix = result.truncated ? `\n\n_Showing subset; total ${result.total}._` : '';
  return `# Callers: ${result.qualifiedName}\n\n${lines.join('\n')}${suffix}`;
}

export function formatSymbolBlastRadiusReport(result: BlastRadiusResult): string {
  const lines = [
    result.summary,
    '',
    '## Structural hits',
    ...(result.hits.length
      ? result.hits.map(
          (h) =>
            `- [${h.confidence}] ${h.edgeType} ← ${h.qualifiedName}:${h.line ?? '?'}`,
        )
      : ['_None_']),
  ];
  if (result.importDependents.length) {
    lines.push('', '## Import dependents', ...result.importDependents.map((f) => `- ${f}`));
  }
  return lines.join('\n');
}

export function formatTypeFlowReport(result: TypeFlowResult): string {
  if (!result.flows.length) {
    return `No type-flow edges found for type \`${result.typeName}\` (${result.direction}).`;
  }
  const lines = result.flows.map(
    (f) => `- [${f.confidence}] ${f.edgeType} ${f.qualifiedName}:${f.line ?? '?'} (${f.kind})`,
  );
  return `# Type flow: ${result.typeName} (${result.direction})\n\n${lines.join('\n')}`;
}
