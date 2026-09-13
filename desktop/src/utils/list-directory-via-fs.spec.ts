import fs from 'fs';
import os from 'os';
import path from 'path';
import { listDirectoryViaFs } from './list-directory-via-fs';
import { resolveWindowsExecutable } from './resolve-windows-executable';
import { LIST_DIRECTORY_AGGREGATION_SCAN_MAX } from './list-directory-aggregation.utils';

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

      const { items, aggregation } = await listDirectoryViaFs(root, 10);
      expect(items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'alpha.txt', path: filePath, isDir: false, size: 5 }),
          expect.objectContaining({ name: 'nested', isDir: true }),
        ]),
      );
      expect(aggregation.totalEntries).toBe(2);
      expect(aggregation.totalFiles).toBe(1);
      expect(aggregation.totalDirs).toBe(1);
      expect(aggregation.extensionCounts).toEqual({ '.txt': 1 });
    } finally {
      await fs.promises.rm(root, { recursive: true, force: true });
    }
  });

  it('respects the display limit while counting every entry', async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'list-dir-fs-limit-'));
    try {
      await Promise.all([
        fs.promises.writeFile(path.join(root, 'a.txt'), 'a'),
        fs.promises.writeFile(path.join(root, 'b.txt'), 'b'),
        fs.promises.writeFile(path.join(root, 'c.txt'), 'c'),
      ]);

      const { items, aggregation } = await listDirectoryViaFs(root, 2);
      expect(items).toHaveLength(2);
      expect(aggregation.totalEntries).toBe(3);
      expect(aggregation.totalFiles).toBe(3);
    } finally {
      await fs.promises.rm(root, { recursive: true, force: true });
    }
  });

  it('counts 150 mixed files and hydrates only the display limit', async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'list-dir-fs-150-'));
    try {
      await Promise.all(
        Array.from({ length: 75 }, async (_, i) => {
          await fs.promises.writeFile(path.join(root, `letter-${i}.docx`), 'd');
          await fs.promises.writeFile(path.join(root, `letter-${i}.pdf`), 'p');
        }),
      );

      const { items, aggregation } = await listDirectoryViaFs(root, { limit: 100 });
      expect(aggregation.totalEntries).toBe(150);
      expect(aggregation.totalFiles).toBe(150);
      expect(aggregation.totalDirs).toBe(0);
      expect(aggregation.extensionCounts).toEqual({ '.docx': 75, '.pdf': 75 });
      expect(items).toHaveLength(100);
      expect(items.every((item) => typeof item.size === 'number')).toBe(true);
    } finally {
      await fs.promises.rm(root, { recursive: true, force: true });
    }
  }, 30000);

  it('returns metrics without file rows when summaryOnly is true', async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'list-dir-fs-sum-'));
    try {
      await fs.promises.writeFile(path.join(root, 'a.PDF'), 'x');
      await fs.promises.writeFile(path.join(root, 'b.pdf'), 'y');
      await fs.promises.mkdir(path.join(root, 'nested'));

      const { items, aggregation } = await listDirectoryViaFs(root, { summaryOnly: true, limit: 100 });
      expect(items).toHaveLength(0);
      expect(aggregation.totalEntries).toBe(3);
      expect(aggregation.totalFiles).toBe(2);
      expect(aggregation.totalDirs).toBe(1);
      expect(aggregation.extensionCounts).toEqual({ '.pdf': 2 });
    } finally {
      await fs.promises.rm(root, { recursive: true, force: true });
    }
  });

  it('recurses through folders that do not match a file pattern', async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'list-dir-fs-rec-'));
    try {
      await fs.promises.mkdir(path.join(root, 'src'));
      await fs.promises.writeFile(path.join(root, 'src', 'note.pdf'), 'p');
      await fs.promises.writeFile(path.join(root, 'readme.md'), 'm');

      const { items, aggregation } = await listDirectoryViaFs(root, {
        recursive: true,
        pattern: '*.pdf',
        limit: 100,
      });
      expect(aggregation.totalFiles).toBe(1);
      expect(aggregation.totalEntries).toBe(1);
      expect(items).toHaveLength(1);
      expect(items[0]?.name).toBe(path.join('src', 'note.pdf'));
    } finally {
      await fs.promises.rm(root, { recursive: true, force: true });
    }
  });

  it('applies pattern and extensions before counting', async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'list-dir-fs-filter-'));
    try {
      await fs.promises.writeFile(path.join(root, 'Cover_Aluko.pdf'), 'a');
      await fs.promises.writeFile(path.join(root, 'Cover_Aluko.docx'), 'b');
      await fs.promises.writeFile(path.join(root, 'Cover_Kenna.pdf'), 'c');

      const { items, aggregation } = await listDirectoryViaFs(root, {
        pattern: '*Aluko*',
        extensions: ['pdf'],
        limit: 100,
      });
      expect(aggregation.unfilteredTotal).toBe(3);
      expect(aggregation.totalEntries).toBe(1);
      expect(items.map((i) => i.name)).toEqual(['Cover_Aluko.pdf']);
    } finally {
      await fs.promises.rm(root, { recursive: true, force: true });
    }
  });

  it('skips dangling-symlink stats without failing the listing', async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'list-dir-fs-link-'));
    try {
      const target = path.join(root, 'missing.txt');
      const link = path.join(root, 'broken.txt');
      try {
        await fs.promises.symlink(target, link);
      } catch {
        return;
      }
      await fs.promises.writeFile(path.join(root, 'ok.txt'), 'ok');

      const { items, aggregation } = await listDirectoryViaFs(root, 10);
      expect(aggregation.unfilteredTotal).toBeGreaterThanOrEqual(2);
      expect(items.some((item) => item.name === 'ok.txt')).toBe(true);
      const broken = items.find((item) => item.name === 'broken.txt');
      if (broken && !broken.isDir) {
        expect(broken.size).toBeUndefined();
      }
    } finally {
      await fs.promises.rm(root, { recursive: true, force: true });
    }
  });

  it('returns a permission warning instead of throwing when readdir is denied', async () => {
    if (process.platform === 'win32') {
      return;
    }
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'list-dir-fs-perm-'));
    try {
      await fs.promises.chmod(root, 0);
      const { items, warnings, permissionDenied } = await listDirectoryViaFs(root, 10);
      expect(items).toHaveLength(0);
      expect(permissionDenied).toBe(true);
      expect(warnings.some((w) => /permission denied/i.test(w))).toBe(true);
    } finally {
      await fs.promises.chmod(root, 0o700).catch(() => undefined);
      await fs.promises.rm(root, { recursive: true, force: true });
    }
  });

  it('exposes the scan cap constant used for huge directories', () => {
    expect(LIST_DIRECTORY_AGGREGATION_SCAN_MAX).toBe(50_000);
  });
});
