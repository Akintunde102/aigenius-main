import {
  buildGoogleAuthUrl,
  resolveAuthApiRootUrl,
} from './resolve-auth-api-root';

describe('resolveAuthApiRootUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('prefers upstream API over legacy sidecar NOBOX root', () => {
    process.env.NEXT_PUBLIC_NOBOX_API_ROOT_URL = 'http://127.0.0.1:8001';
    process.env.NEXT_PUBLIC_DESKTOP_UPSTREAM_API_URL = 'http://localhost:28000';

    expect(resolveAuthApiRootUrl()).toBe('http://localhost:28000');
    expect(buildGoogleAuthUrl(resolveAuthApiRootUrl())).toBe(
      'http://localhost:28000/auth/_/google',
    );
  });

  it('rejects legacy API port 8000 when upstream is configured', () => {
    process.env.NEXT_PUBLIC_NOBOX_API_ROOT_URL = 'http://localhost:8000';
    process.env.NEXT_PUBLIC_DESKTOP_UPSTREAM_API_URL = 'http://localhost:28000';

    expect(resolveAuthApiRootUrl()).toBe('http://localhost:28000');
  });
});
