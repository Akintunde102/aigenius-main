import { formatRagResults, formatIndexStatus, formatReadFile, formatShellResult } from './tool-formatter';

describe('tool-formatter', () => {
  describe('escapeBackticks (via formatters)', () => {
    it('should escape triple backticks to prevent block termination', () => {
      const input = 'Here is a block: ```rm -rf /``` danger!';
      const { result } = formatShellResult({ stdout: input, exit_code: 0 });

      expect(result).toContain('` ` `rm -rf /` ` `');
      expect(result).not.toContain('```\nHere is a block: ```');
    });

    it('should handle strings without triple backticks', () => {
      const input = 'Normal string with `single` and ``double`` backticks';
      const { result } = formatShellResult({ stdout: input, exit_code: 0 });

      expect(result).toContain(input);
    });
  });

  describe('formatShellResult', () => {
    it('should format successful execution with stdout only', () => {
      const data = { stdout: 'hello world', exit_code: 0 };
      const { result } = formatShellResult(data);

      expect(result).toContain('### Shell output');
      expect(result).toContain('- **Exit code**: 0');
      expect(result).toContain('**Stdout**');
      expect(result).toContain('hello world');
      expect(result).not.toContain('**Stderr**');
    });

    it('should format failed execution with stderr', () => {
      const data = { stdout: '', stderr: 'error: file not found', exit_code: 1 };
      const { result } = formatShellResult(data);

      expect(result).toContain('### Shell output');
      expect(result).toContain('- **Exit code**: 1');
      expect(result).toContain('**Stderr**');
      expect(result).toContain('error: file not found');
    });

    it('should handle empty output', () => {
      const data = { stdout: '', stderr: '', exit_code: 0 };
      const { result } = formatShellResult(data);

      expect(result).toContain('*Command produced no output.*');
    });
  });

  describe('formatReadFile', () => {
    it('should format file content correctly', () => {
      const data = { path: '/tmp/test.txt', bytes_read: 12, content: 'hello world\n', truncated: false };
      const { result } = formatReadFile(data);

      expect(result).toContain('### Read file');
      expect(result).toContain('**Path**: `/tmp/test.txt`');
      expect(result).toContain('hello world');
      expect(result).not.toContain('- **Truncated**');
    });

    it('should show truncation warning', () => {
      const data = { path: '/tmp/test.txt', bytes_read: 10, content: 'trunc', truncated: true };
      const { result } = formatReadFile(data);

      expect(result).toContain('- **Truncated**: Yes (size limits)');
    });
  });

  describe('formatRagResults', () => {
    it('should format hits with scores and snippets', () => {
      const data = {
        hits: [{ name: 'file1.ts', path: '/src/file1.ts', score: 0.95, snippet: 'found content here' }],
        hit_count: 1,
      };

      const { result } = formatRagResults(data);

      expect(result).toContain('### Local search');
      expect(result).toContain('- **Matches**: 1');
      expect(result).toContain('**file1.ts**');
      expect(result).toContain('**Relevance**: 95.0%');
      expect(result).toContain('> found content here');
    });

    it('should handle empty results', () => {
      const data = { hits: [], hit_count: 0, scanned_chunks: 42 };
      const { result } = formatRagResults(data);

      expect(result).toContain('No matches found');
      expect(result).toContain('Indexed files**: 42');
    });

    it('should surface query hints when the search request is incomplete', () => {
      const data = {
        hits: [],
        hit_count: 0,
        scanned_chunks: 10,
        hint: 'Provide content_query and/or path_query to search text and paths.',
      };
      const { result } = formatRagResults(data);

      expect(result).toContain('content_query');
      expect(result).not.toContain('index is empty');
    });
  });

  describe('formatIndexStatus', () => {
    it('should format status summary', () => {
      const data = {
        indexed: 1500,
        watching: true,
        lastRun: Date.now(),
        scan_in_progress: false,
      };

      const { result } = formatIndexStatus(data);

      expect(result).toContain('### Local index status');
      expect(result).toContain('- **Files indexed**: 1,500');
      expect(result).toContain('- **Watcher**: Active');
      expect(result).toContain('- **Last index run**:');
      expect(result).toContain('- **Scan in progress**: No');
    });
  });
});
