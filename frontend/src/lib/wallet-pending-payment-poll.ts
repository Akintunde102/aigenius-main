import { clearUserDetailsCache } from '@/lib/calls/get-logged-user-details';
import {
  clearPendingPaymentStorage,
  WALLET_PENDING_PAYMENT_KEY,
} from '@/lib/wallet-payment-return';
import { serverCall } from '@/servercall/init';
import { serverCalls } from '@/servercall/store';

export type PendingPaymentRecord = {
  reference: string;
  amountInNaira: string;
  createdAt: number;
};

export const PAYMENT_POLL_TIMEOUT_MESSAGE =
  "We couldn't confirm your payment in time. Please check your wallet balance or try again.";

export type PendingPaymentPollCallbacks = {
  onSuccess: (amountInNaira: string, newWalletBalance: number | null) => void;
  onFailed?: () => void;
  onTimedOut?: (message: string) => void;
};

type TransactionStatusResponse = {
  status?: string;
  newWalletBalance?: number | null;
};

const PENDING_TTL_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 3000;

function isSuccessfulTransactionStatus(status: string | undefined): boolean {
  return status === 'successful'
    || status === 'success'
    || status === 'already_processed';
}

const listeners = new Set<PendingPaymentPollCallbacks>();
let activeReference: string | null = null;
let pollGeneration = 0;
let lastNotifiedReference: string | null = null;
let lastTimedOutReference: string | null = null;

function notifySuccess(
  reference: string,
  amountInNaira: string,
  newWalletBalance: number | null,
): void {
  if (lastNotifiedReference === reference) {
    return;
  }
  lastNotifiedReference = reference;

  listeners.forEach((listener) => {
    listener.onSuccess(amountInNaira, newWalletBalance);
  });
}

function notifyFailed(): void {
  listeners.forEach((listener) => {
    listener.onFailed?.();
  });
}

function notifyTimedOut(reference: string): void {
  if (lastTimedOutReference === reference) {
    return;
  }
  lastTimedOutReference = reference;

  listeners.forEach((listener) => {
    listener.onTimedOut?.(PAYMENT_POLL_TIMEOUT_MESSAGE);
  });
}

export function subscribePendingWalletPaymentPoll(
  callbacks: PendingPaymentPollCallbacks,
): () => void {
  listeners.add(callbacks);
  return () => {
    listeners.delete(callbacks);
  };
}

export function readPendingPaymentFromStorage(): PendingPaymentRecord | null {
  if (typeof window === 'undefined') return null;

  const stored = window.localStorage.getItem(WALLET_PENDING_PAYMENT_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as PendingPaymentRecord;
    if (!parsed.reference || !parsed.amountInNaira) {
      clearPendingPaymentStorage();
      return null;
    }
    if (Date.now() - parsed.createdAt >= PENDING_TTL_MS) {
      clearPendingPaymentStorage();
      notifyTimedOut(parsed.reference);
      return null;
    }
    return parsed;
  } catch {
    clearPendingPaymentStorage();
    return null;
  }
}

export function hasPendingWalletPayment(): boolean {
  return readPendingPaymentFromStorage() !== null;
}

export async function fetchPendingPaymentStatus(
  reference: string,
): Promise<TransactionStatusResponse | null> {
  try {
    const response = (await serverCall({
      serverCallProps: {
        call: serverCalls.getGatewayPaystackTransactionStatus,
      },
      pathArgs: { reference },
      authorized: true,
    })) as { dataReturned?: TransactionStatusResponse };

    return response?.dataReturned ?? null;
  } catch (error) {
    console.warn('wallet-pending-payment-poll: status lookup failed:', error);
    return null;
  }
}

async function triggerPaymentVerify(
  reference: string,
): Promise<TransactionStatusResponse | null> {
  try {
    const response = (await serverCall({
      serverCallProps: {
        call: serverCalls.postGatewayPaystackTransactionVerify,
      },
      pathArgs: { reference },
      authorized: true,
    })) as { dataReturned?: TransactionStatusResponse };

    return response?.dataReturned ?? null;
  } catch (error) {
    console.warn('wallet-pending-payment-poll: verify failed (may still be pending):', error);
    return null;
  }
}

/** Status check with verify fallback — shared by app polling and the payment callback page. */
export async function reconcilePaymentWithBackend(
  reference: string,
): Promise<TransactionStatusResponse | null> {
  let verification = await fetchPendingPaymentStatus(reference);

  if (!isSuccessfulTransactionStatus(verification?.status)) {
    const verifyResult = await triggerPaymentVerify(reference);
    if (verifyResult?.status) {
      verification = verifyResult;
    } else {
      verification = await fetchPendingPaymentStatus(reference) ?? verification;
    }
  }

  return verification;
}

async function resolvePendingPayment(
  reference: string,
  amountInNaira: string,
): Promise<'success' | 'failed' | 'pending'> {
  const verification = await reconcilePaymentWithBackend(reference);

  if (!verification?.status) {
    return 'pending';
  }

  if (isSuccessfulTransactionStatus(verification.status)) {
    clearUserDetailsCache();
    clearPendingPaymentStorage();
    notifySuccess(reference, amountInNaira, verification.newWalletBalance ?? null);
    return 'success';
  }

  if (verification.status === 'failed' || verification.status === 'cancelled') {
    clearPendingPaymentStorage();
    notifyFailed();
    return 'failed';
  }

  return 'pending';
}

export function startPendingWalletPaymentPoll(
  reference: string,
  amountInNaira: string,
): void {
  if (activeReference === reference) {
    return;
  }

  activeReference = reference;
  const generation = ++pollGeneration;

  void (async () => {
    const immediate = await resolvePendingPayment(reference, amountInNaira);
    if (generation !== pollGeneration || activeReference !== reference) return;

    if (immediate === 'success' || immediate === 'failed') {
      if (activeReference === reference) {
        activeReference = null;
      }
      return;
    }

    while (generation === pollGeneration && activeReference === reference) {
      const pending = readPendingPaymentFromStorage();
      if (!pending || pending.reference !== reference) {
        break;
      }

      await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));
      if (generation !== pollGeneration || activeReference !== reference) {
        return;
      }

      const resolved = await resolvePendingPayment(reference, amountInNaira);
      if (resolved === 'success' || resolved === 'failed') {
        break;
      }
    }

    if (activeReference === reference) {
      activeReference = null;
    }
  })();
}

export function resumePendingWalletPaymentPoll(): void {
  const pending = readPendingPaymentFromStorage();
  if (!pending) return;
  startPendingWalletPaymentPoll(pending.reference, pending.amountInNaira);
}

export async function checkPendingWalletPaymentNow(): Promise<void> {
  const pending = readPendingPaymentFromStorage();
  if (!pending) return;

  const resolved = await resolvePendingPayment(pending.reference, pending.amountInNaira);
  if (resolved === 'success' || resolved === 'failed') {
    if (activeReference === pending.reference) {
      activeReference = null;
    }
  } else if (activeReference !== pending.reference) {
    startPendingWalletPaymentPoll(pending.reference, pending.amountInNaira);
  }
}
