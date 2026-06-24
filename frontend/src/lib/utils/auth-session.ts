import axios from 'axios';
import { storageConstants } from '@/lib/constants';
import { LINKS } from '@/lib/links';
import { storage } from '@/lib/utils/store';

export function clearAuthSession() {
    if (typeof window !== 'undefined') {
        void axios.post(
            `${LINKS.noboxAPIRootUrl}/auth/_/logout`,
            {},
            {
                withCredentials: true,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
            },
        ).catch(() => undefined);
    }
    storage(storageConstants.NOBOX_CLIENT_TOKEN).removeItem();
    storage(storageConstants.NOBOX_TOKEN).removeItem();
    storage(storageConstants.LOGGED_USER_DETAILS).removeItem();
}

export function setAuthSessionTokens(args: { clientToken: string; authToken: string }) {
    const { clientToken, authToken } = args;
    storage(storageConstants.NOBOX_CLIENT_TOKEN).setString(clientToken);
    storage(storageConstants.NOBOX_TOKEN).setString(authToken);
}

export function hasAuthSession(): boolean {
    return Boolean(storage(storageConstants.NOBOX_CLIENT_TOKEN).getString())
        || Boolean(storage(storageConstants.NOBOX_TOKEN).getString());
}

/** Ensures auth keys in localStorage are mirrored to cookies (Next middleware is cookie-only). */
export function syncAuthSessionCookiesFromStorage(): void {
    if (typeof window === "undefined") {
        return;
    }
    const clientToken = storage(storageConstants.NOBOX_CLIENT_TOKEN).getString();
    const token = storage(storageConstants.NOBOX_TOKEN).getString();

    if (clientToken) {
        document.cookie = `nobox_client_token=${clientToken}; path=/; max-age=31536000; SameSite=Lax`;
    }
    if (token) {
        document.cookie = `nobox_token=${token}; path=/; max-age=31536000; SameSite=Lax`;
    }
}
