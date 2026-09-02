import fs from 'fs';
import os from 'os';
import path from 'path';
import { bundledGrep } from '../bundled-grep.js';

describe('bundledGrep', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bundled-grep-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('finds pattern matches without ripgrep', () => {
    fs.writeFileSync(path.join(tmpDir, 'alpha.ts'), 'export const hello = 1;\n');
    fs.writeFileSync(path.join(tmpDir, 'beta.ts'), 'const other = 2;\n');

    const result = bundledGrep({
      pattern: 'hello',
      root: tmpDir,
      headLimit: 10,
    });

    expect(result.lines.some((line) => line.file.endsWith('alpha.ts'))).toBe(true);
    expect(result.lines.some((line) => line.text.includes('hello'))).toBe(true);
  });

  it('supports files_with_matches output mode', () => {
    fs.writeFileSync(path.join(tmpDir, 'match.txt'), 'needle\n');
    fs.writeFileSync(path.join(tmpDir, 'miss.txt'), 'haystack\n');

    const result = bundledGrep({
      pattern: 'needle',
      root: tmpDir,
      outputMode: 'files_with_matches',
    });

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.file).toContain('match.txt');
  });

  it('filters with brace glob patterns like **/*.{ts,js,md}', () => {
    fs.writeFileSync(path.join(tmpDir, 'alpha.ts'), 'needle\n');
    fs.writeFileSync(path.join(tmpDir, 'beta.js'), 'needle\n');
    fs.writeFileSync(path.join(tmpDir, 'readme.md'), 'needle\n');
    fs.writeFileSync(path.join(tmpDir, 'skip.txt'), 'needle\n');

    const result = bundledGrep({
      pattern: 'needle',
      root: tmpDir,
      glob: '**/*.{ts,js,md}',
      headLimit: 10,
    });

    expect(result.lines).toHaveLength(3);
    expect(result.lines.some((line) => line.file.endsWith('skip.txt'))).toBe(false);
  });
});
