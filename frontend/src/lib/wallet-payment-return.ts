import { getAppPublicOrigin } from '@/lib/app-origin';
import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';

export type WalletTopUpReopenTarget = 'sidebar' | 'inline';

export type WalletTopUpReturnState = {
  returnTo: string;
  amountInNaira: string;
  startedAt: number;
  reopenTarget: WalletTopUpReopenTarget;
};

export type WalletTopUpResultState = {
  status: 'success' | 'failed' | 'pending';
  reference: string | null;
  amountInNaira?: string;
  newWalletBalance?: number | null;
  message?: string;
  verifiedAt: number;
  reopenTarget?: WalletTopUpReopenTarget;
};

export type WalletPaymentSuccessOptions = {
  /** Keep the top-up modal open (Paystack redirect return flow). */
  keepModalOpen?: boolean;
};

export const WALLET_TOP_UP_RETURN_QUERY = 'walletTopUp';
export const WALLET_PENDING_PAYMENT_KEY = 'aigenius_pending_payment';

export function clearPendingPaymentStorage(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(WALLET_PENDING_PAYMENT_KEY);
}

type PendingPaymentReferenceRecord = {
  reference?: string;
};

/**
 * Payaza hosted checkout may redirect without query params — fall back to the pending
 * payment record we stored before opening checkout.
 */
export function resolveWalletPaymentReference(
  searchParams: Pick<URLSearchParams, 'get'>,
): string | null {
  const fromUrl =
    searchParams.get('reference')
    || searchParams.get('trxref')
    || searchParams.get('tx_ref')
    || searchParams.get('transaction_reference');
  const trimmed = fromUrl?.trim();
  if (trimmed) {
    return trimmed;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.localStorage.getItem(WALLET_PENDING_PAYMENT_KEY);
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as PendingPaymentReferenceRecord;
    return parsed.reference?.trim() || null;
  } catch {
    return null;
  }
}

type OpenWalletCheckoutResult = {
  ok: boolean;
  url: string;
  error?: string;
};

