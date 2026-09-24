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

const runCreateCodeProjectFromToolArgs = jest.fn();
jest.mock('@/lib/code-projects/create-code-project-workflow', () => ({
  runCreateCodeProjectFromToolArgs: (...args: unknown[]) => runCreateCodeProjectFromToolArgs(...args),
}));

import * as desktopRuntime from '@/lib/utils/desktop-runtime';
import { authorizedFetch } from '@/lib/api/auth-client';
import { accessModelStream, resetDelegatePostDedupeStateForTests } from '../access-model';

const mockConfig = {
  endpoint: 'https://api.test',
  project: 'test-project',
  token: 'test-token',
  autoCreate: true,
  mutate: true,
};

const DELEGATE_ID = '22222222-2222-4222-8222-222222222222';

function sseChunk(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

describe('access-model local_create_project delegate', () => {
  const runLocalDesktopTool = jest.fn();

  beforeEach(() => {
    resetDelegatePostDedupeStateForTests();
    desktopRuntime.resetDesktopRunnableBridgeCacheForTests();
    runLocalDesktopTool.mockReset();
    runCreateCodeProjectFromToolArgs.mockReset();
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

  it('runs the shared create workflow instead of Electron local tools', async () => {
    const payload = {
      success: true,
      project: { id: 'p1', name: 'Demo', rootPath: '/docs/Demo' },
      folderCreated: true,
      reusedExistingFolder: false,
      reusedExistingProject: false,
      message: 'Created project Demo and switched this chat to it.',
    };
    runCreateCodeProjectFromToolArgs.mockResolvedValue(payload);

    const streamBody = [
      sseChunk({
        choices: [{
          delta: {
            tool_stream_event: {
              type: 'client_delegate',
              delegate_id: DELEGATE_ID,
              tool: 'local_create_project',
              arguments: { name: 'Demo' },
            },
          },
        }],
      }),
      sseChunk({
        choices: [{
          delta: { content: 'Created' },
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
        result: JSON.stringify(payload),
      });
      return { ok: true, headers: { get: () => null } };
    });

    await accessModelStream({
      body: { messages: [{ role: 'user', content: 'create project Demo' }] },
      options: { model: 'openai/gpt-4.1' },
      config: mockConfig as any,
      onData: jest.fn(),
    });

    expect(runCreateCodeProjectFromToolArgs).toHaveBeenCalledWith({ name: 'Demo' });
    expect(runLocalDesktopTool).not.toHaveBeenCalled();
    expect(authorizedFetch).toHaveBeenCalledTimes(2);
  });
});
