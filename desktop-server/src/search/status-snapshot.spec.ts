import { getSearchStatusSnapshot, refreshSearchStatusFromDb, resetSearchStatusSnapshot, setSearchStatusDbPath, updateSearchStatusCache } from './status-snapshot.js';
import { createTestSearchDb, isSqliteNativeAvailable } from './__tests__/test-db.js';
import { upsertFile } from './db/queries.js';

describe('search status snapshot', () => {
  if (!isSqliteNativeAvailable()) {
    it.skip('requires better-sqlite3 native bindings', () => {});
    return;
  }

  beforeEach(() => {
    resetSearchStatusSnapshot();
  });

  it('returns cached status without querying on read', () => {
    setSearchStatusDbPath('/tmp/project.sqlite');
    updateSearchStatusCache({ indexed: 42, lastRun: 123, scan_in_progress: true, queue_depth: 5 });
    expect(getSearchStatusSnapshot()).toMatchObject({
      indexed: 42,
      lastRun: 123,
      scan_in_progress: true,
      queue_depth: 5,
      db_path: '/tmp/project.sqlite',
    });
  });

  it('refreshes counts from the database', () => {
    const db = createTestSearchDb();
    upsertFile(db, {
      path: '/home/user/a.ts',
      name: 'a.ts',
      mtime: 100,
      content: 'export const x = 1;',
      tags: 'ts',
      extension: 'ts',
    });
    refreshSearchStatusFromDb(db);
    expect(getSearchStatusSnapshot().indexed).toBe(1);
    db.close();
  });
});
