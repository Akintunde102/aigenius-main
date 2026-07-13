/* eslint-disable @typescript-eslint/no-explicit-any */
import { cLogger, Logger } from '../logger';
import { Config } from '../types';
import { extractErrorMessage } from '../utils';
import { authorizedFetch, getAccessToken } from '../../lib/api/auth-client';
import { getE2eWalletBypassHeaders } from '../../lib/e2e-wallet-bypass';
import {
  getAigeniusDesktopBridgeFromBrowsingContext,
  getRunnableLocalDesktopBridge,
  hasRunnableLocalDesktopToolBridge,
  resolveDesktopChatRequestContext,
  waitForLocalDesktopToolBridge,
} from '../../lib/utils/desktop-runtime';

// Constants
const OPENAI_CHAT_COMPLETIONS_PATH = '/gateway/*/openai/v1/chat/completions';
const OPENAI_DESKTOP_TOOL_RESULT_PATH = '/gateway/*/openai/v1/chat/desktop-tool-result';
const CONTENT_TYPE_JSON = 'application/json';
const AUTHORIZATION_BEARER_PREFIX = 'Bearer ';
const STREAM_DONE_SIGNAL = '[DONE]';

/** SSE `data` lines: `data:` then optional space (OpenAI/OpenRouter). */
function extractSseDataPayload(trimmedLine: string): string | undefined {
  if (!trimmedLine.startsWith('data:')) {
    return undefined;
  }
  return trimmedLine.slice('data:'.length).trimStart();
}
const HTTP_METHOD_POST = 'POST';
const DEFAULT_EMPTY_CONTENT = '';
const NEWLINE = '\n';

/** Must match backend `X_AIGENIUS_DESKTOP_HEADER` + `X_AIGENIUS_DESKTOP_HEADER_PRESENT_VALUE`. */
const AIGENIUS_DESKTOP_CLIENT_HEADER = 'x-aigenius-desktop';
const AIGENIUS_DESKTOP_CLIENT_HEADER_VALUE = '1';

/** Wait for preload IPC before handling `client_delegate` (aligns with long-running desktop tool approval). */
const LOCAL_DESKTOP_BRIDGE_WAIT_MS = 30_000;

/** Avoid `get-chat-runtime-context` IPC on every chat message; catalog rarely changes intra-minute. */
const CHAT_RUNTIME_CONTEXT_CACHE_TTL_MS = 45_000;

type CachedDesktopIpcRuntime = {
  desktopHost: unknown;
  retrievalMemoryCatalog: unknown;
  expiresAt: number;
};

let cachedDesktopIpcRuntime: CachedDesktopIpcRuntime | null = null;

/** Clears desktop IPC runtime snapshot cache (Jest only). */
export function resetDesktopIpcRuntimeCacheForTests(): void {
  cachedDesktopIpcRuntime = null;
}

// Error messages
const ERROR_MESSAGES = {
  GENERIC_CHAT_ERROR: 'Something went wrong. Please try again.',
  NO_RESPONSE_BODY: 'No response body for streaming',
  REQUEST_ABORTED: 'Request aborted',
  MISSING_JWT_TOKEN: 'JWT token not found',
  INVALID_RESPONSE: 'Invalid response from server',
} as const;

/**
 * Thrown when the gateway returns a non-OK response; may include current wallet from the server.
 */
export class GatewayFetchError extends Error {
  readonly statusCode: number;
  readonly wallet?: number;

