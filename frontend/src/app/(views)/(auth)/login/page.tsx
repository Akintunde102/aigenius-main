"use client";
import { useEffect } from "react";
import { AuthPage } from "@/app/components/auth/AuthPage";
import { useRedirectDesktopFromWebAuthPage } from "@/lib/hooks/use-redirect-desktop-from-web-auth";
import { storage } from "@/lib/utils/store";
import { storageConstants } from "@/lib/constants";
import {
  clearDesktopHandoffSession,
  resolveDesktopGoogleOAuthUrl,
  shouldPersistDesktopApiRoot,
  storeDesktopApiRoot,
  storeDesktopHandoffSession,
} from "@/lib/utils/desktop-google-auth-url";
import { parseLoginDesktopHandoffSearch } from "@/lib/utils/desktop-oauth-handoff";
import { resolveAuthApiRootUrl } from "@/lib/utils/resolve-auth-api-root";

const Login = () => {
  useRedirectDesktopFromWebAuthPage();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const parsed = parseLoginDesktopHandoffSearch(window.location.search);

      if (parsed.kind === 'desktop') {
        const { callback, pkceChallenge, apiRoot, autoGoogle } = parsed.handoff;
        storeDesktopHandoffSession({ callback, pkceChallenge });
        if (apiRoot && shouldPersistDesktopApiRoot(apiRoot)) {
          storeDesktopApiRoot(apiRoot);
        }

        if (autoGoogle) {
          window.location.href = resolveDesktopGoogleOAuthUrl(callback, resolveAuthApiRootUrl(), pkceChallenge);
          return;
        }

        // If already logged in, request a desktop handoff code so the desktop gets both an access and refresh token.
        const token = storage(storageConstants.NOBOX_TOKEN).getString();
        if (token) {
          clearDesktopHandoffSession();
          const authApiRoot = resolveAuthApiRootUrl();

          let retryCount = 0;
          const attemptHandoff = () => {
             fetch(`${authApiRoot}/auth/_/desktop/handoff-code`, {
               method: 'POST',
               headers: {
                 'Authorization': `Bearer ${token}`,
                 'Content-Type': 'application/json'
               },
               body: JSON.stringify(pkceChallenge ? { pkceChallenge } : {})
             })
             .then(async (res) => {
                if (res.status >= 400 && res.status < 500) {
                   // Irrecoverable auth error
                   window.location.href = resolveDesktopGoogleOAuthUrl(callback, authApiRoot, pkceChallenge);
                   return;
                }
                if (!res.ok) {
                   throw new Error('Network or 5xx error');
                }
                const data = await res.json();
                if (data?.code) {
                   window.location.href = `${callback}${callback.includes('?') ? '&' : '?'}code=${data.code}`;
                } else {
                   throw new Error('No code returned');
                }
             })
             .catch(() => {
                retryCount++;
                if (retryCount < 3) {
                   setTimeout(attemptHandoff, 1000);
                } else {
                   // Exhausted retries, fallback to browser auth
                   window.location.href = resolveDesktopGoogleOAuthUrl(callback, authApiRoot, pkceChallenge);
                }
             });
          };

          attemptHandoff();
          return;
        }
      } else {
        // Plain web sign-in — drop any leftover desktop handoff from a prior session.
        clearDesktopHandoffSession();
      }
    }
  }, []);

  return <AuthPage variant="login" />;
};

export default Login;
