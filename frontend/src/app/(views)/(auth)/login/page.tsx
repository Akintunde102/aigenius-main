"use client";
import { useLayoutEffect, useState } from "react";
import { AuthPage } from "@/app/components/auth/AuthPage";
import { DesktopSessionRestoringView } from "@/app/components/DesktopSessionRestoringView";
import { PublicPageShell } from "@/app/components/PublicPageShell";
import { useRedirectDesktopFromWebAuthPage } from "@/lib/hooks/use-redirect-desktop-from-web-auth";
import {
  clearDesktopHandoffSession,
  resolveDesktopGoogleOAuthUrl,
  shouldPersistDesktopApiRoot,
  storeDesktopApiRoot,
  storeDesktopHandoffSession,
} from "@/lib/utils/desktop-google-auth-url";
import {
  parseLoginDesktopHandoffSearch,
  shouldAutoStartDesktopGoogleOAuth,
} from "@/lib/utils/desktop-oauth-handoff";
import { resolveAuthApiRootUrl } from "@/lib/utils/resolve-auth-api-root";

const Login = () => {
  useRedirectDesktopFromWebAuthPage();
  const [desktopGoogleRedirecting, setDesktopGoogleRedirecting] = useState(false);

  useLayoutEffect(() => {
    if (!shouldAutoStartDesktopGoogleOAuth(window.location.search)) {
      clearDesktopHandoffSession();
      return;
    }

    const parsed = parseLoginDesktopHandoffSearch(window.location.search);
    if (parsed.kind !== "desktop") {
      clearDesktopHandoffSession();
      return;
    }

    const { callback, pkceChallenge, apiRoot } = parsed.handoff;
    storeDesktopHandoffSession({ callback, pkceChallenge });
    if (apiRoot && shouldPersistDesktopApiRoot(apiRoot)) {
      storeDesktopApiRoot(apiRoot);
    }

    setDesktopGoogleRedirecting(true);
    window.location.href = resolveDesktopGoogleOAuthUrl(
      callback,
      resolveAuthApiRootUrl(),
      pkceChallenge,
    );
  }, []);

  if (desktopGoogleRedirecting) {
    return (
      <PublicPageShell hideHeader showFooter={false} contentClassName="justify-center">
        <DesktopSessionRestoringView
          message="Opening Google sign-in…"
          detail="Choose the Google account for the desktop app. This tab will finish automatically."
        />
      </PublicPageShell>
    );
  }

  return <AuthPage variant="login" />;
};

export default Login;