  constructor(message: string, statusCode: number, wallet?: number) {
    super(message);
    this.name = 'GatewayFetchError';
    this.statusCode = statusCode;
    this.wallet = wallet;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Parses Nest AllExceptionsFilter JSON: `{ statusCode, path, message: string | string[] | { message, wallet? } }` */
function parseNestGatewayErrorBody(body: unknown): { message: string; wallet?: number } {
  if (!body || typeof body !== 'object') {
    return { message: 'Request failed' };
  }
  const b = body as Record<string, unknown>;
  const inner = b.message;
  if (typeof inner === 'string') {
    return {
      message: inner,
      wallet: typeof b.wallet === 'number' ? b.wallet : undefined,
    };
  }
  if (Array.isArray(inner)) {
    const lines = inner.filter((line): line is string => typeof line === 'string' && line.trim().length > 0);
    if (lines.length > 0) {
      return { message: lines.join('; ') };
    }
  }
  if (inner && typeof inner === 'object') {
    const m = inner as Record<string, unknown>;
    return {
      message: typeof m.message === 'string' ? m.message : 'Request failed',
      wallet: typeof m.wallet === 'number' ? m.wallet : undefined,
    };
  }
  return { message: 'Request failed' };
}

async function parseGatewayFailedResponse(res: Response): Promise<{ message: string; wallet?: number }> {
  const text = await res.text();
  try {
    const body = JSON.parse(text) as unknown;
    return parseNestGatewayErrorBody(body);
  } catch {
    return { message: ERROR_MESSAGES.GENERIC_CHAT_ERROR };
  }
}

type AigeniusDesktopBridge = {
  isDesktop?: boolean;
  getChatRuntimeContext?: () => Promise<{
    desktopHost: { platform: string; arch: string; release: string; userHomeDir: string };
    retrievalMemoryCatalog: {
      generatedAtIso: string;
      entries: Array<{ slug: string; name: string; description: string; tags: string[] }>;
    };
  }>;
  runLocalDesktopTool?: (
    payload: {
      tool: string;
      arguments: Record<string, unknown>;
    },
    options?: {
      onShellStreamChunk?: (chunk: { stream: 'stdout' | 'stderr'; text: string }) => void;
    },
  ) => Promise<{ ok: true; result: string; rawData?: any } | { ok: false; error: string }>;
};

const OLLAMA_MODEL_ID_PREFIX = 'ollama:';
const OLLAMA_LOCAL_USAGE = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

function isOllamaModelId(model: string | undefined): model is string {
  return typeof model === 'string' && model.startsWith(OLLAMA_MODEL_ID_PREFIX);
}

function toOllamaWireModel(modelId: string): string {
  return modelId.slice(OLLAMA_MODEL_ID_PREFIX.length);
}

type ChatMessageInput = { role?: string; content?: unknown };

function normalizeOllamaMessages(
  messages: ChatMessageInput[] | undefined,
): Array<{ role: string; content: string }> {
  if (!Array.isArray(messages)) {
    return [];
  }
  return messages.map((message) => ({
    role: typeof message.role === 'string' ? message.role : 'user',
    content: typeof message.content === 'string' ? message.content : '',
  }));
}

function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

async function getDesktopBridgeForOllama(): Promise<AigeniusDesktopBridge & { runLocalDesktopTool: NonNullable<AigeniusDesktopBridge['runLocalDesktopTool']> }> {
  let desktop = getRunnableLocalDesktopBridge() as AigeniusDesktopBridge | undefined;
  if (!desktop?.runLocalDesktopTool) {
    await waitForLocalDesktopToolBridge(LOCAL_DESKTOP_BRIDGE_WAIT_MS);
    desktop = getRunnableLocalDesktopBridge() as AigeniusDesktopBridge | undefined;
  }
  if (!desktop?.runLocalDesktopTool) {
    throw new Error(
      'Ollama models require the AIGenius Desktop app with the local Ollama relay.',
    );
  }
  return desktop as AigeniusDesktopBridge & { runLocalDesktopTool: NonNullable<AigeniusDesktopBridge['runLocalDesktopTool']> };
}

async function connectDesktopOllamaRelay(desktop: AigeniusDesktopBridge): Promise<void> {
  const token = getAccessToken();
  if (!token) {
    throw new Error(ERROR_MESSAGES.MISSING_JWT_TOKEN);
  }
  if (!desktop.runLocalDesktopTool) {
    throw new Error('Local tool execution bridge is not available');
  }
  const out = await desktop.runLocalDesktopTool({
    tool: 'local_ollama_connect',
    arguments: { token },
  });
  if (!out.ok) {
    throw new Error(out.error || 'Failed to connect Ollama relay');
  }
}

function parseOllamaStreamLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as { message?: { content?: string } };
    const text = parsed.message?.content;
    return typeof text === 'string' && text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

function createOllamaStreamChunkParser(
  onData: (content: string) => void,
): {
  onShellStreamChunk: (chunk: { stream: 'stdout' | 'stderr'; text: string }) => void;
  flush: () => void;
} {
  let buffer = '';

  return {
    onShellStreamChunk: (chunk) => {
      if (chunk.stream !== 'stdout' || !chunk.text) {
        return;
      }
      buffer += chunk.text;
      const parts = buffer.split('\n');
      buffer = parts.pop() || '';
      for (const line of parts) {
        const content = parseOllamaStreamLine(line);
        if (content) {
          onData(content);
        }
      }
    },
    flush: () => {
      if (!buffer.trim()) {
        return;
      }
      const content = parseOllamaStreamLine(buffer);
      buffer = '';
      if (content) {
        onData(content);
      }
    },
  };
}

async function mergeRuntimeContextIntoRequestBody(
  requestBody: Record<string, unknown>,
  desktopChat: boolean,
): Promise<void> {
  const now = new Date();
  const tzo = -now.getTimezoneOffset();
  const dif = tzo >= 0 ? '+' : '-';
  const pad = (num: number) => (num < 10 ? '0' : '') + num;
  const clientNowIso =
    now.getFullYear() +
    '-' +
    pad(now.getMonth() + 1) +
    '-' +
    pad(now.getDate()) +
    'T' +
    pad(now.getHours()) +
    ':' +
    pad(now.getMinutes()) +
    ':' +
    pad(now.getSeconds()) +
    dif +
    pad(Math.floor(Math.abs(tzo) / 60)) +
    ':' +
    pad(Math.abs(tzo) % 60);
  let clientTimezone = 'UTC';
  try {
    clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    clientTimezone = 'UTC';
  }
  const base = { clientNowIso, clientTimezone };

  const desktop = getAigeniusDesktopBridgeFromBrowsingContext() as
    | AigeniusDesktopBridge
    | undefined;

  if (
    desktopChat
    && desktop
    && typeof desktop.getChatRuntimeContext === 'function'
  ) {
    const now = Date.now();
    if (
      cachedDesktopIpcRuntime
      && now < cachedDesktopIpcRuntime.expiresAt
      && cachedDesktopIpcRuntime.desktopHost
      && typeof cachedDesktopIpcRuntime.desktopHost === 'object'
      && cachedDesktopIpcRuntime.retrievalMemoryCatalog
      && typeof cachedDesktopIpcRuntime.retrievalMemoryCatalog === 'object'
    ) {
      requestBody.runtimeContext = {
        ...base,
        desktopHost: cachedDesktopIpcRuntime.desktopHost,
        retrievalMemoryCatalog: cachedDesktopIpcRuntime.retrievalMemoryCatalog,
      };
      return;
    }
    try {
      const extra = await desktop.getChatRuntimeContext();
      const dh = extra?.desktopHost && typeof extra.desktopHost === 'object'
        ? extra.desktopHost
        : undefined;
      const cat = extra?.retrievalMemoryCatalog
        && typeof extra.retrievalMemoryCatalog === 'object'
        ? extra.retrievalMemoryCatalog
        : undefined;
      if (dh && cat) {
        cachedDesktopIpcRuntime = {
          desktopHost: dh,
          retrievalMemoryCatalog: cat,
          expiresAt: now + CHAT_RUNTIME_CONTEXT_CACHE_TTL_MS,
        };
      }
      requestBody.runtimeContext = {
        ...base,
        ...(dh ? { desktopHost: dh } : {}),
        ...(cat ? { retrievalMemoryCatalog: cat } : {}),
      };
      return;
    } catch {
      /* fall through: still desktop shell, but no host snapshot */
    }
  }

  requestBody.runtimeContext = base;
}

/**
 * Helper function to set up common API request configuration
 */
async function setupApiRequest(config: Config, requestBody: Record<string, any>, isStreaming = false) {
  if (process.env.NODE_ENV === 'development') {
    console.debug('[access-model] setupApiRequest started', { isStreaming, model: requestBody.model });
  }
  const endpoint = `${config.endpoint}${OPENAI_CHAT_COMPLETIONS_PATH}`;
  const jwtToken = getAccessToken();

  if (!jwtToken) {
    console.error('[access-model] JWT token missing');
    throw new Error(ERROR_MESSAGES.MISSING_JWT_TOKEN);
  }

  const headers: Record<string, string> = {
    'Content-Type': CONTENT_TYPE_JSON,
    'Authorization': `${AUTHORIZATION_BEARER_PREFIX}${jwtToken}`,
    ...getE2eWalletBypassHeaders(),
  };

  console.debug('[access-model] Resolving desktop chat request context...');
  const desktopChat =
    typeof window !== 'undefined' ? await resolveDesktopChatRequestContext() : false;

  if (process.env.NODE_ENV === 'development') {
    console.debug('[AIGenius Bridge] resolveDesktopChatRequestContext returned:', desktopChat);
  }

  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    console.info('[aigenius-desktop][chat] setupApiRequest', {
      desktopChat,
      hasRunnableBridge: hasRunnableLocalDesktopToolBridge(),
      desktopShellAttr: document.documentElement.getAttribute('data-aigenius-desktop-shell'),
      uaHasElectron: /\bElectron\/\d/.test(navigator.userAgent || ''),
    });
  }

  if (desktopChat) {
    headers[AIGENIUS_DESKTOP_CLIENT_HEADER] = AIGENIUS_DESKTOP_CLIENT_HEADER_VALUE;
  }

  if (process.env.NODE_ENV === 'development') {
    console.debug('[access-model] Merging runtime context...');
  }
  await mergeRuntimeContextIntoRequestBody(requestBody, desktopChat);

  const body = JSON.stringify({
    ...requestBody,
    ...(isStreaming && { stream: true }),
  });

  if (process.env.NODE_ENV === 'development') {
    console.debug('[access-model] setupApiRequest finished', { endpoint, headerCount: Object.keys(headers).length });
  }
  return { endpoint, headers, body };
}

async function postDesktopToolDelegateResult(
  config: Config,
  delegateId: string,
  payload: { result?: string; error?: string },
  signal?: AbortSignal,
): Promise<void> {
  const endpoint = `${config.endpoint}${OPENAI_DESKTOP_TOOL_RESULT_PATH}`;
  const jwtToken = getAccessToken();
  if (!jwtToken) {
    throw new Error(ERROR_MESSAGES.MISSING_JWT_TOKEN);
  }
  const headers: Record<string, string> = {
    'Content-Type': CONTENT_TYPE_JSON,
    'Authorization': `${AUTHORIZATION_BEARER_PREFIX}${jwtToken}`,
    ...getE2eWalletBypassHeaders(),
    [AIGENIUS_DESKTOP_CLIENT_HEADER]: AIGENIUS_DESKTOP_CLIENT_HEADER_VALUE,
  };
  const res = await authorizedFetch(endpoint, {
    method: HTTP_METHOD_POST,
    headers,
    body: JSON.stringify({
      delegate_id: delegateId,
      ...(payload.result !== undefined ? { result: payload.result } : {}),
      ...(payload.error !== undefined ? { error: payload.error } : {}),
    }),
    signal,
  });
  if (!res.ok) {
    const parsed = await parseGatewayFailedResponse(res);
    throw new Error(parsed.message);
  }
}

async function fulfillDesktopToolDelegate(
  ev: {
    type: 'client_delegate';
    delegate_id: string;
    tool: string;
    arguments?: Record<string, unknown>;
  },
  config: Config,
  signal?: AbortSignal,
  onToolStreamEvent?: (event: ToolStreamEvent) => void,
): Promise<void> {
  let desktop = getRunnableLocalDesktopBridge() as AigeniusDesktopBridge | undefined;

  if (process.env.NODE_ENV === 'development') {
    console.debug('[AIGenius Bridge] fulfillDesktopToolDelegate: Initial bridge check:', {
      hasDesktop: !!desktop,
      hasRunLocal: typeof desktop?.runLocalDesktopTool === 'function',
      bridgeDebug: typeof window !== 'undefined' ? (window as any).__aigenius_bridge_debug : 'SSR',
    });
  }

  if (!desktop?.runLocalDesktopTool) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(
        `[AIGenius Bridge] Bridge not found immediately. Waiting ${LOCAL_DESKTOP_BRIDGE_WAIT_MS}ms for preload...`,
      );
    }
    await waitForLocalDesktopToolBridge(LOCAL_DESKTOP_BRIDGE_WAIT_MS);
    desktop = getRunnableLocalDesktopBridge() as AigeniusDesktopBridge | undefined;

