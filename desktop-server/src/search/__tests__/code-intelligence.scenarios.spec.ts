import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { createTestSearchDb, isSqliteNativeAvailable, normPath } from './test-db.js';
import { upsertFile, deleteFile } from '../db/queries.js';
import {
  upsertFileStructure,
  ragQueryChunks,
  ragQuerySmart,
  buildProjectArchitecture,
  listSymbolsForFile,
} from '../db/queries-chunks.js';
import {
  computeBlastRadius,
  formatBlastRadiusReport,
  listImportsForFile,
} from '../db/queries-import-graph.js';
import { vectorToBlob } from '../embedding/hash-embedder.js';
import { hashEmbedText } from '../embedding/hash-embedder.js';
import { reciprocalRankFusion } from '../embedding/embedder.js';

describe('code intelligence scenarios (Phases 5–7)', () => {
  if (!isSqliteNativeAvailable()) {
    it.skip('requires better-sqlite3 native bindings (npm rebuild better-sqlite3)', () => {});
    return;
  }

  let db: ReturnType<typeof createTestSearchDb>;
  let projectRoot: string;

  beforeEach(() => {
    db = createTestSearchDb();
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aigenius-ci-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  function writeFile(rel: string, content: string): string {
    const abs = path.join(projectRoot, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
    return abs;
  }

  async function indexFile(absPath: string, content: string, ext: string): Promise<void> {
    upsertFile(db, {
      path: absPath,
      name: path.basename(absPath),
      mtime: Date.now(),
      content,
      tags: ext,
      extension: ext,
    });
    await upsertFileStructure(db, absPath, content, ext, '');
  }

  describe('Scenario A — index a small TypeScript service layer', () => {
    it('extracts symbols, symbol-bounded chunks, and resolved imports', async () => {
      const utilPath = writeFile(
        'src/util.ts',
        `export function helper() {\n  return 42;\n}\n`,
      );
      const servicePath = writeFile(
        'src/service.ts',
        `import { helper } from './util';\n\nexport class UserService {\n  run() {\n    return helper();\n  }\n}\n`,
      );

      await indexFile(utilPath, fs.readFileSync(utilPath, 'utf8'), 'ts');
      await indexFile(servicePath, fs.readFileSync(servicePath, 'utf8'), 'ts');

      const utilSymbols = listSymbolsForFile(db, utilPath);
      const serviceSymbols = listSymbolsForFile(db, servicePath);
      const serviceImports = listImportsForFile(db, servicePath);

      expect(utilSymbols.some((s) => s.kind === 'function' && s.name === 'helper')).toBe(true);
      expect(serviceSymbols.some((s) => s.kind === 'class' && s.name === 'UserService')).toBe(true);
      expect(serviceImports.some((i) => i.module_spec === './util')).toBe(true);
      expect(serviceImports[0]?.imported_path).toBe(normPath(utilPath));

      const chunkCount = (
        db.prepare('SELECT COUNT(*) AS c FROM file_chunks').get() as { c: number }
      ).c;
      expect(chunkCount).toBeGreaterThanOrEqual(2);

      expect({
        utilSymbols: utilSymbols.map((s) => ({ kind: s.kind, name: s.name, line: s.line_start })),
        serviceSymbols: serviceSymbols.map((s) => ({ kind: s.kind, name: s.name, line: s.line_start })),
        importEdge: serviceImports.map((i) => ({
          from: normPath(i.importer_path),
          to: i.imported_path ? normPath(i.imported_path) : null,
          spec: i.module_spec,
        })),
      }).toMatchSnapshot();
    });
  });

  describe('Scenario B — import blast radius (transitive importers)', () => {
    it('walks reverse import graph from a leaf module', async () => {
      const leaf = writeFile('src/leaf.ts', `export const LEAF = 1;\n`);
      const mid = writeFile('src/mid.ts', `import { LEAF } from './leaf';\nexport const MID = LEAF;\n`);
      const top = writeFile('src/top.ts', `import { MID } from './mid';\nexport const TOP = MID;\n`);

      for (const p of [leaf, mid, top]) {
        await indexFile(p, fs.readFileSync(p, 'utf8'), 'ts');
      }

      const blast = computeBlastRadius(db, [leaf], projectRoot, 4);
      const report = formatBlastRadiusReport({
        ...blast,
        seeds: blast.seeds.map(normPath),
        impacted: blast.impacted.map((r) => ({
          ...r,
          path: normPath(r.path),
          via: normPath(r.via),
        })),
      });

      expect(blast.impacted.map((r) => normPath(r.path)).sort()).toEqual(
        [normPath(mid), normPath(top)].sort(),
      );
      expect(report).toMatchSnapshot();
    });

    it('seeds edit-session style multi-file blast radius', async () => {
      const a = writeFile('pkg/a.ts', `export const A = 1;\n`);
      const b = writeFile('pkg/b.ts', `import { A } from './a';\nexport const B = A;\n`);
      const c = writeFile('pkg/c.ts', `import { B } from './b';\nexport const C = B;\n`);
      await indexFile(a, fs.readFileSync(a, 'utf8'), 'ts');
      await indexFile(b, fs.readFileSync(b, 'utf8'), 'ts');
      await indexFile(c, fs.readFileSync(c, 'utf8'), 'ts');

      const blast = computeBlastRadius(db, [a, b], projectRoot, 3);
      expect(blast.impacted.some((r) => normPath(r.path) === normPath(c))).toBe(true);
    });
  });

  describe('Scenario C — chunk-level FTS RAG', () => {
    it('returns symbol-named hits scoped to project prefix', async () => {
      const filePath = writeFile(
        'src/auth.ts',
        `export function validateToken() {\n  return true;\n}\n\nexport function refreshSession() {\n  return 'ok';\n}\n`,
      );
      await indexFile(filePath, fs.readFileSync(filePath, 'utf8'), 'ts');

      const result = ragQueryChunks(db, 'validateToken', '', 5, projectRoot);
      expect(result.hit_count).toBeGreaterThan(0);
      expect(result.hits[0]?.symbol_name).toBe('validateToken');
      expect(normPath(result.hits[0]!.path)).toBe(normPath(filePath));

      expect({
        hit_count: result.hit_count,
        first: {
          symbol: result.hits[0]?.symbol_name,
          lines: [result.hits[0]?.line_start, result.hits[0]?.line_end],
          snippet: result.hits[0]?.snippet?.slice(0, 40),
        },
      }).toMatchSnapshot();
    });

    it('falls back to file-level ragQuerySmart when no chunk query', async () => {
      const filePath = writeFile('docs/readme.txt', `authentication flow documentation\n`);
      await indexFile(filePath, fs.readFileSync(filePath, 'utf8'), 'txt');

      const browse = ragQuerySmart(db, '', '', 5, projectRoot);
      expect(browse.hit_count).toBeGreaterThan(0);
    });
  });

  describe('Scenario D — hybrid RRF ranking', () => {
    it('fuses FTS and vector lists with reciprocal rank fusion', () => {
      const fts = [
        { id: 'chunk:1', path: '/p/a.ts', name: 'a.ts', score: 1 },
        { id: 'chunk:2', path: '/p/b.ts', name: 'b.ts', score: 0.5 },
      ];
      const vec = [
        { id: 'chunk:2', path: '/p/b.ts', name: 'b.ts', score: 0.99 },
        { id: 'chunk:3', path: '/p/c.ts', name: 'c.ts', score: 0.8 },
      ];
      const fused = reciprocalRankFusion([fts, vec], 60);
      expect(fused[0]?.id).toBe('chunk:2');
      expect(fused.map((f) => f.id)).toMatchSnapshot();
    });

    it('stores chunk embeddings for semantic leg', async () => {
      const filePath = writeFile('src/x.ts', `export function alpha() {}\nexport function beta() {}\n`);
      await indexFile(filePath, fs.readFileSync(filePath, 'utf8'), 'ts');

      const chunks = db.prepare('SELECT id, content FROM file_chunks WHERE path = ?').all(filePath) as Array<{
        id: number;
        content: string;
      }>;
      expect(chunks.length).toBeGreaterThan(0);

      const vec = hashEmbedText(chunks[0]!.content);
      db.prepare('INSERT INTO chunk_embeddings (chunk_id, vector) VALUES (?, ?)').run(
        chunks[0]!.id,
        vectorToBlob(vec),
      );

      const embCount = (db.prepare('SELECT COUNT(*) AS c FROM chunk_embeddings').get() as { c: number }).c;
      expect(embCount).toBe(1);
    });
  });

  describe('Scenario E — project architecture summary', () => {
    it('builds architecture markdown for indexed project', async () => {
      const f1 = writeFile('src/index.ts', `export function main() {}\n`);
      const f2 = writeFile('src/types.ts', `export interface User { id: string }\n`);
      await indexFile(f1, fs.readFileSync(f1, 'utf8'), 'ts');
      await indexFile(f2, fs.readFileSync(f2, 'utf8'), 'ts');

      const outline = buildProjectArchitecture(db, projectRoot, 'Demo Project');
      expect(outline).toContain('Demo Project');
      expect(outline).toContain('Indexed files: 2');
      expect(outline).toMatchSnapshot();
    });
  });

  describe('Scenario F — re-index replaces stale structure', () => {
    it('drops old symbols and imports on file update', async () => {
      const filePath = writeFile('src/mut.ts', `export function oldName() {}\n`);
      await indexFile(filePath, fs.readFileSync(filePath, 'utf8'), 'ts');
      expect(listSymbolsForFile(db, filePath).some((s) => s.name === 'oldName')).toBe(true);

      const updated = `export function newName() {}\nimport { x } from './other';\n`;
      writeFile('src/mut.ts', updated);
      await indexFile(filePath, updated, 'ts');

      const symbols = listSymbolsForFile(db, filePath);
      expect(symbols.some((s) => s.name === 'oldName')).toBe(false);
      expect(symbols.some((s) => s.name === 'newName')).toBe(true);
      expect(listImportsForFile(db, filePath).some((i) => i.module_spec === './other')).toBe(true);
    });

    it('cascades delete through file_index removal', async () => {
      const filePath = writeFile('src/del.ts', `export const X = 1;\n`);
      await indexFile(filePath, fs.readFileSync(filePath, 'utf8'), 'ts');
      deleteFile(db, filePath);

      expect(db.prepare('SELECT COUNT(*) AS c FROM symbol_index WHERE path = ?').get(filePath)).toEqual({ c: 0 });
      expect(db.prepare('SELECT COUNT(*) AS c FROM file_chunks WHERE path = ?').get(filePath)).toEqual({ c: 0 });
      expect(db.prepare('SELECT COUNT(*) AS c FROM import_index WHERE importer_path = ?').get(filePath)).toEqual({
        c: 0,
      });
    });
  });
});
