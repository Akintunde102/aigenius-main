import {
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
});