    if (process.env.NODE_ENV === 'development') {
      console.debug('[AIGenius Bridge] fulfillDesktopToolDelegate: Bridge check after wait:', {
        hasDesktop: !!desktop,
        hasRunLocal: typeof desktop?.runLocalDesktopTool === 'function',
        bridgeDebug: typeof window !== 'undefined' ? (window as any).__aigenius_bridge_debug : 'SSR',
      });
    }
  }

  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    console.info('[aigenius-desktop][delegate] fulfillDesktopToolDelegate', {
      hasRunLocal: typeof desktop?.runLocalDesktopTool === 'function',
      tool: ev.tool,
    });
  }

  if (!desktop?.runLocalDesktopTool) {
    const diagInfo = {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR',
      isElectron: /\bElectron\/\d/.test(typeof navigator !== 'undefined' ? (navigator.userAgent || '') : ''),
      desktopShellAttr: typeof document !== 'undefined' ? document.documentElement.getAttribute('data-aigenius-desktop-shell') : null,
      bridgeDebug: typeof window !== 'undefined' ? (window as any).__aigenius_bridge_debug : null,
    };
    console.error(
      `[AIGenius Bridge] No runLocalDesktopTool after ${LOCAL_DESKTOP_BRIDGE_WAIT_MS}ms. Diagnostic context:`,
      diagInfo,
    );
    await postDesktopToolDelegateResult(config, ev.delegate_id, {
      error: 'Local tool execution requires the AIGenius Desktop app. (Bridge not found — please ensure you are using the AIGenius desktop app, not a browser.)',
    }, signal);
    return;
  }

  try {
    const streamOpts =
      (ev.tool === 'run_command' || ev.tool === 'local_shell') && onToolStreamEvent
        ? {
          onShellStreamChunk: (chunk: { stream: 'stdout' | 'stderr'; text: string }) => {
            onToolStreamEvent({
              type: 'log',
              tag: chunk.stream,
              message: chunk.text,
            });
          },
        }
        : undefined;

    const out = await desktop.runLocalDesktopTool(
      {
        tool: ev.tool,
        arguments: ev.arguments ?? {},
      },
      streamOpts,
    );
    if (out.ok) {
      await postDesktopToolDelegateResult(config, ev.delegate_id, { result: out.result }, signal);
    } else {
      await postDesktopToolDelegateResult(config, ev.delegate_id, { error: out.error }, signal);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Local tool failed';
    await postDesktopToolDelegateResult(config, ev.delegate_id, { error: msg }, signal);
  }
}

