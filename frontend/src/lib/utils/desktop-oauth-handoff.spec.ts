import {
  isDesktopLoopbackCallbackUrl,
  parseLoginDesktopHandoffSearch,
  resolveOAuthTokenDesktopHandoffRedirect,
  shouldAutoStartDesktopGoogleOAuth,
  shouldKeepAuthenticatedAuthPageForDesktopHandoff,
} from './desktop-oauth-handoff';

describe('parseLoginDesktopHandoffSearch', () => {
  it('treats a missing callback as plain web sign-in', () => {
    expect(parseLoginDesktopHandoffSearch('')).toEqual({ kind: 'plain_web' });
    expect(parseLoginDesktopHandoffSearch('?next=/chat')).toEqual({ kind: 'plain_web' });
  });

  it('reads desktop handoff query params', () => {
    expect(
      parseLoginDesktopHandoffSearch(
        '?desktop_callback=http://127.0.0.1:49201/&pkce_challenge=abc&api_root=https://api.example.com&auto=google',
      ),
    ).toEqual({
      kind: 'desktop',
      handoff: {
        callback: 'http://127.0.0.1:49201/',
        pkceChallenge: 'abc',
        apiRoot: 'https://api.example.com',
        autoGoogle: true,
      },
    });
  });
});

describe('isDesktopLoopbackCallbackUrl', () => {
  it('allows http loopback hosts only', () => {
    expect(isDesktopLoopbackCallbackUrl('http://127.0.0.1:49201/')).toBe(true);
    expect(isDesktopLoopbackCallbackUrl('http://localhost:9/')).toBe(true);
    expect(isDesktopLoopbackCallbackUrl('http://[::1]:9/')).toBe(true);
    expect(isDesktopLoopbackCallbackUrl('https://127.0.0.1:49201/')).toBe(false);
    expect(isDesktopLoopbackCallbackUrl('http://evil.example/')).toBe(false);
    expect(isDesktopLoopbackCallbackUrl('not-a-url')).toBe(false);
  });
});

describe('shouldKeepAuthenticatedAuthPageForDesktopHandoff', () => {
  it('keeps /login when desktop is handing off through the system browser', () => {
    expect(
      shouldKeepAuthenticatedAuthPageForDesktopHandoff(
        '/login',
        '?desktop_callback=http://127.0.0.1:49201/&pkce_challenge=abc',
      ),
    ).toBe(true);
  });

  it('still sends authenticated users home from a normal /login visit', () => {
    expect(shouldKeepAuthenticatedAuthPageForDesktopHandoff('/login', '')).toBe(false);
    expect(shouldKeepAuthenticatedAuthPageForDesktopHandoff('/login', '?next=/chat')).toBe(false);
  });

  it('does not keep the auth page for a non-loopback callback', () => {
    expect(
      shouldKeepAuthenticatedAuthPageForDesktopHandoff(
        '/login',
        '?desktop_callback=https://evil.example/steal',
      ),
    ).toBe(false);
  });
});

describe('shouldAutoStartDesktopGoogleOAuth', () => {
  it('starts Google immediately for a desktop loopback handoff, even without auto=google', () => {
    expect(
      shouldAutoStartDesktopGoogleOAuth(
        '?desktop_callback=http://127.0.0.1:49201/&pkce_challenge=abc',
      ),
    ).toBe(true);
  });

  it('does not auto-start Google for a normal web login', () => {
    expect(shouldAutoStartDesktopGoogleOAuth('')).toBe(false);
    expect(shouldAutoStartDesktopGoogleOAuth('?next=/chat')).toBe(false);
  });

  it('does not auto-start Google for a non-loopback callback', () => {
    expect(
      shouldAutoStartDesktopGoogleOAuth('?desktop_callback=https://evil.example/steal'),
    ).toBe(false);
  });
});

describe('resolveOAuthTokenDesktopHandoffRedirect', () => {
  it('forwards a desktop token only to a loopback callback', () => {
    expect(
      resolveOAuthTokenDesktopHandoffRedirect({
        token: 'jwt',
        callbackClient: 'desktop',
        desktopCallback: 'http://127.0.0.1:9/',
      }),
    ).toBe('http://127.0.0.1:9/?token=jwt');

    expect(
      resolveOAuthTokenDesktopHandoffRedirect({
        token: 'jwt',
        callbackClient: 'desktop',
        desktopCallback: 'https://evil.example/',
      }),
    ).toBeNull();
  });
});
