import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { createTestSearchDb, isSqliteNativeAvailable, normPath } from '../__tests__/test-db.js';
import { upsertFile } from './queries.js';
import { upsertFileStructure } from './queries-chunks.js';
import {
  computeBlastRadius,
  formatBlastRadiusReport,
  listImportersOfFile,
  listImportsForFile,
} from './queries-import-graph.js';

describe('queries-import-graph scenarios', () => {
  if (!isSqliteNativeAvailable()) {
    it.skip('requires better-sqlite3 native bindings (npm rebuild better-sqlite3)', () => {});
    return;
  }

  let db: ReturnType<typeof createTestSearchDb>;
  let root: string;

  beforeEach(() => {
    db = createTestSearchDb();
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'aigenius-ig-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(root, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  async function indexTs(rel: string, content: string): Promise<string> {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
    upsertFile(db, {
      path: abs,
      name: path.basename(abs),
      mtime: 1,
      content,
      tags: 'ts',
      extension: 'ts',
    });
    await upsertFileStructure(db, abs, content, 'ts', '');
    return abs;
  }

  it('lists direct importers only at depth 1', async () => {
    const lib = await indexTs('lib.ts', `export const V = 1;\n`);
    const app = await indexTs('app.ts', `import { V } from './lib';\n`);

    const importers = listImportersOfFile(db, lib);
    expect(importers).toHaveLength(1);
    expect(normPath(importers[0]!.importer_path)).toBe(normPath(app));
  });

  it('respects path_prefix filter on blast radius', async () => {
    const shared = await indexTs('shared/util.ts', `export const U = 1;\n`);
    const inApp = await indexTs('apps/web/main.ts', `import { U } from '../../shared/util';\n`);
    const other = await indexTs('other/pkg.ts', `import { U } from '../shared/util';\n`);

    const full = computeBlastRadius(db, [shared], root, 2);
    expect(full.impacted.length).toBeGreaterThanOrEqual(2);

    const scoped = computeBlastRadius(db, [shared], path.join(root, 'apps'), 2);
    const scopedPaths = scoped.impacted.map((r) => normPath(r.path));
    expect(scopedPaths).toContain(normPath(inApp));
    expect(scopedPaths).not.toContain(normPath(other));
  });

  it('snapshot: diamond import graph blast report', async () => {
    const base = await indexTs('diamond/base.ts', `export const B = 1;\n`);
    const left = await indexTs('diamond/left.ts', `import { B } from './base';\nexport const L = B;\n`);
    const right = await indexTs('diamond/right.ts', `import { B } from './base';\nexport const R = B;\n`);
    await indexTs(
      'diamond/merge.ts',
      `import { L } from './left';\nimport { R } from './right';\nexport const M = L + R;\n`,
    );

    const blast = computeBlastRadius(db, [base], path.join(root, 'diamond'), 3);
    const report = formatBlastRadiusReport({
      seeds: [normPath(base)],
      impacted: blast.impacted.map((r) => ({
        path: normPath(r.path),
        depth: r.depth,
        via: normPath(r.via),
      })),
    });
    expect(report).toMatchSnapshot();
  });

  it('returns empty importers for unindexed external package imports', async () => {
    const f = await indexTs('ext.ts', `import fs from 'fs';\nexport const x = 1;\n`);
    const imports = listImportsForFile(db, f);
    expect(imports.some((i) => i.module_spec === 'fs')).toBe(true);
    expect(imports.find((i) => i.module_spec === 'fs')?.imported_path).toBeNull();
    expect(listImportersOfFile(db, f)).toHaveLength(0);
  });
});
