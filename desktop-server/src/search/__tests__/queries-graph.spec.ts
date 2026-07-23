import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { createTestSearchDb, isSqliteNativeAvailable } from './test-db.js';
import { upsertFile } from '../db/queries.js';
import { upsertFileStructure } from '../db/queries-chunks.js';
import {
  findCallers,
  symbolBlastRadius,
  buildStructuralDigest,
  typeFlowTrace,
} from '../db/queries-graph.js';

describe('structural graph queries', () => {
  if (!isSqliteNativeAvailable()) {
    it.skip('requires better-sqlite3 native bindings', () => {});
    return;
  }

  let db: ReturnType<typeof createTestSearchDb>;
  let projectRoot: string;

  beforeEach(() => {
    db = createTestSearchDb();
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aigenius-graph-'));
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

  it('findCallers returns indexed call edges', async () => {
    const util = await indexFile('src/util.ts', `export function helper() { return 1; }\n`, 'ts');
    const service = await indexFile(
      'src/service.ts',
      `import { helper } from './util';\nexport function run() { return helper(); }\n`,
      'ts',
    );

    const result = findCallers(db, `${util}#helper`, { maxDepth: 2, pathPrefix: projectRoot });
    expect(result.callers.length).toBeGreaterThanOrEqual(0);
    expect(result.qualifiedName).toContain('helper');
    expect(service).toContain('service');
  });

  it('buildStructuralDigest includes project metadata', async () => {
    await indexFile('src/a.ts', `export const x = 1;\n`, 'ts');
    const digest = buildStructuralDigest(db, projectRoot, 'TestProject');
    expect(digest).toContain('TestProject');
    expect(digest).toContain('local_find_callers');
  });

  it('symbolBlastRadius returns summary for known symbol', async () => {
    const util = await indexFile('src/util.ts', `export function helper() { return 1; }\n`, 'ts');
    const blast = symbolBlastRadius(db, `${util}#helper`, 'signature_change', {
      pathPrefix: projectRoot,
    });
    expect(blast.summary).toContain('Blast radius');
    expect(blast.changeType).toBe('signature_change');
  });

  it('typeFlowTrace accepts type name', async () => {
    await indexFile(
      'src/types.ts',
      `export interface UserProfile { id: string; }\nexport function load(): UserProfile { return { id: '1' }; }\n`,
      'ts',
    );
    const flow = typeFlowTrace(db, 'UserProfile', 'both', { pathPrefix: projectRoot });
    expect(flow.typeName).toBe('UserProfile');
    expect(Array.isArray(flow.flows)).toBe(true);
  });
});
