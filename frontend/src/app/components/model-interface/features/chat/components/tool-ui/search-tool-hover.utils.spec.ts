import {
  buildSearchToolHoverPreview,
  formatSearchToolLineLabel,
  isSearchToolWithFileHover,
} from './search-tool-hover.utils';

describe('search-tool-hover.utils', () => {
  it('detects search tools eligible for hover previews', () => {
    expect(isSearchToolWithFileHover('local_grep')).toBe(true);
    expect(isSearchToolWithFileHover('local_shell')).toBe(false);
  });

  it('parses local_grep markdown hits with line numbers', () => {
    const preview = buildSearchToolHoverPreview(
      'local_grep',
      {
        path_prefix: 'C:/proj/client/desktop/src/utils/read-file',
        extensions: ['ts'],
      },
      '# Grep: helper\n\n- C:/proj/client/desktop/src/utils/read-file/types.ts:12:export type X\n- C:/proj/client/desktop/src/utils/read-file/index.ts:3:export',
    );

    expect(preview?.scopeLabel).toBe('C:/proj/client/desktop/src/utils/read-file/**/*.{ts}');
    expect(preview?.files).toHaveLength(2);
    expect(preview?.files[0]).toMatchObject({
      name: 'types.ts',
      path: './types.ts',
      line: 12,
    });
    expect(formatSearchToolLineLabel(preview!.files[0])).toBe('L12');
  });

  it('parses local_rag_query markdown hits with line ranges', () => {
    const preview = buildSearchToolHoverPreview(
      'local_rag_query',
      { path_prefix: 'C:/proj', query: 'resume' },
      [
        '### Local search',
        '',
        '1. **resume.ts**',
        '   - **Path**: C:/proj/src/resume.ts',
        '   - **Location**: lines 10–25',
      ].join('\n'),
    );

    expect(preview?.files[0]).toMatchObject({
      name: 'resume.ts',
      line: 10,
      lineEnd: 25,
    });
    expect(formatSearchToolLineLabel(preview!.files[0])).toBe('L10–25');
  });

  it('parses JSON rag hits when result is structured', () => {
    const preview = buildSearchToolHoverPreview(
      'local_rag_query',
      { path_prefix: 'C:/proj' },
      JSON.stringify({
        hits: [
          { path: 'C:/proj/a.ts', name: 'a.ts', line_start: 4, line_end: 8 },
        ],
      }),
    );

    expect(preview?.files[0]).toMatchObject({
      name: 'a.ts',
      path: './a.ts',
      line: 4,
      lineEnd: 8,
    });
  });
});
