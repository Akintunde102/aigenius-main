"use client";

import { AUTH_CONFIG } from "@/lib/config/auth";
import {
  buildDevLoginUrl,
  resolveAuthApiRootUrlAsync,
} from "@/lib/utils/resolve-auth-api-root";
import { resolveDevLoginEmail } from "@/app/components/auth/dev-login.utils";

export function DevLoginButton() {
  if (!AUTH_CONFIG.ENABLE_DEV_LOGIN) {
    return null;
  }

  const handleDevLogin = async () => {
    const apiRoot = await resolveAuthApiRootUrlAsync();
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
      window.location.href = `${buildDevLoginUrl(apiRoot)}?email=${encodeURIComponent(email)}`;
    }
  };

  return (
    <button type="button" onClick={handleDevLogin} className="secondary-btn">
      Developer Login (Bypass)
    </button>
  );
}
