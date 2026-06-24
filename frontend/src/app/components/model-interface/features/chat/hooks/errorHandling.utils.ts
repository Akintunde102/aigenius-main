import type { Dispatch, SetStateAction } from 'react';
import { ChatMessage } from '@/app/components/model-interface/shared/types';
import { GatewayFetchError } from '@/nobox-client/functions/access-model';
import { clearUserDetailsCache } from '@/lib/calls/user-details-cache';
import { CHAT_CONFIG, ERROR_MESSAGES } from './chatOperations.constants';

function isInsufficientFundsText(message: string | undefined): boolean {
    if (!message) return false;
    return /insufficient funds/i.test(message) || /wallet balance is zero or negative/i.test(message);
}

function extractAxiosStyleMessage(error: unknown): string | undefined {
    const e = error as { response?: { data?: { message?: unknown } } };
    const m = e?.response?.data?.message;
    if (typeof m === 'string') return m;
    if (m && typeof m === 'object' && 'message' in m && typeof (m as { message?: unknown }).message === 'string') {
        return (m as { message: string }).message;
    }
    return undefined;
}

function extractAxiosWallet(error: unknown): number | undefined {
    const m = (error as { response?: { data?: { message?: unknown } } }).response?.data?.message;
    if (m && typeof m === 'object' && typeof (m as { wallet?: unknown }).wallet === 'number') {
        return (m as { wallet: number }).wallet;
    }
    return undefined;
}

/**
 * Returns a finite numeric balance for gating, or null if the value is missing/invalid.
 * Prevents `NaN < required` (false in JS) from bypassing insufficient-funds checks.
 */
export function normalizeWalletForGating(wallet: unknown): number | null {
    if (wallet === null || wallet === undefined) {
        return null;
    }
    const n = typeof wallet === 'number' ? wallet : Number(wallet);
    if (!Number.isFinite(n)) {
        return null;
    }
    return n;
}

export type HandleSendErrorOptions = {
    /** Apply server-reported balance when the gateway rejects a request for insufficient funds. */
    setWallet?: Dispatch<SetStateAction<number | null>>;
    /** e.g. open Add Credits modal when the server reports low balance. */
    onInsufficientFunds?: () => void;
};

/**
 * Handles errors during message sending
 */
export function handleSendError(
    error: unknown,
    chat: ChatMessage[],
    streaming: boolean,
    setChat: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
    setError: React.Dispatch<React.SetStateAction<string>>,
    options?: HandleSendErrorOptions,
): void {
    // Clean up incomplete assistant messages during streaming
    if (streaming) {
        setChat(prev => {
            if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' &&
                prev[prev.length - 1].content === '') {
                return prev.slice(0, -1);
            }
            return prev;
        });
    }

    if (error instanceof GatewayFetchError) {
        if (typeof error.wallet === 'number' && options?.setWallet) {
            clearUserDetailsCache();
            options.setWallet(error.wallet);
        }
        if (isInsufficientFundsText(error.message)) {
            options?.onInsufficientFunds?.();
            setError(ERROR_MESSAGES.REQUEST_ABORTED_LOW_BALANCE);
            return;
        }
        setError(error.message || ERROR_MESSAGES.MODEL_RESPONSE_FAILED);
        return;
    }

    const axiosStyle = extractAxiosStyleMessage(error);
    const axiosWallet = extractAxiosWallet(error);
    if (
        isInsufficientFundsText(axiosStyle)
        || (error as { response?: { data?: { message?: string } } })?.response?.data?.message?.includes?.('Insufficient funds')
    ) {
        if (typeof axiosWallet === 'number' && options?.setWallet) {
            clearUserDetailsCache();
            options.setWallet(axiosWallet);
        }
        options?.onInsufficientFunds?.();
        setError(ERROR_MESSAGES.REQUEST_ABORTED_LOW_BALANCE);
        return;
    }

    const err = error as { message?: string };
    if (err.message === 'Request aborted') {
        setError(ERROR_MESSAGES.REQUEST_CANCELLED);
    } else if (typeof err.message === 'string' && err.message.trim()) {
        // Streaming path throws `Error(providerMessage)` for SSE `error` / provider failures — surface it.
        setError(err.message.trim());
    } else {
        setError(ERROR_MESSAGES.MODEL_RESPONSE_FAILED);
    }
}

/**
 * Validates wallet balance before sending messages
 */
export function validateWalletBalance(
    wallet: number | null,
    requiredBalance = CHAT_CONFIG.MIN_WALLET_BALANCE
): { isValid: boolean; error?: string } {
    if (wallet === null) {
        return {
            isValid: false,
            error: 'Wallet balance not loaded. Please refresh and try again.'
        };
    }

    if (!Number.isFinite(wallet)) {
        return {
            isValid: false,
            error: 'Wallet balance not loaded. Please refresh and try again.'
        };
    }

    if (wallet < requiredBalance) {
        const message = requiredBalance > CHAT_CONFIG.MIN_WALLET_BALANCE
            ? `Insufficient funds: This model requires at least ${Math.ceil(requiredBalance)} credits.`
            : ERROR_MESSAGES.INSUFFICIENT_FUNDS;
        return {
            isValid: false,
            error: message
        };
    }

    return { isValid: true };
}

/**
 * Validates project configuration
 */
export function validateProject(project?: string): { isValid: boolean; error?: string } {
    if (!project) {
        return {
            isValid: false,
            error: ERROR_MESSAGES.NO_PROJECT
        };
    }
    return { isValid: true };
}

/**
 * Validates message content before sending
 */
export function validateMessageContent(
    content: string,
    selectedModel: any
): { isValid: boolean; error?: string } {
    if (!selectedModel) {
        return {
            isValid: false,
            error: 'No model selected'
        };
    }

    if (!content.trim()) {
        return {
            isValid: false,
            error: 'Message content cannot be empty'
        };
    }

    return { isValid: true };
}

/**
 * Logs metrics for performance monitoring (currently commented out)
 */
export function logMetrics(usageInfo: any, cost: any, selectedModel: any): void {
    if (usageInfo) {
        // logger.performanceMetric('model_usage', usageInfo.total_tokens, {
        //     feature: 'model-interface',
        //     action: 'token_usage',
        //     metadata: {
        //         model: selectedModel!.name,
        //         promptTokens: usageInfo.prompt_tokens,
        //         completionTokens: usageInfo.completion_tokens,
        //         totalTokens: usageInfo.total_tokens
        //     }
        // });
    }

    if (cost) {
        // logger.performanceMetric('model_cost', cost, {
        //     feature: 'model-interface',
        //     action: 'cost_calculation',
        //     metadata: {
        //         model: selectedModel!.name,
        //         totalCost: cost,
        //         totalTokens: usageInfo?.total_tokens || 0
        //     }
        // });
    }
}
