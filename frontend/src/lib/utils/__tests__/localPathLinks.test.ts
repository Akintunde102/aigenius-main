import {
  buildDesktopLocalLinksGuidance,
  formatLocalPathMarkdownLink,
  isLoopbackHttpUrl,
  normalizeFileUriToPath,
  resolveMarkdownHrefForDesktop,
  toLocalFileHref,
} from '../localPathLinks';

describe('localPathLinks', () => {
  it('builds local-file href with encoding', () => {
    expect(toLocalFileHref('/Users/me/My Files/index.html')).toBe(
      'local-file://%2FUsers%2Fme%2FMy%20Files%2Findex.html',
    );
  });

  it('normalizes file:// URIs on macOS and Windows', () => {
    expect(normalizeFileUriToPath('file:///Users/me/site/index.html')).toBe(
      '/Users/me/site/index.html',
    );
    expect(normalizeFileUriToPath('file:///C:/Users/me/site/index.html')).toBe(
      'C:/Users/me/site/index.html',
    );
  });

  it('does not treat tilde paths as local-file preview links', () => {
    expect(
      resolveMarkdownHrefForDesktop(
        'local-file://' + encodeURIComponent('~/Documents/report.pdf'),
      ),
    ).toEqual({ kind: 'passthrough' });
    expect(
      resolveMarkdownHrefForDesktop('local-file://' + encodeURIComponent('~')),
    ).toEqual({ kind: 'passthrough' });
  });

  it('resolves only local-file:// preview links for desktop', () => {
    expect(
      resolveMarkdownHrefForDesktop(
        'local-file://%2FUsers%2Fme%2Findex.html',
      ),
    ).toEqual({
      kind: 'local-file',
      path: '/Users/me/index.html',
    });
    expect(resolveMarkdownHrefForDesktop('/Users/me/index.html')).toEqual({
      kind: 'passthrough',
    });
    expect(resolveMarkdownHrefForDesktop('file:///Users/me/index.html')).toEqual({
      kind: 'passthrough',
    });
    expect(resolveMarkdownHrefForDesktop('http://127.0.0.1:8080/')).toEqual({
      kind: 'passthrough',
    });
  });

  it('formats markdown preview links', () => {
    expect(formatLocalPathMarkdownLink('/tmp/a.html')).toBe(
      '[a.html](local-file://%2Ftmp%2Fa.html)',
    );
  });

  it('detects loopback hosts', () => {
    expect(isLoopbackHttpUrl('http://localhost:5500')).toBe(true);
    expect(isLoopbackHttpUrl('https://example.com')).toBe(false);
  });

  it('includes platform-specific guidance without Windows assumptions on darwin', () => {
    const text = buildDesktopLocalLinksGuidance('darwin', '/Users/clinton');
    expect(text).toContain('darwin');
    expect(text).toContain('/Users/clinton');
    expect(text).toContain('local-file://');
    expect(text).toContain('Do **not** assume Windows');
  });
});