/**
 * Processes streaming content delta and creates structured content blocks
 */
function processStreamingContent(delta: any): string | Array<{
  type: string;
  text?: string;
  image_url?: { url: string };
}> | null {
  const content = delta.content || '';
  const images = delta.images || [];

  if (images.length > 0) {
    const contentBlocks: Array<{
      type: string;
      text?: string;
      image_url?: { url: string };
    }> = [];

    images.forEach((image: any) => {
      if (image.type === 'image_url' && image.image_url?.url) {
        contentBlocks.push({ type: 'image_url', image_url: { url: image.image_url.url } });
      } else if (image.type === 'image' && image.data) {
        contentBlocks.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${image.data}` } });
      } else if (image.data && typeof image.data === 'string' && image.data.length > 1000) {
        const dataUrl = image.data.startsWith('data:image/') ? image.data : `data:image/png;base64,${image.data}`;
        contentBlocks.push({ type: 'image_url', image_url: { url: dataUrl } });
      }
    });

    return contentBlocks;
  }

  // Some gateways send a single content part object `{ type, text }` instead of a string or array.
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    const typed = content as { type?: string };
    if (typed.type) {
      return [content as { type: string; text?: string; image_url?: { url: string } }];
    }
  }

  // Simple text content (string) or array of blocks
  return content;
}

/**
 * Updates streaming result with metadata from chunk
 */
function updateStreamingResult(result: StreamingResult, chunk: any): void {
  if (chunk.usage) {
    result.usage = chunk.usage;
  }
  if (chunk.cost) {
    result.cost = chunk.cost;
  }
  if (chunk.wallet !== undefined) {
    result.wallet = chunk.wallet;
  }
  if (chunk.tool_usage_charges?.length) {
    result.tool_usage_charges = chunk.tool_usage_charges;
  }
}

interface StreamState {
  hasReceivedContent: boolean;
  endedWithStreamError?: boolean;
}

/**
 * Processes a single streaming data chunk
 */
async function processStreamingChunk(
  data: string,
  onData: (content: string | Array<{
    type: string;
    text?: string;
    image_url?: { url: string };
  }>, reasoning?: string, reasoningDetails?: any[]) => void,
  finalResult: StreamingResult,
  config: Config,
  streamState: StreamState,
  onToolStreamEvent?: (event: ToolStreamEvent) => void,
  signal?: AbortSignal,
): Promise<boolean> {
  const trimmed = data.trim();
  if (trimmed === STREAM_DONE_SIGNAL) {
    return true; // Signal completion
  }

  if (trimmed === '') {
    return false;
  }

  try {
    const chunk = JSON.parse(trimmed) as Record<string, unknown>;

    const errObj = chunk.error as { message?: string } | undefined;
    if (errObj && typeof errObj.message === 'string' && errObj.message.trim()) {
      if (streamState.hasReceivedContent) {
        console.warn(
          '[access-model] Trailing error chunk after content already streamed — treating as end of stream:',
          JSON.stringify(chunk),
        );
        streamState.endedWithStreamError = true;
        return true; // end stream cleanly
      }
      console.error(
        '[access-model] Streaming error chunk detected before any content:',
        errObj.message.trim(),
        JSON.stringify(chunk),
      );
      throw new Error(ERROR_MESSAGES.GENERIC_CHAT_ERROR);
    }

    const choice0 = (chunk.choices as Array<{ finish_reason?: string | null; delta?: { content?: string } }> | undefined)?.[0];
    if (choice0?.finish_reason === 'error') {
      if (streamState.hasReceivedContent) {
        console.warn(
          '[access-model] Trailing finish_reason error after content already streamed — treating as end of stream.',
        );
        streamState.endedWithStreamError = true;
        return true; // end stream cleanly
      }
      const fromDelta = typeof choice0.delta?.content === 'string' ? choice0.delta.content.trim() : '';
      if (fromDelta) {
        console.error('[access-model] Stream finished with error before content:', fromDelta);
      }
      throw new Error(ERROR_MESSAGES.GENERIC_CHAT_ERROR);
    }

    const delta = choice0?.delta as Record<string, unknown> | undefined;

    if (delta) {
      const toolStreamEvent = delta.tool_stream_event as ToolStreamEvent | undefined;
      if (toolStreamEvent && onToolStreamEvent) {
        onToolStreamEvent(toolStreamEvent);
      }

      if (toolStreamEvent?.type === 'client_delegate') {
        await fulfillDesktopToolDelegate(toolStreamEvent, config, signal, onToolStreamEvent);
      }

      const contentToSend = processStreamingContent(delta);
      const reasoning = typeof delta.reasoning === 'string' ? delta.reasoning : undefined;
      const reasoningDetails = delta.reasoning_details as unknown[] | undefined;

      const hasStreamContent =
        typeof contentToSend === 'string'
          ? contentToSend.length > 0
          : Array.isArray(contentToSend) && contentToSend.length > 0;

      // Preserve whitespace-only text chunks. Markdown structure often arrives as
      // newline-only deltas, and trimming them here collapses live formatting.
      if (typeof contentToSend === 'string' && contentToSend.length > 0) {
        streamState.hasReceivedContent = true;
        onData(contentToSend, reasoning, reasoningDetails);
      } else if (Array.isArray(contentToSend) && contentToSend.length > 0) {
        streamState.hasReceivedContent = true;
        onData(contentToSend, reasoning, reasoningDetails);
      } else if (reasoning) {
        // Send reasoning even without content (for thinking display)
        streamState.hasReceivedContent = true;
        onData('', reasoning, reasoningDetails);
      }
    }

    // Update result with metadata
    updateStreamingResult(finalResult, chunk);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return false;
    }
    throw error;
  }

  return false;
}

/**
 * Reads and processes streaming data from the response body
 */
async function processStreamingData(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  onData: (content: string | Array<{
    type: string;
    text?: string;
    image_url?: { url: string };
  }>, reasoning?: string, reasoningDetails?: any[]) => void,
  finalResult: StreamingResult,
  config: Config,
  signal?: AbortSignal,
  onToolStreamEvent?: (event: ToolStreamEvent) => void,
): Promise<void> {
  let buffer = '';
  const streamState: StreamState = { hasReceivedContent: false };

  while (true) {
    // Check if aborted
    if (signal?.aborted) {
      throw new Error(ERROR_MESSAGES.REQUEST_ABORTED);
    }

    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let lineEnd;

    while ((lineEnd = buffer.indexOf(NEWLINE)) !== -1) {
      const line = buffer.slice(0, lineEnd).trim();
      buffer = buffer.slice(lineEnd + 1);

      if (!line || line.startsWith(':')) {
        continue;
      }

      const dataPayload = extractSseDataPayload(line);
      if (dataPayload === undefined) {
        continue;
      }

      const isDone = await processStreamingChunk(
        dataPayload,
        onData,
        finalResult,
        config,
        streamState,
        onToolStreamEvent,
        signal,
      );

      if (isDone) {
        if (streamState.endedWithStreamError) {
          finalResult.endedWithStreamError = true;
        }
        return; // Stream completed
      }
    }
  }

  if (streamState.endedWithStreamError) {
    finalResult.endedWithStreamError = true;
  }
}

/**
 * Represents different types of content blocks that can be sent to or received from AI models.
 * Supports text, images, and audio content in a structured format.
 */
export type OpenRouterContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'input_audio'; input_audio: { data: string; format: string } };

/** Per-tool billed amounts from the gateway (USD + ₦). */
export interface ToolUsageCharge {
  tool: string;
  display_name: string;
  cost_usd: number;
  cost_naira: number;
}

/**
 * A message in the conversation with the AI model.
 * Contains the role (user/assistant/system) and the content being communicated.
 */
export interface OpenRouterMessage {
  /** The role of the message sender */
  role: 'user' | 'assistant' | 'system';
  /** The content of the message - can be plain text or structured content blocks */
  content: string | OpenRouterContentBlock[];
  /** Optional stable message id preserved across persistence/rehydration */
  messageId?: string;
  /** Optional timestamp preserved across persistence/rehydration */
  timestamp?: number;
  /** Optional model metadata preserved across persistence/rehydration */
  modelId?: string;
  modelName?: string;
  /** Optional usage/cost metadata for already-completed assistant turns */
  usage?: UsageInfo;
  cost?: number;
  tool_usage_charges?: ToolUsageCharge[];
}

/**
 * Token usage statistics for an AI model interaction.
 * Tracks the number of tokens used in prompts and completions.
 */
export interface UsageInfo {
  /** Number of tokens used in the input prompt */
  prompt_tokens: number;
  /** Number of tokens used in the model's response */
  completion_tokens: number;
  /** Total number of tokens used (prompt + completion) */
  total_tokens: number;
  /** USD charged for tool invocations in this completion (aggregated). */
  tool_cost_usd?: number;
}

/**
 * Cost calculation information for an AI model interaction.
 * Includes usage statistics and detailed cost breakdown.
 */
export interface CostCalculation {
  /** Token usage statistics */
  usage: UsageInfo;
  /** Total cost of the interaction */
  cost: number;
  /** Breakdown of costs by prompt and completion */
  costBreakdown: {
    promptCost: number;
    completionCost: number;
  };
  /** Pricing information for different models */
  modelPricing: Record<string, string>;
}

/**
 * Configuration options for AI model requests.
 */
export type Options = {
  /** The name/ID of the AI model to use */
  model: string;
};

/**
 * The body of an AI model request containing the conversation messages.
 */
export type Body = {
  /** Array of messages in the conversation */
  messages: OpenRouterMessage[];
  /** Optional conversation/session id when continuing an existing chat */
  conversationId?: string;
  conversationKind?: 'default' | 'orphan_question';
  parentConversationId?: string;
  parentMessageId?: string;
  anchor?: {
    surface: 'chat_transcript';
    anchorZone: 'chat_area';
    tapClientX: number;
    tapClientY: number;
    rowRelativeX: number;
    rowRelativeY: number;
    viewportWidth?: number;
    viewportHeight?: number;
    anchorText?: string;
    anchorPrefix?: string;
    anchorSuffix?: string;
    anchorTextOffset?: number;
    parentMessageTimestamp?: number;
    messageExcerpt?: string;
    createdFromRole?: 'user' | 'assistant' | 'system';
  };
};

/**
 * Arguments required for accessing an AI model.
 */
export type AccessModelArgs<T> = {
  /** The request body containing messages */
  body: Body;
  /** Model configuration options */
  options: Options;
  /** API configuration including endpoint and authentication */
  config: Config;
};

/**
 * Response from a synchronous AI model request.
 */
export type AccessModelResponse<T> = {
  /** The generated content/response from the model */
  content: string;
  /** Token usage statistics */
  usage?: UsageInfo;
  /** Cost of the model interaction */
  cost?: number;
  /** Conversation id when backend created/updated a session (from X-Conversation-Id) */
  conversationId?: string;
  /** Authentication token used */
  token?: string;
  /** User data (generic type for flexibility) */
  user?: T;
  /** Tool executions that happened during the request (non-streaming path only) */
  tool_executions?: Array<{
    tool: string;
    arguments: Record<string, unknown>;
    result: string;
    timestamp: number;
  }>;
  tool_usage_charges?: ToolUsageCharge[];
};

/**
 * Accesses an AI model synchronously via the gateway API.
 *
 * This function makes a single request to the AI model and returns the complete response.
 * Use this for non-streaming interactions where you need the full response at once.
 *
 * @template T - The type of user data to include in the response
 * @param args - Configuration and request parameters
 * @param args.body - The messages and content to send to the model
 * @param args.options - Model configuration options (model name, etc.)
 * @param args.config - API configuration including endpoint and token
 * @returns Promise resolving to the model response or null if an error occurs
 * @throws Error when API request fails or authentication is invalid
 *
 * @example
 * ```typescript
 * const response = await _accessModel({
 *   body: { messages: [{ role: 'user', content: 'Hello!' }] },
 *   options: { model: 'gpt-3.5-turbo' },
 *   config: { endpoint: 'https://api.example.com', token: '...' }
 * });
 * ```
 */
export const _accessModel = async <T>(args: AccessModelArgs<T> & { signal?: AbortSignal }): Promise<AccessModelResponse<T> | null> => {
  const { body, config, options, signal } = args;
  const { model } = options;

  try {
    if (isOllamaModelId(model)) {
      const desktop = await getDesktopBridgeForOllama();
      if (isBrowserOffline()) {
        const out = await desktop.runLocalDesktopTool({
          tool: 'local_ollama_chat',
          arguments: {
            payload: {
              model: toOllamaWireModel(model),
              messages: normalizeOllamaMessages(body.messages as ChatMessageInput[]),
              stream: false,
            },
          },
        });
        if (!out.ok) {
          throw new Error(out.error || 'Local Ollama chat failed');
        }
        return {
          content: out.result,
          usage: OLLAMA_LOCAL_USAGE,
          cost: 0,
          token: config.token,
          user: undefined as T,
        };
      }
      await connectDesktopOllamaRelay(desktop);
    }

    const requestBody = {
      model,
      messages: body.messages,
      ...(body.conversationId && { conversationId: body.conversationId }),
      ...(body.conversationKind && { conversationKind: body.conversationKind }),
      ...(body.parentConversationId && { parentConversationId: body.parentConversationId }),
      ...(body.parentMessageId && { parentMessageId: body.parentMessageId }),
      ...(body.anchor && { anchor: body.anchor }),
    };
    const { endpoint, headers, body: requestBodyString } = await setupApiRequest(config, requestBody);

    const res = await authorizedFetch(endpoint, {
      method: HTTP_METHOD_POST,
      headers,
      body: requestBodyString,
      signal,
    });

    if (!res.ok) {
      const { message, wallet } = await parseGatewayFailedResponse(res);
      throw new GatewayFetchError(message, res.status, wallet);
    }

    const conversationId = res.headers.get('X-Conversation-Id') ?? undefined;
    // Transform OpenAI response to our format
    const openAIResponse = await res.json();

    return {
      content: openAIResponse.choices[0]?.message?.content || DEFAULT_EMPTY_CONTENT,
      usage: openAIResponse.usage,
      cost: openAIResponse.cost,
      conversationId,
      token: config.token,
      user: undefined as T,
      ...(openAIResponse.tool_executions?.length && { tool_executions: openAIResponse.tool_executions }),
      ...(openAIResponse.tool_usage_charges?.length && { tool_usage_charges: openAIResponse.tool_usage_charges }),
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(ERROR_MESSAGES.REQUEST_ABORTED);
    }
    const context = 'functions::accessModel';
    Logger.log(error, context);
    const extractedErrorMessage = extractErrorMessage(error);
    cLogger.log(`Access model error: ${extractedErrorMessage}`, context);
    throw error; // Re-throw to allow caller to handle
  }

};

/**
 * Result metadata from a streaming AI model interaction.
 * Contains usage statistics and cost information collected during streaming.
 */
export interface StreamingResult {
  /** Token usage statistics for the entire streaming session */
  usage?: UsageInfo;
  /** Total cost of the streaming interaction */
  cost?: number;
  /** Remaining wallet balance after the interaction */
  wallet?: number;
  /** Conversation id when backend created or updated a session (from X-Conversation-Id) */
  conversationId?: string;
  /** Per-tool billed rows when tools incurred charges */
  tool_usage_charges?: ToolUsageCharge[];
  /** Set when the stream ended with a provider error after partial content was delivered */
  endedWithStreamError?: boolean;
}

/** Tool stream event sent during tool execution for live UI updates */
export type ToolStreamEvent =
  | { type: 'start'; tool: string; displayName: string; arguments?: Record<string, unknown> }
  | { type: 'log'; tag: string; message: string; data?: Record<string, unknown> }
  | {
    type: 'client_delegate';
    delegate_id: string;
    tool: string;
    displayName: string;
    arguments?: Record<string, unknown>;
    tool_call_id: string;
  }
  | { type: 'end'; tool: string; success: boolean; result?: string; invokeCode?: string };

/**
 * Accesses an AI model with streaming responses via the gateway API.
 *
 * This function establishes a streaming connection to the AI model and provides
 * real-time updates as the model generates content. Content can include both
 * text and images in structured format.
 *
 * @template T - The type of user data (not used in streaming responses)
 * @param args - Configuration and request parameters
 * @param args.body - The messages and content to send to the model
 * @param args.options - Model configuration options (model name, etc.)
 * @param args.config - API configuration including endpoint and token
 * @param args.onData - Callback function called with each chunk of content as it's received
 * @param args.onComplete - Optional callback called when streaming completes with final metadata
 * @param args.signal - Optional AbortSignal to cancel the streaming request
 * @returns Promise resolving to streaming metadata (usage, cost, wallet) when complete
 * @throws Error when API request fails, authentication is invalid, or streaming is aborted
 *
 * @example
 * ```typescript
 * const result = await accessModelStream({
 *   body: { messages: [{ role: 'user', content: 'Tell me a story' }] },
 *   options: { model: 'gpt-4' },
 *   config: { endpoint: 'https://api.example.com', token: '...' },
 *   onData: (content) => {
 *     if (typeof content === 'string') {
 *       console.log('Text:', content);
 *     } else {
 *       console.log('Structured content:', content);
 *     }
 *   },
 *   onComplete: (result) => {
 *     console.log('Usage:', result.usage);
 *     console.log('Cost:', result.cost);
 *   }
 * });
 * ```
 */
export const accessModelStream = async <T>(args: AccessModelArgs<T> & {
  onData: (content: string | Array<{
    type: string;
    text?: string;
    image_url?: { url: string };
  }>, reasoning?: string, reasoningDetails?: any[]) => void;
  onToolStreamEvent?: (event: ToolStreamEvent) => void;
  /** Fired as soon as X-Conversation-Id is available on the response headers. */
  onConversationId?: (conversationId: string) => void;
  onComplete?: (result: StreamingResult) => void;
  signal?: AbortSignal;
}): Promise<StreamingResult> => {
  const { body, config, options, onData, onToolStreamEvent, onConversationId, onComplete, signal } = args;
  const { model } = options;

  if (isOllamaModelId(model)) {
    const desktop = await getDesktopBridgeForOllama();
    if (isBrowserOffline()) {
      const streamParser = createOllamaStreamChunkParser((content) => {
        onData(content);
      });
      const out = await desktop.runLocalDesktopTool(
        {
          tool: 'local_ollama_chat',
          arguments: {
            payload: {
              model: toOllamaWireModel(model),
              messages: normalizeOllamaMessages(body.messages as ChatMessageInput[]),
              stream: true,
            },
          },
        },
        { onShellStreamChunk: streamParser.onShellStreamChunk },
      );
      streamParser.flush();
      if (!out.ok) {
        throw new Error(out.error || 'Local Ollama chat failed');
      }
      const finalResult: StreamingResult = {
        usage: OLLAMA_LOCAL_USAGE,
        cost: 0,
      };
      onComplete?.(finalResult);
      return finalResult;
    }
    await connectDesktopOllamaRelay(desktop);
  }

  const requestBody = {
    model,
    messages: body.messages,
    ...(body.conversationId && { conversationId: body.conversationId }),
    ...(body.conversationKind && { conversationKind: body.conversationKind }),
    ...(body.parentConversationId && { parentConversationId: body.parentConversationId }),
    ...(body.parentMessageId && { parentMessageId: body.parentMessageId }),
    ...(body.anchor && { anchor: body.anchor }),
  };
  const { endpoint, headers, body: requestBodyString } = await setupApiRequest(config, requestBody, true);

  let res: Response;
  try {
    res = await authorizedFetch(endpoint, {
      method: HTTP_METHOD_POST,
      headers,
      body: requestBodyString,
      signal, // Add AbortSignal support
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(ERROR_MESSAGES.REQUEST_ABORTED);
    }
    throw error;
  }

  if (!res.ok) {
    const { message, wallet } = await parseGatewayFailedResponse(res);
    throw new GatewayFetchError(message, res.status, wallet);
  }

  if (!res.body) throw new Error(ERROR_MESSAGES.NO_RESPONSE_BODY);


  const conversationId = res.headers.get('X-Conversation-Id') ?? undefined;
  if (conversationId) {
    onConversationId?.(conversationId);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let finalResult: StreamingResult = { ...(conversationId && { conversationId }) };

  try {
    await processStreamingData(reader, decoder, onData, finalResult, config, signal, onToolStreamEvent);

    // Call onComplete when streaming is done
    if (onComplete) onComplete(finalResult);
    return finalResult;
  } catch (error: any) {
    const context = 'functions::accessModelStream';
    Logger.log(error, context);
    const extractedErrorMessage = extractErrorMessage(error);
    cLogger.log(`Streaming error: ${extractedErrorMessage}`, context);
    throw error; // Re-throw to allow caller to handle
  } finally {
    reader.releaseLock();
  }
};
