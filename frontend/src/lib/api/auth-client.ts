import axios, { AxiosError, AxiosHeaders, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { LINKS } from '@/lib/links';
import { storageConstants } from '@/lib/constants';
import { storage } from '@/lib/utils/store';
import { navigateTo } from '@/lib/utils/navigate';
import { getE2eWalletBypassHeaders } from '@/lib/e2e-wallet-bypass';

type RetryableAxiosRequestConfig = InternalAxiosRequestConfig & {
    _authRetry?: boolean;
};

const REQUESTED_WITH_HEADER = 'X-Requested-With';
const REQUESTED_WITH_VALUE = 'XMLHttpRequest';
const LOGIN_PATH = LINKS.internalPages.login.github;
const AUTH_TOKEN_REFRESHED_EVENT = 'auth:token-refreshed';

let refreshPromise: Promise<string> | null = null;

export function getAccessToken(): string | undefined {
    return storage(storageConstants.NOBOX_TOKEN).getString() ?? undefined;
}

export function setAccessToken(token: string) {
    storage(storageConstants.NOBOX_TOKEN).setString(token);
    // Sync with legacy key to ensure getLoggedUserToken() finds it
    storage(storageConstants.NOBOX_CLIENT_TOKEN).setString(token);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(AUTH_TOKEN_REFRESHED_EVENT, { detail: { token } }));
    }
}

export function clearStoredAuthSession() {
    storage(storageConstants.NOBOX_TOKEN).removeItem();
    storage(storageConstants.NOBOX_CLIENT_TOKEN).removeItem();
    storage(storageConstants.LOGGED_USER_DETAILS).removeItem();
}

export function handleSessionExpired() {
    clearStoredAuthSession();
    if (typeof window !== 'undefined') {
        navigateTo(LOGIN_PATH);
    }
}

function normalizeAuthError(data: any) {
    const dataError = data?.error;
    const dataMessage = data?.message;
    const mappedDataMessageError = dataMessage?.error?.join?.('');
    const errorMessage = Array.isArray(dataMessage)
        ? dataMessage
        : Array.isArray(dataError)
            ? dataError[0]
            : dataError;

    return {
        mappedDataMessageError,
        errorMessage,
    };
}

function tokenRevokedInPayload(data: any): boolean {
    if (!data) return false;
    const flat = data.error;
    const nested = data.message?.error;
    const msg = Array.isArray(nested) ? nested[0] : nested;
    return flat === 'Token has been revoked' || msg === 'Token has been revoked';
}

export function isSessionTerminalError(error: AxiosError | { response?: { status?: number; data?: any } }) {
    const response = error?.response;
    const data = response?.data;
    return tokenRevokedInPayload(data)
        || (response?.status === 401 && data?.code === 'TOKEN_STALE');
}

export function isRefreshableAuthError(error: AxiosError | { response?: { status?: number; data?: unknown } }) {
    if (isSessionTerminalError(error)) {
        return false;
    }
    const response = error?.response as { status?: number; data?: unknown } | undefined;
    if (response?.status !== 401) {
        return false;
    }
    const { mappedDataMessageError, errorMessage } = normalizeAuthError(response?.data);
    return mappedDataMessageError === 'Authorization error' || errorMessage === 'Authorization error';
}

/**
 * When POST /auth/_/refresh fails, only clear the session for definitive auth failures.
 * Network errors, timeouts, and 5xx should not force logout — the user can retry when online.
 */
export function shouldLogoutOnRefreshFailure(error: unknown): boolean {
    if (error instanceof Error && error.message === 'Refresh response did not include an access token') {
        return true;
    }
    if (!axios.isAxiosError(error)) {
        return false;
    }
    const status = error.response?.status;
    if (status === undefined || status === 0) {
        return false;
    }
    if (status >= 500) {
        return false;
    }
    if (status === 429 || status === 408) {
        return false;
    }
    return true;
}

function decodeJwtExp(token: string): number | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return null;
        }
        const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(json) as { exp?: number };
        return typeof payload.exp === 'number' ? payload.exp : null;
    } catch {
        return null;
    }
}

const PROACTIVE_REFRESH_WITHIN_SEC = 5 * 60;
const PROACTIVE_CHECK_INTERVAL_MS = 60 * 1000;

let proactiveRefreshTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Periodically refreshes the access token before it expires so API calls do not hit
 * expired JWT first (reduces race conditions and failed first requests after idle tabs).
 */
