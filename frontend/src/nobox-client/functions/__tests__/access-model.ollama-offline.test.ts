/* eslint-disable @typescript-eslint/no-explicit-any */
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

import * as desktopRuntime from '@/lib/utils/desktop-runtime';
import { authorizedFetch } from '@/lib/api/auth-client';
import { _accessModel, accessModelStream } from '../access-model';

const mockConfig = {
  endpoint: 'https://api.test',
  project: 'test-project',
  token: 'test-token',
  autoCreate: true,
  mutate: true,
};

describe('access-model ollama offline', () => {
  const runLocalDesktopTool = jest.fn();

  beforeEach(() => {
    desktopRuntime.resetDesktopRunnableBridgeCacheForTests();
    runLocalDesktopTool.mockReset();
    
    // Mock offline
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    
    // Mock desktop bridge
    (window as any).aigeniusDesktop = {
      isDesktop: true,
      runLocalDesktopTool,
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (window as any).aigeniusDesktop;
  });

  it('should use direct local tool when offline for ollama model', async () => {
    runLocalDesktopTool.mockResolvedValue({
      ok: true,
      result: 'Local response from Ollama',
    });

    const result = await _accessModel({
      body: { messages: [{ role: 'user', content: 'hello' }] },
      options: { model: 'ollama:llama3' },
      config: mockConfig as any,
    });

    expect(runLocalDesktopTool).toHaveBeenCalledWith(expect.objectContaining({
      tool: 'local_ollama_chat',
      arguments: expect.objectContaining({
        payload: expect.objectContaining({
          model: 'llama3',
          stream: false,
        }),
      }),
    }));
    expect(result?.content).toBe('Local response from Ollama');
  });

  it('sends the complete desktop Ollama request payload and normalizes the response back to chat content', async () => {
    runLocalDesktopTool.mockResolvedValue({
      ok: true,
      result: 'Desktop roundtrip response',
    });

    const result = await _accessModel({
      body: {
        messages: [
          { role: 'system', content: 'Be concise' },
          { role: 'user', content: 'Summarize this' },
        ],
        conversationId: 'desktop-ollama-conv-1',
      },
      options: { model: 'ollama:llama3.1:8b' },
      config: mockConfig as any,
    });

    expect(runLocalDesktopTool).toHaveBeenCalledWith({
      tool: 'local_ollama_chat',
      arguments: {
        payload: {
          model: 'llama3.1:8b',
          messages: [
            { role: 'system', content: 'Be concise' },
            { role: 'user', content: 'Summarize this' },
          ],
          stream: false,
        },
      },
    });
    expect(result).toEqual(expect.objectContaining({
      content: 'Desktop roundtrip response',
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      cost: 0,
    }));
  });

  it('surfaces desktop Ollama failures instead of falling through to network chat', async () => {
    runLocalDesktopTool.mockResolvedValue({
      ok: false,
      error: 'Ollama is not running',
    });

    await expect(_accessModel({
      body: { messages: [{ role: 'user', content: 'hello' }] },
      options: { model: 'ollama:llama3' },
      config: mockConfig as any,
    })).rejects.toThrow('Ollama is not running');

    expect(authorizedFetch).not.toHaveBeenCalled();
  });

  it('should use streaming local tool when offline for ollama model', async () => {
    runLocalDesktopTool.mockImplementation(async (payload, options) => {
        // Simulate streaming chunks
        if (options?.onShellStreamChunk) {
            options.onShellStreamChunk({ stream: 'stdout', text: '{"message":{"content":"Hello"}}\n' });
            options.onShellStreamChunk({ stream: 'stdout', text: '{"message":{"content":" world"}}\n' });
        }
        return { ok: true, result: 'Hello world' };
    });

    const onData = jest.fn();
    await accessModelStream({
      body: { messages: [{ role: 'user', content: 'hello' }] },
      options: { model: 'ollama:llama3' },
      config: mockConfig as any,
      onData,
    });

    expect(onData).toHaveBeenCalledWith('Hello');
    expect(onData).toHaveBeenCalledWith(' world');
  });

  it('streams split desktop Ollama JSON lines back to the chat UI and completes once', async () => {
    runLocalDesktopTool.mockImplementation(async (_payload, options) => {
      options.onShellStreamChunk({ stream: 'stderr', text: 'progress noise\n' });
      options.onShellStreamChunk({ stream: 'stdout', text: '{"message":{"content":"Hel' });
      options.onShellStreamChunk({ stream: 'stdout', text: 'lo"}}\n{"message":{"content":" world"}}' });
      return { ok: true, result: 'Hello world' };
    });

    const onData = jest.fn();
    const onComplete = jest.fn();
    const result = await accessModelStream({
      body: { messages: [{ role: 'user', content: 'hello' }] },
      options: { model: 'ollama:llama3' },
      config: mockConfig as any,
      onData,
      onComplete,
    });

    expect(onData.mock.calls.map(([text]) => text)).toEqual(['Hello', ' world']);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(result);
    expect(result).toEqual(expect.objectContaining({
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      cost: 0,
    }));
  });

  it('throws when the streaming desktop Ollama tool reports failure', async () => {
    runLocalDesktopTool.mockResolvedValue({
      ok: false,
      error: 'Local Ollama error: model missing',
    });

    await expect(accessModelStream({
      body: { messages: [{ role: 'user', content: 'hello' }] },
      options: { model: 'ollama:missing-model' },
      config: mockConfig as any,
      onData: jest.fn(),
    })).rejects.toThrow('Local Ollama error: model missing');
  });

  it('should connect the relay before using an online Ollama Cloud catalog model', async () => {
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    runLocalDesktopTool.mockResolvedValue({
      ok: true,
      result: 'Relay connected',
    });
    (authorizedFetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      json: async () => ({
        choices: [{ message: { content: 'GLM cloud relayed' } }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        cost: 0,
      }),
    });

    const result = await _accessModel({
      body: { messages: [{ role: 'user', content: 'hello' }] },
      options: { model: 'ollama:glm-5.1:cloud' },
      config: mockConfig as any,
    });

    expect(runLocalDesktopTool).toHaveBeenCalledWith({
      tool: 'local_ollama_connect',
      arguments: { token: 'test-jwt-token' },
    });
    expect(result?.content).toBe('GLM cloud relayed');
  });

  it('should connect the relay before using an online ollama model', async () => {
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    runLocalDesktopTool.mockResolvedValue({
      ok: true,
      result: 'Relay connected',
    });
    (authorizedFetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      json: async () => ({
        choices: [{ message: { content: 'Cloud relayed response' } }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        cost: 0,
      }),
    });

    const result = await _accessModel({
      body: { messages: [{ role: 'user', content: 'hello' }] },
      options: { model: 'ollama:llama3' },
      config: mockConfig as any,
    });

    expect(runLocalDesktopTool).toHaveBeenCalledWith({
      tool: 'local_ollama_connect',
      arguments: { token: 'test-jwt-token' },
    });
    expect(result?.content).toBe('Cloud relayed response');
  });
});
