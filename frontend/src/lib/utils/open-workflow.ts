import { syncAuthSessionCookiesFromStorage } from '@/lib/utils/auth-session';
import {
  isAigeniusDesktopRuntime,
  isLikelyElectronRenderer,
} from '@/lib/utils/desktop-runtime';

/**
 * Workflow routes that should open beside chat (new tab / Electron window) instead of
 * navigating away from the conversation shell.
 */
export function isWorkflowShellPath(href: string, pageOrigin?: string): boolean {
  const t = href.trim();
  if (!t) {
    return false;
  }
  if (t === '/workflows' || t.startsWith('/workflows/')) {
    return true;
  }
  if (t.startsWith('/workflow/')) {
    const rest = t.slice('/workflow/'.length);
    const first = rest.split('/')[0] ?? '';
    return first.length > 0;
  }
  if (!pageOrigin) {
    return false;
  }
  try {
    const u = new URL(t);
    if (u.origin !== pageOrigin) {
      return false;
    }
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts[0] === 'workflows') {
      return true;
    }
    return parts[0] === 'workflow' && (parts[1]?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

/** @deprecated Use {@link isWorkflowShellPath}. Kept for existing imports/tests. */
export function shouldOpenWorkflowStudioLinkInNewTab(href: string, pageOrigin?: string): boolean {
  return isWorkflowShellPath(href, pageOrigin);
}

function isSafeInternalPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('\\') && !/[\s\r\n]/.test(path);
}

/**
 * Normalizes a workflow href to a safe in-app path, or null when not a workflow route.
 */
export function normalizeWorkflowOpenPath(href: string, pageOrigin?: string): string | null {
  const t = href.trim();
  if (!t) {
    return null;
  }
  if (isSafeInternalPath(t) && isWorkflowShellPath(t, pageOrigin)) {
    return t;
  }
  if (!pageOrigin) {
    return null;
  }
  try {
    const u = new URL(t);
    if (u.origin !== pageOrigin) {
      return null;
    }
    const path = `${u.pathname}${u.search}${u.hash}`;
    return isWorkflowShellPath(path, pageOrigin) ? path : null;
  } catch {
    return null;
  }
}

export function workflowStudioPath(workflowId: string): string {
  return `/workflow/${encodeURIComponent(workflowId.trim())}`;
}

/**
 * Opens a workflow route in a new browser tab (web) or Electron window (desktop),
 * keeping the current chat shell mounted.
 */
export function openWorkflow(href: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  const origin = window.location.origin;
  const path = normalizeWorkflowOpenPath(href, origin);
  if (!path) {
    return;
  }

  // Middleware is cookie-only; mirror localStorage tokens before a new shell window loads.
  syncAuthSessionCookiesFromStorage();

  const openNewWindow = window.aigeniusDesktop?.openNewWindow;
  const useDesktopNewWindow =
    typeof openNewWindow === 'function' &&
    (isAigeniusDesktopRuntime() || isLikelyElectronRenderer());

  if (useDesktopNewWindow) {
    void openNewWindow(path);
    return;
  }

  const url = new URL(path, origin);
  window.open(url.href, '_blank', 'noopener,noreferrer');
}

/**
 * Reads workflow IDs from workflow_agent / workflow_intent tool results.
 */
export function extractWorkflowIdsFromToolResult(parsed: unknown): string[] {
  if (!parsed || typeof parsed !== 'object') {
    return [];
  }
  const ids = new Set<string>();
  const record = parsed as {
    workflow_ids_touched?: unknown;
    workflow_urls?: unknown;
  };

  if (Array.isArray(record.workflow_ids_touched)) {
    for (const id of record.workflow_ids_touched) {
      if (typeof id === 'string' && id.trim()) {
        ids.add(id.trim());
      }
    }
  }

  if (Array.isArray(record.workflow_urls)) {
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
    for (const url of record.workflow_urls) {
      if (typeof url !== 'string') {
        continue;
      }
      const path = normalizeWorkflowOpenPath(url, origin);
      if (!path) {
        continue;
      }
      const match = path.match(/^\/workflow\/([^/?#]+)/);
      if (match?.[1]) {
        ids.add(match[1]);
      }
    }
  }

  return Array.from(ids);
}
