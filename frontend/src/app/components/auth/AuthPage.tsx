"use client";

import { BotMessageSquare, MonitorDown, Wallet } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { GoogleSignIn } from "@/app/components/auth/GoogleSignIn";
import { ENTER } from "@/app/components/landing/constants";
import { Logo } from "@/app/components/landing/Logo";
import { ThemeToggle } from "@/app/components/landing/ThemeToggle";
import { DISPLAY } from "@/app/components/landing/typography";
import { PublicPageShell } from "@/app/components/PublicPageShell";
import { SIGNUP_BONUS_CREDITS } from "@/lib/credits";

export type AuthPageVariant = "login" | "signup";

const COPY: Record<
  AuthPageVariant,
  {
    title: string;
    subtitle: string;
    swapPrompt: string;
    swapLabel: string;
    swapHref: string;
  }
> = {
  login: {
    title: "Welcome back",
    subtitle: "Sign in to continue to your workspace.",
    swapPrompt: "Don't have an account?",
    swapLabel: "Sign up",
    swapHref: "/signup",
  },
  signup: {
    title: "Create your account",
    subtitle: "Every top AI model in one workspace.",
    swapPrompt: "Already have an account?",
    swapLabel: "Sign in",
    swapHref: "/login",
  },
};

const TRUST_ITEMS = [
  { icon: BotMessageSquare, label: "GPT, Claude, Gemini & more" },
  { icon: Wallet, label: "Pay only for what you use" },
  { icon: MonitorDown, label: "Web & desktop app" },
] as const;

/**
 * Restyles the Google button purely through className, so GoogleSignIn.tsx (and every line of its
 * sign-in logic) stays untouched. The `!` modifiers beat the component's own base classes.
 * Plain stone colours are used instead of bg-lp-fg: in the browser that background was not
 * rendering, which left a bare line of text instead of a button.
 */
const GOOGLE_BUTTON_CLASS =
  "!h-12 !rounded-full !border-0 !bg-stone-900 !text-[15px] !font-medium !text-white dark:!bg-white dark:!text-stone-900 hover:!scale-100 hover:!opacity-90 active:!scale-[0.97]";

const LEGAL_LINK =
  "underline underline-offset-4 transition-colors duration-150 hover:text-lp-fg";

interface TrustListProps {
  onImage?: boolean;
}

/**
 * Plain divs with list roles instead of <ul>/<li>: a global list rule in the project CSS was
 * indenting every list, which pushed these items out of line with the text above them.
 */
function TrustList({ onImage = false }: TrustListProps) {
  return (
    <div
      role="list"
      className={`flex flex-wrap gap-x-6 gap-y-3 text-sm ${onImage ? "text-white/85" : "text-lp-muted"}`}
    >
      {TRUST_ITEMS.map(({ icon: Icon, label }) => (
        <div key={label} role="listitem" className="flex items-center gap-2">
          <Icon
            className={`h-4 w-4 shrink-0 ${onImage ? "text-white/70" : "text-lp-muted"}`}
            aria-hidden
          />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function LegalBlock({ variant }: { variant: AuthPageVariant }) {
  if (variant === "signup") {
    return (
      <p className="mt-6 text-[13px] leading-relaxed text-lp-muted">
        By creating an account, you agree to our{" "}
        <Link prefetch href="/docs/terms-and-conditions" className={LEGAL_LINK}>
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link prefetch href="/docs/privacy-policy" className={LEGAL_LINK}>
          Privacy Policy
        </Link>
        .
      </p>
    );
  }

  return (
    <p className="mt-6 text-[13px] text-lp-muted">
      <Link prefetch href="/docs/privacy-policy" className={LEGAL_LINK}>
        Privacy Policy
      </Link>
      <span className="mx-2" aria-hidden>
        ·
      </span>
      <Link prefetch href="/docs/terms-and-conditions" className={LEGAL_LINK}>
        Terms of Service
      </Link>
    </p>
  );
}

export function AuthPage({ variant }: { variant: AuthPageVariant }) {
  const copy = COPY[variant];

  return (
    <PublicPageShell hideHeader showFooter={false}>
      {/* Flex-1 fills the PublicPageShell main container perfectly. */}
      <div className="flex flex-1 w-full flex-col lg:flex-row">
        {/* Edge-to-edge photo panel on the left half */}
        <div className="hidden lg:flex lg:w-[46%] lg:shrink-0">
          <div className="relative flex-1 overflow-hidden">
            <Image
              src="/images/hero-bg-landscape.jpg"
              alt=""
              fill
              sizes="46vw"
              priority
              className="object-cover dark:brightness-75"
            />
            {/* Subtle dark overlay for text readability */}
            <div className="absolute inset-0 bg-black/30 dark:bg-black/10" />
            
            {/* Vertically centered content */}
            <div className="absolute inset-0 flex flex-col justify-center px-12 lg:px-16 text-white">
              <p
                className={`${DISPLAY} text-[clamp(1.9rem,2.8vw,2.75rem)] font-semibold leading-[1.06] tracking-[-0.04em]`}
              >
                <span className="block">One app. Every model.</span>
                <span className="block text-white/70">
                  Your files. Your machine.
                </span>
              </p>
              <div className="mt-8">
                <TrustList onImage />
              </div>
            </div>
          </div>
        </div>

        <section className="flex flex-1 flex-col">
          {/* Replaces the site header on this page, so nothing sits above the photo panel. */}
          <div className="flex items-center justify-between px-6 py-5">
            <Logo />
            <ThemeToggle />
          </div>

          <div className="flex flex-1 items-center justify-center px-6 py-10">
            <div className={`${ENTER} w-full max-w-[22rem]`}>
              <h1
                className={`${DISPLAY} text-[2.25rem] font-normal leading-[1.05] tracking-[-0.03em]`}
              >
                {copy.title}
              </h1>
              <p className="mt-3 text-base leading-relaxed text-lp-muted">
                {copy.subtitle}
              </p>

              {variant === "signup" ? (
                <div className="mt-6 rounded-2xl bg-black/[0.04] px-4 py-3 text-sm leading-relaxed text-lp-muted dark:bg-white/[0.06]">
                  <span className="font-semibold text-lp-fg">
                    {SIGNUP_BONUS_CREDITS} free credits
                  </span>{" "}
                  land in your wallet when you sign up. No credit card required.
                </div>
              ) : null}

              <div className="mt-8 w-full">
                <GoogleSignIn
                  variant={variant}
                  className={GOOGLE_BUTTON_CLASS}
                />
              </div>

              <p className="mt-5 text-[13px] leading-relaxed text-lp-muted">
                We use Google&apos;s secure authentication system. Your data is
                protected and never shared with third parties.
              </p>

              <p className="mt-8 text-[15px] text-lp-muted">
                {copy.swapPrompt}{" "}
                <Link
                  prefetch
                  href={copy.swapHref}
                  className="font-semibold text-lp-fg underline underline-offset-4 transition-colors duration-150 hover:text-lp-accent"
                >
                  {copy.swapLabel}
                </Link>
              </p>

              <LegalBlock variant={variant} />

              {/* On small screens the photo panel is hidden, so the reassurances move under the form. */}
              <div className="mt-10 lg:hidden">
                <TrustList />
              </div>
            </div>
          </div>

          <p className="px-6 pb-6 text-[13px] text-lp-muted">
            &copy; {new Date().getFullYear()} Nobox Labs Limited
          </p>
        </section>
      </div>
    </PublicPageShell>
  );
}

export default AuthPage;
