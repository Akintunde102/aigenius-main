import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';

describe('exchangeDesktopOAuthCode', () => {
  const originalFetch = global.fetch;
  const codeVerifier = 'pkce-verifier-12345678901234567890123456789012';

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns access and refresh tokens from the desktop exchange endpoint', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        token: 'access-token',
        refreshToken: 'refresh-token',
      }),
    })) as unknown as typeof fetch;

    const { exchangeDesktopOAuthCode } = await import('./desktop-auth-exchange');
    const result = await exchangeDesktopOAuthCode(
      'http://127.0.0.1:28000',
      'oauth-code',
      codeVerifier,
    );

    expect(result).toEqual({
      token: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:28000/auth/_/desktop/exchange',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-aigenius-desktop': '1',
        }),
        body: JSON.stringify({ code: 'oauth-code', codeVerifier }),
      }),
    );
  });

  it('returns null when the exchange fails', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 401,
    })) as unknown as typeof fetch;

    const { exchangeDesktopOAuthCode } = await import('./desktop-auth-exchange');
    await expect(
      exchangeDesktopOAuthCode('http://127.0.0.1:28000', 'bad-code', codeVerifier),
    ).resolves.toBeNull();
  });

  it('returns null when codeVerifier is missing', async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;

    const { exchangeDesktopOAuthCode } = await import('./desktop-auth-exchange');
    await expect(
      exchangeDesktopOAuthCode('http://127.0.0.1:28000', 'oauth-code', '  '),
    ).resolves.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
