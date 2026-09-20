import {
  buildListDirectoryLabel,
  buildReadFilesLabel,
  buildToolActivityLabel,
  countReadFilesInArgs,
  extractReadFilePathsFromArgs,
  truncateFilename,
} from './tool-activity-label.utils';

describe('tool-activity-label.utils', () => {
  it('extracts batch read paths from reads[]', () => {
    expect(
      extractReadFilePathsFromArgs({
        reads: [{ path: 'src/a.ts' }, { path: 'src/b.ts' }, { path: 'README.md' }],
      }),
    ).toEqual(['src/a.ts', 'src/b.ts', 'README.md']);
    expect(countReadFilesInArgs({ reads: [{ path: 'a.ts' }, { path: 'b.ts' }] })).toBe(2);
  });

  it('extracts a single-file path shorthand', () => {
    expect(extractReadFilePathsFromArgs({ path: 'package.json' })).toEqual(['package.json']);
  });

  it('truncates long filenames preserving extension', () => {
    expect(truncateFilename('very-long-component-name.tsx', 22)).toBe('very-long-compone….tsx');
    expect(truncateFilename('short.ts', 22)).toBe('short.ts');
  });

  it('formats read labels — no entries falls back to count wording', () => {
    expect(buildReadFilesLabel(1)).toBe('Read 1 file');
    expect(buildReadFilesLabel(4)).toBe('Read 4 files');
  });

  it('formats read labels — single file with no lines', () => {
    expect(buildReadFilesLabel(1, [{ path: 'src/index.html' }])).toBe('Read index.html');
  });

  it('formats read labels — single file with line range', () => {
    expect(
      buildReadFilesLabel(1, [{ path: 'src/index.html', startLine: 120, endLine: 150 }]),
    ).toBe('Read index.html:120–150');
  });

  it('formats read labels — two files', () => {
    expect(
      buildReadFilesLabel(2, [{ path: 'src/a.ts' }, { path: 'src/b.ts' }]),
    ).toBe('Read a.ts, b.ts');
  });

  it('formats read labels — three+ files shows overflow', () => {
    expect(
      buildReadFilesLabel(3, [{ path: 'a.ts' }, { path: 'b.ts' }, { path: 'c.ts' }]),
    ).toBe('Read a.ts, b.ts +1 more');
  });

  it('builds batch read activity labels from arguments with filenames', () => {
    expect(
      buildToolActivityLabel({
        tool: 'local_read_file',
        loading: false,
        arguments: {
          reads: [{ path: 'a.ts' }, { path: 'b.ts' }, { path: 'c.ts' }],
        },
      }),
    ).toBe('Read a.ts, b.ts +1 more');
  });

  it('builds single-file read label with line range', () => {
    expect(
      buildToolActivityLabel({
        tool: 'local_read_file',
        loading: false,
        arguments: { path: 'src/utils.ts', start_line: 10, end_line: 40 },
      }),
    ).toBe('Read utils.ts:10–40');
  });

  it('formats list-directory labels', () => {
    expect(buildListDirectoryLabel({ path: 'C:/proj/src/components' })).toBe('Listed components');
    expect(buildListDirectoryLabel({})).toBe('Listed directory');
  });

  it('uses list-directory wording instead of explored files', () => {
    expect(
      buildToolActivityLabel({
        tool: 'local_list_directory',
        loading: false,
        arguments: { path: 'C:/proj/src' },
      }),
    ).toBe('Listed src');
  });
});

