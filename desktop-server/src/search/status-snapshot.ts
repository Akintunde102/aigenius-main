import type Database from 'better-sqlite3';
import { getStatus } from './db/queries.js';

export type SearchStatusSnapshot = {
  indexed: number;
  watching: boolean;
  lastRun: number;
  scan_in_progress: boolean;
  queue_depth: number;
  db_path: string;
};

let snapshot: SearchStatusSnapshot = {
  indexed: 0,
  watching: false,
  lastRun: 0,
  scan_in_progress: false,
  queue_depth: 0,
  db_path: '',
};

export function getSearchStatusSnapshot(): SearchStatusSnapshot {
  return { ...snapshot };
}

export function setSearchStatusDbPath(dbPath: string): void {
  snapshot = { ...snapshot, db_path: dbPath, watching: true };
}

export function updateSearchStatusCache(
  partial: Partial<SearchStatusSnapshot>,
): void {
  snapshot = { ...snapshot, ...partial };
}

export function refreshSearchStatusFromDb(db: Database.Database): void {
  const row = getStatus(db);
  snapshot = {
    ...snapshot,
    indexed: row.indexed,
    lastRun: row.lastRun,
    watching: true,
  };
}

export function resetSearchStatusSnapshot(): void {
  snapshot = {
    indexed: 0,
    watching: false,
    lastRun: 0,
    scan_in_progress: false,
    queue_depth: 0,
    db_path: '',
  };
}