function openCheckoutViaAnchor(checkoutUrl: string): void {
  const anchor = document.createElement('a');
  anchor.href = checkoutUrl;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/**
 * Desktop-only: try every supported strategy to hand off checkout to the system browser.
 */
export async function tryOpenWalletPaymentCheckout(
  authorizationUrl: string,
): Promise<OpenWalletCheckoutResult> {
  const checkoutUrl = authorizationUrl?.trim();
  if (!checkoutUrl) {
    return { ok: false, url: authorizationUrl, error: 'missing_checkout_url' };
  }

  const desktop = window.aigeniusDesktop;
  if (!desktop?.isDesktop) {
    return { ok: false, url: checkoutUrl, error: 'not_desktop' };
  }

  const errors: string[] = [];
  let attemptedBrowserHandoff = false;

  if (typeof desktop.openWalletCheckoutUrl === 'function') {
    try {
      const result = await desktop.openWalletCheckoutUrl(checkoutUrl);
      if (result?.ok) {
        return { ok: true, url: checkoutUrl };
      }
      if (result?.error) {
        errors.push(result.error);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  try {
    // Electron routes hosted payment URLs to the system browser via setWindowOpenHandler.
    window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    attemptedBrowserHandoff = true;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  try {
    openCheckoutViaAnchor(checkoutUrl);
    attemptedBrowserHandoff = true;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  if (typeof desktop.openExternalUrl === 'function') {
    try {
      const result = await desktop.openExternalUrl(checkoutUrl);
      if (result?.ok) {
        return { ok: true, url: checkoutUrl };
      }
      if (result?.error) {
        errors.push(result.error);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  } else if (typeof desktop.openExternal === 'function') {
    try {
      desktop.openExternal(checkoutUrl);
      return { ok: true, url: checkoutUrl };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (attemptedBrowserHandoff) {
    return { ok: true, url: checkoutUrl };
  }

  return {
    ok: false,
    url: checkoutUrl,
    error: errors[0] || 'could_not_open_browser',
  };
}

/**
 * Opens Paystack/Payaza/Flutterwave hosted checkout.
 * - Web: navigates the current tab.
 * - Desktop: opens the system browser (wallet updates via background polling).
 * @returns the checkout URL that was opened (for desktop fallback UI).
 */
export function openWalletPaymentCheckout(authorizationUrl: string): string {
  if (typeof window === 'undefined') return authorizationUrl;

  const checkoutUrl = authorizationUrl?.trim();
  if (!checkoutUrl) {
    return authorizationUrl;
  }

  if (window.aigeniusDesktop?.isDesktop) {
    void tryOpenWalletPaymentCheckout(checkoutUrl);
    return checkoutUrl;
  }

  window.location.assign(checkoutUrl);
  return checkoutUrl;
}

export function appendWalletTopUpReturnMarker(returnPath: string): string {
  if (typeof window === 'undefined') {
    return returnPath;
  }
  try {
    const url = new URL(returnPath, window.location.origin);
    url.searchParams.set(WALLET_TOP_UP_RETURN_QUERY, '1');
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    const sep = returnPath.includes('?') ? '&' : '?';
    return `${returnPath}${sep}${WALLET_TOP_UP_RETURN_QUERY}=1`;
  }
}

/** Where to send the user after Paystack verification (relative in-app path). */
export function resolveWalletPaymentReturnTarget(
  returnTo: string | null | undefined,
  fallback = '/',
): string {
  const raw = (returnTo || fallback || '/').trim() || '/';
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const url = new URL(raw);
      return appendWalletTopUpReturnMarker(`${url.pathname}${url.search}${url.hash}`);
    } catch {
      return appendWalletTopUpReturnMarker('/');
    }
  }
  if (!raw.startsWith('/') || raw.startsWith('//')) {
    return appendWalletTopUpReturnMarker('/');
  }
  return appendWalletTopUpReturnMarker(raw);
}

export const WALLET_TOP_UP_RETURN_KEY = 'aigenius:wallet-top-up:return';
export const WALLET_TOP_UP_RESULT_KEY = 'aigenius:wallet-top-up:result';

function canUseSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function getCurrentReturnPath(): string {
  if (typeof window === 'undefined') {
    return '/';
  }
  return `${window.location.pathname}${window.location.search}${window.location.hash}` || '/';
}

export function saveWalletTopUpReturnState(state: WalletTopUpReturnState): void {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.setItem(WALLET_TOP_UP_RETURN_KEY, JSON.stringify(state));
}

export function readWalletTopUpReturnState(): WalletTopUpReturnState | null {
  if (!canUseSessionStorage()) return null;
  const raw = window.sessionStorage.getItem(WALLET_TOP_UP_RETURN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WalletTopUpReturnState;
    return typeof parsed.returnTo === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function clearWalletTopUpReturnState(): void {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.removeItem(WALLET_TOP_UP_RETURN_KEY);
}

export function saveWalletTopUpResultState(state: WalletTopUpResultState): void {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.setItem(WALLET_TOP_UP_RESULT_KEY, JSON.stringify(state));
}

export function peekWalletTopUpResultState(): WalletTopUpResultState | null {
  if (!canUseSessionStorage()) return null;
  const raw = window.sessionStorage.getItem(WALLET_TOP_UP_RESULT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WalletTopUpResultState;
    return parsed.status === 'success' || parsed.status === 'failed' || parsed.status === 'pending'
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function consumeWalletTopUpResultState(): WalletTopUpResultState | null {
  const state = peekWalletTopUpResultState();
  if (canUseSessionStorage()) {
    window.sessionStorage.removeItem(WALLET_TOP_UP_RESULT_KEY);
  }
  return state;
}

export function buildPaymentCallbackUrl(
  amountInNaira: string,
  reopenTarget: WalletTopUpReopenTarget = 'sidebar',
): string {
  const returnTo = getCurrentReturnPath();
  saveWalletTopUpReturnState({
    returnTo,
    amountInNaira,
    startedAt: Date.now(),
    reopenTarget,
  });

  const callbackUrl = new URL('/payment-callback', getAppPublicOrigin());
  callbackUrl.searchParams.set('returnTo', returnTo);
  callbackUrl.searchParams.set('modal', 'wallet-top-up');
  if (typeof window !== 'undefined' && isAigeniusDesktopRuntime()) {
    callbackUrl.searchParams.set('desktop', '1');
  }
  return callbackUrl.toString();
}

/** Embed the transaction reference so Payaza redirects back with it (system browser has no app localStorage). */
export function appendWalletPaymentReferenceToCallbackUrl(
  callbackUrl: string,
  reference: string,
): string {
  const trimmed = reference.trim();
  if (!trimmed) {
    return callbackUrl;
  }

  try {
    const url = new URL(callbackUrl);
    url.searchParams.set('reference', trimmed);
    return url.toString();
  } catch {
    const sep = callbackUrl.includes('?') ? '&' : '?';
    return `${callbackUrl}${sep}reference=${encodeURIComponent(trimmed)}`;
  }
}
