import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  collectFastIndexPocketPaths,
  rememberPocketPaths,
  getRememberedPocketPaths,
} from '../fast-index-pocket.js';

describe('fast-index-pocket', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aigenius-pocket-'));
    fs.writeFileSync(path.join(tmpRoot, 'package.json'), '{"name":"t"}');
    fs.mkdirSync(path.join(tmpRoot, 'src'));
    fs.writeFileSync(path.join(tmpRoot, 'src', 'index.ts'), 'export const x = 1;\n');
    fs.writeFileSync(path.join(tmpRoot, 'noise.bin'), 'binary');
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('collectFastIndexPocketPaths includes entry-point files and shallow src/', () => {
    const paths = collectFastIndexPocketPaths(tmpRoot);
    const rel = paths.map((p) => path.relative(tmpRoot, p).replace(/\\/g, '/'));
    expect(rel).toContain('package.json');
    expect(rel).toContain('src/index.ts');
    expect(rel).not.toContain('noise.bin');
  });

  it('rememberPocketPaths merges explicit hints into collection', () => {
    const dbPath = path.join(tmpRoot, 'index.sqlite');
    const hint = path.join(tmpRoot, 'noise.bin');
    rememberPocketPaths(dbPath, [hint]);
    const paths = collectFastIndexPocketPaths(tmpRoot, getRememberedPocketPaths(dbPath));
    expect(paths).toContain(path.normalize(hint));
  });
});
