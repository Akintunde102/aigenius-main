import { listLocalDirectory } from './local-tool-executor-fs';
import { listDirectoryViaShell } from './utils/list-directory-via-shell';
import type { DirectoryAggregation } from './utils/list-directory-aggregation.utils';

jest.mock('electron', () => ({
  app: { isPackaged: false },
  dialog: { showMessageBox: jest.fn() },
  shell: { openPath: jest.fn().mockResolvedValue('') },
}));

jest.mock('./utils/read-file', () => ({
  executeReadFile: jest.fn(),
}));

jest.mock('./utils/read-file/path-resolver', () => ({
  resolveDirectoryPath: jest.fn(async (inputPath: string) => {
    if (!inputPath?.trim()) {
      return { ok: false, error: 'path is required' };
    }
    if (inputPath.includes('missing-dir')) {
      return { ok: false, error: `Error: directory not found — ${inputPath}` };
    }
    return { ok: true, resolved: inputPath, displayPath: inputPath };
  }),
  resolveReadFilePath: jest.fn(),
  resolveLocalImagePath: jest.fn(),
}));

jest.mock('./utils/list-directory-via-shell', () => ({
  listDirectoryViaShell: jest.fn(),
}));

const listViaShell = listDirectoryViaShell as jest.Mock;

const COVER_LETTERS = 'C:\\Users\\DELL5530\\Desktop\\Dami\\cover_letters';

function file(name: string, dir = COVER_LETTERS, extra?: { size?: number; mtime?: number }) {
  return {
    name,
    path: `${dir}\\${name}`,
    isDir: false,
    size: extra?.size ?? 2442,
    mtime: extra?.mtime ?? 1_725_000_000,
  };
}

function dir(name: string, parent = COVER_LETTERS) {
  return { name, path: `${parent}\\${name}`, isDir: true };
}

function structuredListing(
  items: Array<Record<string, unknown>>,
  command?: string,
  aggregation?: DirectoryAggregation,
) {
  return {
    shellCommand: command || `Get-ChildItem -LiteralPath '${COVER_LETTERS}' -Force`,
    structured: true,
    items,
    aggregation,
    warnings: [] as string[],
  };
}

