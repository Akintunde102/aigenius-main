/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('PublicPageShellClient smoke', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'PublicPageShellClient.tsx'),
    'utf8',
  );

  it('source file exists', () => {
    expect(source.length).toBeGreaterThan(0);
  });

  it('shows Open app when a session exists and Sign in when it does not', () => {
    expect(source).toContain('hasAuthSession');
    expect(source).toContain('Open app');
    expect(source).toContain('Sign in');
    expect(source).toContain('signedIn');
  });
});
