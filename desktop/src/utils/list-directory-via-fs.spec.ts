import fs from 'fs';
import os from 'os';
import path from 'path';
import { listDirectoryViaFs } from './list-directory-via-fs';
import { resolveWindowsExecutable } from './resolve-windows-executable';

describe('resolveWindowsExecutable', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('returns the executable unchanged on non-Windows', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    expect(resolveWindowsExecutable('powershell.exe')).toBe('powershell.exe');
  });

  it('resolves powershell.exe to an absolute path on Windows when present', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    const resolved = resolveWindowsExecutable('powershell.exe');
    if (process.platform === 'win32') {
      expect(path.isAbsolute(resolved)).toBe(true);
      expect(fs.existsSync(resolved)).toBe(true);
    } else {
      expect(resolved).toContain('powershell.exe');
    }
  });
});

describe('listDirectoryViaFs', () => {
  it('lists files and directories with metadata', async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'list-dir-fs-'));
    try {
      const filePath = path.join(root, 'alpha.txt');
      await fs.promises.writeFile(filePath, 'hello');
      await fs.promises.mkdir(path.join(root, 'nested'));

      const items = await listDirectoryViaFs(root, 10);
      expect(items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'alpha.txt', path: filePath, isDir: false, size: 5 }),
          expect.objectContaining({ name: 'nested', isDir: true }),
        ]),
      );
    } finally {
      await fs.promises.rm(root, { recursive: true, force: true });
    }
  });

  it('respects the limit', async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'list-dir-fs-limit-'));
    try {
      await Promise.all([
        fs.promises.writeFile(path.join(root, 'a.txt'), 'a'),
        fs.promises.writeFile(path.join(root, 'b.txt'), 'b'),
        fs.promises.writeFile(path.join(root, 'c.txt'), 'c'),
      ]);

      const items = await listDirectoryViaFs(root, 2);
      expect(items).toHaveLength(2);
    } finally {
      await fs.promises.rm(root, { recursive: true, force: true });
    }
  });
});