describe('listLocalDirectory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a missing path', async () => {
    const out = await listLocalDirectory({});
    expect(out).toEqual({ ok: false, error: 'path is required' });
    expect(listViaShell).not.toHaveBeenCalled();
  });

  it('rejects a blank path', async () => {
    const out = await listLocalDirectory({ path: '   ' });
    expect(out).toEqual({ ok: false, error: 'path is required' });
  });

  it('returns the resolver error when the directory does not exist', async () => {
    const out = await listLocalDirectory({ path: 'C:\\missing-dir' });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toMatch(/directory not found/i);
  });

  it('lists every entry when only path is provided', async () => {
    listViaShell.mockResolvedValue(
      structuredListing([
        file('Cover_Aluko_Oyebode.pdf'),
        file('Cover_Kenna_Partners.pdf'),
        dir('archive'),
      ]),
    );

    const out = await listLocalDirectory({ path: COVER_LETTERS });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('Cover_Aluko_Oyebode.pdf');
      expect(out.result).toContain('Cover_Kenna_Partners.pdf');
      expect(out.result).toContain('archive');
      expect(out.result).not.toMatch(/\*\*Shell\*\*/);
      expect(out.result).not.toMatch(/Get-ChildItem/i);
    }
  });

  it('filters names with *Aluko* without using a shell command', async () => {
    listViaShell.mockResolvedValue(
      structuredListing([
        file('Cover_Aluko_Oyebode.pdf'),
        file('Cover_Aluko_Oyebode.docx'),
        file('Cover_Kenna_Partners.pdf'),
        dir('notes'),
      ]),
    );

    const out = await listLocalDirectory({ path: COVER_LETTERS, pattern: '*Aluko*' });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('Cover_Aluko_Oyebode.pdf');
      expect(out.result).toContain('Cover_Aluko_Oyebode.docx');
      expect(out.result).not.toContain('Cover_Kenna_Partners.pdf');
      expect(out.result).not.toContain('**notes**');
    }
    expect(listViaShell.mock.calls[0][1].command).toBeUndefined();
  });

  it('applies pattern case-insensitively', async () => {
    listViaShell.mockResolvedValue(structuredListing([file('Cover_Aluko_Oyebode.pdf')]));
    const out = await listLocalDirectory({ path: COVER_LETTERS, pattern: '*aluko*' });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.result).toContain('Cover_Aluko_Oyebode.pdf');
  });

  it('returns an empty listing when pattern matches nothing', async () => {
    listViaShell.mockResolvedValue(structuredListing([file('Cover_Kenna_Partners.pdf')]));
    const out = await listLocalDirectory({ path: COVER_LETTERS, pattern: '*Aluko*' });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('No entries matched');
      expect(out.result).not.toContain('Cover_Kenna_Partners.pdf');
    }
  });

  it('filters files by extension while keeping matching directories', async () => {
    listViaShell.mockResolvedValue(
      structuredListing([
        file('Cover_Aluko_Oyebode.pdf'),
        file('Cover_Aluko_Oyebode.docx'),
        dir('pdfs'),
      ]),
    );

    const out = await listLocalDirectory({ path: COVER_LETTERS, extensions: ['.PDF'] });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('Cover_Aluko_Oyebode.pdf');
      expect(out.result).not.toContain('Cover_Aluko_Oyebode.docx');
      expect(out.result).toContain('pdfs');
    }
  });

  it('requires both pattern and extension when both are set', async () => {
    listViaShell.mockResolvedValue(
      structuredListing([
        file('Cover_Aluko_Oyebode.pdf'),
        file('Cover_Aluko_Oyebode.docx'),
        file('Cover_Kenna_Partners.pdf'),
      ]),
    );

    const out = await listLocalDirectory({
      path: COVER_LETTERS,
      pattern: '*Aluko*',
      extensions: ['pdf'],
    });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('Cover_Aluko_Oyebode.pdf');
      expect(out.result).not.toContain('Cover_Aluko_Oyebode.docx');
      expect(out.result).not.toContain('Cover_Kenna_Partners.pdf');
    }
  });

  it('skips ignored path segments such as node_modules', async () => {
    listViaShell.mockResolvedValue(
      structuredListing([
        file('keep.ts', 'C:\\proj'),
        { name: 'left-pad', path: 'C:\\proj\\node_modules\\left-pad', isDir: true },
      ]),
    );

    const out = await listLocalDirectory({ path: 'C:\\proj' });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('keep.ts');
      expect(out.result).not.toContain('left-pad');
    }
  });

  it('asks the filesystem listing to recurse instead of walking nested shell calls', async () => {
    listViaShell.mockResolvedValue(
      structuredListing([file('Cover_Aluko_nested.pdf', `${COVER_LETTERS}\\nested`)]),
    );

    const out = await listLocalDirectory({
      path: COVER_LETTERS,
      recursive: true,
      pattern: '*Aluko*',
    });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('Cover_Aluko_nested.pdf');
    }
    expect(listViaShell).toHaveBeenCalledTimes(1);
    expect(listViaShell.mock.calls[0][1].recursive).toBe(true);
  });

  it('does not recurse when recursive is omitted', async () => {
    listViaShell.mockResolvedValue(structuredListing([dir('nested'), file('root.pdf')]));
    await listLocalDirectory({ path: COVER_LETTERS });
    expect(listViaShell).toHaveBeenCalledTimes(1);
    expect(listViaShell.mock.calls[0][1].recursive).toBe(false);
  });

  it('stops at the default 100-entry cap and marks the limit', async () => {
    const items = Array.from({ length: 120 }, (_, i) => file(`file-${String(i).padStart(3, '0')}.txt`));
    listViaShell.mockResolvedValue(structuredListing(items));

    const out = await listLocalDirectory({ path: COVER_LETTERS });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('(limit reached)');
      expect(out.result).toContain('**Showing**: 100');
      expect(out.result).toContain('file-000.txt');
      expect(out.result).not.toContain('file-100.txt');
    }
  });

  it('reports exact totals and file types when the directory exceeds the display cap', async () => {
    const items = [
      ...Array.from({ length: 75 }, (_, i) => file(`letter-${i}.docx`)),
      ...Array.from({ length: 75 }, (_, i) => file(`letter-${i}.pdf`)),
    ];
    listViaShell.mockResolvedValue(
      structuredListing(items.slice(0, 100), undefined, {
        unfilteredTotal: 150,
        totalEntries: 150,
        totalFiles: 150,
        totalDirs: 0,
        extensionCounts: { '.docx': 75, '.pdf': 75 },
        scanCapped: false,
      }),
    );

    const out = await listLocalDirectory({ path: COVER_LETTERS });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('**Total items**: 150 (150 files, 0 subdirectories)');
      expect(out.result).toContain('**File types**: 75 .docx, 75 .pdf');
      expect(out.result).toContain('**Showing**: 100 of 150 (limit reached)');
      expect(out.result).toContain('summary_only: true');
      expect(out.result).toContain('do not use `local_shell` or `run_command`');
    }
  });

  it('returns metrics without file rows when summary_only is true', async () => {
    listViaShell.mockResolvedValue(
      structuredListing([], undefined, {
        unfilteredTotal: 150,
        totalEntries: 150,
        totalFiles: 150,
        totalDirs: 0,
        extensionCounts: { '.docx': 75, '.pdf': 75 },
        scanCapped: false,
      }),
    );

    const out = await listLocalDirectory({ path: COVER_LETTERS, summary_only: true });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('**Total items**: 150');
      expect(out.result).toContain('**File types**: 75 .docx, 75 .pdf');
      expect(out.result).toContain('(summary only)');
      expect(out.result).not.toMatch(/^\d+\.\s+\*\*/m);
    }
    expect(listViaShell.mock.calls[0][1].summaryOnly).toBe(true);
  });

  it('honors a smaller explicit limit', async () => {
    listViaShell.mockResolvedValue(
      structuredListing([file('a.pdf'), file('b.pdf'), file('c.pdf')]),
    );
    const out = await listLocalDirectory({ path: COVER_LETTERS, limit: 2 });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('**Showing**: 2 of');
      expect(out.result).toContain('(limit reached)');
    }
  });

  it('ignores a leftover command key and lists via filesystem once', async () => {
    listViaShell.mockResolvedValue(
      structuredListing([
        file('Cover_Aluko_Oyebode.pdf'),
        file('Cover_Kenna_Partners.pdf'),
      ]),
    );

    const out = await listLocalDirectory({
      path: COVER_LETTERS,
      command: 'Get-ChildItem -Filter *Aluko* | Select-Object FullName',
    });

    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('Cover_Aluko_Oyebode.pdf');
      expect(out.result).toContain('Cover_Kenna_Partners.pdf');
      expect(out.result).not.toMatch(/Select-Object/i);
    }
    expect(listViaShell).toHaveBeenCalledTimes(1);
    expect(listViaShell.mock.calls[0][1].command).toBeUndefined();
  });

  it('applies pattern even when a leftover command key is present', async () => {
    listViaShell.mockResolvedValue(
      structuredListing([
        file('Cover_Aluko_Oyebode.pdf'),
        file('Cover_Kenna_Partners.pdf'),
      ]),
    );

    const out = await listLocalDirectory({
      path: COVER_LETTERS,
      command: 'Get-ChildItem | Select-Object Name',
      pattern: '*Aluko*',
    });

    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('Cover_Aluko_Oyebode.pdf');
      expect(out.result).not.toContain('Cover_Kenna_Partners.pdf');
    }
    expect(listViaShell.mock.calls[0][1].command).toBeUndefined();
  });

  it('surfaces listing failures as list errors', async () => {
    listViaShell.mockRejectedValue(new Error('Access denied'));
    const out = await listLocalDirectory({ path: COVER_LETTERS });
    expect(out).toEqual({ ok: false, error: 'Failed to list directory: Access denied' });
  });

  it('treats an empty extensions array as no extension filter', async () => {
    listViaShell.mockResolvedValue(structuredListing([file('Cover_Aluko_Oyebode.pdf')]));
    const out = await listLocalDirectory({ path: COVER_LETTERS, extensions: [] });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.result).toContain('Cover_Aluko_Oyebode.pdf');
  });

  it('still recurses when a leftover command key is present', async () => {
    listViaShell.mockResolvedValue(
      structuredListing([dir('nested'), file('root.pdf')]),
    );
    await listLocalDirectory({
      path: COVER_LETTERS,
      recursive: true,
      command: 'Get-ChildItem',
    });
    expect(listViaShell).toHaveBeenCalledTimes(1);
    expect(listViaShell.mock.calls[0][1].recursive).toBe(true);
    expect(listViaShell.mock.calls[0][1].command).toBeUndefined();
  });
});
