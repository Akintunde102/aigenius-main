"use client";

import { useEffect, useState } from "react";
import { BotMessageSquare, Mic, Wallet } from "lucide-react";
import { GoogleSignIn } from "@/app/components/auth/GoogleSignIn";
import { PublicPageShell } from "@/app/components/PublicPageShell";
import { DesktopSessionRestoringView } from "@/app/components/DesktopSessionRestoringView";
import { getStoredUserDetailsSnapshot } from "@/lib/calls/get-logged-user-details";
import { useDesktopAuthFlow } from "@/lib/hooks/use-desktop-auth-flow";

const TRUST_ITEMS = [
  { icon: BotMessageSquare, label: "Every top model" },
  { icon: Mic, label: "Voice dictation" },
  { icon: Wallet, label: "Pay as you go" },
] as const;

export default function DesktopLoginPage() {
  const [storedFirstName, setStoredFirstName] = useState<string | null>(null);
  const {
    authFlow,
    authError,
    setAuthError,
    setAuthFlowWithPersist,
    finishOAuthToken,
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
    if (!window.aigeniusDesktop?.startWebSignIn) return;
    setAuthError(null);
    setAuthFlowWithPersist("awaiting-browser");
    const res = await window.aigeniusDesktop.startWebSignIn();
    if (!res?.token) {
      setAuthFlowWithPersist("idle");
      setAuthError("Browser sign-in did not complete. Finish sign-in in your browser, then try again.");
      return;
    }
    await finishOAuthToken(res.token);
  };

  const authLoading = authFlow !== "idle";

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
            <GoogleSignIn
              variant="login"
              onDesktopAuthFlowChange={setAuthFlowWithPersist}
              onDesktopOAuthToken={finishOAuthToken}
            />
            <button
              type="button"
              onClick={handleBrowserSignIn}
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
              Sign in with Browser
            </button>
          </div>

          {authLoading ? (
            <DesktopSessionRestoringView
              message={
                authFlow === "completing"
                  ? "Signing you in…"
                  : "Complete sign-in in your browser"
              }
              detail={
                authFlow === "completing"
                  ? "Setting up your workspace…"
                  : "Return here when you are done — we will finish automatically."
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
