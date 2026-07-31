import {
  formatWebFetchDuration,
  hostnameFromUrl,
  parseWebFetchResult,
  webFetchContentToRender,
  webFetchWarningLabel,
} from './web-fetch-display.utils';

describe('web-fetch-display.utils', () => {
  it('parses structured web_fetch result', () => {
    const parsed = parseWebFetchResult(
      JSON.stringify({
        success: true,
        title: 'Example',
        result: '# Hello',
        durationMs: 450,
      }),
    );
    expect(parsed?.title).toBe('Example');
    expect(webFetchContentToRender(parsed)).toBe('# Hello');
  });

  it('formats duration and warning labels', () => {
    expect(formatWebFetchDuration(850)).toBe('850ms');
    expect(formatWebFetchDuration(2400)).toBe('2.4s');
    expect(webFetchWarningLabel('js_required')).toContain('JavaScript');
  });

  it('extracts hostname from url', () => {
    expect(hostnameFromUrl('https://www.example.com/path')).toBe('example.com');
  });
});
