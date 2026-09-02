import { useEffect, useState } from 'react';
import { storageConstants } from '../constants';
import { navigateTo } from '../utils/navigate';
import { storage } from '../utils/store';
import { hasAuthSession, syncAuthSessionCookiesFromStorage } from '../utils/auth-session';
import { getAccessToken, restoreAccessTokenFromStoredSession } from '../api/auth-client';
import {
  DESKTOP_SHELL_ENTRY_QUERY_PARAM,
  isAigeniusDesktopRuntime,
  isDesktopShellFromBuild,
  isLikelyElectronRenderer,
  waitForAigeniusDesktopBridge,
} from '../utils/desktop-runtime';

const DESKTOP_AUTH_ENTRY = `/desktop-login?${DESKTOP_SHELL_ENTRY_QUERY_PARAM}=1`;

const useTokenHandler = () => {
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const resolveAuth = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('token')) {
                if (!cancelled) {
                    setToken('');
                }
                return;
            }

            let noboxToken = storage(storageConstants.NOBOX_CLIENT_TOKEN).getString();
            let accessToken = getAccessToken();

            if (!noboxToken && !hasAuthSession() && !accessToken) {
                const maybeDesktop =
                    isAigeniusDesktopRuntime()
                    || isDesktopShellFromBuild()
                    || isLikelyElectronRenderer();

                if (maybeDesktop) {
                    await waitForAigeniusDesktopBridge(10_000);
                    const restored = await restoreAccessTokenFromStoredSession();
                    if (restored) {
                        syncAuthSessionCookiesFromStorage();
                        noboxToken = storage(storageConstants.NOBOX_CLIENT_TOKEN).getString();
                        accessToken = restored;
                    }
                }
            }

            if (!noboxToken && !hasAuthSession() && !accessToken) {
                const path = window.location.pathname;
                const desktop =
                    isAigeniusDesktopRuntime()
                    || isDesktopShellFromBuild()
                    || isLikelyElectronRenderer();
                const signInUrl =
                  desktop &&
                  path !== '/login' &&
                  path !== '/signup' &&
                  path !== '/desktop-welcome' &&
                  path !== '/desktop-login'
                    ? `${DESKTOP_AUTH_ENTRY}&next=${encodeURIComponent(path + window.location.search)}`
                    : desktop
                      ? DESKTOP_AUTH_ENTRY
                      : '/login';
                navigateTo(signInUrl);
                if (!cancelled) {
                    setToken('');
                }
                return;
            }

            if (!cancelled) {
                setToken(noboxToken || accessToken || 'authenticated');
            }
        };

        void resolveAuth();

        return () => {
            cancelled = true;
        };
    }, []);

    return { token: token ?? '', authChecking: token === null };
};

export default useTokenHandler;
