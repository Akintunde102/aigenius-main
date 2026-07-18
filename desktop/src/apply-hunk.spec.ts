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
});
