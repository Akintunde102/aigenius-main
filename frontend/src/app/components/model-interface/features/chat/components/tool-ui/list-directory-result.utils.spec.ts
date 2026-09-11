import {
  formatDirectoryListingCountLabel,
  formatDirectoryListingEmptyMessage,
  formatFileSize,
  formatModifiedDate,
  normalizeMtimeMs,
  parseDirectoryListingMarkdown,
  parseDirectoryListingResult,
  sortListingItems,
} from './list-directory-result.utils';

describe('normalizeMtimeMs', () => {
  it('treats small values as Unix seconds', () => {
    expect(normalizeMtimeMs(1_700_000_000)).toBe(1_700_000_000_000);
  });

  it('leaves millisecond timestamps unchanged', () => {
    expect(normalizeMtimeMs(1_700_000_000_000)).toBe(1_700_000_000_000);
  });
});

describe('formatFileSize', () => {
  it('formats bytes, kilobytes, and megabytes', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(1_048_576)).toBe('1.0 MB');
  });
});

describe('formatModifiedDate', () => {
  it('formats a recent timestamp without throwing', () => {
    const label = formatModifiedDate(Date.now() - 3_600_000);
    expect(label.length).toBeGreaterThan(0);
  });
});

describe('sortListingItems', () => {
  it('lists directories before files and sorts alphabetically', () => {
    const sorted = sortListingItems([
      { name: 'z.ts', path: '/z.ts', isDir: false },
      { name: 'src', path: '/src', isDir: true },
      { name: 'a.ts', path: '/a.ts', isDir: false },
      { name: 'lib', path: '/lib', isDir: true },
    ]);
    expect(sorted.map((i) => i.name)).toEqual(['lib', 'src', 'a.ts', 'z.ts']);
  });
});

describe('parseDirectoryListingMarkdown', () => {
  const sample = `### Directory listing

- **Directory**: [a](local-file://C%3A%5CUsers%5CTest%5Ca)
- **Entries**: 2

1. **report.pdf**
   - **Path**: [report.pdf](local-file://C%3A%5CUsers%5CTest%5Ca%5Creport.pdf)
   - **Type**: File
   - **Size (bytes)**: 68,141
   - **Last modified**: 3/12/2026, 2:15:45 PM

2. **images**
   - **Path**: [images](local-file://C%3A%5CUsers%5CTest%5Ca%5Cimages)
   - **Type**: Directory
`;

  it('parses directory metadata and file rows from tool markdown', () => {
    const parsed = parseDirectoryListingMarkdown(sample);
    expect(parsed).not.toBeNull();
    expect(parsed?.directoryPath).toBe('C:\\Users\\Test\\a');
    expect(parsed?.entryCount).toBe(2);
    expect(parsed?.totalEntries).toBe(2);
    expect(parsed?.summaryOnly).toBe(false);
    expect(parsed?.items).toHaveLength(2);
    expect(parsed?.items[0]).toMatchObject({ name: 'images', isDir: true });
    expect(parsed?.items[1]).toMatchObject({
      name: 'report.pdf',
      isDir: false,
      size: 68141,
    });
  });

  it('returns null for unrelated markdown', () => {
    expect(parseDirectoryListingMarkdown('### Shell output\n\n- **Exit code**: 0')).toBeNull();
  });

  it('parses terminal fallback output', () => {
    const md = `### Directory listing

- **Directory**: [a](local-file://C%3A%5Ctmp)
- **Entries**: 0

\`\`\`
Mode   Name
----   ----
-a---  foo.txt
\`\`\`
`;
    const parsed = parseDirectoryListingMarkdown(md);
    expect(parsed?.terminalOutput).toContain('foo.txt');
    expect(parsed?.items).toHaveLength(0);
  });
});

