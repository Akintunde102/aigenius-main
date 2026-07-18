/* eslint-disable @typescript-eslint/no-explicit-any */
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

import * as desktopRuntime from '@/lib/utils/desktop-runtime';
import { authorizedFetch } from '@/lib/api/auth-client';
import { accessModelStream } from '../access-model';

const mockConfig = {
  endpoint: 'https://api.test',
  project: 'test-project',
  token: 'test-token',
  autoCreate: true,
  mutate: true,
};

const DELEGATE_ID = '11111111-1111-4111-8111-111111111111';

function sseChunk(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

describe('access-model desktop delegate', () => {
  const runLocalDesktopTool = jest.fn();

  beforeEach(() => {
    desktopRuntime.resetDesktopRunnableBridgeCacheForTests();
    runLocalDesktopTool.mockReset();
    (authorizedFetch as jest.Mock).mockReset();

    (window as any).aigeniusDesktop = {
      isDesktop: true,
      runLocalDesktopTool,
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (window as any).aigeniusDesktop;
  });

  it('posts desktop tool results without rawData (backend DTO rejects extra fields)', async () => {
    runLocalDesktopTool.mockResolvedValue({
      ok: true,
      result: '{"created":["/Users/test/demo/index.html"]}',
      rawData: { created: ['/Users/test/demo/index.html'] },
    });

    const streamBody = [
      sseChunk({
        choices: [{
          delta: {
            tool_stream_event: {
              type: 'client_delegate',
              delegate_id: DELEGATE_ID,
              tool: 'local_apply_patch',
              arguments: { operations: [] },
            },
          },
        }],
      }),
      sseChunk({
        choices: [{
          delta: { content: 'Done' },
          finish_reason: 'stop',
        }],
      }),
      'data: [DONE]\n\n',
    ].join('');

    const encoder = new TextEncoder();
    let fetchCall = 0;
    (authorizedFetch as jest.Mock).mockImplementation(async (url: string, init?: RequestInit) => {
      fetchCall += 1;
      if (fetchCall === 1) {
        return {
          ok: true,
          headers: { get: () => null },
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode(streamBody));
              controller.close();
            },
          }),
        };
      }

      expect(String(url)).toContain('/gateway/*/openai/v1/chat/desktop-tool-result');
      const body = JSON.parse(String(init?.body));
      expect(body).toEqual({
        delegate_id: DELEGATE_ID,
        result: '{"created":["/Users/test/demo/index.html"]}',
      });
      expect(body.rawData).toBeUndefined();

      return { ok: true, headers: { get: () => null } };
    });

    await accessModelStream({
      body: { messages: [{ role: 'user', content: 'create file' }] },
      options: { model: 'openai/gpt-4.1' },
      config: mockConfig as any,
      onData: jest.fn(),
    });

    expect(runLocalDesktopTool).toHaveBeenCalledWith(
      expect.objectContaining({ tool: 'local_apply_patch' }),
      undefined,
    );
    expect(authorizedFetch).toHaveBeenCalledTimes(2);
  });
});
