jest.mock('axios', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

jest.mock('@/lib/links', () => ({
  LINKS: {
    noboxAPIRootUrl: 'https://api.example.com',
  },
}));

const mockSetString = jest.fn();

jest.mock('@/lib/utils/store', () => ({
  storage: jest.fn(() => ({
    setString: mockSetString,
    getString: jest.fn(),
    removeItem: jest.fn(),
  })),
}));

import axios from 'axios';
import { completeDesktopOAuthSession } from './complete-desktop-oauth-session';
import { storageConstants } from '@/lib/constants';
import { storage } from '@/lib/utils/store';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('completeDesktopOAuthSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.cookie = '';
  });

  it('exchanges the OAuth JWT for a connection token and stores both', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { token: 'client-api-key' },
    });

    const ok = await completeDesktopOAuthSession('oauth-jwt');

    expect(ok).toBe(true);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.example.com/auth/_/connection_token',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer oauth-jwt',
        }),
      }),
    );
    expect(storage).toHaveBeenCalledWith(storageConstants.NOBOX_TOKEN);
    expect(storage).toHaveBeenCalledWith(storageConstants.NOBOX_CLIENT_TOKEN);
    expect(mockSetString).toHaveBeenCalledWith('oauth-jwt');
    expect(mockSetString).toHaveBeenCalledWith('client-api-key');
  });

  it('returns false when connection_token is missing', async () => {
    mockedAxios.get.mockResolvedValue({ data: {} });
    await expect(completeDesktopOAuthSession('oauth-jwt')).resolves.toBe(false);
  });

  it('returns false when the exchange request fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('network'));
    await expect(completeDesktopOAuthSession('oauth-jwt')).resolves.toBe(false);
  });
});
