import { describe, expect, it, jest } from '@jest/globals';

describe('intelligence-router', () => {
  it('does not crash when tree-sitter is unavailable (packaged build)', async () => {
    // `web-tree-sitter` is intentionally excluded from packaged builds (see
    // install-server-deps-for-platform.cjs). intelligence-router must load
    // ./tree-sitter-indexer.js lazily and fall back gracefully, never via a
    // static import — a static import would fail the whole ESM module graph
    // at load time and crash the mini-server on startup.
    jest.doMock('../tree-sitter-indexer', () => {
      throw new Error("Cannot find package 'web-tree-sitter'");
    });

    const { indexFileIntelligenceFast } = await import('../intelligence-router');

    const pyContent = 'def foo():\n    pass\n';
    const result = await indexFileIntelligenceFast('sample.py', pyContent, 'py');
    expect(result.language).toBe('python');
    expect(result.symbols.some((s) => s.name === 'foo')).toBe(true);

    jest.dontMock('../tree-sitter-indexer');
  });
});