export function initProactiveAccessTokenRefresh(): void {
    if (typeof window === 'undefined' || proactiveRefreshTimer) {
        return;
    }

    const tick = () => {
        const token = getAccessToken();
        if (!token) {
            return;
        }
        const exp = decodeJwtExp(token);
        if (exp === null) {
            return;
        }
        const msLeft = exp * 1000 - Date.now();
        if (msLeft > PROACTIVE_REFRESH_WITHIN_SEC * 1000) {
            return;
        }
        void refreshAccessToken().catch(() => {
            /* Errors are handled inside refreshAccessToken / shouldLogoutOnRefreshFailure */
        });
    };

    tick();
    proactiveRefreshTimer = setInterval(tick, PROACTIVE_CHECK_INTERVAL_MS);
}

function applyAuthHeaders<T extends AxiosRequestConfig>(config: T, token?: string): T {
    const headers = AxiosHeaders.from(config.headers as any);
    headers.set(REQUESTED_WITH_HEADER, REQUESTED_WITH_VALUE);
    if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    const e2eBypass = getE2eWalletBypassHeaders();
    for (const [key, value] of Object.entries(e2eBypass)) {
        if (!headers.has(key)) {
            headers.set(key, value);
        }
    }
    (config as any).headers = headers;
    (config as any).withCredentials = true;
    return config;
}

export async function refreshAccessToken(): Promise<string> {
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = axios.post(
        `${LINKS.noboxAPIRootUrl}/auth/_/refresh`,
        {},
        {
            withCredentials: true,
            headers: {
                [REQUESTED_WITH_HEADER]: REQUESTED_WITH_VALUE,
            },
        },
    ).then((res) => {
        const token = res.data?.token;
        if (!token) {
            throw new Error('Refresh response did not include an access token');
        }
        setAccessToken(token);
        return token;
    }).catch((error) => {
        if (shouldLogoutOnRefreshFailure(error)) {
            handleSessionExpired();
        }
        throw error;
    }).finally(() => {
        refreshPromise = null;
    });

    return refreshPromise;
}

export const authHttp = axios.create({
    withCredentials: true,
});

authHttp.interceptors.request.use((config) => {
    const token = getAccessToken();
    return applyAuthHeaders(config, token);
});

authHttp.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as RetryableAxiosRequestConfig | undefined;

        if (isSessionTerminalError(error)) {
            handleSessionExpired();
            return Promise.reject(error);
        }

        if (!originalRequest || originalRequest._authRetry || !isRefreshableAuthError(error)) {
            return Promise.reject(error);
        }

        originalRequest._authRetry = true;

        try {
            const token = await refreshAccessToken();
            return authHttp(applyAuthHeaders(originalRequest, token));
        } catch (refreshError) {
            return Promise.reject(refreshError);
        }
    },
);

export async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const token = getAccessToken();
    const headers = new Headers(init.headers || {});
    headers.set(REQUESTED_WITH_HEADER, REQUESTED_WITH_VALUE);
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    const e2eBypass = getE2eWalletBypassHeaders();
    for (const [key, value] of Object.entries(e2eBypass)) {
        if (!headers.has(key)) {
            headers.set(key, value);
        }
    }

    const firstResponse = await fetch(input, {
        ...init,
        headers,
        credentials: 'include',
    });

    if (firstResponse.status !== 401) {
        return firstResponse;
    }

    const refreshedToken = await refreshAccessToken();
    const retryHeaders = new Headers(init.headers || {});
    retryHeaders.set(REQUESTED_WITH_HEADER, REQUESTED_WITH_VALUE);
    retryHeaders.set('Authorization', `Bearer ${refreshedToken}`);
    for (const [key, value] of Object.entries(getE2eWalletBypassHeaders())) {
        if (!retryHeaders.has(key)) {
            retryHeaders.set(key, value);
        }
    }

    return fetch(input, {
        ...init,
        headers: retryHeaders,
        credentials: 'include',
    });
}

export function subscribeToTokenRefresh(callback: () => void) {
    if (typeof window === 'undefined') {
        return () => undefined;
    }

    const listener = () => callback();
    window.addEventListener(AUTH_TOKEN_REFRESHED_EVENT, listener);
    return () => window.removeEventListener(AUTH_TOKEN_REFRESHED_EVENT, listener);
}
