import {
  linkifyMarkdownFilePaths,
  looksLikeLinkableFilePath,
  resolveLinkableFileAbsolutePath,
} from '../linkifyMarkdownFilePaths';

const ABS = '/home/dev/momversity/apps/web';
const WIN_ABS = 'C:\\Users\\dev\\momversity\\apps\\web';

describe('linkifyMarkdownFilePaths', () => {
  it('detects absolute filesystem paths only', () => {
    expect(looksLikeLinkableFilePath(ABS)).toBe(true);
    expect(looksLikeLinkableFilePath(WIN_ABS)).toBe(true);
    expect(looksLikeLinkableFilePath('apps/web')).toBe(false);
    expect(looksLikeLinkableFilePath('docker-compose.local.yml')).toBe(false);
    expect(looksLikeLinkableFilePath('feat/patient-referrals-and-portal-updates')).toBe(false);
    expect(looksLikeLinkableFilePath('local_read_file')).toBe(false);
    expect(looksLikeLinkableFilePath('https://example.com')).toBe(false);
  });

  it('returns absolute paths unchanged and rejects relative paths', () => {
    expect(resolveLinkableFileAbsolutePath(ABS)).toBe(ABS);
    expect(resolveLinkableFileAbsolutePath(WIN_ABS)).toBe(WIN_ABS);
    expect(resolveLinkableFileAbsolutePath('apps/web')).toBeNull();
  });

  it('rewrites inline absolute paths into local-file markdown links', () => {
    const input = `Open \`${ABS}\` and \`${WIN_ABS}\`.`;
    const out = linkifyMarkdownFilePaths(input);
    expect(out).toContain(`[${ABS}](local-file://`);
    expect(out).toContain(`[${WIN_ABS}](local-file://`);
    expect(out).toContain('%2Fhome%2Fdev%2Fmomversity%2Fapps%2Fweb');
  });

  it('does not rewrite relative paths — model must emit full local-file links', () => {
    const input =
      'Primary app: `apps/web` with `docker-compose.local.yml` and `docker-compose.prod.yml`.';
    expect(linkifyMarkdownFilePaths(input)).toBe(input);
  });

  it('skips fenced code blocks', () => {
    const input = `Text \`${ABS}\` and block:\n\`\`\`\n${ABS}\n\`\`\`\nAfter \`/tmp/a.ts\``;
    const out = linkifyMarkdownFilePaths(input);
    expect(out).toContain(`[${ABS}](local-file://`);
    expect(out).toContain(`\`\`\`\n${ABS}\n\`\`\``);
    expect(out).toContain('[/tmp/a.ts](local-file://');
  });
});
