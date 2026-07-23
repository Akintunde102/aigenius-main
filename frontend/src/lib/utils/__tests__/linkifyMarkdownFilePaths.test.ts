import {
  linkifyMarkdownFilePaths,
  looksLikeLinkableFilePath,
  resolveLinkableFileAbsolutePath,
} from '../linkifyMarkdownFilePaths';

const ROOT = '/home/dev/momversity';

describe('linkifyMarkdownFilePaths', () => {
  it('detects file-like inline code and skips branches', () => {
    expect(looksLikeLinkableFilePath('apps/web')).toBe(true);
    expect(looksLikeLinkableFilePath('docker-compose.local.yml')).toBe(true);
    expect(looksLikeLinkableFilePath('feat/patient-referrals-and-portal-updates')).toBe(false);
    expect(looksLikeLinkableFilePath('local_read_file')).toBe(false);
    expect(looksLikeLinkableFilePath('https://example.com')).toBe(false);
  });

  it('resolves relative paths against the active project root', () => {
    expect(resolveLinkableFileAbsolutePath('apps/web', ROOT)).toBe(
      '/home/dev/momversity/apps/web',
    );
    expect(resolveLinkableFileAbsolutePath('/etc/hosts', ROOT)).toBe('/etc/hosts');
    expect(resolveLinkableFileAbsolutePath('apps/web', null)).toBeNull();
  });

  it('rewrites inline code paths into local-file markdown links', () => {
    const input =
      'Primary app: `apps/web` with `docker-compose.local.yml` and `docker-compose.prod.yml`.';
    const out = linkifyMarkdownFilePaths(input, { projectRoot: ROOT });
    expect(out).toContain('[apps/web](local-file://');
    expect(out).toContain('[docker-compose.local.yml](local-file://');
    expect(out).toContain('%2Fhome%2Fdev%2Fmomversity%2Fapps%2Fweb');
  });

  it('does not rewrite git branch names', () => {
    const input = 'Branch: `feat/patient-referrals-and-portal-updates`';
    const out = linkifyMarkdownFilePaths(input, { projectRoot: ROOT });
    expect(out).toBe(input);
  });

  it('skips fenced code blocks', () => {
    const input = 'Text `apps/web` and block:\n```\napps/web\n```\nAfter `src/index.ts`';
    const out = linkifyMarkdownFilePaths(input, { projectRoot: ROOT });
    expect(out).toContain('[apps/web](local-file://');
    expect(out).toContain('```\napps/web\n```');
    expect(out).toContain('[src/index.ts](local-file://');
  });

  it('leaves paths unchanged when no project root is available', () => {
    const input = 'See `apps/web` for details.';
    expect(linkifyMarkdownFilePaths(input, { projectRoot: null })).toBe(input);
  });
});
