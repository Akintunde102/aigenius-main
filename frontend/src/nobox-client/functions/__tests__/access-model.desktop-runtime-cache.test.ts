/**
 * Desktop chat: getChatRuntimeContext should be cached across sequential requests (TTL).
 */
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

jest.mock('@/lib/utils/store', () => ({
  storage: () => ({
    getString: () => 'test-jwt-token',
  }),
}));
jest.mock('@/lib/constants', () => ({
  storageConstants: { NOBOX_TOKEN: 'nobox_token' },
}));
jest.mock('@/lib/e2e-wallet-bypass', () => ({
  getE2eWalletBypassHeaders: () => ({}),
}));

jest.mock('@/lib/utils/desktop-runtime', () => {
  const actual = jest.requireActual('@/lib/utils/desktop-runtime') as Record<string, unknown>;
  return {
    ...actual,
    resolveDesktopChatRequestContext: jest.fn(() => Promise.resolve(true)),
  };
});

jest.mock('@/lib/api/auth-client', () => {
  const actual = jest.requireActual('@/lib/api/auth-client') as Record<string, unknown>;
  return {
    ...actual,
    authorizedFetch: jest.fn(),
  };
});

import { authorizedFetch } from '@/lib/api/auth-client';
import * as desktopRuntime from '@/lib/utils/desktop-runtime';
import {
  _accessModel,
  resetDesktopIpcRuntimeCacheForTests,
} from '../access-model';

const mockConfig = {
  endpoint: 'https://api.test',
  project: 'test-project',
  token: 'test-token',
  autoCreate: true,
  mutate: true,
};

describe('access-model desktop runtimeContext cache', () => {
  const getChatRuntimeContext = jest.fn().mockResolvedValue({
    desktopHost: {
      platform: 'linux',
      arch: 'x64',
      release: '1',
      userHomeDir: '/home',
    },
    retrievalMemoryCatalog: { generatedAtIso: '2020-01-01T00:00:00.000Z', entries: [] },
  });

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    resetDesktopIpcRuntimeCacheForTests();
    desktopRuntime.resetDesktopRunnableBridgeCacheForTests();
    mockFetch.mockReset();
    getChatRuntimeContext.mockClear();
    (desktopRuntime.resolveDesktopChatRequestContext as jest.Mock).mockResolvedValue(true);
    (authorizedFetch as jest.Mock).mockImplementation((url: string, init?: RequestInit) =>
      mockFetch(url, init),
    );
    jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 Electron/33.0.0',
    );
    (window as Window & { aigeniusDesktop?: object }).aigeniusDesktop = {
      isDesktop: true,
      runLocalDesktopTool: async () => ({ ok: true as const, result: '{}' }),
      getChatRuntimeContext,
    };
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: async () => ({ choices: [{ message: { content: 'Hi' } }] }),
    } as unknown as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (window as Window & { aigeniusDesktop?: object }).aigeniusDesktop;
    resetDesktopIpcRuntimeCacheForTests();
    desktopRuntime.resetDesktopRunnableBridgeCacheForTests();
  });

  it('calls getChatRuntimeContext once for two back-to-back completions within TTL', async () => {
    await _accessModel({
      body: { messages: [{ role: 'user', content: 'a' }] },
      options: { model: 'gpt-4' },
      config: mockConfig as any,
    });
    await _accessModel({
      body: { messages: [{ role: 'user', content: 'b' }] },
      options: { model: 'gpt-4' },
      config: mockConfig as any,
    });
    expect(getChatRuntimeContext).toHaveBeenCalledTimes(1);
  });

  it('calls getChatRuntimeContext again after cache TTL', async () => {
    await _accessModel({
      body: { messages: [{ role: 'user', content: 'a' }] },
      options: { model: 'gpt-4' },
      config: mockConfig as any,
    });
    (Date.now as jest.Mock).mockReturnValue(1_700_000_000_000 + 46_000);
    await _accessModel({
      body: { messages: [{ role: 'user', content: 'b' }] },
      options: { model: 'gpt-4' },
      config: mockConfig as any,
    });
    expect(getChatRuntimeContext).toHaveBeenCalledTimes(2);
  });
});
