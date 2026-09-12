import { buildUpstreamGoogleAuthUrl } from './main-desktop-signin';

jest.mock('electron', () => ({
  BrowserWindow: { fromWebContents: jest.fn() },
  shell: { openExternal: jest.fn() },
  app: { isPackaged: false },
}));

describe('buildUpstreamGoogleAuthUrl', () => {
  it('opens Google through the API with a desktop loopback callback, not the web login page', () => {
    const url = buildUpstreamGoogleAuthUrl(
      'https://api.example.com/',
      'http://127.0.0.1:49201/',
      'pkce-challenge',
    );

    expect(url).toBe(
      'https://api.example.com/auth/_/google?callback_url=http%3A%2F%2F127.0.0.1%3A49201%2F&callback_client=desktop&pkce_challenge=pkce-challenge',
    );
    expect(url).not.toContain('/login');
    expect(url).not.toContain('desktop_callback');
  });
});
