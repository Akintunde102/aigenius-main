import {
  parseLoginDesktopHandoffSearch,
  resolveOAuthTokenDesktopHandoffRedirect,
} from './desktop-oauth-handoff';

describe('parseLoginDesktopHandoffSearch', () => {
  it('returns plain_web when desktop_callback is absent', () => {
    expect(parseLoginDesktopHandoffSearch('')).toEqual({ kind: 'plain_web' });
    expect(parseLoginDesktopHandoffSearch('?foo=bar')).toEqual({ kind: 'plain_web' });
  });

  it('parses desktop handoff params including pkce_challenge', () => {
    const search =
      '?desktop_callback=http%3A%2F%2F127.0.0.1%3A49201%2F'
      + '&pkce_challenge=abc-challenge'
      + '&api_root=https%3A%2F%2Fapi.example.com'
      + '&auto=google';

    expect(parseLoginDesktopHandoffSearch(search)).toEqual({
      kind: 'desktop',
      handoff: {
        callback: 'http://127.0.0.1:49201/',
        pkceChallenge: 'abc-challenge',
        apiRoot: 'https://api.example.com',
        autoGoogle: true,
      },
    });
  });

  it('treats blank pkce_challenge as null', () => {
    const search = '?desktop_callback=http%3A%2F%2F127.0.0.1%3A49201%2F&pkce_challenge=%20%20';
    expect(parseLoginDesktopHandoffSearch(search)).toEqual({
      kind: 'desktop',
      handoff: {
        callback: 'http://127.0.0.1:49201/',
        pkceChallenge: null,
        apiRoot: null,
        autoGoogle: false,
      },
    });
  });

  it('ignores auto=google unless desktop_callback is present', () => {
    expect(parseLoginDesktopHandoffSearch('?auto=google')).toEqual({ kind: 'plain_web' });
  });
});

describe('resolveOAuthTokenDesktopHandoffRedirect', () => {
  it('redirects to desktop loopback only for explicit desktop callbacks', () => {
    expect(
      resolveOAuthTokenDesktopHandoffRedirect({
        token: 'jwt-token',
        callbackClient: 'desktop',
        desktopCallback: 'http://127.0.0.1:49201/',
      }),
    ).toBe('http://127.0.0.1:49201/?token=jwt-token');
  });

  it('preserves existing query string on loopback callback', () => {
    expect(
      resolveOAuthTokenDesktopHandoffRedirect({
        token: 'jwt-token',
        callbackClient: 'desktop',
        desktopCallback: 'http://127.0.0.1:49201/?state=1',
      }),
    ).toBe('http://127.0.0.1:49201/?state=1&token=jwt-token');
  });

  it('does not redirect normal web OAuth token landings', () => {
    expect(
      resolveOAuthTokenDesktopHandoffRedirect({
        token: 'jwt-token',
        callbackClient: null,
        desktopCallback: 'http://127.0.0.1:49201/',
      }),
    ).toBeNull();
  });

  it('does not redirect when callback_client is not desktop', () => {
    expect(
      resolveOAuthTokenDesktopHandoffRedirect({
        token: 'jwt-token',
        callbackClient: 'web',
        desktopCallback: 'http://127.0.0.1:49201/',
      }),
    ).toBeNull();
  });

  it('does not redirect without a stored desktop callback', () => {
    expect(
      resolveOAuthTokenDesktopHandoffRedirect({
        token: 'jwt-token',
        callbackClient: 'desktop',
        desktopCallback: null,
      }),
    ).toBeNull();
  });

  it('encodes token values for URL safety', () => {
    expect(
      resolveOAuthTokenDesktopHandoffRedirect({
        token: 'a+b/c',
        callbackClient: 'desktop',
        desktopCallback: 'http://127.0.0.1:49201/',
      }),
    ).toBe('http://127.0.0.1:49201/?token=a%2Bb%2Fc');
  });
});
