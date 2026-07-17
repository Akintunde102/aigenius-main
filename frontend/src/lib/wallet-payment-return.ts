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

/**
 * Opens Paystack hosted checkout.
 * - Web: navigates the current tab.
 * - Desktop: approval modal → system browser (wallet updates via background polling).
 */
export function openWalletPaymentCheckout(authorizationUrl: string): void {
  if (typeof window === 'undefined') return;

  if (window.aigeniusDesktop?.isDesktop && typeof window.aigeniusDesktop.openExternal === 'function') {
    window.aigeniusDesktop.openExternal(authorizationUrl);
    return;
  }

  window.location.assign(authorizationUrl);
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
