import fs from 'fs';
import path from 'path';
import type { IndexTier } from './indexer/index-tier.js';

export type IndexerProjectStatus = {
  project_id: string;
  project_root: string;
  db_path: string;
  indexed: number;
  last_run: number;
  is_active: boolean;
  watching: boolean;
  /** Text + structure indexing complete for this project; queue idle. */
  index_ready: boolean;
};

export type IndexerHealthStatus = {
  indexer_ipc_reachable: boolean;
  db_integrity: 'ok' | 'unknown' | 'failed';
  last_error: string | null;
  queue_text_depth: number;
  queue_structure_depth: number;
};

export type IndexerStatusFile = {
  updated_at_ms: number;
  db_path: string;
  project_root: string | null;
  active_project_id?: string | null;
  projects?: IndexerProjectStatus[];
  watching: boolean;
  indexed: number;
  last_run: number;
  scan_in_progress: boolean;
  queue_depth: number;
  queue_by_tier: Record<IndexTier, number>;
  core_ready: boolean;
  enrichment_ready: boolean;
  health?: IndexerHealthStatus;
};

function statusFilePath(userData: string): string {
  return path.join(userData, 'indexer-status.json');
}

export function writeIndexerStatusFile(userData: string, status: IndexerStatusFile): void {
  if (!userData) return;
  const target = statusFilePath(userData);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(status), 'utf8');
    try {
      fs.renameSync(tmp, target);
    } catch {
      // Windows may block rename when another process reads the target file.
      try {
        if (fs.existsSync(target)) {
          fs.unlinkSync(target);
        }
        fs.renameSync(tmp, target);
      } catch (err) {
        try {
          fs.copyFileSync(tmp, target);
        } finally {
          try {
            fs.unlinkSync(tmp);
          } catch {
            /* ignore */
          }
        }
        if (!fs.existsSync(target)) {
          throw err;
        }
      }
    }
  } catch (err) {
    try {
      if (fs.existsSync(tmp)) {
        fs.unlinkSync(tmp);
      }
    } catch {
      /* ignore */
    }
    console.warn('[indexer-status] failed to write status file:', err);
  }
}

export function readIndexerStatusFile(userData: string): IndexerStatusFile | null {
  if (!userData) return null;
  try {
    const raw = fs.readFileSync(statusFilePath(userData), 'utf8');
    return JSON.parse(raw) as IndexerStatusFile;
  } catch {
    return null;
  }
}

export function computeCoreReady(counts: Record<IndexTier, number>): boolean {
  return counts.project_core === 0;
}

export function computeEnrichmentReady(counts: Record<IndexTier, number>): boolean {
  return (
    counts.project_core === 0
    && counts.project_docs === 0
    && counts.project_media === 0
    && counts.idle_project === 0
  );
}
