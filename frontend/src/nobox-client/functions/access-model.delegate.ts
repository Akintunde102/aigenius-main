/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Config } from '../types';
import { authorizedFetch, getAccessToken } from '../../lib/api/auth-client';
import {
  OPENAI_DESKTOP_TOOL_RESULT_PATH,
  OPENAI_TOOL_APPROVAL_RESULT_PATH,
  CONTENT_TYPE_JSON,
  AUTHORIZATION_BEARER_PREFIX,
  HTTP_METHOD_POST,
  AIGENIUS_DESKTOP_CLIENT_HEADER,
  AIGENIUS_DESKTOP_CLIENT_HEADER_VALUE,
  ERROR_MESSAGES,
  LOCAL_DESKTOP_BRIDGE_WAIT_MS,
} from './access-model.constants.js';
import { GatewayFetchError, parseGatewayFailedResponse } from './access-model.gateway.js';
import { getE2eWalletBypassHeaders } from '../../lib/e2e-wallet-bypass';
import type { AigeniusDesktopBridge, StreamingResult, ToolStreamEvent } from './access-model.types.js';
import {
  getRunnableLocalDesktopBridge,
  waitForLocalDesktopToolBridge,
} from '../../lib/utils/desktop-runtime';
import {
  isToolApprovalExempt,
  promptToolApproval,
  shouldRequireToolApproval,
} from '@/lib/tool-permissions';

/** Prevent duplicate POSTs for the same delegate_id (retries, overlapping SSE handlers). */
const desktopToolDelegatePosted = new Set<string>();
const toolApprovalDelegatePosted = new Set<string>();
const desktopToolDelegatePostInFlight = new Map<string, Promise<void>>();
const toolApprovalPostInFlight = new Map<string, Promise<void>>();

async function runDelegatePostOnce(
  inFlight: Map<string, Promise<void>>,
  delegateId: string,
  run: () => Promise<void>,
): Promise<void> {
  const existing = inFlight.get(delegateId);
  if (existing) {
    return existing;
  }
  const promise = run().finally(() => {
    inFlight.delete(delegateId);
  });
  inFlight.set(delegateId, promise);
  return promise;
}

/** Clears delegate POST dedupe state (Jest only). */
export function resetDelegatePostDedupeStateForTests(): void {
  desktopToolDelegatePosted.clear();
  toolApprovalDelegatePosted.clear();
  desktopToolDelegatePostInFlight.clear();
  toolApprovalPostInFlight.clear();
}

export async function postDesktopToolDelegateResult(
  config: Config,
  delegateId: string,
  payload: { result?: string; error?: string },
  signal?: AbortSignal,
): Promise<void> {
  if (desktopToolDelegatePosted.has(delegateId)) {
    return;
  }

  return runDelegatePostOnce(desktopToolDelegatePostInFlight, delegateId, async () => {
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
    desktopToolDelegatePosted.add(delegateId);
  });
}

export async function postToolApprovalResult(
  config: Config,
  delegateId: string,
  payload: { result?: string; error?: string },
  signal?: AbortSignal,
): Promise<void> {
  if (toolApprovalDelegatePosted.has(delegateId)) {
    return;
  }

  return runDelegatePostOnce(toolApprovalPostInFlight, delegateId, async () => {
    const endpoint = `${config.endpoint}${OPENAI_TOOL_APPROVAL_RESULT_PATH}`;
    const jwtToken = getAccessToken();
    if (!jwtToken) {
      throw new Error(ERROR_MESSAGES.MISSING_JWT_TOKEN);
    }
    const headers: Record<string, string> = {
      'Content-Type': CONTENT_TYPE_JSON,
      'Authorization': `${AUTHORIZATION_BEARER_PREFIX}${jwtToken}`,
      ...getE2eWalletBypassHeaders(),
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
    toolApprovalDelegatePosted.add(delegateId);
  });
}

export async function fulfillToolApprovalRequest(
  ev: {
    type: 'approval_request';
    delegate_id: string;
    tool: string;
    displayName: string;
    arguments?: Record<string, unknown>;
  },
  config: Config,
  signal?: AbortSignal,
): Promise<void> {
  if (isToolApprovalExempt(ev.tool)) {
    await postToolApprovalResult(config, ev.delegate_id, { result: 'approved' }, signal);
    return;
  }

  if (!shouldRequireToolApproval(ev.tool)) {
    await postToolApprovalResult(config, ev.delegate_id, { result: 'approved' }, signal);
    return;
  }

  const approved = await promptToolApproval({
    tool: ev.tool,
    displayName: ev.displayName,
    arguments: ev.arguments,
  });

  if (approved) {
    await postToolApprovalResult(config, ev.delegate_id, { result: 'approved' }, signal);
  } else {
    await postToolApprovalResult(
      config,
      ev.delegate_id,
      { error: 'User declined tool execution' },
      signal,
    );
  }
}

export async function fulfillDesktopToolDelegate(
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
