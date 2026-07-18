import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { createTestSearchDb, isSqliteNativeAvailable, normPath } from './test-db.js';
import { upsertFile } from '../db/queries.js';
import { upsertFileStructure } from '../db/queries-chunks.js';
import {
  getContext,
  getFileOverview,
  getSymbolDetail,
  findSymbolReferences,
} from '../db/queries-intelligence.js';

describe('code intelligence layer (two-stage)', () => {
  if (!isSqliteNativeAvailable()) {
    it.skip('requires better-sqlite3 native bindings', () => {});
    return;
  }

  let db: ReturnType<typeof createTestSearchDb>;
  let projectRoot: string;

  beforeEach(() => {
    db = createTestSearchDb();
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aigenius-intel-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  async function indexFile(rel: string, content: string, ext: string): Promise<string> {
    const abs = path.join(projectRoot, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
    upsertFile(db, {
      path: abs,
      name: path.basename(abs),
      mtime: Date.now(),
      content,
      tags: ext,
      extension: ext,
      content_hash: 'test',
      language: ext,
      index_status: 'ok',
      last_indexed: Date.now(),
    });
    await upsertFileStructure(db, abs, content, ext, '');
    return abs;
  }

  it('indexes TS symbols and call edges via ts-morph', async () => {
    const util = await indexFile(
      'src/util.ts',
      `export function helper() { return 1; }\n`,
      'ts',
    );
    const service = await indexFile(
      'src/service.ts',
      `import { helper } from './util';\nexport function run() { return helper(); }\n`,
      'ts',
    );

    const overview = getFileOverview(db, service);
    expect(overview.symbols.some((s) => s.name === 'run')).toBe(true);

    const detail = getSymbolDetail(db, service, 'run');
    expect(detail).not.toBeNull();
    expect(detail!.callees.some((c) => c.name.includes('helper'))).toBe(true);

    const refs = findSymbolReferences(db, util, 'helper');
    expect(refs.total).toBeGreaterThanOrEqual(0);
    expect(normPath(service)).toContain('service');
  });

  it('getContext resolves file path to overview', async () => {
    const fp = await indexFile('src/a.ts', `export const x = 1;\n`, 'ts');
    const ctx = await getContext(db, '', fp);
    expect(ctx.type).toBe('file');
    expect(ctx.overview?.path).toBe(fp);
  });

  it('detects Nest-style boundaries', async () => {
    const fp = await indexFile(
      'src/routes.ts',
      `@Get('/health')\nexport function health() {}\n`,
      'ts',
    );
    const overview = getFileOverview(db, fp);
    expect(overview.boundaries.some((b) => b.type === 'http_route')).toBe(true);
  });

  it('indexes makefile targets', async () => {
    const fp = await indexFile(
      'Makefile',
      `all: build test\nbuild: src/main\n`,
      '',
    );
    const ctx = await getContext(db, '', fp);
    expect(ctx.type).toBe('file');
    const targets = db
      .prepare('SELECT target FROM makefile_targets WHERE file_path = ?')
      .all(fp) as Array<{ target: string }>;
    expect(targets.some((t) => t.target === 'all')).toBe(true);
  });
});
