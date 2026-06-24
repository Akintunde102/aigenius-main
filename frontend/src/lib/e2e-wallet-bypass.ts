/** Must match backend header check (`E2E_WALLET_BYPASS_SECRET`). */
export const E2E_WALLET_BYPASS_HEADER = 'x-e2e-wallet-bypass';

/**
 * Wallet bypass is only allowed when `NODE_ENV === 'test'`.
 *
 * - **Jest / Node test runners**: `NODE_ENV` is already `test` — no extra setup.
 * - **Browser / `next dev`**: Next.js normally inlines `development` or `production`. For Playwright
 *   E2E, start the app with `E2E_WALLET_BYPASS_TEST_CLIENT=1` so `next.config.js` injects `test` for
 *   the client bundle (see webpack `DefinePlugin` there).
 * - **Normal local dev** (`npm run dev` without that flag): bypass stays off.
 */
function isE2eWalletBypassEnvironmentAllowed(): boolean {
    if (typeof process === 'undefined' || !process.env) {
        return false;
    }
    return process.env.NODE_ENV === 'test';
}

/**
 * When allowed by environment and NEXT_PUBLIC_E2E_WALLET_BYPASS_SECRET is set, the client sends
 * the header on API calls and skips client-side "insufficient credits" gating (Playwright, local agents).
 */
export function getE2eWalletBypassHeaders(): Record<string, string> {
    if (!isE2eWalletBypassEnvironmentAllowed()) {
        return {};
    }
    const secret = process.env.NEXT_PUBLIC_E2E_WALLET_BYPASS_SECRET?.trim();
    if (!secret) {
        return {};
    }
    return { [E2E_WALLET_BYPASS_HEADER]: secret };
}

/** True when bypass headers are sent and client-side wallet gating is skipped (same rules as {@link getE2eWalletBypassHeaders}). */
export function isE2eBrowserWalletBypassEnabled(): boolean {
    if (!isE2eWalletBypassEnvironmentAllowed()) {
        return false;
    }
    return Boolean(process.env.NEXT_PUBLIC_E2E_WALLET_BYPASS_SECRET?.trim());
}
