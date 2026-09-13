import { resolveDesktopShellGoogleSignIn } from './desktop-google-signin';

describe('resolveDesktopShellGoogleSignIn', () => {
  it('starts Google OAuth through the desktop bridge', async () => {
    const startOAuthSignIn = jest.fn(async () => ({ token: 'access' }));
    const start = resolveDesktopShellGoogleSignIn({
      startOAuthSignIn,
      startWebSignIn: jest.fn(async () => ({ token: 'web' })),
    });

    await expect(start?.()).resolves.toEqual({ token: 'access' });
    expect(startOAuthSignIn).toHaveBeenCalledWith({ provider: 'google' });
  });

  it('falls back to startWebSignIn when startOAuthSignIn is missing', async () => {
    const startWebSignIn = jest.fn(async () => ({ token: 'web' }));
    const start = resolveDesktopShellGoogleSignIn({ startWebSignIn });

    await expect(start?.()).resolves.toEqual({ token: 'web' });
    expect(startWebSignIn).toHaveBeenCalledTimes(1);
  });

  it('returns null when the desktop bridge cannot start sign-in', () => {
    expect(resolveDesktopShellGoogleSignIn(undefined)).toBeNull();
    expect(resolveDesktopShellGoogleSignIn({})).toBeNull();
  });
});
