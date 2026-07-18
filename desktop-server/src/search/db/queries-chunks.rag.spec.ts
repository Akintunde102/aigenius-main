import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { createTestSearchDb, isSqliteNativeAvailable } from '../__tests__/test-db.js';
import { upsertFile } from '../db/queries.js';
import { upsertFileStructure, ragQueryChunks } from '../db/queries-chunks.js';

describe('ragQueryChunks content_query', () => {
  if (!isSqliteNativeAvailable()) {
    it.skip('requires better-sqlite3 native bindings', () => {});
    return;
  }

  let db: ReturnType<typeof createTestSearchDb>;
  let projectRoot: string;

  beforeEach(() => {
    db = createTestSearchDb();
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aigenius-rag-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('does not throw SqliteError on content_query', async () => {
    const filePath = path.join(projectRoot, 'src', 'auth.ts');
    const content = `export function validateToken(jwt: string) {\n  return jwt.length > 0;\n}\n`;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');

    upsertFile(db, {
      path: filePath,
      name: 'auth.ts',
      mtime: Date.now(),
      content,
      tags: 'ts',
      extension: 'ts',
    });
    await upsertFileStructure(db, filePath, content, 'ts', '');

    expect(() =>
      ragQueryChunks(db, 'validateToken', '', 5, projectRoot),
    ).not.toThrow();

    const result = ragQueryChunks(db, 'validateToken', '', 5, projectRoot);
    expect(result.hit_count).toBeGreaterThan(0);
    expect(result.hits[0]?.snippet).toBeTruthy();
  });

  it('supports boolean OR queries without SqliteError', async () => {
    const filePath = path.join(projectRoot, 'src', 'api.ts');
    const content = `export function bulkUpdate() {}\nexport function deleteItem() {}\n`;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');

    upsertFile(db, {
      path: filePath,
      name: 'api.ts',
      mtime: Date.now(),
      content,
      tags: 'ts',
      extension: 'ts',
    });
    await upsertFileStructure(db, filePath, content, 'ts', '');

    expect(() => ragQueryChunks(db, 'bulk OR delete', '', 10, projectRoot)).not.toThrow();

    const result = ragQueryChunks(db, 'bulk OR delete', '', 10, projectRoot);
    expect(result.hit_count).toBeGreaterThan(0);
  });
});
