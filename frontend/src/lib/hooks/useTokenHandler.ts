import { useEffect, useState } from 'react';
import { storageConstants } from '../constants';
import { navigateTo } from '../utils/navigate';
import { storage } from '../utils/store';
import { hasAuthSession } from '../utils/auth-session';
import {
  DESKTOP_SHELL_ENTRY_QUERY_PARAM,
  isAigeniusDesktopRuntime,
} from '../utils/desktop-runtime';

const DESKTOP_AUTH_ENTRY = `/desktop-login?${DESKTOP_SHELL_ENTRY_QUERY_PARAM}=1`;

const useTokenHandler = () => {
    const [token, setToken] = useState("");

    useEffect(() => {
        if (!token) {
            const noboxToken = storage(storageConstants.NOBOX_CLIENT_TOKEN).getString();

            if (!noboxToken && !hasAuthSession()) {
                const urlParams = new URLSearchParams(window.location.search);
                const tokenInUrl = urlParams.get("token");

                if (tokenInUrl) {
                    return;
                }

                const desktop = isAigeniusDesktopRuntime();
                const path = window.location.pathname;
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
            }

            setToken(noboxToken || "");
        }

    }, [token]);


    return { token };
};

export default useTokenHandler;
