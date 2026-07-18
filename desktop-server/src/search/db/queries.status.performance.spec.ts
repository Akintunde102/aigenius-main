import type Database from 'better-sqlite3';
import { createTestSearchDb, isSqliteNativeAvailable } from '../__tests__/test-db.js';
import { getStatus, upsertFile } from './queries.js';
import { assertWithinBudget, percentileTiming, timed } from '../../__tests__/timing.utils.js';

const FILE_COUNT_BUDGETS: Array<{ files: number; maxMs: number }> = [
  { files: 0, maxMs: 10 },
  { files: 100, maxMs: 25 },
  { files: 1_000, maxMs: 75 },
  { files: 5_000, maxMs: 200 },
];

function seedFiles(db: Database.Database, count: number): void {
  const batch = db.transaction((n: number) => {
    for (let i = 0; i < n; i += 1) {
      upsertFile(db, {
        path: `/home/user/project/src/module-${i}.ts`,
        name: `module-${i}.ts`,
        mtime: 1_700_000_000_000 + i,
        content: `export const value${i} = ${i};`,
        tags: 'ts',
        extension: 'ts',
        content_hash: `hash-${i}`,
        language: 'ts',
        index_status: 'ok',
        last_indexed: 1_700_000_000_000 + i,
      });
    }
  });
  batch(count);
}

describe('getStatus performance', () => {
  if (!isSqliteNativeAvailable()) {
    it.skip('requires better-sqlite3 native bindings', () => {});
    return;
  }

  let db: Database.Database;

  beforeEach(() => {
    db = createTestSearchDb();
  });

  afterEach(() => {
    db.close();
  });

  it.each(FILE_COUNT_BUDGETS)(
    'returns status for $files files within $maxMs ms',
  async ({ files, maxMs }) => {
    seedFiles(db, files);

    const { ms, result } = await timed(() => getStatus(db));
    expect(result.indexed).toBe(files);
    if (files > 0) {
      expect(result.lastRun).toBe(1_700_000_000_000 + files - 1);
    } else {
      expect(result.lastRun).toBe(0);
    }
    assertWithinBudget(ms, { label: `getStatus(${files})`, maxMs });
  });

  it('p95 stays within budget for 1k files over 30 iterations', async () => {
    seedFiles(db, 1_000);
    const { p95 } = await percentileTiming(30, () => getStatus(db));
    assertWithinBudget(p95, { label: 'getStatus(1000) p95', maxMs: 75 });
  });
});
