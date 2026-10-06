import { getPostHogClient } from '@/lib/analytics/posthog-client';
import { getApiRootUrl } from '@/lib/api-root';
import {
  buildClientCrashPayload,
  ClientCrashPayload,
} from '@/lib/utils/client-crash-payload';

const DEDUPE_MS = 10_000;
const recentReports = new Map<string, number>();

export type ClientErrorReportExtra = {
  componentStack?: string | null;
  digest?: string;
};

declare global {
  interface Window {
    __aigCrashInstalled?: boolean;
    __aigReportCrash?: (payload: ClientCrashPayload) => void;
  }
}

function sendCrashBeacon(payload: ClientCrashPayload): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  if (typeof window.__aigReportCrash === 'function') {
    window.__aigReportCrash(payload);
    return true;
  }

  const root = getApiRootUrl().trim().replace(/\/$/, '');
  if (!root) {
    return false;
  }

  const body = JSON.stringify(payload);
  const endpoint = `${root}/client-errors`;
  try {
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'text/plain' });
      if (navigator.sendBeacon(endpoint, blob)) {
        return true;
      }
    }
  } catch {
    /* fetch fallback below */
  }

  try {
    void fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body,
      keepalive: true,
      credentials: 'omit',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Reports a client failure once per message in a short window.
 * The first-party beacon does not require analytics consent.
 * PostHog in the browser is only a fallback when that beacon cannot be sent.
 * Chat text and request bodies are not attached.
 */
export function reportClientError(
  error: unknown,
  source: string,
  extra?: ClientErrorReportExtra,
): void {
  const payload = buildClientCrashPayload(error, source, extra);
  const key = `${payload.name}:${payload.message.slice(0, 180)}`;
  const now = Date.now();
  const last = recentReports.get(key);
  if (last != null && now - last < DEDUPE_MS) {
    return;
  }
  recentReports.set(key, now);

  console.error(`[${payload.source}]`, error);

  if (sendCrashBeacon(payload)) {
    return;
  }

  const client = getPostHogClient();
  if (!client) {
    return;
  }

  client.capture('$exception', {
    $exception_message: payload.message,
    $exception_type: payload.name,
    $exception_stack_trace_raw: payload.stack ?? '',
    source: payload.source,
    component_stack: payload.componentStack,
    digest: payload.digest,
  });
}

/** Test-only reset so dedupe does not leak across cases. */
export function resetClientErrorReportsForTests(): void {
  recentReports.clear();
}
