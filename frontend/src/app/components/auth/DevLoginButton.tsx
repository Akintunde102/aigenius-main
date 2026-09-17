"use client";

import { AUTH_CONFIG } from "@/lib/config/auth";
import {
  buildDevLoginUrl,
  resolveAuthApiRootUrlAsync,
} from "@/lib/utils/resolve-auth-api-root";
import { resolveDevLoginEmail } from "@/app/components/auth/dev-login.utils";
import { useDesktopAuthFlow } from "@/lib/hooks/use-desktop-auth-flow";

export function DevLoginButton() {
  const { finishOAuthToken } = useDesktopAuthFlow();

  if (!AUTH_CONFIG.ENABLE_DEV_LOGIN) {
    return null;
  }

  const handleDevLogin = async () => {
    let promptedEmail: string | null = null;
    try {
      promptedEmail = prompt("Enter email for dev login:", "test@example.com");
    } catch {
      console.warn(
        "prompt() is not supported in this environment, falling back to default dev email.",
      );
    }

    const email = resolveDevLoginEmail(
      promptedEmail,
      typeof window !== "undefined" ? window.location.hostname : "",
    );

    if (email) {
      const bridge = window.aigeniusDesktop;
      if (bridge?.startOAuthSignIn) {
        const res = await bridge.startOAuthSignIn({ provider: 'dev', email });
        // After IPC returns, complete the OAuth session correctly.
        if (res?.token) {
          void finishOAuthToken(res.token);
        }
        return;
      }

      const apiRoot = await resolveAuthApiRootUrlAsync();
      window.location.href = `${buildDevLoginUrl(apiRoot)}?email=${encodeURIComponent(email)}`;
    }
  };

  return (
    <button type="button" onClick={handleDevLogin} className="secondary-btn">
      Developer Login (Bypass)
    </button>
  );
}
