"use client";

import { useEffect, useState } from "react";
import { DevLoginButton } from "@/app/components/auth/DevLoginButton";
import {
  DESKTOP_PRIMARY_BUTTON,
  DesktopAuthFrame,
  DesktopAuthHeading,
  DesktopTrustRow,
} from "@/app/components/auth/DesktopAuthFrame";
import { PublicPageShell } from "@/app/components/PublicPageShell";
import { DesktopSessionRestoringView } from "@/app/components/DesktopSessionRestoringView";
import { getStoredUserDetailsSnapshot } from "@/lib/calls/get-logged-user-details";
import { readDesktopAuthFlowPhase } from "@/lib/utils/desktop-auth-flow-storage";
import { useDesktopAuthFlow } from "@/lib/hooks/use-desktop-auth-flow";
import { useDesktopSessionRestore } from "@/lib/hooks/use-desktop-session-restore";

export default function DesktopLoginPage() {
  const { restoring: restoringSession } = useDesktopSessionRestore();
  const [storedFirstName, setStoredFirstName] = useState<string | null>(null);
  const {
    authFlow,
    authError,
    setAuthError,
    setAuthFlowWithPersist,
    finishOAuthToken,
    cancelBrowserSignIn,
  } = useDesktopAuthFlow();

  useEffect(() => {
    try {
      const snap = getStoredUserDetailsSnapshot<Record<string, unknown>>();
      const raw = snap?.firstName;
      if (typeof raw === "string" && raw.trim().length > 0) {
        setStoredFirstName(raw.trim());
      }
    } catch {
      // ignore
    }
  }, []);

  const handleBrowserSignIn = async () => {
    const bridge = window.aigeniusDesktop;
    if (!bridge?.startOAuthSignIn && !bridge?.startWebSignIn) return;

    setAuthError(null);
    setAuthFlowWithPersist("awaiting-browser");

    // Prefer direct Google OAuth with PKCE from the main process. The legacy web-signin
    // path depends on the hosted login page forwarding pkce_challenge to the API.
    const res = bridge.startOAuthSignIn
      ? await bridge.startOAuthSignIn({ provider: "google" })
      : await bridge.startWebSignIn!();

    if (!res?.token) {
      if (readDesktopAuthFlowPhase() !== "idle") {
        setAuthFlowWithPersist("idle");
        setAuthError("Google sign-in did not complete. Finish sign-in in your browser, then try again.");
      }
      return;
    }
    await finishOAuthToken(res.token);
  };

  const authLoading = authFlow !== "idle" || restoringSession;

  if (restoringSession) {
    return (
      <PublicPageShell hideHeader showFooter={false} contentClassName="items-center justify-center">
        <DesktopSessionRestoringView />
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell hideHeader showFooter={false} contentClassName="items-center justify-center">
      <DesktopAuthFrame>
        <DesktopAuthHeading
          title="Welcome back"
          subtitle={storedFirstName ? `Sign in as ${storedFirstName}` : "Sign in to your desktop workspace"}
        />

        <div
          className={`relative mt-8 w-full ${authLoading ? "max-w-md" : "max-w-xs"}`}
        >
          {/* Stays mounted but invisible while sign-in runs, exactly as before. */}
          <div
            className={`flex flex-col gap-3 ${authLoading ? "pointer-events-none absolute h-px w-px overflow-hidden opacity-0" : ""
              }`}
            aria-hidden={authLoading}
          >
            <button
              type="button"
              onClick={handleBrowserSignIn}
              disabled={authLoading}
              className={DESKTOP_PRIMARY_BUTTON}
            >
              Sign in with Google
            </button>
            <DevLoginButton />
          </div>

          {authLoading ? (
            <DesktopSessionRestoringView
              message={authFlow === "completing" ? "Signing you in…" : "Complete sign-in in your browser"}
              detail={
                authFlow === "completing"
                  ? "Setting up your workspace…"
                  : "Return here when you are done and we will finish automatically."
              }
              action={
                authFlow === "awaiting-browser" ? (
                  <button
                    type="button"
                    onClick={cancelBrowserSignIn}
                    className="text-sm font-medium text-lp-muted underline underline-offset-4 transition-colors duration-150 hover:text-lp-fg"
                  >
                    Cancel and start over
                  </button>
                ) : undefined
              }
            />
          ) : null}

          {authError && (
            <div role="alert" className="mt-4 text-center text-sm text-rose-500">
              {authError}
            </div>
          )}
        </div>

        <DesktopTrustRow />
      </DesktopAuthFrame>
    </PublicPageShell>
  );
}