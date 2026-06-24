import { normalizeLoopbackToShellOrigin } from './loopback-frontend-url';

describe('normalizeLoopbackToShellOrigin', () => {
  const p = '3001';

  it('rewrites http://localhost:<frontendPort> to 127.0.0.1', () => {
    expect(normalizeLoopbackToShellOrigin('http://localhost:3001/?token=x', p)).toBe(
      'http://127.0.0.1:3001/?token=x',
    );
  });

  it('rewrites http://[::1]:<frontendPort> to 127.0.0.1', () => {
    expect(normalizeLoopbackToShellOrigin('http://[::1]:3001/chat?token=y', p)).toBe(
      'http://127.0.0.1:3001/chat?token=y',
    );
  });

  it('leaves 127.0.0.1 unchanged', () => {
    const u = 'http://127.0.0.1:3001/desktop-login';
    expect(normalizeLoopbackToShellOrigin(u, p)).toBe(u);
  });

  it('does not rewrite a different port', () => {
    const u = 'http://localhost:8001/callback?code=1';
    expect(normalizeLoopbackToShellOrigin(u, p)).toBe(u);
  });

  it('does not rewrite https URLs', () => {
    const u = 'https://localhost:3001/';
    expect(normalizeLoopbackToShellOrigin(u, p)).toBe(u);
  });

  it('returns original string on parse failure', () => {
    const u = 'not-a-url';
    expect(normalizeLoopbackToShellOrigin(u, p)).toBe(u);
  });
});
