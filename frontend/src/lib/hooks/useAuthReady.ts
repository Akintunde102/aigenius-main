'use client';

import { useEffect, useState } from 'react';
import {
    getValidAccessToken,
    restoreAccessTokenFromStoredSession,
    subscribeToTokenRefresh,
} from '@/lib/api/auth-client';
import { hasAuthSession, syncAuthSessionCookiesFromStorage } from '@/lib/utils/auth-session';
import { canUseDesktopStoredRefreshToken, readDesktopStoredRefreshToken } from '@/lib/utils/desktop-auth-refresh';

/**
 * True once a JWT is present — use to gate React Query / effects that need gateway auth.
 */
export function useAuthReady(): boolean {
    const [ready, setReady] = useState(() =>
        typeof window !== 'undefined' && Boolean(getValidAccessToken()),
    );

    useEffect(() => {
        if (ready) {
            return;
        }

        let cancelled = false;

        const markReady = () => {
            if (getValidAccessToken()) {
                setReady(true);
            }
        };

        const attemptRestore = async () => {
            markReady();
            if (getValidAccessToken()) {
                return;
            }

            const hasSession = hasAuthSession();
            const desktopRefreshToken = canUseDesktopStoredRefreshToken()
                ? await readDesktopStoredRefreshToken()
                : undefined;

            if (!hasSession && !desktopRefreshToken) {
                return;
            }

            const token = await restoreAccessTokenFromStoredSession();
            if (!cancelled && token) {
                syncAuthSessionCookiesFromStorage();
                setReady(true);
            }
        };

        void attemptRestore();
        const unsubscribe = subscribeToTokenRefresh(markReady);
        const pollId = window.setInterval(markReady, 50);

        return () => {
            cancelled = true;
            unsubscribe();
            window.clearInterval(pollId);
        };
    }, [ready]);

    return ready;
}
