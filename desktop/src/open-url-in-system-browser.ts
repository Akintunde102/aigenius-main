import { BrowserWindow, shell } from 'electron';
import { isHostedPaymentUrl } from './payment-allowlist';

export type OpenUrlInSystemBrowserResult =
  | { ok: true }
  | { ok: false; error: string };

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

function normalizeExternalUrl(url: unknown): string | null {
  if (typeof url !== 'string') {
    return null;
  }
  const trimmed = url.trim();
  if (trimmed.startsWith('mailto:')) {
    return trimmed;
  }
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return null;
  }
  return trimmed;
}

function normalizeHttpUrl(url: unknown): string | null {
  return normalizeExternalUrl(url);
}

/**
 * Trusted domains (official documentation, marketing pages, mailto, and Github repo)
 * that should open directly in the system browser without an approval modal dialog.
 */
export function isTrustedDirectExternalUrl(url: string): boolean {
  if (url.startsWith('mailto:')) {
    return true;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === 'aigenius.noboxlabs.xyz' ||
    host.endsWith('.noboxlabs.xyz') ||
    host === 'noboxlabs.xyz' ||
    host === 'aigenius.chat' ||
    host.endsWith('.aigenius.chat')
  ) {
    return true;
  }
  if (host === 'github.com' && parsed.pathname.toLowerCase().startsWith('/noboxlabs')) {
    return true;
  }
  return false;
}

/**
 * Published conversation pages are public links the user asked to view.
 * Loopback only — other hosts still go through the external-link approval dialog.
 */
export function isLoopbackPublishedConversationUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }
  if (!LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase())) {
    return false;
  }
  const path = parsed.pathname.replace(/\/+$/, '') || '/';
  return path === '/published-conversations' || path.startsWith('/published-conversations/');
}

/**
 * Opens a wallet hosted-checkout URL in the OS default browser.
 * Skips the external-link approval dialog — these links come from our payment API.
 */
export async function openWalletCheckoutInSystemBrowser(
  url: unknown,
): Promise<OpenUrlInSystemBrowserResult> {
  const normalized = normalizeExternalUrl(url);
  if (!normalized) {
    return { ok: false, error: 'invalid_url' };
  }

  try {
    console.log('[aigenius-desktop] opening wallet checkout in system browser', {
      url: normalized,
    });
    await shell.openExternal(normalized, { activate: true });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[aigenius-desktop] openWalletCheckoutInSystemBrowser failed', {
      url: normalized,
      message,
    });
    return { ok: false, error: message };
  }
}

/**
 * Opens an http(s) URL in the OS browser after the user clicked a model link.
 * The chat UI already shows the destination on hover, so this click leaves the app
 * without a second confirmation dialog. Non-http URLs are rejected.
 */
export async function openClickedHttpUrlInSystemBrowser(
  url: unknown,
): Promise<OpenUrlInSystemBrowserResult> {
  const normalized = normalizeExternalUrl(url);
  if (!normalized || normalized.startsWith('mailto:')) {
    return { ok: false, error: 'invalid_url' };
  }

  try {
    await shell.openExternal(normalized, { activate: true });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[aigenius-desktop] openClickedHttpUrlInSystemBrowser failed', {
      url: normalized,
      message,
    });
    return { ok: false, error: message };
  }
}

/**
 * Opens http(s) and mailto URLs in the OS default browser / client.
 * Hosted wallet checkouts, trusted official domains, and mailto skip the approval dialog.
 */
export async function openUrlInSystemBrowser(
  url: unknown,
  parent?: BrowserWindow,
): Promise<OpenUrlInSystemBrowserResult> {
  const normalized = normalizeExternalUrl(url);
  if (!normalized) {
    return { ok: false, error: 'invalid_url' };
  }

  if (
    isHostedPaymentUrl(normalized) ||
    isLoopbackPublishedConversationUrl(normalized) ||
    isTrustedDirectExternalUrl(normalized)
  ) {
    try {
      await shell.openExternal(normalized, { activate: true });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[aigenius-desktop] openUrlInSystemBrowser direct open failed', {
        url: normalized,
        message,
      });
      return { ok: false, error: message };
    }
  }

  try {
    const { showExternalLinkApprovalDialog } = await import('./external-link-approval-dialog');
    const ok = await showExternalLinkApprovalDialog(parent, normalized);
    if (!ok) {
      return { ok: false, error: 'user_declined' };
    }
    await shell.openExternal(normalized, { activate: true });
    return { ok: true };
  } catch (error) {
    console.error(
      '[aigenius-desktop] external link approval failed; opening URL in system browser',
      error,
    );
    try {
      await shell.openExternal(normalized, { activate: true });
      return { ok: true };
    } catch (openError) {
      const message = openError instanceof Error ? openError.message : String(openError);
      return { ok: false, error: message };
    }
  }
}
