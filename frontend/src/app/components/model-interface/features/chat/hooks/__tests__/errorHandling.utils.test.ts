import { normalizeWalletForGating, validateWalletBalance } from '../errorHandling.utils';
import { CHAT_CONFIG } from '../chatOperations.constants';

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
