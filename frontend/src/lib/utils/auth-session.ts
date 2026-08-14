import axios from 'axios';
import { storageConstants } from '@/lib/constants';
import { LINKS } from '@/lib/links';
import { storage } from '@/lib/utils/store';
import { clearChatStorage } from '@/lib/utils/chatStorage';
import {
    isAigeniusDesktopRuntime,
    isDesktopShellFromBuild,
    isLikelyElectronRenderer,
} from '@/lib/utils/desktop-runtime';
import {
    canUseDesktopStoredRefreshToken,
    clearDesktopStoredRefreshToken,
    getDesktopNativeClientHeaders,
    readDesktopStoredRefreshToken,
} from '@/lib/utils/desktop-auth-refresh';

/**
 * Desktop OAuth completes in the system browser; the HttpOnly refresh cookie is never
 * available to the Electron renderer. Web uses cookie-based refresh; desktop uses OS
 * keychain storage via the Electron main process.
 */
export function canUseHttpOnlyRefreshCookie(): boolean {
    if (typeof window === 'undefined') {
        return true;
    }
    return !(
        isDesktopShellFromBuild()
        || isAigeniusDesktopRuntime()
        || isLikelyElectronRenderer()
    );
}

export function clearAuthSession() {
    if (typeof window !== 'undefined') {
        const refreshTokenPromise = canUseDesktopStoredRefreshToken()
            ? readDesktopStoredRefreshToken()
            : Promise.resolve<string | undefined>(undefined);

        void refreshTokenPromise.then((refreshToken) => {
            void axios.post(
                `${LINKS.noboxAPIRootUrl}/auth/_/logout`,
                refreshToken ? { refreshToken } : {},
                {
                    withCredentials: true,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        ...(refreshToken ? getDesktopNativeClientHeaders() : {}),
                    },
                },
            ).catch(() => undefined);
        });

        void clearDesktopStoredRefreshToken().catch(() => undefined);

        // Clear local IndexedDB cached chat logs and workspace state
        void clearChatStorage().catch(err => console.error("Failed to clear chat IndexedDB storage:", err));
        localStorage.removeItem('aigenius-active-code-project-v1');
        localStorage.removeItem('aigenius-active-editor-context-v1');
        localStorage.removeItem('aigenius-conversation-scroll-state-v1');
    }
    storage(storageConstants.NOBOX_CLIENT_TOKEN).removeItem();
    storage(storageConstants.NOBOX_TOKEN).removeItem();
    storage(storageConstants.LOGGED_USER_DETAILS).removeItem();
}

export function setAuthSessionTokens(args: { clientToken: string; authToken: string }) {
    const { clientToken, authToken } = args;
    storage(storageConstants.NOBOX_CLIENT_TOKEN).setString(clientToken);
    storage(storageConstants.NOBOX_TOKEN).setString(authToken);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(
            new CustomEvent('auth:token-refreshed', { detail: { token: authToken } }),
        );
    }
}

export function hasAuthSession(): boolean {
    return Boolean(storage(storageConstants.NOBOX_CLIENT_TOKEN).getString())
        || Boolean(storage(storageConstants.NOBOX_TOKEN).getString());
}

const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function writeAuthCookie(key: string, value: string): void {
    document.cookie =
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}; path=/; max-age=${AUTH_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

/** Ensures auth keys in localStorage are mirrored to cookies (Next middleware is cookie-only). */
export function syncAuthSessionCookiesFromStorage(): void {
    if (typeof window === "undefined") {
        return;
    }
    const clientToken = storage(storageConstants.NOBOX_CLIENT_TOKEN).getString();
    const token = storage(storageConstants.NOBOX_TOKEN).getString();

    if (clientToken) {
        writeAuthCookie(storageConstants.NOBOX_CLIENT_TOKEN, clientToken);
    }
    if (token) {
        writeAuthCookie(storageConstants.NOBOX_TOKEN, token);
    }
}
