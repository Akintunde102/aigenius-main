import { useState, useEffect, useCallback } from 'react';
import { clearUserDetailsCache, getUserDetails } from '@/lib/calls/get-logged-user-details';
import { CHAT_CONFIG } from './chatOperations.constants';
import { UseWalletManagementProps } from './chatOperations.types';
import { useWalletSocket } from '@/lib/hooks/useWalletSocket';
import { isE2eBrowserWalletBypassEnabled } from '@/lib/e2e-wallet-bypass';
import { WalletPaymentSuccessOptions } from '@/lib/wallet-payment-return';


/**
 * Hook for managing wallet balance and validation
 */
export function useWalletManagement({
    setError,
    setWallet,
    error,
    setShowWalletModal,
    refreshWalletFromBackend,
    skipVisibilityRefetch = false,
}: UseWalletManagementProps & {
    error?: string;
    setShowWalletModal?: (show: boolean) => void;
    refreshWalletFromBackend?: () => Promise<number | null>;
}) {
    const [paymentModalLoading, setPaymentModalLoading] = useState(false);

    // Load wallet on mount
    useEffect(() => {
        const loadWallet = async () => {
            try {
                const res = await getUserDetails();
                setWallet(res?.config?.wallet ?? null);
            } catch (error) {
                console.error('Failed to load wallet:', error);
                setError('Failed to load wallet balance');
            }
        };

        loadWallet();
    }, [setError, setWallet]);

    // Real-time updates: when the server pushes wallet:updated (e.g. after admin grants credits),
    // update local UI immediately without requiring a page reload.
    const handleSocketWalletUpdate = useCallback((newBalance: number) => {
        setWallet(newBalance);
    }, [setWallet]);

    useWalletSocket({ onWalletUpdated: handleSocketWalletUpdate });

    /**
     * Validates if wallet has sufficient balance
     */
    const validateBalance = (
        wallet: number | null,
        requiredBalance: number = CHAT_CONFIG.MIN_WALLET_BALANCE,
        modelName?: string
    ): boolean => {
        if (isE2eBrowserWalletBypassEnabled()) {
            return true;
        }

        if (wallet === null) {
            setError('Wallet balance not loaded. Please refresh and try again.');
            return false;
        }

        if (!Number.isFinite(wallet)) {
            setError('Wallet balance not loaded. Please refresh and try again.');
            return false;
        }

        if (wallet < requiredBalance) {
            const roundedRequired = Math.ceil(requiredBalance);
            const message = modelName
                ? `You need at least ${roundedRequired} credits to use ${modelName}.`
                : `You need at least ${roundedRequired} credits.`;
            setError(message);
            return false;
        }

        return true;
    };

    /**
     * Updates wallet balance from API response
     */
    const updateWalletFromResponse = (newBalance?: number, currentWallet?: number | null) => {
        if (newBalance !== undefined && currentWallet !== newBalance) {
            clearUserDetailsCache();
            setWallet(newBalance);
        }
    };

    /**
     * Refreshes wallet balance from backend
     */
    const refreshWalletBalance = useCallback(async (): Promise<number | null> => {
        if (refreshWalletFromBackend) {
            return await refreshWalletFromBackend();
        }

        try {
            const userDetails = await getUserDetails(true);
            const newWalletBalance = userDetails?.config?.wallet ?? null;
            setWallet(newWalletBalance);
            return newWalletBalance;
        } catch (error) {
            console.error('Failed to refresh wallet:', error);
            return null;
        }
    }, [refreshWalletFromBackend, setWallet]);

    // Refetch when the tab becomes visible again (socket may have missed updates while backgrounded).
    useEffect(() => {
        if (skipVisibilityRefetch) return;
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void refreshWalletBalance();
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, [refreshWalletBalance, skipVisibilityRefetch]);

    /**
     * Handles successful payment
     */
    const handlePaymentSuccess = async (
        amountInNaira: string,
        newWalletBalance?: number | null,
        options?: WalletPaymentSuccessOptions,
    ) => {
        void amountInNaira;

        if (newWalletBalance !== undefined && newWalletBalance !== null) {
            setWallet(newWalletBalance);
        } else {
            await refreshWalletBalance();
        }

        setPaymentModalLoading(false);
        if (!options?.keepModalOpen && setShowWalletModal) {
            setShowWalletModal(false);
        }
    };

    return {
        validateBalance,
        updateWalletFromResponse,
        refreshWalletBalance,
        handlePaymentSuccess,
        paymentModalLoading,
        setPaymentModalLoading
    };
}