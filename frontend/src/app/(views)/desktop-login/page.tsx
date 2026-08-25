"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { BotMessageSquare, Mic, Wallet } from "lucide-react";
import { BrandLogo } from "@/app/components/BrandLogo";
import { DesktopAuthFlowPhase } from "@/app/components/auth/GoogleSignIn";
import { PublicPageShell } from "@/app/components/PublicPageShell";
import { completeDesktopOAuthSession } from "@/lib/utils/complete-desktop-oauth-session";
import { getStoredUserDetailsSnapshot } from "@/lib/calls/get-logged-user-details";
import { syncAuthSessionCookiesFromStorage } from "@/lib/utils/auth-session";
import { resolveAuthenticatedDesktopShellRedirect } from "@/lib/utils/safe-internal-next-path";

const TRUST_ITEMS = [
  { icon: BotMessageSquare, label: "Every top model" },
  { icon: Mic, label: "Voice dictation" },
  { icon: Wallet, label: "Pay as you go" },
] as const;

export default function DesktopLoginPage() {
  const pathname = usePathname();
  const [storedFirstName, setStoredFirstName] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authFlow, setAuthFlow] = useState<DesktopAuthFlowPhase>("idle");

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
    setAuthFlow("awaiting-browser");
    const res = await window.aigeniusDesktop.startWebSignIn();
    if (!res?.token) {
      setAuthFlow("idle");
      setAuthError("Browser sign-in did not complete. Finish sign-in in your browser, then try again.");
      return;
    }
    setAuthFlow("completing");
    const ok = await completeDesktopOAuthSession(res.token);
    if (!ok) {
      setAuthFlow("idle");
      setAuthError("Sign-in succeeded in the browser but the desktop app could not start your session. Check that the API is running and try again.");
      return;
    }
    syncAuthSessionCookiesFromStorage();
    const target = resolveAuthenticatedDesktopShellRedirect(pathname, window.location.search);
    window.location.replace(target);
  };

  return (
    <PublicPageShell hideHeader showFooter={false} contentClassName="justify-center">
      <div className="content-centered">
        <h1 className="headline">Welcome back</h1>
        <p className="subtext">
          {storedFirstName ? `Sign in as ${storedFirstName}` : "Sign in to your desktop workspace"}
        </p>

        <div style={{ width: "100%", maxWidth: "320px", marginTop: "1.5rem" }}>
          {authFlow === "awaiting-browser" || authFlow === "completing" ? (
            <div style={{ padding: "1rem", textAlign: "center", fontSize: "0.875rem", color: "#71717a" }}>
              Please complete sign in within your browser...
            </div>
          ) : (
            <button
              type="button"
              onClick={handleBrowserSignIn}
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
                cursor: "pointer",
                border: "none",
                transition: "background 0.1s ease"
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#e5e5e0")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#f5f5f0")}
            >
              Sign in with Browser
            </button>
          )}

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
