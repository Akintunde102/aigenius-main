import { ReadableStream } from 'stream/web';
import { OllamaRelayClient } from './ollama-relay.client.js';
import { OLLAMA_RELAY_EVENTS } from './ollama-relay.events.js';

const socket = {
  connected: true,
  emit: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  off: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => socket),
}));

jest.mock('child_process', () => ({
  execSync: jest.fn(() => ''),
  spawn: jest.fn(() => ({
    unref: jest.fn(),
    kill: jest.fn(),
    killed: false,
  })),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
}));

describe('OllamaRelayClient inference relay', () => {
  const encode = (text: string) => new TextEncoder().encode(text);
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (OllamaRelayClient as unknown as { instance?: OllamaRelayClient }).instance = undefined;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('relays streaming local Ollama chunks back to the cloud socket and emits done', async () => {
    const client = OllamaRelayClient.getInstance();
    (client as any).socket = socket;
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encode('{"message":{"content":"Hello"}}\n'));
          controller.enqueue(encode('{"message":{"content":" relay"}}\n'));
          controller.close();
        },
      }),
    });

    await (client as any).handleInferenceRequest('req-1', {
      model: 'llama3',
      messages: [{ role: 'user', content: 'hello' }],
      stream: true,
    });

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:11434/api/chat', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        messages: [{ role: 'user', content: 'hello' }],
        stream: true,
      }),
      signal: expect.any(AbortSignal),
    }));
    expect(socket.emit).toHaveBeenCalledWith(OLLAMA_RELAY_EVENTS.inferenceChunk, {
      requestId: 'req-1',
      text: 'Hello',
    });
    expect(socket.emit).toHaveBeenCalledWith(OLLAMA_RELAY_EVENTS.inferenceChunk, {
      requestId: 'req-1',
      text: ' relay',
    });
    expect(socket.emit).toHaveBeenCalledWith(OLLAMA_RELAY_EVENTS.inferenceDone, { requestId: 'req-1' });
  });

  it('relays non-streaming local Ollama responses using the request id', async () => {
    const client = OllamaRelayClient.getInstance();
    (client as any).socket = socket;
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: {},
      json: async () => ({ message: { content: 'Non-stream response' } }),
    });

    await (client as any).handleInferenceRequest('req-2', {
      model: 'llama3',
      messages: [{ role: 'user', content: 'hello' }],
      stream: false,
    });

    expect(socket.emit).toHaveBeenCalledWith(OLLAMA_RELAY_EVENTS.inferenceResponse, {
      requestId: 'req-2',
      content: 'Non-stream response',
    });
  });

  it('emits stream errors when local Ollama fails', async () => {
    const client = OllamaRelayClient.getInstance();
    (client as any).socket = socket;
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: 'model not found',
      body: {},
    });

    await (client as any).handleInferenceRequest('req-3', {
      model: 'missing',
      messages: [{ role: 'user', content: 'hello' }],
      stream: true,
    });

    expect(socket.emit).toHaveBeenCalledWith(OLLAMA_RELAY_EVENTS.inferenceError, {
      requestId: 'req-3',
      error: 'Local Ollama error: model not found',
    });
  });

  it('emits Ollama response bodies when cloud chat fails', async () => {
    const client = OllamaRelayClient.getInstance();
    (client as any).socket = socket;
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, text: async () => '' })
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Forbidden',
        body: {},
        text: async () => '{"error":"this model requires a subscription"}',
      });

    await (client as any).handleInferenceRequest('req-cloud', {
      model: 'glm-5.1:cloud',
      messages: [{ role: 'user', content: 'hello' }],
      stream: true,
    });

    expect(global.fetch).toHaveBeenNthCalledWith(1, 'http://localhost:11434/api/pull', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ model: 'glm-5.1:cloud', stream: false }),
    }));

    expect(socket.emit).toHaveBeenCalledWith(OLLAMA_RELAY_EVENTS.inferenceError, {
      requestId: 'req-cloud',
      error: 'Local Ollama error: {"error":"this model requires a subscription"}',
    });
  });

  it('maps unauthorized cloud chat errors to a sign-in hint', async () => {
    const client = OllamaRelayClient.getInstance();
    (client as any).socket = socket;
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, text: async () => '' })
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
        body: {},
        text: async () => '{"error":"unauthorized"}',
      });

    await (client as any).handleInferenceRequest('req-unauth', {
      model: 'gpt-oss:120b-cloud',
      messages: [{ role: 'user', content: 'hello' }],
      stream: true,
    });

    expect(socket.emit).toHaveBeenCalledWith(OLLAMA_RELAY_EVENTS.inferenceError, {
      requestId: 'req-unauth',
      error: expect.stringContaining('ollama signin'),
    });
  });
});
