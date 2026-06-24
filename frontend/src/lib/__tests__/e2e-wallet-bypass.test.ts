import {
    getE2eWalletBypassHeaders,
    isE2eBrowserWalletBypassEnabled,
} from '../e2e-wallet-bypass';

describe('e2e-wallet-bypass', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    test('does not enable bypass when NODE_ENV is production', () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
            NEXT_PUBLIC_E2E_WALLET_BYPASS_SECRET: 'test-secret',
        };

        expect(isE2eBrowserWalletBypassEnabled()).toBe(false);
        expect(getE2eWalletBypassHeaders()).toEqual({});
    });

    test('does not enable bypass when NODE_ENV is development', () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'development',
            NEXT_PUBLIC_E2E_WALLET_BYPASS_SECRET: 'dev-secret',
        };

        expect(isE2eBrowserWalletBypassEnabled()).toBe(false);
        expect(getE2eWalletBypassHeaders()).toEqual({});
    });

    test('enables bypass only when NODE_ENV is test and secret is set', () => {
        process.env = {
            ...originalEnv,
            NODE_ENV: 'test',
            NEXT_PUBLIC_E2E_WALLET_BYPASS_SECRET: 'test-secret',
        };

        expect(isE2eBrowserWalletBypassEnabled()).toBe(true);
        expect(getE2eWalletBypassHeaders()).toEqual({
            'x-e2e-wallet-bypass': 'test-secret',
        });
    });

    test('does not enable when NODE_ENV is test but secret is unset', () => {
        const { NEXT_PUBLIC_E2E_WALLET_BYPASS_SECRET: _omit, ...envWithoutSecret } = originalEnv as NodeJS.ProcessEnv &
            Record<string, string | undefined>;
        process.env = {
            ...envWithoutSecret,
            NODE_ENV: 'test',
        };

        expect(isE2eBrowserWalletBypassEnabled()).toBe(false);
        expect(getE2eWalletBypassHeaders()).toEqual({});
    });
});
