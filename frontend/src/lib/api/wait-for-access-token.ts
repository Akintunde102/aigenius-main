import { getValidAccessToken, subscribeToTokenRefresh } from '@/lib/api/auth-client';

const DEFAULT_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 50;

/**
 * Resolves once a non-expired JWT is available in storage (after OAuth exchange / session restore).
 * Gateway calls made before this often return 401 or empty payloads on desktop.
 */
export function waitForAccessToken(timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('waitForAccessToken requires a browser environment'));
    }

    const existing = getValidAccessToken();
    if (existing) {
        return Promise.resolve(existing);
    }

    return new Promise((resolve, reject) => {
        let settled = false;

        const finish = (token: string) => {
            if (settled) {
                return;
            }
            settled = true;
            window.clearInterval(pollId);
            window.clearTimeout(timeoutId);
            unsubscribe();
            resolve(token);
        };

        const fail = (error: Error) => {
            if (settled) {
                return;
            }
            settled = true;
            window.clearInterval(pollId);
            window.clearTimeout(timeoutId);
            unsubscribe();
            reject(error);
        };

        const unsubscribe = subscribeToTokenRefresh(() => {
            const token = getValidAccessToken();
            if (token) {
                finish(token);
            }
        });

        const pollId = window.setInterval(() => {
            const token = getValidAccessToken();
            if (token) {
                finish(token);
            }
        }, POLL_INTERVAL_MS);

        const timeoutId = window.setTimeout(() => {
            fail(new Error('Timed out waiting for auth token'));
        }, timeoutMs);
    });
}
