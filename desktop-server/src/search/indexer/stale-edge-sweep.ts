import type Database from 'better-sqlite3';
import path from 'path';
import { indexTypeScript, isTypeScriptExtension } from './ts-morph-indexer.js';
import fs from 'fs';

const SWEEP_BATCH = 40;
const SWEEP_INTERVAL_MS = 45_000;

let sweepTimer: ReturnType<typeof setInterval> | null = null;
let sweepRunning = false;

/** Before deleting symbols for a file, preserve inbound edges as stale unresolved rows. */
export function detachInboundEdgesBeforeReindex(db: Database.Database, filePath: string): void {
  db.prepare(
    `UPDATE symbol_edges
     SET stale = 1, to_symbol_id = NULL
     WHERE to_symbol_id IN (SELECT id FROM symbol_index WHERE path = ?)`,
  ).run(filePath);
}

function lookupSymbolId(db: Database.Database, targetPath: string, targetName: string): number | null {
  const short = targetName.includes('.') ? targetName.split('.').pop()! : targetName;
  const row = db
    .prepare(
      `SELECT id FROM symbol_index
       WHERE path = ? AND name = ? AND kind NOT IN ('import', 'module')
       ORDER BY line_start LIMIT 1`,
    )
    .get(targetPath, short) as { id: number } | undefined;
  return row?.id ?? null;
}

function resolveEdgeTarget(db: Database.Database, edge: {
  id: number;
  to_name: string;
  to_path: string | null;
}): boolean {
  if (!edge.to_name) return false;
  let targetPath = edge.to_path;
  if (!targetPath) return false;
  targetPath = path.normalize(targetPath);
  const toId = lookupSymbolId(db, targetPath, edge.to_name);
  if (!toId) return false;
  db.prepare(
    `UPDATE symbol_edges SET to_symbol_id = ?, stale = 0, confidence = 'high'
     WHERE id = ?`,
  ).run(toId, edge.id);
  return true;
}

/**
 * Re-resolve stale or unresolved cross-file edges (idle-time worker).
 */
export function sweepStaleEdges(db: Database.Database, limit = SWEEP_BATCH): number {
  const rows = db
    .prepare(
      `SELECT id, to_name, to_path, kind
       FROM symbol_edges
       WHERE (stale = 1 OR (to_symbol_id IS NULL AND to_path IS NOT NULL AND to_name IS NOT NULL))
         AND kind IN ('calls', 'references', 'type_flows_into', 'depends_on')
       ORDER BY stale DESC, id ASC
       LIMIT ?`,
    )
    .all(limit) as Array<{ id: number; to_name: string; to_path: string | null; kind: string }>;

  let resolved = 0;
  for (const row of rows) {
    if (resolveEdgeTarget(db, row)) resolved++;
  }

  // Re-index TS caller files that still have unresolved call edges (ts-morph refresh)
  const unresolvedCallers = db
    .prepare(
      `SELECT DISTINCT s.path
       FROM symbol_edges e
       JOIN symbol_index s ON e.from_symbol_id = s.id
       WHERE e.stale = 1 AND e.kind = 'calls'
       LIMIT 5`,
    )
    .all() as Array<{ path: string }>;

  for (const { path: filePath } of unresolvedCallers) {
    const ext = path.extname(filePath).replace(/^\./, '');
    if (!isTypeScriptExtension(ext)) continue;
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      indexTypeScript(filePath, content);
      db.prepare(`UPDATE symbol_edges SET stale = 0 WHERE from_symbol_id IN (
        SELECT id FROM symbol_index WHERE path = ?
      ) AND stale = 1`).run(filePath);
    } catch {
      /* skip */
    }
  }

  return resolved;
}

export function startStaleEdgeSweepWorker(
  getDb: () => Database.Database,
  isIdle: () => boolean,
): void {
  if (sweepTimer) return;
  if (process.env.AIGENIUS_DISABLE_STALE_SWEEP === '1') return;

  sweepTimer = setInterval(() => {
    if (sweepRunning || !isIdle()) return;
    sweepRunning = true;
    try {
      const n = sweepStaleEdges(getDb());
      if (n > 0) {
        console.info(`[search] Stale-edge sweep resolved ${n} edge(s)`);
      }
    } catch (err) {
      console.warn('[search] Stale-edge sweep failed:', err);
    } finally {
      sweepRunning = false;
    }
  }, SWEEP_INTERVAL_MS);
  sweepTimer.unref?.();
}

export function stopStaleEdgeSweepWorker(): void {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
}
