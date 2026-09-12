import {
  buildDesktopGoogleOAuthUrl,
  clearDesktopHandoffSession,
  readStoredDesktopApiRoot,
  readStoredDesktopCallback,
  readStoredDesktopPkceChallenge,
  resolveDesktopGoogleOAuthUrl,
  shouldPersistDesktopApiRoot,
  storeDesktopApiRoot,
  storeDesktopHandoffSession,
} from './desktop-google-auth-url';

describe('buildDesktopGoogleOAuthUrl', () => {
  it('targets the hosted API root with a desktop loopback callback', () => {
    expect(
      buildDesktopGoogleOAuthUrl(
        'https://api.example.com/',
        'http://127.0.0.1:49201/',
      ),
    ).toBe(
      'https://api.example.com/auth/_/google?callback_url=http%3A%2F%2F127.0.0.1%3A49201%2F&callback_client=desktop',
    );
  });

  it('includes pkce_challenge when provided', () => {
    expect(
      buildDesktopGoogleOAuthUrl(
        'https://api.example.com',
        'http://127.0.0.1:49201/',
        'abc-challenge',
      ),
    ).toBe(
      'https://api.example.com/auth/_/google?callback_url=http%3A%2F%2F127.0.0.1%3A49201%2F&callback_client=desktop&pkce_challenge=abc-challenge',
    );
  });
});

describe('desktop handoff session storage', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
        clear: () => {
          store.clear();
        },
      },
    });
  });

  it('stores callback and pkce challenge for browser desktop sign-in', () => {
    storeDesktopHandoffSession({
      callback: 'http://127.0.0.1:49201/',
      pkceChallenge: 'challenge-123',
    });
    expect(readStoredDesktopCallback()).toBe('http://127.0.0.1:49201/');
    expect(readStoredDesktopPkceChallenge()).toBe('challenge-123');
  });

  it('clears desktop handoff session keys together', () => {
    storeDesktopHandoffSession({
      callback: 'http://127.0.0.1:49201/',
      pkceChallenge: 'challenge-123',
    });
    clearDesktopHandoffSession();
    expect(readStoredDesktopCallback()).toBeNull();
    expect(readStoredDesktopPkceChallenge()).toBeNull();
  });

  it('removes stale pkce challenge when storing a callback without one', () => {
    storeDesktopHandoffSession({
      callback: 'http://127.0.0.1:49201/',
      pkceChallenge: 'old-challenge',
    });
    storeDesktopHandoffSession({
      callback: 'http://127.0.0.1:49201/',
      pkceChallenge: null,
    });
    expect(readStoredDesktopPkceChallenge()).toBeNull();
  });

  it('ignores blank callbacks', () => {
    storeDesktopHandoffSession({ callback: '   ', pkceChallenge: 'challenge-123' });
    expect(readStoredDesktopCallback()).toBeNull();
  });

  it('returns null when sessionStorage throws', () => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: () => {
          throw new Error('blocked');
        },
        setItem: () => {
          throw new Error('blocked');
        },
        removeItem: () => {
          throw new Error('blocked');
        },
      },
    });
    expect(readStoredDesktopCallback()).toBeNull();
    expect(readStoredDesktopPkceChallenge()).toBeNull();
    clearDesktopHandoffSession();
  });

  it('uses stored api root and pkce when resolving desktop OAuth URL', () => {
    storeDesktopApiRoot('https://stored-api.example.com');
    const url = resolveDesktopGoogleOAuthUrl(
      'http://127.0.0.1:49201/',
      'https://fallback-api.example.com',
      'challenge-456',
    );
    expect(url).toContain('https://stored-api.example.com/auth/_/google');
    expect(url).toContain('pkce_challenge=challenge-456');
    expect(url).not.toContain('fallback-api.example.com');
  });
});

describe('desktop api root session storage', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
        clear: () => {
          store.clear();
        },
      },
    });
  });

  it('stores and reads the upstream API root for desktop browser sign-in', () => {
    storeDesktopApiRoot('https://api.example.com/');
    expect(readStoredDesktopApiRoot()).toBe('https://api.example.com');
  });

  it('ignores legacy localhost:8000 defaults', () => {
    expect(shouldPersistDesktopApiRoot('http://localhost:8000')).toBe(false);
    storeDesktopApiRoot('http://localhost:8000');
    expect(readStoredDesktopApiRoot()).toBeNull();
  });

  it('ignores legacy desktop sidecar port 8001', () => {
    expect(shouldPersistDesktopApiRoot('http://127.0.0.1:8001')).toBe(false);
    storeDesktopApiRoot('http://127.0.0.1:8001');
    expect(readStoredDesktopApiRoot()).toBeNull();
  });
});
