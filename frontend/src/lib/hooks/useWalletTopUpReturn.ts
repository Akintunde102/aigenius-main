import { useEffect } from 'react';
import {
    peekWalletTopUpResultState,
    WALLET_TOP_UP_RETURN_QUERY,
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
        let urlWantsWallet = false;
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            urlWantsWallet =
                params.get(WALLET_TOP_UP_RETURN_QUERY) === '1'
                || params.get('modal') === 'wallet-top-up';
        }

        if (!paymentResult && !urlWantsWallet) return;

        const target = paymentResult?.reopenTarget ?? 'sidebar';
        if (target === reopenTarget || urlWantsWallet) {
            setShowWalletModal(true);
        }

        if (urlWantsWallet && typeof window !== 'undefined') {
            try {
                const url = new URL(window.location.href);
                url.searchParams.delete(WALLET_TOP_UP_RETURN_QUERY);
                url.searchParams.delete('modal');
                const next = `${url.pathname}${url.search}${url.hash}`;
                window.history.replaceState(null, '', next);
            } catch {
                /* ignore */
            }
        }
    }, [setShowWalletModal, reopenTarget]);
}
