import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db/connection.js';
import {
  upsertFile,
  deleteFile,
  checkMtime,
  searchFiles,
  ragQuery,
  getStatus,
  browseFileIndex,
  browseFolderGroups,
  browseExplorerDirectory,
  getFileIndexRow,
  ensureBrowseSqlFunctions,
} from '../db/queries.js';

// Point __dirname at the src/search directory so schema.sql resolves correctly
jest.mock('../db/connection', () => {
  const Database = jest.requireActual<typeof import('better-sqlite3')>('better-sqlite3');
  const fs = jest.requireActual<typeof import('fs')>('fs');
  const path = jest.requireActual<typeof import('path')>('path');

  let _db: InstanceType<typeof Database> | null = null;

  return {
    getDb: (_dbPath: string) => {
      if (_db) return _db;
      const db = new Database(':memory:');
      db.pragma('journal_mode = WAL');
      const schemaFiles = ['schema.sql', 'schema-chunks.sql', 'schema-import-graph.sql'];
      for (const file of schemaFiles) {
        db.exec(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'));
      }
      _db = db;
      return db;
    },
    closeDb: () => {
      if (_db) { _db.close(); _db = null; }
    },
  };
});

describe('search db queries', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    for (const file of ['schema.sql', 'schema-chunks.sql', 'schema-import-graph.sql']) {
      db.exec(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'));
    }
    ensureBrowseSqlFunctions(db);
  });

  const sampleFile = {
    path: '/home/user/docs/hello.txt',
    name: 'hello.txt',
    mtime: 1_700_000_000,
    content: 'The quick brown fox jumps',
    tags: 'txt',
    extension: 'txt',
  };

  describe('upsertFile', () => {
    it('inserts a new record', () => {
      upsertFile(db, sampleFile);
      const row = db
        .prepare('SELECT * FROM file_index WHERE path = ?')
        .get(sampleFile.path) as typeof sampleFile | undefined;
      expect(row).toBeDefined();
      expect(row!.name).toBe('hello.txt');
    });

    it('replaces an existing record on duplicate path', () => {
      upsertFile(db, sampleFile);
      upsertFile(db, { ...sampleFile, content: 'updated content', mtime: 1_700_000_001 });
      const row = db
        .prepare('SELECT * FROM file_index WHERE path = ?')
        .get(sampleFile.path) as typeof sampleFile | undefined;
      expect(row!.mtime).toBe(1_700_000_001);
      expect(row!.content).toBe('updated content');
    });
  });

  describe('checkMtime', () => {
    it('returns null for unknown path', () => {
      expect(checkMtime(db, '/nonexistent/file.txt')).toBeNull();
    });

    it('returns stored mtime after upsert', () => {
      upsertFile(db, sampleFile);
      expect(checkMtime(db, sampleFile.path)).toBe(sampleFile.mtime);
    });
  });

  describe('deleteFile', () => {
    it('removes the file from the index', () => {
      upsertFile(db, sampleFile);
      deleteFile(db, sampleFile.path);
      expect(checkMtime(db, sampleFile.path)).toBeNull();
    });

    it('is a no-op for non-existent paths', () => {
      expect(() => deleteFile(db, '/no/such/file.txt')).not.toThrow();
    });
  });

  describe('searchFiles', () => {
    it('returns matching results', () => {
      upsertFile(db, sampleFile);
      const results = searchFiles(db, 'fox', 10);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].path).toBe(sampleFile.path);
    });

    it('returns empty array for no match', () => {
      upsertFile(db, sampleFile);
      const results = searchFiles(db, 'zzznomatch999', 10);
      expect(results).toHaveLength(0);
    });

    it('respects the limit parameter', () => {
      for (let i = 0; i < 5; i++) {
        upsertFile(db, {
          path: `/home/user/docs/fox-${i}.txt`,
          name: `fox-${i}.txt`,
          mtime: 1_700_000_000 + i,
          content: 'fox is here',
          tags: 'txt',
          extension: 'txt',
        });
      }
      const results = searchFiles(db, 'fox', 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('ragQuery', () => {
    it('matches the file basename even when body text does not contain the term', () => {
      upsertFile(db, {
        path: '/home/user/docs/quarterly_quux_summary.xlsx',
        name: 'quarterly_quux_summary.xlsx',
        mtime: 10,
        content: 'generic spreadsheet cells',
        tags: '',
        extension: 'xlsx',
      });
      upsertFile(db, {
        path: '/home/user/docs/other.txt',
        name: 'other.txt',
        mtime: 11,
        content: 'summary of unrelated topics',
        tags: '',
        extension: 'txt',
      });
      const res = ragQuery(db, 'quux', 10);
      expect(res.hits.some((h) => h.path === '/home/user/docs/quarterly_quux_summary.xlsx')).toBe(true);
      expect(res.hits.some((h) => h.path === '/home/user/docs/other.txt')).toBe(false);
    });

    it('matches extracted body text', () => {
      upsertFile(db, {
        path: '/home/user/docs/hello.txt',
        name: 'hello.txt',
        mtime: 20,
        content: 'The quick brown fox jumps',
        tags: '',
        extension: 'txt',
      });
      const res = ragQuery(db, 'fox', 10);
      expect(res.hit_count).toBeGreaterThan(0);
      expect(res.hits[0]?.path).toBe('/home/user/docs/hello.txt');
    });

    it('matches text stored from image OCR in content (same column as documents)', () => {
      upsertFile(db, {
        path: '/home/user/scans/receipt.png',
        name: 'receipt.png',
        mtime: 30,
        content: 'INVOICE-ID-XY77ZZ merchant downtown',
        tags: 'image ocr',
        extension: 'png',
      });
      const res = ragQuery(db, 'XY77ZZ', 10);
      expect(res.hits.some((h) => h.path === '/home/user/scans/receipt.png')).toBe(true);
    });

    it('matches indexed tags', () => {
      upsertFile(db, {
        path: '/home/user/photos/vacation.jpg',
        name: 'vacation.jpg',
        mtime: 40,
        content: '',
        tags: 'beach hawaii snorkeling',
        extension: 'jpg',
      });
      const res = ragQuery(db, 'snorkeling', 10);
      expect(res.hits.some((h) => h.path === '/home/user/photos/vacation.jpg')).toBe(true);
    });

    it('does not match parent-folder tokens that only appear in the full path', () => {
      upsertFile(db, {
        path: '/data/myproject/secretfolderunique/doc.txt',
        name: 'doc.txt',
        mtime: 50,
        content: 'hello world',
        tags: '',
        extension: 'txt',
      });
      const res = ragQuery(db, 'secretfolderunique', 10);
      expect(res.hits).toHaveLength(0);
    });

    it('strips FTS5 column qualifiers (e.g. OS:term) instead of SQLITE_ERROR no such column', () => {
      upsertFile(db, {
        path: '/notes/os-note.txt',
        name: 'os-note.txt',
        mtime: 60,
        content: 'Discussing OS windows portability',
        tags: '',
        extension: 'txt',
      });
      expect(() => ragQuery(db, 'OS:windows', 10)).not.toThrow();
      const res = ragQuery(db, 'OS:windows', 10);
      expect(res.hit_count).toBeGreaterThan(0);
      expect(res.hits[0]?.path).toBe('/notes/os-note.txt');
    });

    it('normalizes colon look-alikes used in pasted text', () => {
      upsertFile(db, {
        path: '/docs/a.txt',
        name: 'a.txt',
        mtime: 61,
        content: 'API details',
        tags: '',
        extension: 'txt',
      });
      const fullwidth = 'API\uFF1Adetails'; // API：details
      expect(() => ragQuery(db, fullwidth, 10)).not.toThrow();
      expect(ragQuery(db, fullwidth, 10).hit_count).toBeGreaterThan(0);
    });

    it('browses by path_prefix and extensions when no text query is provided', () => {
      upsertFile(db, {
        path: 'C:\\Users\\DELL5530\\Desktop\\notes.txt',
        name: 'notes.txt',
        mtime: 100,
        content: 'meeting notes',
        tags: '',
        extension: 'txt',
      });
      upsertFile(db, {
        path: 'C:\\Users\\DELL5530\\Desktop\\photo.png',
        name: 'photo.png',
        mtime: 200,
        content: '',
        tags: 'image',
        extension: 'png',
      });
      upsertFile(db, {
        path: 'C:\\Users\\DELL5530\\Downloads\\other.pdf',
        name: 'other.pdf',
        mtime: 300,
        content: 'invoice',
        tags: '',
        extension: 'pdf',
      });

      const res = ragQuery(
        db,
        '',
        '',
        5,
        'C:\\Users\\DELL5530\\Desktop',
        ['txt', 'png', 'jpg'],
      );

      expect(res.hit_count).toBe(2);
      expect(res.hits.map((h) => h.path)).toEqual([
        'C:\\Users\\DELL5530\\Desktop\\photo.png',
        'C:\\Users\\DELL5530\\Desktop\\notes.txt',
      ]);
    });

    it('returns a hint instead of pretending the index is empty when no query or filters', () => {
      upsertFile(db, {
        path: '/home/user/docs/hello.txt',
        name: 'hello.txt',
        mtime: 20,
        content: 'hello',
        tags: '',
        extension: 'txt',
      });

      const res = ragQuery(db, '', '', 5);

      expect(res.hit_count).toBe(0);
      expect(res.scanned_chunks).toBeGreaterThan(0);
      expect(res.hint).toMatch(/content_query|path_prefix/i);
    });
  });

  describe('browseFileIndex', () => {
    it('returns paginated rows with shortened content preview', () => {
      const longContent = 'y'.repeat(500);
      upsertFile(db, sampleFile);
      upsertFile(db, {
        ...sampleFile,
        path: '/photos/cap.png',
        name: 'cap.png',
        mtime: sampleFile.mtime + 100,
        content: longContent,
        tags: 'image ocr png',
        extension: 'png',
      });
      const { rows, total } = browseFileIndex(db, { limit: 10, offset: 0, previewChars: 80 });
      expect(total).toBe(2);
      const png = rows.find((r) => r.path === '/photos/cap.png');
      expect(png?.contentPreview.length).toBeLessThanOrEqual(80);
      expect(rows[0].path).toBe('/photos/cap.png'); // newer mtime first
    });

    it('browseFileIndex succeeds when content is stored as BLOB (no SQLITE_MISMATCH)', () => {
      db.exec(
        `INSERT INTO file_index (path, name, mtime, content, tags, extension)
         VALUES ('/legacy/hello.bin', 'hello.bin', 42, X'68656c6c6f', '', 'bin')`,
      );
      expect(() =>
        browseFileIndex(db, { limit: 20, previewChars: 40, previewTailChars: 0 }),
      ).not.toThrow();
      const { rows, total } = browseFileIndex(db, {
        limit: 20,
      });
      expect(total).toBeGreaterThanOrEqual(1);
      expect(rows.some((r) => r.path === '/legacy/hello.bin')).toBe(true);
    });

    it('filters by extension using path suffix when extension column empty', () => {
      upsertFile(db, {
        ...sampleFile,
        path: '/photos/legacy.PNG',
        name: 'legacy.PNG',
        mtime: 99,
        content: '',
        tags: '',
        extension: '',
      });
      upsertFile(db, {
        ...sampleFile,
        path: '/readme.txt',
        mtime: 100,
        extension: 'txt',
      });
      const { total, rows } = browseFileIndex(db, { extension: 'PNG' });
      expect(total).toBe(1);
      expect(rows).toHaveLength(1);
      expect(rows[0].path.toLowerCase().endsWith('.png')).toBe(true);
    });

    it('matches compound extension by full path suffix (e.g. tar.gz)', () => {
      upsertFile(db, {
        ...sampleFile,
        path: 'C:\\backups\\dump.tar.gz',
        name: 'dump.tar.gz',
        mtime: 200,
        content: '',
        tags: '',
        extension: 'gz',
      });
      upsertFile(db, {
        ...sampleFile,
        path: '/other/file.png',
        name: 'file.png',
        mtime: 201,
        extension: 'png',
      });
      const onlyTarGz = browseFileIndex(db, { extension: 'tar.gz', limit: 20 });
      expect(onlyTarGz.total).toBe(1);
      expect(onlyTarGz.rows[0]?.path).toContain('dump.tar.gz');

      const pngByPath = browseFileIndex(db, { extension: 'png' });
      expect(pngByPath.total).toBe(1);
      expect(pngByPath.rows[0]?.path).toContain('file.png');
    });

    it('sorts by path ascending when requested', () => {
      upsertFile(db, { ...sampleFile, path: '/z-last.txt', mtime: 5, extension: 'txt' });
      upsertFile(db, { ...sampleFile, path: '/a-first.txt', mtime: 10, extension: 'txt' });
      const { rows } = browseFileIndex(db, { sortColumn: 'path', sortDir: 'asc', limit: 10 });
      expect(rows.map((r) => r.path)).toEqual(['/a-first.txt', '/z-last.txt']);
    });

    it('returns head and tail previews when content is long enough', () => {
      const body = `${'a'.repeat(120)}\nMID\n${'b'.repeat(120)}`;
      upsertFile(db, { ...sampleFile, content: body });
      const { rows } = browseFileIndex(db, {
        limit: 5,
        previewChars: 50,
        previewTailChars: 40,
      });
      const row = rows.find((r) => r.path === sampleFile.path);
      expect(row).toBeDefined();
      expect(row!.contentHead.length).toBeLessThanOrEqual(50);
      expect(row!.contentTail.length).toBeGreaterThan(0);
      expect(row!.contentChars).toBeGreaterThan(100);
    });

    it('filters by indexed content substring', () => {
      upsertFile(db, { ...sampleFile, path: '/a.txt', name: 'a.txt', content: 'alpha secret token', extension: 'txt' });
      upsertFile(db, { ...sampleFile, path: '/b.txt', name: 'b.txt', content: 'beta only', extension: 'txt' });
      const { total, rows } = browseFileIndex(db, { contentContains: 'secret' });
      expect(total).toBe(1);
      expect(rows[0].path).toBe('/a.txt');
    });

    it('groups distinct folders for browseFolderGroups', () => {
      upsertFile(db, { ...sampleFile, path: '/home/a/x.txt', name: 'x.txt', extension: 'txt' });
      upsertFile(db, { ...sampleFile, path: '/home/a/y.txt', name: 'y.txt', extension: 'txt' });
      upsertFile(db, { ...sampleFile, path: '/home/b/z.txt', name: 'z.txt', extension: 'txt' });
      const { folders, total } = browseFolderGroups(db, { limit: 20, sortBy: 'folder', sortDir: 'asc' });
      expect(total).toBe(2);
      const a = folders.find((f) => f.folderPath === '/home/a');
      expect(a?.fileCount).toBe(2);
    });

    it('lists first-level folders across roots in explorer root mode', () => {
      upsertFile(db, { ...sampleFile, path: 'C:\\Users\\alice\\a.txt', name: 'a.txt', mtime: 10, extension: 'txt' });
      upsertFile(db, { ...sampleFile, path: 'C:\\Work\\b.txt', name: 'b.txt', mtime: 20, extension: 'txt' });
      upsertFile(db, { ...sampleFile, path: '/var/log/app.log', name: 'app.log', mtime: 30, extension: 'log' });

      const res = browseExplorerDirectory(db, { rootLimit: 20, rootOffset: 0, rootSortBy: 'folder', rootSortDir: 'asc' });
      const roots = res.folders.map((f) => f.folderPath);

      expect(res.mode).toBe('root');
      expect(roots.map(r => path.normalize(r))).toContain(path.normalize('C:\\Users'));
      expect(roots.map(r => path.normalize(r))).toContain(path.normalize('C:\\Work'));
      expect(roots.map(r => path.normalize(r))).toContain(path.normalize('/var'));
      expect(res.totalRootFolders).toBeGreaterThanOrEqual(3);
    });

    it('returns immediate child folders + direct files in explorer directory mode', () => {
      upsertFile(db, { ...sampleFile, path: 'C:\\Users\\alice\\todo.txt', name: 'todo.txt', mtime: 100, extension: 'txt' });
      upsertFile(db, { ...sampleFile, path: 'C:\\Users\\alice\\docs\\note.md', name: 'note.md', mtime: 101, extension: 'md' });
      upsertFile(db, { ...sampleFile, path: 'C:\\Users\\alice\\pics\\a.png', name: 'a.png', mtime: 102, extension: 'png' });
      upsertFile(db, { ...sampleFile, path: 'C:\\Users\\bob\\skip.txt', name: 'skip.txt', mtime: 103, extension: 'txt' });

      const res = browseExplorerDirectory(db, {
        directoryPath: 'C:\\Users\\alice',
        fileLimit: 20,
        fileOffset: 0,
      });

      expect(res.mode).toBe('dir');
      expect(res.currentDirectory).toBe('C:\\Users\\alice');
      expect(res.files.map((f) => f.name)).toContain('todo.txt');
      expect(res.folders.map((f) => f.folderPath)).toContain('C:\\Users\\alice\\docs');
      expect(res.folders.map((f) => f.folderPath)).toContain('C:\\Users\\alice\\pics');
      expect(res.folders.map((f) => f.folderPath)).not.toContain('C:\\Users\\bob');
    });
  });

  describe('getFileIndexRow', () => {
    it('returns null for unknown paths', () => {
      expect(getFileIndexRow(db, '/nope')).toBeNull();
    });

    it('returns row and truncation flag for long content', () => {
      const body = 'z'.repeat(400);
      upsertFile(db, { ...sampleFile, content: body });
      const detail = getFileIndexRow(db, sampleFile.path, 200);
      expect(detail).not.toBeNull();
      expect(detail!.content).toHaveLength(200);
      expect(detail!.contentTruncated).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('returns indexed count 0 on empty DB', () => {
      const status = getStatus(db);
      expect(status.indexed).toBe(0);
    });

    it('counts inserted records', () => {
      upsertFile(db, sampleFile);
      upsertFile(db, { ...sampleFile, path: '/home/user/docs/other.txt', name: 'other.txt', extension: 'txt' });
      const status = getStatus(db);
      expect(status.indexed).toBe(2);
    });
  });
});
