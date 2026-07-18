import { useEffect, useRef } from 'react';
import {
  checkPendingWalletPaymentNow,
  hasPendingWalletPayment,
  PendingPaymentPollCallbacks,
  resumePendingWalletPaymentPoll,
  subscribePendingWalletPaymentPoll,
} from '@/lib/wallet-pending-payment-poll';
import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';
import { toast } from 'sonner';
import { PAYMENT_POLL_TIMEOUT_MESSAGE } from '@/lib/wallet-pending-payment-poll';

/**
 * Keeps wallet top-up polling alive at the app shell level so desktop payments
 * completed in the system browser still credit the in-app wallet after the modal closes.
 */
export function usePendingWalletPayment(
  onPaymentResolved: PendingPaymentPollCallbacks['onSuccess'],
  onPaymentFailed?: PendingPaymentPollCallbacks['onFailed'],
  onPaymentTimedOut?: PendingPaymentPollCallbacks['onTimedOut'],
): void {
  const onResolvedRef = useRef(onPaymentResolved);
  const onFailedRef = useRef(onPaymentFailed);
  const onTimedOutRef = useRef(onPaymentTimedOut);

  useEffect(() => {
    onResolvedRef.current = onPaymentResolved;
  }, [onPaymentResolved]);

  useEffect(() => {
    onFailedRef.current = onPaymentFailed;
  }, [onPaymentFailed]);

  useEffect(() => {
    onTimedOutRef.current = onPaymentTimedOut;
  }, [onPaymentTimedOut]);

  useEffect(() => {
    const unsubscribe = subscribePendingWalletPaymentPoll({
      onSuccess: (amountInNaira, newWalletBalance) => {
        onResolvedRef.current(amountInNaira, newWalletBalance);
      },
      onFailed: () => {
        onFailedRef.current?.();
      },
      onTimedOut: (message) => {
        toast.error(message || PAYMENT_POLL_TIMEOUT_MESSAGE);
        onTimedOutRef.current?.(message);
      },
    });

    resumePendingWalletPaymentPoll();

    const refreshPendingPayment = () => {
      if (!hasPendingWalletPayment()) {
        return;
      }
      void checkPendingWalletPaymentNow();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshPendingPayment();
      }
    };

    window.addEventListener('focus', refreshPendingPayment);
    document.addEventListener('visibilitychange', onVisibilityChange);

    const removeDesktopFocusListener = isAigeniusDesktopRuntime()
      && typeof window.aigeniusDesktop?.onMainWindowFocus === 'function'
      ? window.aigeniusDesktop.onMainWindowFocus(refreshPendingPayment)
      : undefined;

    const intervalId = window.setInterval(() => {
      if (hasPendingWalletPayment()) {
        refreshPendingPayment();
      }
    }, 5000);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', refreshPendingPayment);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      removeDesktopFocusListener?.();
      window.clearInterval(intervalId);
    };
  }, []);
}
