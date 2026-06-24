export type WalletTopUpReopenTarget = 'sidebar' | 'inline';

export type WalletTopUpReturnState = {
  returnTo: string;
  amountInNaira: string;
  startedAt: number;
  reopenTarget: WalletTopUpReopenTarget;
};

export type WalletTopUpResultState = {
  status: 'success' | 'failed';
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
    return parsed.status === 'success' || parsed.status === 'failed' ? parsed : null;
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

  const callbackUrl = new URL('/payment-callback', window.location.origin);
  callbackUrl.searchParams.set('returnTo', returnTo);
  callbackUrl.searchParams.set('modal', 'wallet-top-up');
  return callbackUrl.toString();
}
