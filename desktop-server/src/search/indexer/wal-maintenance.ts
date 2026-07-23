import type Database from 'better-sqlite3';

const CHECKPOINT_INTERVAL_MS = 5 * 60_000;
const INTEGRITY_INTERVAL_MS = 30 * 60_000;

let checkpointTimer: NodeJS.Timeout | null = null;
let integrityTimer: NodeJS.Timeout | null = null;

export function startWalMaintenance(listDbs: () => Database.Database[]): void {
  stopWalMaintenance();

  checkpointTimer = setInterval(() => {
    for (const db of listDbs()) {
      try {
        db.pragma('wal_checkpoint(PASSIVE)');
      } catch (err) {
        console.warn('[search-wal] checkpoint failed:', err);
      }
    }
  }, CHECKPOINT_INTERVAL_MS);

  integrityTimer = setInterval(() => {
    for (const db of listDbs()) {
      try {
        const row = db.prepare('PRAGMA quick_check').get() as { quick_check?: string } | undefined;
        const status = row?.quick_check ?? 'unknown';
        if (status !== 'ok') {
          console.warn('[search-wal] quick_check reported:', status);
        }
      } catch (err) {
        console.warn('[search-wal] quick_check failed:', err);
      }
    }
  }, INTEGRITY_INTERVAL_MS);
}

export function stopWalMaintenance(): void {
  if (checkpointTimer) {
    clearInterval(checkpointTimer);
    checkpointTimer = null;
  }
  if (integrityTimer) {
    clearInterval(integrityTimer);
    integrityTimer = null;
  }
}
