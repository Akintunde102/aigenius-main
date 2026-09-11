import fs from 'fs';
import os from 'os';
import path from 'path';
import { scanDirectoryListing } from './list-directory-scan';

async function makeTempDir(prefix: string): Promise<string> {
  return fs.promises.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeFile(root: string, relative: string, contents = 'x'): Promise<string> {
  const full = path.join(root, relative);
  await fs.promises.mkdir(path.dirname(full), { recursive: true });
  await fs.promises.writeFile(full, contents);
  return full;
}

describe('scanDirectoryListing', () => {
  let root = '';

  afterEach(async () => {
    if (root) {
      await fs.promises.rm(root, { recursive: true, force: true });
      root = '';
    }
  });

  it('streams with opendir instead of loading the whole table via readdir', async () => {
    root = await makeTempDir('list-dir-scan-opendir-');
    await writeFile(root, 'a.txt');

    const opendirSpy = jest.spyOn(fs.promises, 'opendir');
    const readdirSpy = jest.spyOn(fs.promises, 'readdir');
    try {
      await scanDirectoryListing(root, { limit: 10 });
      expect(opendirSpy).toHaveBeenCalled();
      expect(readdirSpy).not.toHaveBeenCalled();
    } finally {
      opendirSpy.mockRestore();
      readdirSpy.mockRestore();
    }
  });

  it('walks subfolders when recursive is true and still applies a file pattern', async () => {
    root = await makeTempDir('list-dir-scan-rec-');
    await writeFile(root, 'readme.md');
    await writeFile(root, path.join('docs', 'Cover_Ngo.pdf'));
    await writeFile(root, path.join('docs', 'archive', 'Cover_Aluko.pdf'));
    await fs.promises.mkdir(path.join(root, 'empty-folder'));

    const { items, aggregation } = await scanDirectoryListing(root, {
      recursive: true,
      pattern: '*.pdf',
      limit: 100,
    });

    expect(aggregation.unfilteredTotal).toBeGreaterThanOrEqual(5);
    expect(aggregation.totalFiles).toBe(2);
    expect(aggregation.totalDirs).toBe(0);
    expect(aggregation.totalEntries).toBe(2);
    expect(items.map((item) => item.name).sort()).toEqual(
      [path.join('docs', 'archive', 'Cover_Aluko.pdf'), path.join('docs', 'Cover_Ngo.pdf')].sort(),
    );
  });

  it('accumulates nested totals so recursive counts are not top-level-only', async () => {
    root = await makeTempDir('list-dir-scan-totals-');
    await writeFile(root, 'a.txt');
    await writeFile(root, path.join('nested', 'b.txt'));
    await writeFile(root, path.join('nested', 'deep', 'c.txt'));

    const { aggregation, items } = await scanDirectoryListing(root, {
      recursive: true,
      limit: 100,
    });

    expect(aggregation.totalFiles).toBe(3);
    expect(aggregation.totalDirs).toBe(2);
    expect(aggregation.totalEntries).toBe(5);
    expect(items.length).toBe(5);
  });

  it('still walks the tree for summary_only + recursive', async () => {
    root = await makeTempDir('list-dir-scan-sum-rec-');
    await writeFile(root, 'a.pdf', 'p');
    await writeFile(root, path.join('nested', 'b.pdf'), 'q');
    await writeFile(root, path.join('nested', 'c.docx'), 'd');

    const { items, aggregation } = await scanDirectoryListing(root, {
      recursive: true,
      summaryOnly: true,
      extensions: ['pdf'],
      limit: 100,
    });

    expect(items).toHaveLength(0);
    expect(aggregation.totalFiles).toBe(2);
    expect(aggregation.totalDirs).toBeGreaterThanOrEqual(1);
    expect(aggregation.extensionCounts).toEqual({ '.pdf': 2 });
  });

  it('matches Cover_[N-Z]* as a glob character class', async () => {
    root = await makeTempDir('list-dir-scan-class-');
    await writeFile(root, 'Cover_Ngo.pdf');
    await writeFile(root, 'Cover_Aluko.pdf');
    await writeFile(root, 'Cover_Zed.pdf');

    const { items, aggregation } = await scanDirectoryListing(root, {
      pattern: 'Cover_[N-Z]*',
      limit: 100,
    });

    expect(aggregation.unfilteredTotal).toBe(3);
    expect(aggregation.totalFiles).toBe(2);
    expect(items.map((item) => item.name).sort()).toEqual(['Cover_Ngo.pdf', 'Cover_Zed.pdf']);
  });

  it('does not treat a slash-delimited regex as an alternation filter', async () => {
    root = await makeTempDir('list-dir-scan-re-');
    await writeFile(root, 'Cover_Aluko.pdf');
    await writeFile(root, 'Cover_Kenna.pdf');
    await writeFile(root, 'Cover_Ngo.pdf');

    const { items, aggregation } = await scanDirectoryListing(root, {
      pattern: '/Aluko|Kenna/',
      limit: 100,
    });

    expect(aggregation.totalFiles).toBe(0);
    expect(items).toHaveLength(0);
  });

  it('caps the scan before loading more entries', async () => {
    root = await makeTempDir('list-dir-scan-cap-');
    await Promise.all([
      writeFile(root, 'a.txt'),
      writeFile(root, 'b.txt'),
      writeFile(root, 'c.txt'),
      writeFile(root, 'd.txt'),
      writeFile(root, 'e.txt'),
    ]);

    const { aggregation } = await scanDirectoryListing(root, {
      limit: 100,
      scanMax: 2,
    });

    expect(aggregation.scanCapped).toBe(true);
    expect(aggregation.unfilteredTotal).toBe(2);
  });

  it('returns permissionDenied for an unreadable root directory', async () => {
    if (process.platform === 'win32') {
      return;
    }
    root = await makeTempDir('list-dir-scan-perm-');
    try {
      await fs.promises.chmod(root, 0);
      const { items, warnings, permissionDenied, aggregation } = await scanDirectoryListing(root, {
        limit: 10,
      });
      expect(permissionDenied).toBe(true);
      expect(items).toHaveLength(0);
      expect(aggregation.totalEntries).toBe(0);
      expect(warnings.some((warning) => /permission denied/i.test(warning))).toBe(true);
    } finally {
      await fs.promises.chmod(root, 0o700).catch(() => undefined);
    }
  });
});
