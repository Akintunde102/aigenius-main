import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import {
  countFileLines,
  formatNumberedLines,
  readFileLines,
  wantsLineBasedRead,
} from './read-file-lines';

describe('read-file-lines', () => {
  let tmpDir = '';

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'read-lines-'));
  });

  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('counts lines in a small file', async () => {
    const file = path.join(tmpDir, 'a.txt');
    await fs.writeFile(file, 'one\ntwo\nthree\n');
    const { totalLines, lineCountOmitted } = await countFileLines(file);
    expect(totalLines).toBe(3);
    expect(lineCountOmitted).toBe(false);
  });

  it('reads a line window with total line count', async () => {
    const file = path.join(tmpDir, 'b.txt');
    await fs.writeFile(file, 'L1\nL2\nL3\nL4\nL5\n');
    const slice = await readFileLines(file, 2, 2);
    expect(slice.lines).toEqual(['L2', 'L3']);
    expect(slice.totalLines).toBe(5);
    expect(slice.lineStart).toBe(2);
    expect(slice.lineEnd).toBe(3);
    expect(slice.truncatedBelow).toBe(true);
  });

  it('formats numbered lines', () => {
    expect(formatNumberedLines(['alpha', 'beta'], 10)).toBe('    10\talpha\n    11\tbeta');
  });

  it('detects line-based read args', () => {
    expect(wantsLineBasedRead({ path: '/x' })).toBe(false);
    expect(wantsLineBasedRead({ path: '/x', start_line: 5 })).toBe(true);
    expect(wantsLineBasedRead({ path: '/x', max_lines: 10 })).toBe(true);
  });
});
