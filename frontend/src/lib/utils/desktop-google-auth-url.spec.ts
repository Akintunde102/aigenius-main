import {
  buildDesktopGoogleOAuthUrl,
  readStoredDesktopApiRoot,
  storeDesktopApiRoot,
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
});
