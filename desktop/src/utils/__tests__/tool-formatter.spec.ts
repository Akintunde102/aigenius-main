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
      expect(res.result).toContain('- **Entries**: 2');
      expect(res.result).toContain('**a.ts**');
      expect(res.result).toContain('**Type**: Directory');
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
