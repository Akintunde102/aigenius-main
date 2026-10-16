import { describe, expect, it } from '@jest/globals';
import { applySearchReplaceHunk } from './apply-hunk';

describe('applySearchReplaceHunk', () => {
  it('replaces a unique match', () => {
    const r = applySearchReplaceHunk('hello world', 'world', 'there');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.content).toBe('hello there');
  });

  it('fails when search is missing', () => {
    const r = applySearchReplaceHunk('abc', 'xyz', 'q');
    expect(r.ok).toBe(false);
  });

  it('fails on ambiguous match unless replaceAll', () => {
    const r = applySearchReplaceHunk('foo foo', 'foo', 'bar');
    expect(r.ok).toBe(false);
    const all = applySearchReplaceHunk('foo foo', 'foo', 'bar', true);
    expect(all.ok).toBe(true);
    if (all.ok) expect(all.content).toBe('bar bar');
  });

  it('replaces CRLF file content when model sends LF search string', () => {
    const crlfFile = 'line 1\r\nline 2\r\nline 3\r\n';
    const lfSearch = 'line 2\nline 3';
    const lfReplace = 'line two\nline three';

    const r = applySearchReplaceHunk(crlfFile, lfSearch, lfReplace);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.content).toBe('line 1\r\nline two\r\nline three\r\n');
      // Preserves original CRLF line endings
      expect(r.content).toContain('\r\n');
    }
  });

  it('matches when trailing spaces differ on lines', () => {
    const fileWithTrailingSpaces = 'const a = 1;   \nconst b = 2;\n';
    const modelSearch = 'const a = 1;\nconst b = 2;';
    const modelReplace = 'const a = 10;\nconst b = 20;';

    const r = applySearchReplaceHunk(fileWithTrailingSpaces, modelSearch, modelReplace);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.content).toBe('const a = 10;\nconst b = 20;\n');
    }
  });
});
