"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { BotMessageSquare, Mic, Wallet } from "lucide-react";
import { PublicPageShell } from "@/app/components/PublicPageShell";
import { hasAuthSession, syncAuthSessionCookiesFromStorage } from "@/lib/utils/auth-session";
import { resolveAuthenticatedDesktopShellRedirect } from "@/lib/utils/safe-internal-next-path";
import { LINKS } from "@/lib/links";

const DESKTOP_SHELL_ENTRY_QUERY_PARAM = 'desktop';

const TRUST_ITEMS = [
  { icon: BotMessageSquare, label: "Every top model" },
  { icon: Mic, label: "Voice dictation" },
  { icon: Wallet, label: "Pay as you go" },
] as const;

export default function DesktopWelcomePage() {
  const pathname = usePathname();
  const didSessionRedirectRef = useRef(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (!params.has(DESKTOP_SHELL_ENTRY_QUERY_PARAM)) {
        return;
      }
      params.delete(DESKTOP_SHELL_ENTRY_QUERY_PARAM);
      const q = params.toString();
      const path = `${window.location.pathname}${q ? `?${q}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", path);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!hasAuthSession()) {
      return;
    }
    if (didSessionRedirectRef.current) {
      return;
    }
    didSessionRedirectRef.current = true;
    syncAuthSessionCookiesFromStorage();
    const target = resolveAuthenticatedDesktopShellRedirect(
      pathname,
      window.location.search,
    );
    window.location.assign(target);
  }, [pathname]);

  return (
    <PublicPageShell hideHeader showFooter={false} contentClassName="justify-center">
      <div className="content-centered">
        <h1 className="headline">Welcome</h1>
        <p className="subtext">
          Sign in to continue in your desktop workspace.
        </p>

        <div style={{ width: "100%", maxWidth: "320px", marginTop: "1.5rem" }}>
          <button
            type="button"
            onClick={() => {
              window.location.href = LINKS.googleLogin;
            }}
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
            Continue with Google
          </button>
        </div>

        <p className="subtext" style={{ marginTop: "1.5rem", fontSize: "0.875rem" }}>
          <Link
            prefetch
            href={`/desktop-login?${DESKTOP_SHELL_ENTRY_QUERY_PARAM}=1`}
            style={{ color: "#06b6d4", textDecoration: "underline", textUnderlineOffset: "4px" }}
          >
            Full desktop sign-in
          </Link>
          <span style={{ margin: "0 0.5rem" }}>·</span>
          <Link
            prefetch
            href="/login"
            style={{ color: "#a1a1aa", textDecoration: "underline", textUnderlineOffset: "2px" }}
          >
            Web sign-in
          </Link>
        </p>

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