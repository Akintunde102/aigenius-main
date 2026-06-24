import { mockLocalStorage } from "./mock-local-storage";

const AUTH_COOKIE_KEYS = new Set([
    "nobox_client_token",
    "nobox_token",
]);

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const getCookieValue = (key: string): string | null => {
    if (typeof document === "undefined") {
        return null;
    }

    const match = document.cookie
        .split("; ")
        .find((cookie) => cookie.startsWith(`${encodeURIComponent(key)}=`));

    if (!match) {
        return null;
    }

    const [, rawValue = ""] = match.split("=");
    return decodeURIComponent(rawValue);
};

const setCookieValue = (key: string, value: string) => {
    if (typeof document === "undefined") {
        return;
    }

    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
};

const removeCookieValue = (key: string) => {
    if (typeof document === "undefined") {
        return;
    }

    document.cookie = `${encodeURIComponent(key)}=; path=/; max-age=0; samesite=lax`;
};

export const storage = <K extends string, V extends Record<string, any>>(key: K) => {
    const ls = typeof window === "undefined" ? mockLocalStorage : localStorage;
    const syncAuthCookie = AUTH_COOKIE_KEYS.has(String(key));

    return {
        getObject<T>(): T | null {
            const item = ls.getItem(key);
            return item ? JSON.parse(item) : null;
        },
        setObject(value: V) {
            if (value) {
                const item = JSON.stringify(value);
                ls.setItem(key, item);
            }
        },
        setString(value: string) {
            ls.setItem(key, value);
            if (syncAuthCookie) {
                setCookieValue(String(key), value);
            }
        },
        getString() {
            const localValue = ls.getItem(key);

            // Keep document cookies aligned with localStorage for auth keys so Next middleware
            // (cookie-only) agrees with the renderer after multi-window / Electron loads.
            if (syncAuthCookie && localValue) {
                const cookieValue = getCookieValue(String(key));
                if (cookieValue !== localValue) {
                    setCookieValue(String(key), localValue);
                }
            }

            if (localValue) {
                return localValue;
            }

            if (!syncAuthCookie) {
                return localValue;
            }

            const cookieValue = getCookieValue(String(key));
            if (cookieValue) {
                ls.setItem(key, cookieValue);
            }

            return cookieValue;
        },
        removeItem() {
            ls.removeItem(key);
            if (syncAuthCookie) {
                removeCookieValue(String(key));
            }
        }
    }
};
