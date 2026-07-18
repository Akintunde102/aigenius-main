import {
  buildLocalFilePreviewPayload,
  inferLocalFilePreviewType,
  toLocalFileMarkdownLink,
} from '../local-file-link';

describe('local-file-link (frontend)', () => {
  it('infers preview types from extensions', () => {
    expect(inferLocalFilePreviewType('/tmp/readme.md')).toBe('code');
    expect(inferLocalFilePreviewType('/tmp/photo.png')).toBe('image');
    expect(inferLocalFilePreviewType('/tmp/doc.pdf')).toBe('pdf');
    expect(inferLocalFilePreviewType('/tmp/folder')).toBe('folder');
  });

  it('builds side-panel preview payloads for chat links', () => {
    const payload = buildLocalFilePreviewPayload('/src/app.ts', { placement: 'side' });
    expect(payload.placement).toBe('side');
    expect(payload.localPath).toBe('/src/app.ts');
    expect(payload.name).toBe('app.ts');
    expect(payload.type).toBe('code');
    expect(payload.textContent).toBe('// Loading code...');
  });

  it('formats markdown links', () => {
    expect(toLocalFileMarkdownLink('/a/b.ts')).toContain('[b.ts](local-file://');
  });
});
