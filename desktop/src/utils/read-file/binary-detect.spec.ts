import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { isBinaryFile } from './binary-detect';

describe('binary-detect', () => {
  let tmpDir = '';

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'read-binary-'));
  });

  afterEach(async () => {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('detects null-byte binary files', async () => {
    const file = path.join(tmpDir, 'image.bin');
    await fs.writeFile(file, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0x0d]));
    expect(await isBinaryFile(file)).toBe(true);
  });

  it('allows plain UTF-8 text', async () => {
    const file = path.join(tmpDir, 'readme.txt');
    await fs.writeFile(file, 'Hello\nWorld\n', 'utf8');
    expect(await isBinaryFile(file)).toBe(false);
  });

  it('allows empty files', async () => {
    const file = path.join(tmpDir, 'empty.txt');
    await fs.writeFile(file, '', 'utf8');
    expect(await isBinaryFile(file)).toBe(false);
  });
});
