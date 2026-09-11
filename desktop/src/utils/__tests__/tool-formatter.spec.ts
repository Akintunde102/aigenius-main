import {
  formatDirectoryListing,
  formatRagResults,
  formatReadFile,
  formatShellResult,
} from '../tool-formatter';

describe('tool-formatter', () => {
  describe('formatRagResults', () => {
    it('should return a structured object with Markdown and rawData', () => {
      const mockData = {
        hits: [
          {
            path: '/test/file.ts',
            name: 'file.ts',
            score: 0.95,
            snippet: 'const x = 1;',
          },
        ],
        hit_count: 1,
      };

      const res = formatRagResults(mockData);
      expect(res.result).toContain('### Local search');
      expect(res.result).toContain('- **Matches**: 1');
      expect(res.result).toContain('**file.ts**');
      expect(res.rawData).toEqual(mockData);
    });

    it('should handle empty results', () => {
      const mockData = { hits: [], hit_count: 0 };
      const res = formatRagResults(mockData);
      expect(res.result).toContain('### Local search');
      expect(res.result).toContain('- **Matches**: 0');
      expect(res.result).toContain('local_grep');
      expect(res.rawData).toEqual(mockData);
    });

    it('should handle non-object inputs gracefully', () => {
      const res = formatRagResults(null);
      expect(res.result).toBe('null');
      expect(res.rawData).toBeNull();
    });
  });

  describe('formatDirectoryListing', () => {
    it('formats entries like other local tools', () => {
      const res = formatDirectoryListing({
        path: '/proj',
        items: [
          { path: '/proj/a.ts', name: 'a.ts', isDir: false, size: 10, mtime: 1 },
          { path: '/proj/sub', name: 'sub', isDir: true },
        ],
      });
      expect(res.result).toContain('### Directory listing');
      expect(res.result).toContain('- **Directory**: [proj](local-file://');
      expect(res.result).toContain(encodeURIComponent('/proj'));
      expect(res.result).toContain('- **Total items**: 2 (1 file, 1 subdirectory)');
      expect(res.result).toContain('- **File types**: 1 .ts');
      expect(res.result).toContain('- **Showing**: 2 of 2');
      expect(res.result).not.toContain('(limit reached)');
      expect(res.result).toContain('**a.ts**');
      expect(res.result).toContain('**Type**: Directory');
      expect(res.result).not.toMatch(/\*\*Shell\*\*/);
      expect(res.result).not.toContain('Assistant action');
    });

    it('includes totals and an assistant-action hint when the listing is truncated', () => {
      const res = formatDirectoryListing({
        path: '/cover_letters',
        items: Array.from({ length: 100 }, (_, i) => ({
          path: `/cover_letters/file-${i}.pdf`,
          name: `file-${i}.pdf`,
          isDir: false,
        })),
        hitLimit: true,
        aggregation: {
          unfilteredTotal: 184,
          totalEntries: 184,
          totalFiles: 184,
          totalDirs: 0,
          extensionCounts: { '.docx': 92, '.pdf': 92 },
          scanCapped: false,
        },
      });
      expect(res.result).toContain('- **Total items**: 184 (184 files, 0 subdirectories)');
      expect(res.result).toContain('- **File types**: 92 .docx, 92 .pdf');
      expect(res.result).toContain('- **Showing**: 100 of 184 (limit reached)');
      expect(res.result).toContain('**Assistant action (invoke yourself — do not delegate to the user):**');
      expect(res.result).toContain('summary_only: true');
      expect(res.result).toContain('Do not ask the user to count files');
      expect(res.result).toContain('do not use `local_shell` or `run_command` to count them');
      expect(res.result).not.toContain('regex');
    });

    it('marks totals and file types as lower bounds when the scan is capped', () => {
      const res = formatDirectoryListing({
        path: '/huge',
        items: [{ path: '/huge/a.txt', name: 'a.txt', isDir: false, size: 1 }],
        hitLimit: true,
        aggregation: {
          unfilteredTotal: 50_000,
          totalEntries: 50_000,
          totalFiles: 49_900,
          totalDirs: 100,
          extensionCounts: { '.txt': 40_000, '.log': 9_900 },
          scanCapped: true,
        },
      });
      expect(res.result).toContain('- **Total items**: at least 50000 (at least 49900 files, at least 100 subdirectories)');
      expect(res.result).toContain('- **File types**: at least 40000 .txt, 9900 .log');
      expect(res.result).toContain('- **Showing**: 1 of at least 50000 (limit reached)');
    });

    it('returns metrics without file rows when summaryOnly is true', () => {
      const res = formatDirectoryListing({
        path: '/cover_letters',
        items: [],
        summaryOnly: true,
        aggregation: {
          unfilteredTotal: 150,
          totalEntries: 150,
          totalFiles: 150,
          totalDirs: 0,
          extensionCounts: { '.docx': 75, '.pdf': 75 },
          scanCapped: false,
        },
      });
      expect(res.result).toContain('- **Total items**: 150 (150 files, 0 subdirectories)');
      expect(res.result).toContain('- **File types**: 75 .docx, 75 .pdf');
      expect(res.result).toContain('- **Showing**: 0 of 150 (summary only)');
      expect(res.result).not.toMatch(/^\d+\.\s+\*\*/m);
      expect(res.result).toContain('omit `summary_only`');
    });

    it('distinguishes an empty directory from a filter with no matches', () => {
      const empty = formatDirectoryListing({
        path: '/empty',
        items: [],
      });
      expect(empty.result).toContain('*Directory is empty.*');

      const filtered = formatDirectoryListing({
        path: '/letters',
        items: [],
        hadFilters: true,
        aggregation: {
          unfilteredTotal: 12,
          totalEntries: 0,
          totalFiles: 0,
          totalDirs: 0,
          extensionCounts: {},
          scanCapped: false,
        },
      });
      expect(filtered.result).toContain('*No entries matched the current pattern or extensions filter.*');
      expect(filtered.result).toContain('**Unfiltered items**: 12');
    });

    it('says permission was denied instead of calling the folder empty', () => {
      const res = formatDirectoryListing({
        path: '/secret',
        items: [],
        permissionDenied: true,
        warnings: ['Permission denied reading /secret'],
      });
      expect(res.result).toContain('*Permission denied reading this directory.*');
      expect(res.result).not.toContain('*Directory is empty.*');
      expect(res.result).toContain('**Notice**: Permission denied reading /secret');
    });
  });

  describe('formatReadFile', () => {
    it('should format file content and preserve rawData', () => {
      const mockData = {
        path: '/test/file.txt',
        bytes_read: 50,
        truncated: false,
        content: 'Hello World',
      };

      const res = formatReadFile(mockData);
      expect(res.result).toContain('### Read file');
      expect(res.result).toContain('**Path**: [file.txt](local-file://');
      expect(res.result).toContain(encodeURIComponent('/test/file.txt'));
      expect(res.result).toContain('- **Bytes read**: 50');
      expect(res.result).toContain('```\nHello World\n```');
      expect(res.rawData).toEqual(mockData);
    });
  });

  describe('formatShellResult', () => {
    it('should format shell output and exit code', () => {
      const mockData = {
        stdout: 'Success',
        stderr: '',
        exit_code: 0,
      };

      const res = formatShellResult(mockData);
      expect(res.result).toContain('### Shell output');
      expect(res.result).toContain('- **Exit code**: 0');
      expect(res.result).toContain('Success');
      expect(res.rawData).toEqual(mockData);
    });

    it('should format shell errors', () => {
      const mockData = {
        stdout: '',
        stderr: 'Error occurred',
        exit_code: 1,
      };

      const res = formatShellResult(mockData);
      expect(res.result).toContain('- **Exit code**: 1');
      expect(res.result).toContain('Error occurred');
      expect(res.rawData).toEqual(mockData);
    });
  });
});
