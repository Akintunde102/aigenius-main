import fs from 'fs';
import type { IndexTier } from './index-tier.js';
import { isDeviceFastIndexEnabled } from './device-fast-index-enabled.js';
import { listDeviceFastIndexRoots } from './device-fast-index-pocket.js';
import Database from 'better-sqlite3';
import { homedirIndexDbPath } from '../project-index-registry.js';

export type DeviceFastIndexReadiness = {
  enabled: boolean;
  mode: 'disabled' | 'warming' | 'ready';
  roots: string[];
  indexedFiles: number;
  fastPocketQueueDepth: number;
};

function homedirIndexedCount(userData: string): number {
  if (!userData) return 0;
  const dbPath = homedirIndexDbPath(userData);
  try {
    if (!fs.existsSync(dbPath)) return 0;
    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare('SELECT COUNT(*) AS indexed FROM files').get() as { indexed?: number };
    db.close();
    return typeof row?.indexed === 'number' ? row.indexed : 0;
  } catch {
    return 0;
  }
}

/** Device fast pocket is ready when the fast_pocket queue is idle (files may still be warming in other tiers). */
export function readDeviceFastIndexReadiness(
  userData: string,
  queueByTier?: Partial<Record<IndexTier, number>>,
): DeviceFastIndexReadiness {
  const enabled = isDeviceFastIndexEnabled();
  const roots = enabled && userData ? listDeviceFastIndexRoots(userData) : [];
  const fastPocketQueueDepth = queueByTier?.fast_pocket ?? 0;
  const indexedFiles = enabled && userData ? homedirIndexedCount(userData) : 0;

  if (!enabled) {
    return {
      enabled: false,
      mode: 'disabled',
      roots: [],
      indexedFiles: 0,
      fastPocketQueueDepth: 0,
    };
  }

  if (fastPocketQueueDepth > 0) {
    return {
      enabled: true,
      mode: 'warming',
      roots,
      indexedFiles,
      fastPocketQueueDepth,
    };
  }

  return {
    enabled: true,
    mode: 'ready',
    roots,
    indexedFiles,
    fastPocketQueueDepth: 0,
  };
}
