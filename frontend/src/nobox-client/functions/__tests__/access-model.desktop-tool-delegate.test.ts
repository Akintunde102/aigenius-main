/**
 * Desktop delegated tools: POST /desktop-tool-result must not send `rawData`
 * (backend ValidationPipe forbidNonWhitelisted rejects unknown fields).
 */
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
    getAccessToken: () => 'test-jwt-token',
  };
});

import { authorizedFetch } from '@/lib/api/auth-client';
import * as desktopRuntime from '@/lib/utils/desktop-runtime';
import { accessModelStream } from '../access-model';

const DELEGATE_ID = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
const mockConfig = {
  endpoint: 'https://api.test',
  project: 'test-project',
  token: 'test-token',
  autoCreate: true,
  mutate: true,
};

function sseResponse(lines: string[]): Response {
  const encoder = new TextEncoder();
  const payload = lines.map((line) => `${line}\n`).join('');
  const bytes = encoder.encode(payload);
  let offset = 0;
  const reader = {
    read: async (): Promise<ReadableStreamReadResult<Uint8Array>> => {
      if (offset >= bytes.length) {
        return { done: true, value: undefined };
      }
      const value = bytes.subarray(offset);
      offset = bytes.length;
      return { done: false, value };
    },
    releaseLock: () => undefined,
    cancel: async () => undefined,
    closed: Promise.resolve(undefined),
  };
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    body: { getReader: () => reader },
  } as unknown as Response;
}

function clientDelegateChunk(): string {
  return JSON.stringify({
    choices: [
      {
        delta: {
          tool_stream_event: {
            type: 'client_delegate',
            delegate_id: DELEGATE_ID,
            tool: 'local_shell',
            arguments: { command: 'echo hello' },
          },
        },
      },
    ],
  });
}

describe('accessModelStream desktop tool delegate', () => {
  const runLocalDesktopTool = jest.fn();

  beforeEach(() => {
    desktopRuntime.resetDesktopRunnableBridgeCacheForTests();
    (desktopRuntime.resolveDesktopChatRequestContext as jest.Mock).mockResolvedValue(true);
    jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 Electron/33.0.0',
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (window as Window & { aigeniusDesktop?: object }).aigeniusDesktop;
    desktopRuntime.resetDesktopRunnableBridgeCacheForTests();
  });

  it('posts delegate result without rawData when the local tool returns rawData', async () => {
    runLocalDesktopTool.mockResolvedValue({
      ok: true,
      result: '### Shell output\n\n```\nhello\n```',
      rawData: { stdout: 'hello\n', stderr: '', exit_code: 0 },
    });
    (window as Window & { aigeniusDesktop?: object }).aigeniusDesktop = {
      isDesktop: true,
      runLocalDesktopTool,
    };

    const delegatePosts: Array<{ url: string; body: unknown }> = [];

    (authorizedFetch as jest.Mock).mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/openai/v1/chat/desktop-tool-result')) {
        delegatePosts.push({
          url,
          body: JSON.parse(String(init?.body ?? '{}')),
        });
        return { ok: true, status: 200, json: async () => ({ ok: true }) } as Response;
      }
      return sseResponse([`data: ${clientDelegateChunk()}`, 'data: [DONE]']);
    });

    await accessModelStream({
      body: { messages: [{ role: 'user', content: 'list desktop' }] },
      options: { model: 'gpt-4' },
      config: mockConfig as any,
      onData: () => undefined,
    });

    expect(runLocalDesktopTool).toHaveBeenCalledTimes(1);
    expect(delegatePosts).toHaveLength(1);
    expect(delegatePosts[0]?.url).toContain('/openai/v1/chat/desktop-tool-result');
    expect(delegatePosts[0]?.body).toEqual({
      delegate_id: DELEGATE_ID,
      result: '### Shell output\n\n```\nhello\n```',
    });
    expect(delegatePosts[0]?.body).not.toHaveProperty('rawData');
  });

  it('posts tool errors without rawData', async () => {
    runLocalDesktopTool.mockResolvedValue({
      ok: false,
      error: 'Sidecar returned 401: Unauthorized',
    });
    (window as Window & { aigeniusDesktop?: object }).aigeniusDesktop = {
      isDesktop: true,
      runLocalDesktopTool,
    };

    const delegatePosts: unknown[] = [];

    (authorizedFetch as jest.Mock).mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/openai/v1/chat/desktop-tool-result')) {
        delegatePosts.push(JSON.parse(String(init?.body ?? '{}')));
        return { ok: true, status: 200, json: async () => ({ ok: true }) } as Response;
      }
      return sseResponse([`data: ${clientDelegateChunk()}`, 'data: [DONE]']);
    });

    await accessModelStream({
      body: { messages: [{ role: 'user', content: 'index status' }] },
      options: { model: 'gpt-4' },
      config: mockConfig as any,
      onData: () => undefined,
    });

    expect(delegatePosts).toEqual([
      {
        delegate_id: DELEGATE_ID,
        error: 'Sidecar returned 401: Unauthorized',
      },
    ]);
  });

  it('completes delegate on the first POST when the tool returns rawData locally', async () => {
    runLocalDesktopTool.mockResolvedValue({ ok: true, result: 'ok', rawData: { stdout: 'hello' } });
    (window as Window & { aigeniusDesktop?: object }).aigeniusDesktop = {
      isDesktop: true,
      runLocalDesktopTool,
    };

    let delegateAttempt = 0;
    (authorizedFetch as jest.Mock).mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/openai/v1/chat/desktop-tool-result')) {
        delegateAttempt += 1;
        const body = JSON.parse(String(init?.body ?? '{}'));
        expect(body).not.toHaveProperty('rawData');
        expect(body).toEqual({ delegate_id: DELEGATE_ID, result: 'ok' });
        return { ok: true, status: 200, json: async () => ({ ok: true }) } as Response;
      }
      return sseResponse([`data: ${clientDelegateChunk()}`, 'data: [DONE]']);
    });

    await accessModelStream({
      body: { messages: [{ role: 'user', content: 'test' }] },
      options: { model: 'gpt-4' },
      config: mockConfig as any,
      onData: () => undefined,
    });

    expect(delegateAttempt).toBe(1);
  });
});
