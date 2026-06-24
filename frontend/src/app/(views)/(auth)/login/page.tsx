"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/app/components/ui";
import { GoogleSignIn } from "@/app/components/auth/GoogleSignIn";
import { PublicPageShell } from "@/app/components/PublicPageShell";
import { FOCUS_RING } from "@/app/components/public-page-shell.constants";
import { cn } from "@/lib/utils";
import { useRedirectDesktopFromWebAuthPage } from "@/lib/hooks/use-redirect-desktop-from-web-auth";
import { storage } from "@/lib/utils/store";
import { storageConstants } from "@/lib/constants";

/**
 * Single surface: no gradient hairline wrapper, no inset ring (avoids the “white line” artifact).
 * Solid base overrides shadcn `bg-card` so the light theme token cannot bleed through.
 */
const AUTH_CARD_SURFACE =
  "rounded-2xl border border-zinc-700/45 bg-zinc-950 bg-gradient-to-b from-zinc-900 to-zinc-950 text-zinc-100 shadow-2xl shadow-black/35";

const Login = () => {
  useRedirectDesktopFromWebAuthPage();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const callback = params.get("desktop_callback");
      if (callback) {
        sessionStorage.setItem("desktop_callback", callback);

        // If already logged in, redirect immediately to the callback with the token
        const token = storage(storageConstants.NOBOX_TOKEN).getString()
          || storage(storageConstants.NOBOX_CLIENT_TOKEN).getString();
        if (token) {
          sessionStorage.removeItem("desktop_callback");
          window.location.href = `${callback}${callback.includes('?') ? '&' : '?'}token=${token}`;
        }
      }
    }
  }, []);

  return (
    <PublicPageShell contentClassName="justify-center">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 pb-16 sm:py-16 sm:pb-20 lg:py-20">
        <Card className={cn("border-0", AUTH_CARD_SURFACE)}>
          <CardContent className="space-y-6 p-8 sm:p-10">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Welcome back
              </h1>
              <p className="text-sm text-zinc-400 sm:text-base">
                Sign in to your account to continue
              </p>
            </div>

            <GoogleSignIn
              variant="login"
              className="!h-14 !rounded-xl !text-base !font-medium !border-zinc-500 !bg-white !text-zinc-900 hover:!border-cyan-400 hover:!bg-cyan-50 focus-visible:!ring-2 focus-visible:!ring-cyan-500 focus-visible:!ring-offset-2 focus-visible:!ring-offset-zinc-950"
            />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wide">
                <span className="bg-zinc-950 px-3 text-zinc-500">Secure authentication</span>
              </div>
            </div>

            <div className="space-y-2 text-center text-sm text-zinc-400">
              <p>We use Google&apos;s secure authentication system.</p>
              <p className="text-xs text-zinc-500">
                Your data is protected and never shared with third parties.
              </p>
            </div>

            <p className="text-center text-sm text-zinc-400">
              Don&apos;t have an account?{" "}
              <Link
                prefetch
                href="/signup"
                className={cn(
                  "font-medium text-cyan-300 underline decoration-cyan-500/40 underline-offset-4 hover:text-cyan-200",
                  FOCUS_RING,
                )}
              >
                Sign up
              </Link>
            </p>

            <div className="border-t border-white/10 pt-6 text-center">
              <p className="text-[13px] leading-relaxed text-zinc-500 sm:text-sm">
                <Link
                  prefetch
                  href="/docs/privacy-policy"
                  className={cn(
                    "font-medium text-zinc-300 underline decoration-cyan-500/50 underline-offset-2 hover:text-white",
                    FOCUS_RING,
                  )}
                >
                  Privacy Policy
                </Link>
                <span className="mx-2 text-zinc-600" aria-hidden>
                  ·
                </span>
                <Link
                  prefetch
                  href="/docs/terms-and-conditions"
                  className={cn(
                    "font-medium text-zinc-300 underline decoration-cyan-500/50 underline-offset-2 hover:text-white",
                    FOCUS_RING,
                  )}
                >
                  Terms of Service
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicPageShell>
  );
};

export default Login;
