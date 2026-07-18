import {
  hostnameMatchesOauthSuffix,
  isNoboxAuthBackendFlowUrl,
  urlMatchesOauthAllowlist,
} from './oauth-allowlist';

describe('hostnameMatchesOauthSuffix', () => {
  it('matches exact host', () => {
    expect(hostnameMatchesOauthSuffix('github.com', 'github.com')).toBe(true);
  });

  it('matches subdomain', () => {
    expect(hostnameMatchesOauthSuffix('accounts.google.com', 'google.com')).toBe(true);
  });

  it('does not match unrelated suffix', () => {
    expect(hostnameMatchesOauthSuffix('evilgoogle.com', 'google.com')).toBe(false);
  });
});

describe('urlMatchesOauthAllowlist', () => {
  const emptyOrigins = new Set<string>();

  it('matches Google accounts', () => {
    expect(
      urlMatchesOauthAllowlist('https://accounts.google.com/o/oauth2/v2/auth', emptyOrigins, [
        'google.com',
      ]),
    ).toBe(true);
  });

  it('matches extra origin with http for local IdP', () => {
    const origins = new Set(['http://localhost:8080']);
    expect(
      urlMatchesOauthAllowlist('http://localhost:8080/realms/foo/protocol/openid-connect/auth', origins, []),
    ).toBe(true);
  });

  it('rejects non-http(s)', () => {
    expect(urlMatchesOauthAllowlist('file:///etc/passwd', emptyOrigins, ['google.com'])).toBe(false);
  });

  it('rejects unknown host', () => {
    expect(
      urlMatchesOauthAllowlist('https://example.com/login', emptyOrigins, ['google.com']),
    ).toBe(false);
  });
});

describe('isNoboxAuthBackendFlowUrl', () => {
  it('matches remote API Google auth entry', () => {
    expect(isNoboxAuthBackendFlowUrl('https://api.example.com/auth/_/google')).toBe(true);
  });

  it('matches callback path on any host', () => {
    expect(isNoboxAuthBackendFlowUrl('https://api.example.com/auth/_/google/callback?code=x')).toBe(
      true,
    );
  });

  it('matches client-scoped google route', () => {
    expect(isNoboxAuthBackendFlowUrl('https://api.example.com/default/auth/google')).toBe(true);
  });

  it('rejects unrelated paths on same host', () => {
    expect(isNoboxAuthBackendFlowUrl('https://api.example.com/v1/users')).toBe(false);
  });
});
