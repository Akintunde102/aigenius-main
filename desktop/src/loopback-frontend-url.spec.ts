import { normalizeLoopbackToShellOrigin } from './loopback-frontend-url';

describe('normalizeLoopbackToShellOrigin', () => {
  const p = '23001';

  it('rewrites http://127.0.0.1:<frontendPort> to localhost', () => {
    expect(normalizeLoopbackToShellOrigin('http://127.0.0.1:23001/?token=x', p)).toBe(
      'http://localhost:23001/?token=x',
    );
  });

  it('rewrites http://[::1]:<frontendPort> to localhost', () => {
    expect(normalizeLoopbackToShellOrigin('http://[::1]:23001/chat?token=y', p)).toBe(
      'http://localhost:23001/chat?token=y',
    );
  });

  it('leaves localhost unchanged', () => {
    const u = 'http://localhost:23001/desktop-login';
    expect(normalizeLoopbackToShellOrigin(u, p)).toBe(u);
  });

  it('does not rewrite a different port', () => {
    const u = 'http://127.0.0.1:8001/callback?code=1';
    expect(normalizeLoopbackToShellOrigin(u, p)).toBe(u);
  });

  it('does not rewrite https URLs', () => {
    const u = 'https://localhost:23001/';
    expect(normalizeLoopbackToShellOrigin(u, p)).toBe(u);
  });

  it('returns original string on parse failure', () => {
    const u = 'not-a-url';
    expect(normalizeLoopbackToShellOrigin(u, p)).toBe(u);
  });
});
