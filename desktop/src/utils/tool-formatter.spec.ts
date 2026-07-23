import { formatRagResults, formatReadFile, formatReadFileBatch, formatShellResult, formatGetContext } from './tool-formatter';

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
      expect(result).toContain('**Path**: [test.txt](local-file://');
      expect(result).toContain(encodeURIComponent('/tmp/test.txt'));
      expect(result).toContain('hello world');
      expect(result).not.toContain('- **Truncated**');
    });

    it('should show truncation warning', () => {
      const data = { path: '/tmp/test.txt', bytes_read: 10, content: 'trunc', truncated: true, mode: 'bytes' };
      const { result } = formatReadFile(data);

      expect(result).toContain('- **Truncated**: Yes (byte limit');
    });

    it('surfaces explicit truncationNotice for LLM continuation', () => {
      const data = {
        path: 'src/big.ts',
        mode: 'lines',
        status: 'truncated',
        content: '> ⚠ Showing lines 1–100 of 500. Call again with start_line=101\n\n     1\tcode',
        truncationNotice: 'Showing lines 1–100 of 500. Call again with start_line=101',
        linesReturned: [1, 100],
        totalLines: 500,
        resolvedVia: 'lineRange',
      };
      const { result } = formatReadFile(data);
      expect(result).toContain('start_line=101');
      expect(result).toContain('- **Resolved via**: lineRange');
    });
  });

  describe('formatReadFileBatch', () => {
    it('formats single result like formatReadFile', () => {
      const batch = {
        results: [{ path: 'a.ts', status: 'ok', content: '     1\tconst x = 1', mode: 'lines' }],
      };
      const { result } = formatReadFileBatch(batch);
      expect(result).toContain('### Read file');
      expect(result).not.toContain('Read files (');
    });

    it('formats multiple files with numbered sections', () => {
      const batch = {
        results: [
          { path: 'a.ts', status: 'ok', content: 'a', mode: 'lines' },
          { path: 'b.ts', status: 'ok', content: 'b', mode: 'lines' },
        ],
      };
      const { result } = formatReadFileBatch(batch);
      expect(result).toContain('### Read files (2)');
      expect(result).toContain('#### 1. a.ts');
      expect(result).toContain('#### 2. b.ts');
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

      expect(result).toContain('local_grep');
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

  describe('formatGetContext', () => {
    it('should surface assistant action when index is incomplete for project with src/', () => {
      const data = {
        query: 'C:/Users/test/nobox-website',
        type: 'project_overview',
        projectOverview: {
          root: 'C:\\Users\\test\\nobox-website',
          projectName: 'nobox-website',
          directory: {
            entries: [{ name: 'src', kind: 'directory' }, { name: 'package.json', kind: 'file' }],
          },
          indexedFiles: 2,
          indexedChunks: 2,
          architectureMarkdown: '## Project architecture\n\nSparse index.',
        },
      };

      const { result } = formatGetContext(data);

      expect(result).toContain('Assistant action');
      expect(result).toContain('local_grep');
      expect(result).toContain('Indexed files**: 2');
    });
  });
});
