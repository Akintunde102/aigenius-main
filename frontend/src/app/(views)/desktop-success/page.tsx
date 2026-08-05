"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BrandLogo } from "@/app/components/BrandLogo";
import { PublicPageShell } from "@/app/components/PublicPageShell";
import { LandingAmbientBackground } from "@/app/components/ui";
import { FOCUS_RING } from "@/app/components/public-page-shell.constants";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const EASE = [0.22, 1, 0.36, 1] as const;

export default function DesktopSuccessPage() {
  const reduce = useReducedMotion();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <PublicPageShell contentClassName="justify-center">
      <div className="relative flex w-full flex-1 flex-col justify-center">
        <LandingAmbientBackground />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={reduce ? undefined : container}
          className="relative mx-auto flex w-full max-w-md flex-col px-4 py-16 sm:py-20"
        >
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-6 rounded-[2rem] bg-gradient-to-r from-emerald-500/[0.14] via-transparent to-cyan-500/[0.12] blur-2xl"
            />

            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950 p-8 text-center shadow-2xl shadow-black/50 sm:p-10">
              <div
                aria-hidden
                className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent"
              />

              <motion.div
                variants={reduce ? undefined : fadeUp}
                transition={{ duration: 0.5, ease: EASE }}
                className="relative flex justify-center"
              >
                <BrandLogo size="compact" asStatic />
              </motion.div>

              <motion.div
                variants={reduce ? undefined : fadeUp}
                transition={{ duration: 0.5, ease: EASE }}
                className="relative mx-auto mt-8 flex h-20 w-20 items-center justify-center"
              >
                {!reduce && (
                  <div
                    aria-hidden
                    className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20"
                  />
                )}
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 shadow-[0_0_40px_-8px_rgba(16,185,129,0.4)]">
                  <CheckCircle2 size={40} aria-hidden />
                </div>
              </motion.div>

              <motion.h1
                variants={reduce ? undefined : fadeUp}
                transition={{ duration: 0.5, ease: EASE }}
                className="relative mt-8 text-2xl font-semibold tracking-tight text-white sm:text-3xl"
              >
                Sign-in successful
              </motion.h1>

              <motion.p
                variants={reduce ? undefined : fadeUp}
                transition={{ duration: 0.5, ease: EASE }}
                className="relative mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base"
              >
                You have successfully authenticated. You can now close this
                browser tab and return to the AIGenius Desktop application.
              </motion.p>

              <motion.div
                variants={reduce ? undefined : fadeUp}
                transition={{ duration: 0.5, ease: EASE }}
                className="relative mt-8 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4"
              >
                <p className="text-[13px] font-medium text-zinc-500">
                  This tab will remain open for your confirmation.
                </p>
              </motion.div>

              <motion.button
                variants={reduce ? undefined : fadeUp}
                transition={{ duration: 0.5, ease: EASE }}
                onClick={() => window.close()}
                className={cn(
                  "relative mt-8 text-sm font-medium text-zinc-500 underline decoration-zinc-700 underline-offset-4 transition hover:text-zinc-300",
                  FOCUS_RING,
                )}
              >
                Close tab manually
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </PublicPageShell>
  );
}
