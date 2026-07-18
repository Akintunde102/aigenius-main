import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from '@jest/globals';
import { walkProjectFiles } from './project-walk';

describe('walkProjectFiles', () => {
  it('indexes files and respects aigeniusignore', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aigenius-walk-'));
    fs.writeFileSync(path.join(root, 'keep.ts'), 'export const x = 1;\n');
    fs.mkdirSync(path.join(root, 'node_modules'));
    fs.writeFileSync(path.join(root, 'node_modules', 'skip.ts'), 'skip');
    fs.writeFileSync(path.join(root, '.aigeniusignore'), 'ignored.ts\n');
    fs.writeFileSync(path.join(root, 'ignored.ts'), 'ignored');

    const files = walkProjectFiles(root);
    expect(files.some((f) => f.endsWith('keep.ts'))).toBe(true);
    expect(files.some((f) => f.includes('node_modules'))).toBe(false);
    expect(files.some((f) => f.endsWith('ignored.ts'))).toBe(false);
  });
});
