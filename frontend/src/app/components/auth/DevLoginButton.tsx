"use client";

import { AUTH_CONFIG } from "@/lib/config/auth";
import {
  buildDevLoginUrl,
  resolveAuthApiRootUrlAsync,
} from "@/lib/utils/resolve-auth-api-root";
import { resolveDevLoginEmail } from "@/app/components/auth/dev-login.utils";
import { useDesktopAuthFlow } from "@/lib/hooks/use-desktop-auth-flow";

/** Dev-only control. Dashed so it never reads as a real sign-in option. Styling only: the logic below is unchanged. */
const DEV_BUTTON_CLASS =
  "inline-flex h-10 w-full items-center justify-center rounded-full border border-dashed border-lp-line bg-lp-tint px-4 text-xs font-medium text-lp-muted transition-[background-color,color,transform] duration-150 hover:bg-lp-tint-hover hover:text-lp-fg active:scale-[0.97]";

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
    <button type="button" onClick={handleDevLogin} className={DEV_BUTTON_CLASS}>
      Developer Login (Bypass)
    </button>
  );
}