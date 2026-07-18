import { normalizeWalletForGating, validateWalletBalance, handleSendError, toUserFacingChatErrorMessage, isRequestCancellationMessage, isWalletRelatedChatError } from '../errorHandling.utils';
import { CHAT_CONFIG, ERROR_MESSAGES } from '../chatOperations.constants';
import { GatewayFetchError } from '@/nobox-client/functions/access-model';

describe('normalizeWalletForGating', () => {
    test('returns null for NaN and non-finite values', () => {
        expect(normalizeWalletForGating(Number.NaN)).toBeNull();
        expect(normalizeWalletForGating(Number.POSITIVE_INFINITY)).toBeNull();
    });

    test('returns finite numbers for display', () => {
        expect(normalizeWalletForGating(100)).toBe(100);
        expect(normalizeWalletForGating(-3)).toBe(-3);
    });
});

describe('validateWalletBalance', () => {
    test('rejects negative balance when required is positive', () => {
        const r = validateWalletBalance(-1, CHAT_CONFIG.MIN_WALLET_BALANCE);
        expect(r.isValid).toBe(false);
    });

    test('rejects NaN wallet values', () => {
        const r = validateWalletBalance(Number.NaN as unknown as number, CHAT_CONFIG.MIN_WALLET_BALANCE);
        expect(r.isValid).toBe(false);
    });
});

describe('toUserFacingChatErrorMessage', () => {
    test('maps provider-style errors to a generic message', () => {
        expect(
            toUserFacingChatErrorMessage(new Error('Provider returned 429: rate limit exceeded')),
        ).toBe(ERROR_MESSAGES.GENERIC_CHAT_ERROR);
    });

    test('maps request aborted to cancelled copy', () => {
        expect(toUserFacingChatErrorMessage(new Error('Request aborted'))).toBe(
            ERROR_MESSAGES.REQUEST_CANCELLED,
        );
    });

    test('maps insufficient funds gateway errors to low-balance copy', () => {
        expect(
            toUserFacingChatErrorMessage(
                new GatewayFetchError('Insufficient funds in wallet. model/x requires at least ₦10.', 400, 2),
            ),
        ).toBe(ERROR_MESSAGES.REQUEST_ABORTED_LOW_BALANCE);
    });
});

describe('handleSendError', () => {
    test('never surfaces raw gateway error text', () => {
        const setError = jest.fn();
        handleSendError(
            new GatewayFetchError('Internal validation failed: bad tool schema', 500),
            [],
            false,
            jest.fn(),
            setError,
        );
        expect(setError).toHaveBeenCalledWith(ERROR_MESSAGES.GENERIC_CHAT_ERROR);
    });
});

describe('isRequestCancellationMessage', () => {
    test('detects cancelled request copy', () => {
        expect(isRequestCancellationMessage(ERROR_MESSAGES.REQUEST_CANCELLED)).toBe(true);
        expect(isRequestCancellationMessage(ERROR_MESSAGES.GENERIC_CHAT_ERROR)).toBe(false);
    });
});

describe('isWalletRelatedChatError', () => {
    test('detects wallet and credit messages', () => {
        expect(isWalletRelatedChatError(ERROR_MESSAGES.REQUEST_ABORTED_LOW_BALANCE)).toBe(true);
        expect(isWalletRelatedChatError('You need at least 42 credits to use Claude.')).toBe(true);
    });

    test('does not treat generic chat failures as wallet errors', () => {
        expect(isWalletRelatedChatError(ERROR_MESSAGES.GENERIC_CHAT_ERROR)).toBe(false);
        expect(isWalletRelatedChatError('Failed to load wallet balance')).toBe(false);
    });
});
