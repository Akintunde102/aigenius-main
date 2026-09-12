"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BotMessageSquare, FolderOpen, Wallet } from "lucide-react";
import { DevLoginButton } from "@/app/components/auth/DevLoginButton";
import { PublicPageShell } from "@/app/components/PublicPageShell";
import { DesktopSessionRestoringView } from "@/app/components/DesktopSessionRestoringView";
import { getStoredUserDetailsSnapshot } from "@/lib/calls/get-logged-user-details";
import { readDesktopAuthFlowPhase } from "@/lib/utils/desktop-auth-flow-storage";
import { resolveDesktopShellGoogleSignIn } from "@/lib/utils/desktop-google-signin";
import { useDesktopAuthFlow } from "@/lib/hooks/use-desktop-auth-flow";
import { useDesktopSessionRestore } from "@/lib/hooks/use-desktop-session-restore";

const TRUST_ITEMS = [
  { icon: BotMessageSquare, label: "Every top model" },
  { icon: FolderOpen, label: "Local files" },
  { icon: Wallet, label: "Pay as you go" },
] as const;

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

  const handleGoogleSignIn = async () => {
    const startSignIn = resolveDesktopShellGoogleSignIn(window.aigeniusDesktop);
    if (!startSignIn) return;
    setAuthError(null);
    setAuthFlowWithPersist("awaiting-browser");
    const res = await startSignIn();
    if (!res?.token) {
      if (readDesktopAuthFlowPhase() !== "idle") {
        setAuthFlowWithPersist("idle");
        setAuthError("Google sign-in did not complete. Finish signing in with Google in your browser, then try again.");
      }
      return;
    }
    await finishOAuthToken(res.token);
  };

  const authLoading = authFlow !== "idle" || restoringSession;

  if (restoringSession) {
    return (
      <PublicPageShell hideHeader showFooter={false} contentClassName="justify-center">
        <DesktopSessionRestoringView />
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell hideHeader showFooter={false} contentClassName="justify-center">
      <div className="content-centered">
        <h1 className="headline">Welcome back</h1>
        <p className="subtext">
          {storedFirstName ? `Sign in as ${storedFirstName}` : "Sign in to your desktop workspace"}
        </p>

        <div style={{ width: "100%", maxWidth: "320px", marginTop: "1.5rem", position: "relative" }}>
          <div
            className="flex flex-col gap-3"
            style={
              authLoading
                ? { position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }
                : undefined
            }
            aria-hidden={authLoading}
          >
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              style={{
                display: "flex",
                width: "100%",
                height: "3rem",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
                borderRadius: "0.75rem",
                background: "#f5f5f0",
                color: "#0e0d0c",
                fontWeight: 600,
                fontSize: "0.9375rem",
                cursor: authLoading ? "default" : "pointer",
                border: "none",
                transition: "background 0.1s ease"
              }}
              onMouseOver={(e) => {
                if (!authLoading) e.currentTarget.style.background = "#e5e5e0";
              }}
              onMouseOut={(e) => {
                if (!authLoading) e.currentTarget.style.background = "#f5f5f0";
              }}
            >
              <Image
                src="/assets/google-icon.svg"
                alt=""
                width={20}
                height={20}
                unoptimized
              />
              Sign in with Google
            </button>
            <DevLoginButton />
          </div>

          {authLoading ? (
            <DesktopSessionRestoringView
              message={
                authFlow === "completing"
                  ? "Signing you in…"
                  : "Complete Google sign-in in your browser"
              }
              detail={
                authFlow === "completing"
                  ? "Setting up your workspace…"
                  : "Return here when you are done — we will finish automatically."
              }
              action={
                authFlow === "awaiting-browser" ? (
                  <button
                    type="button"
                    onClick={cancelBrowserSignIn}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#71717a",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      textDecoration: "underline",
                      textUnderlineOffset: "0.2em",
                    }}
                  >
                    Cancel and start over
                  </button>
                ) : undefined
              }
            />
          ) : null}

          {authError && (
            <div style={{ marginTop: "1rem", fontSize: "0.875rem", color: "#f43f5e", textAlign: "center" }}>
              {authError}
            </div>
          )}
        </div>

        <ul style={{
          marginTop: "3.5rem",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "1.5rem",
          listStyle: "none",
          fontSize: "0.75rem",
          color: "#71717a"
        }}>
          {TRUST_ITEMS.map(({ icon: Icon, label }) => (
            <li key={label} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Icon style={{ width: "1rem", height: "1rem", color: "#52525b" }} aria-hidden />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </PublicPageShell>
  );
}
