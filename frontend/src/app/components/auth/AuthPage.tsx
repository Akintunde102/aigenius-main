"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { BotMessageSquare, MonitorDown, Wallet } from "lucide-react";
import { GoogleSignIn } from "@/app/components/auth/GoogleSignIn";
import { BrandLogo } from "@/app/components/BrandLogo";
import { PublicPageShell } from "@/app/components/PublicPageShell";
import { LandingAmbientBackground } from "@/app/components/ui";
import { FOCUS_RING } from "@/app/components/public-page-shell.constants";
import { cn } from "@/lib/utils";
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
    subtitle: "Sign in to continue to your workspace",
    swapPrompt: "Don't have an account?",
    swapLabel: "Sign up",
    swapHref: "/signup",
  },
  signup: {
    title: "Create your account",
    subtitle: `Start with ${SIGNUP_BONUS_CREDITS} free credits — every top AI model in one workspace`,
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

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const EASE = [0.22, 1, 0.36, 1] as const;

function LegalBlock({ variant }: { variant: AuthPageVariant }) {
  const linkClass = cn(
    "font-medium text-zinc-300 underline decoration-cyan-500/50 underline-offset-2 transition hover:text-white",
    FOCUS_RING,
  );

  if (variant === "signup") {
    return (
      <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-zinc-500 sm:text-sm">
        By creating an account, you agree to our{" "}
        <Link prefetch href="/docs/terms-and-conditions" className={linkClass}>
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link prefetch href="/docs/privacy-policy" className={linkClass}>
          Privacy Policy
        </Link>
        .
      </p>
    );
  }

  return (
    <p className="text-[13px] leading-relaxed text-zinc-500 sm:text-sm">
      <Link prefetch href="/docs/privacy-policy" className={linkClass}>
        Privacy Policy
      </Link>
      <span className="mx-2 text-zinc-600" aria-hidden>
        ·
      </span>
      <Link prefetch href="/docs/terms-and-conditions" className={linkClass}>
        Terms of Service
      </Link>
    </p>
  );
}

/**
 * Shared surface for /login and /signup: same dark, ambient aesthetic as the
 * landing page — animated background, staggered entrance, glowing gradient card.
 */
export function AuthPage({ variant }: { variant: AuthPageVariant }) {
  const reduce = useReducedMotion();
  const copy = COPY[variant];

  return (
    <PublicPageShell contentClassName="justify-center">
      <div className="relative flex w-full flex-1 flex-col justify-center">
        <LandingAmbientBackground />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={reduce ? undefined : container}
          className="relative mx-auto flex w-full max-w-md flex-col px-4 py-12 sm:py-16"
        >
          {/* Card with ambient glow */}
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-6 rounded-[2rem] bg-gradient-to-r from-cyan-500/[0.12] via-transparent to-emerald-500/[0.12] blur-2xl"
            />

            <motion.div
              variants={reduce ? undefined : fadeUp}
              transition={{ duration: 0.55, ease: EASE }}
              className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950 shadow-2xl shadow-black/50"
            >
              {/* Gradient hairline */}
              <div
                aria-hidden
                className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent"
              />
              {/* Soft inner wash */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent"
              />

              <div className="relative space-y-6 p-8 sm:p-10">
                <motion.div
                  variants={reduce ? undefined : fadeUp}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="flex justify-center"
                >
                  <BrandLogo asStatic size="default" />
                </motion.div>

                <motion.div
                  variants={reduce ? undefined : fadeUp}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="space-y-2 text-center"
                >
                  <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    {copy.title}
                  </h1>
                  <p className="text-sm text-zinc-400 sm:text-base">{copy.subtitle}</p>
                </motion.div>

                {variant === "signup" ? (
                  <motion.div
                    variants={reduce ? undefined : fadeUp}
                    transition={{ duration: 0.5, ease: EASE }}
                    className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-3 text-center text-sm leading-relaxed text-cyan-100/90"
                  >
                    <span className="font-semibold text-cyan-200">
                      {SIGNUP_BONUS_CREDITS} free credits
                    </span>{" "}
                    land in your wallet when you sign up — no credit card required.
                  </motion.div>
                ) : null}

                <motion.div
                  variants={reduce ? undefined : fadeUp}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <GoogleSignIn
                    variant={variant}
                    className="!h-12 !rounded-xl !text-[15px] !font-semibold !border-zinc-500 !bg-white !text-zinc-900 !shadow-lg !shadow-cyan-950/30 hover:!bg-zinc-100 focus-visible:!ring-2 focus-visible:!ring-cyan-500 focus-visible:!ring-offset-2 focus-visible:!ring-offset-zinc-950"
                  />
                </motion.div>

                <motion.div
                  variants={reduce ? undefined : fadeUp}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="relative"
                >
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/[0.08]" />
                  </div>
                  <div className="relative flex justify-center text-[11px] uppercase tracking-[0.14em]">
                    <span className="bg-zinc-950 px-3 text-zinc-500">Secure authentication</span>
                  </div>
                </motion.div>

                <motion.p
                  variants={reduce ? undefined : fadeUp}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="text-center text-xs leading-relaxed text-zinc-500"
                >
                  We use Google&apos;s secure authentication system.
                  <br />
                  Your data is protected and never shared with third parties.
                </motion.p>

                <motion.p
                  variants={reduce ? undefined : fadeUp}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="text-center text-sm text-zinc-400"
                >
                  {copy.swapPrompt}{" "}
                  <Link
                    prefetch
                    href={copy.swapHref}
                    className={cn(
                      "font-medium text-cyan-300 underline decoration-cyan-500/40 underline-offset-4 transition hover:text-cyan-200",
                      FOCUS_RING,
                    )}
                  >
                    {copy.swapLabel}
                  </Link>
                </motion.p>

                <motion.div
                  variants={reduce ? undefined : fadeUp}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="border-t border-white/[0.08] pt-6 text-center"
                >
                  <LegalBlock variant={variant} />
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Trust row */}
          <motion.ul
            variants={reduce ? undefined : fadeUp}
            transition={{ duration: 0.5, ease: EASE }}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-500"
          >
            {TRUST_ITEMS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-cyan-400/70" aria-hidden />
                <span>{label}</span>
              </li>
            ))}
          </motion.ul>
        </motion.div>
      </div>
    </PublicPageShell>
  );
}

export default AuthPage;