describe('parseDirectoryListingResult', () => {
  it('parses plain markdown tool results', () => {
    const md = `### Directory listing

- **Directory**: [x](local-file://C%3A%5Cx)
- **Entries**: 1

1. **note.txt**
   - **Path**: [note.txt](local-file://C%3A%5Cx%5Cnote.txt)
   - **Type**: File
   - **Size (bytes)**: 10
`;
    const parsed = parseDirectoryListingResult(md);
    expect(parsed?.items[0]?.name).toBe('note.txt');
  });

  it('parses JSON-wrapped markdown results', () => {
    const wrapped = JSON.stringify({
      success: true,
      result: `### Directory listing

- **Directory**: [x](local-file://C%3A%5Cx)
- **Entries**: 1

1. **note.txt**
   - **Path**: [note.txt](local-file://C%3A%5Cx%5Cnote.txt)
   - **Type**: File
`,
    });
    const parsed = parseDirectoryListingResult(wrapped);
    expect(parsed?.items[0]?.name).toBe('note.txt');
  });

  it('parses Total items / Showing headers and truncated listings', () => {
    const md = `### Directory listing

- **Directory**: [cover_letters](local-file://C%3A%5Ccover_letters)
- **Total items**: 184 (184 files, 0 subdirectories)
- **File types**: 92 .docx, 92 .pdf
- **Showing**: 100 of 184 (limit reached)

1. **Cover_Aluko.pdf**
   - **Path**: [Cover_Aluko.pdf](local-file://C%3A%5Ccover_letters%5CCover_Aluko.pdf)
   - **Type**: File
`;
    const parsed = parseDirectoryListingMarkdown(md);
    expect(parsed?.entryCount).toBe(100);
    expect(parsed?.totalEntries).toBe(184);
    expect(parsed?.hitLimit).toBe(true);
    expect(parsed?.scanCapped).toBe(false);
    expect(parsed?.fileTypes).toBe('92 .docx, 92 .pdf');
    expect(parsed?.items).toHaveLength(1);
    expect(formatDirectoryListingCountLabel(parsed!)).toBe('100 of 184');
  });

  it('parses scan-capped totals as lower bounds', () => {
    const md = `### Directory listing

- **Directory**: [huge](local-file://C%3A%5Chuge)
- **Total items**: at least 50000 (at least 49900 files, at least 100 subdirectories)
- **File types**: at least 40000 .txt, 9900 .log
- **Showing**: 100 of at least 50000 (limit reached)

1. **a.txt**
   - **Path**: [a.txt](local-file://C%3A%5Chuge%5Ca.txt)
   - **Type**: File
`;
    const parsed = parseDirectoryListingMarkdown(md);
    expect(parsed?.totalEntries).toBe(50_000);
    expect(parsed?.entryCount).toBe(100);
    expect(parsed?.scanCapped).toBe(true);
    expect(parsed?.fileTypes).toBe('at least 40000 .txt, 9900 .log');
    expect(formatDirectoryListingCountLabel(parsed!)).toBe('100 of at least 50000');
  });

  it('parses summary_only listings with no numbered rows', () => {
    const md = `### Directory listing

- **Directory**: [cover_letters](local-file://C%3A%5Ccover_letters)
- **Total items**: 150 (150 files, 0 subdirectories)
- **File types**: 75 .docx, 75 .pdf
- **Showing**: 0 of 150 (summary only)
`;
    const parsed = parseDirectoryListingMarkdown(md);
    expect(parsed).not.toBeNull();
    expect(parsed?.summaryOnly).toBe(true);
    expect(parsed?.entryCount).toBe(0);
    expect(parsed?.totalEntries).toBe(150);
    expect(parsed?.items).toHaveLength(0);
    expect(formatDirectoryListingCountLabel(parsed!)).toBe('150 items');
  });
});

describe('formatDirectoryListingEmptyMessage', () => {
  it('distinguishes empty folders, zero search hits, and permission errors', () => {
    expect(
      formatDirectoryListingEmptyMessage({
        directoryPath: '/empty',
        entryCount: 0,
        totalEntries: 0,
        hitLimit: false,
        summaryOnly: false,
        scanCapped: false,
        hadFilters: false,
        permissionDenied: false,
        items: [],
      }),
    ).toBe('Directory is empty.');

    expect(
      formatDirectoryListingEmptyMessage({
        directoryPath: '/letters',
        entryCount: 0,
        totalEntries: 0,
        hitLimit: false,
        summaryOnly: false,
        scanCapped: false,
        hadFilters: true,
        permissionDenied: false,
        items: [],
      }),
    ).toBe('No entries matched the current pattern or extensions filter.');

    expect(
      formatDirectoryListingEmptyMessage({
        directoryPath: '/secret',
        entryCount: 0,
        totalEntries: 0,
        hitLimit: false,
        summaryOnly: false,
        scanCapped: false,
        hadFilters: false,
        permissionDenied: true,
        items: [],
      }),
    ).toBe('Permission denied reading this directory.');
  });
});

describe('parseDirectoryListingMarkdown empty states', () => {
  it('sets hadFilters when the markdown says no entries matched a filter', () => {
    const md = `### Directory listing

- **Directory**: [letters](local-file://C%3A%5Cletters)
- **Total items**: 0 (0 files, 0 subdirectories)
- **Unfiltered items**: 12 (before pattern/extension filters)
- **Showing**: 0 of 0

*No entries matched the current pattern or extensions filter.*
`;
    const parsed = parseDirectoryListingMarkdown(md);
    expect(parsed?.hadFilters).toBe(true);
    expect(parsed?.permissionDenied).toBe(false);
    expect(formatDirectoryListingEmptyMessage(parsed!)).toBe(
      'No entries matched the current pattern or extensions filter.',
    );
  });

  it('sets permissionDenied from the markdown empty line', () => {
    const md = `### Directory listing

- **Directory**: [secret](local-file://C%3A%5Csecret)
- **Total items**: 0 (0 files, 0 subdirectories)
- **Showing**: 0 of 0
- **Notice**: Permission denied reading C:\\secret

*Permission denied reading this directory.*
`;
    const parsed = parseDirectoryListingMarkdown(md);
    expect(parsed?.permissionDenied).toBe(true);
    expect(formatDirectoryListingEmptyMessage(parsed!)).toBe(
      'Permission denied reading this directory.',
    );
  });
});
