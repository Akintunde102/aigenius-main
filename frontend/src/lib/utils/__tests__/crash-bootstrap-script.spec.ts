import { buildCrashBootstrapScript } from '@/lib/utils/crash-bootstrap-script';

describe('crash bootstrap script', () => {
  it('is empty when the API root is missing', () => {
    expect(buildCrashBootstrapScript('  ')).toBe('');
  });

  it('installs a text/plain beacon to the API before React loads', () => {
    const source = buildCrashBootstrapScript('https://api.test/root/');

    expect(source).toContain('https://api.test/root/client-errors');
    expect(source).toContain('__aigReportCrash');
    expect(source).toContain("type:'text/plain'");
    expect(source).not.toContain('document.cookie');
    expect(source).not.toContain('localStorage');
    expect(source).toContain('ChunkLoadError');
  });
});
