import {
  buildListDirectoryLabel,
  buildReadFilesLabel,
  buildToolActivityLabel,
  countReadFilesInArgs,
  extractReadFilePathsFromArgs,
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

  it('formats read and list-directory labels', () => {
    expect(buildReadFilesLabel(1)).toBe('Read 1 file');
    expect(buildReadFilesLabel(4)).toBe('Read 4 files');
    expect(buildListDirectoryLabel({ path: 'C:/proj/src/components' })).toBe('Listed components');
    expect(buildListDirectoryLabel({})).toBe('Listed directory');
  });

  it('builds batch read activity labels from arguments', () => {
    expect(
      buildToolActivityLabel({
        tool: 'local_read_file',
        loading: false,
        arguments: {
          reads: [{ path: 'a.ts' }, { path: 'b.ts' }, { path: 'c.ts' }],
        },
      }),
    ).toBe('Read 3 files');
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
