import { parseConnectionTokenFromResponse } from '@/lib/utils/oauth-connection-token';

describe('parseConnectionTokenFromResponse', () => {
  it('reads a flat ApiToken body', () => {
    expect(
      parseConnectionTokenFromResponse({
        token: 'api-key-123',
        createdOn: '2026-01-01T00:00:00.000Z',
        expired: false,
      }),
    ).toBe('api-key-123');
  });

  it('reads a nested data.token body', () => {
    expect(
      parseConnectionTokenFromResponse({
        data: { token: 'nested-key' },
      }),
    ).toBe('nested-key');
  });

  it('returns null when token is missing or empty', () => {
    expect(parseConnectionTokenFromResponse({})).toBeNull();
    expect(parseConnectionTokenFromResponse({ token: '' })).toBeNull();
    expect(parseConnectionTokenFromResponse(null)).toBeNull();
  });
});
