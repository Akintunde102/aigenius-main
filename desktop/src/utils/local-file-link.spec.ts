import { toLocalFileMarkdownLink, localFileLinkLabel } from './local-file-link';

describe('local-file-link', () => {
  it('builds markdown links with encoded paths', () => {
    const path = 'C:\\Users\\dev\\project\\readme.md';
    expect(toLocalFileMarkdownLink(path)).toBe(
      `[readme.md](local-file://${encodeURIComponent(path)})`,
    );
  });

  it('uses custom labels', () => {
    expect(toLocalFileMarkdownLink('/tmp/a.ts', 'source')).toBe(
      `[source](local-file://${encodeURIComponent('/tmp/a.ts')})`,
    );
  });

  it('extracts basename labels', () => {
    expect(localFileLinkLabel('/var/log/app.log')).toBe('app.log');
    expect(localFileLinkLabel('C:\\data\\file.txt')).toBe('file.txt');
  });
});
