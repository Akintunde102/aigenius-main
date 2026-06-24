import { useEffect } from 'react';
import {
    peekWalletTopUpResultState,
    WalletTopUpReopenTarget,
} from '@/lib/wallet-payment-return';

/**
 * Reopens the wallet top-up modal after Paystack redirects back to the app.
 */
export function useWalletTopUpReturn(
    setShowWalletModal: (show: boolean) => void,
    reopenTarget: WalletTopUpReopenTarget,
): void {
    useEffect(() => {
        const paymentResult = peekWalletTopUpResultState();
        if (!paymentResult) return;

        const target = paymentResult.reopenTarget ?? 'sidebar';
        if (target === reopenTarget) {
            setShowWalletModal(true);
        }
    }, [setShowWalletModal, reopenTarget]);
}
