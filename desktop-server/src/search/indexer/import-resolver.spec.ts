import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from '@jest/globals';
import { resolveImportPath } from './import-resolver';

describe('resolveImportPath', () => {
  it('resolves relative imports with extension', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aigenius-import-'));
    const dir = path.join(root, 'src');
    fs.mkdirSync(dir, { recursive: true });
    const target = path.join(dir, 'util.ts');
    fs.writeFileSync(target, 'export const x = 1;\n');
    const importer = path.join(dir, 'index.ts');
    fs.writeFileSync(importer, "import { x } from './util';\n");
    expect(resolveImportPath(importer, './util')).toBe(path.normalize(target));
  });
});
