import { buildUpstreamGoogleAuthUrl } from './main-desktop-signin';

describe('buildUpstreamGoogleAuthUrl', () => {
  it('includes desktop callback params for the API Google OAuth entrypoint', () => {
    expect(
      buildUpstreamGoogleAuthUrl(
        'https://api.example.com/',
        'http://127.0.0.1:49201/',
      ),
    ).toBe(
      'https://api.example.com/auth/_/google?callback_url=http%3A%2F%2F127.0.0.1%3A49201%2F&callback_client=desktop',
    );
  });

  it('includes pkce_challenge when provided', () => {
    expect(
      buildUpstreamGoogleAuthUrl(
        'https://api.example.com',
        'http://127.0.0.1:49201/',
        'pkce-challenge-xyz',
      ),
    ).toBe(
      'https://api.example.com/auth/_/google?callback_url=http%3A%2F%2F127.0.0.1%3A49201%2F&callback_client=desktop&pkce_challenge=pkce-challenge-xyz',
    );
  });

  it('omits pkce_challenge when not provided', () => {
    const url = buildUpstreamGoogleAuthUrl(
      'https://api.example.com',
      'http://127.0.0.1:49201/',
    );
    expect(url).not.toContain('pkce_challenge');
  });
});
