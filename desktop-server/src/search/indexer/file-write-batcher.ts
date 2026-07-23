import { getDb } from '../db/connection.js';
import { upsertFile } from '../db/queries.js';
import type { IndexedFile } from '../types.js';

const DEFAULT_BATCH_SIZE = 24;
const FLUSH_INTERVAL_MS = 400;

type PendingRow = { dbPath: string; file: IndexedFile };

/**
 * Batches file_index upserts per DB inside a single transaction per flush.
 */
export class FileWriteBatcher {
  private readonly buffers = new Map<string, IndexedFile[]>();
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly batchSize = DEFAULT_BATCH_SIZE,
    private readonly flushIntervalMs = FLUSH_INTERVAL_MS,
  ) {}

  add(dbPath: string, file: IndexedFile): void {
    const list = this.buffers.get(dbPath) ?? [];
    list.push(file);
    this.buffers.set(dbPath, list);
    if (list.length >= this.batchSize) {
      this.flushDb(dbPath);
    } else {
      this.scheduleFlush();
    }
  }

  flushAll(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    for (const dbPath of [...this.buffers.keys()]) {
      this.flushDb(dbPath);
    }
  }

  private scheduleFlush(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flushAll();
    }, this.flushIntervalMs);
  }

  private flushDb(dbPath: string): void {
    const batch = this.buffers.get(dbPath);
    if (!batch?.length) return;
    this.buffers.set(dbPath, []);
    const db = getDb(dbPath);
    const run = db.transaction((rows: IndexedFile[]) => {
      for (const row of rows) {
        upsertFile(db, row);
      }
    });
    run(batch);
  }
}
