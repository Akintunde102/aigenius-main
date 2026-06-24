"use client";
import Link from "next/link";
import { Card, CardContent } from "@/app/components/ui";
import { GoogleSignIn } from "@/app/components/auth/GoogleSignIn";
import { PublicPageShell } from "@/app/components/PublicPageShell";
import { FOCUS_RING } from "@/app/components/public-page-shell.constants";
import { cn } from "@/lib/utils";
import { useRedirectDesktopFromWebAuthPage } from "@/lib/hooks/use-redirect-desktop-from-web-auth";

const AUTH_CARD_SURFACE =
  "rounded-2xl border border-zinc-700/45 bg-zinc-950 bg-gradient-to-b from-zinc-900 to-zinc-950 text-zinc-100 shadow-2xl shadow-black/35";

const SignUp = () => {
  useRedirectDesktopFromWebAuthPage();
  return (
    <PublicPageShell contentClassName="justify-center">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 pb-16 sm:py-16 sm:pb-20 lg:py-20">
        <Card className={cn("border-0", AUTH_CARD_SURFACE)}>
          <CardContent className="space-y-6 p-8 sm:p-10">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Create your account
              </h1>
              <p className="text-sm text-zinc-400 sm:text-base">
                Start chatting with AI models today
              </p>
            </div>

            <GoogleSignIn
              variant="signup"
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
              Already have an account?{" "}
              <Link
                prefetch
                href="/login"
                className={cn(
                  "font-medium text-cyan-300 underline decoration-cyan-500/40 underline-offset-4 hover:text-cyan-200",
                  FOCUS_RING,
                )}
              >
                Sign in
              </Link>
            </p>

            <div className="border-t border-white/10 pt-6 text-center">
              <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-zinc-500 sm:text-sm">
                By creating an account, you agree to our{" "}
                <Link
                  prefetch
                  href="/docs/terms-and-conditions"
                  className={cn(
                    "font-medium text-zinc-300 underline decoration-cyan-500/50 underline-offset-2 hover:text-white",
                    FOCUS_RING,
                  )}
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
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
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicPageShell>
  );
};

export default SignUp;
