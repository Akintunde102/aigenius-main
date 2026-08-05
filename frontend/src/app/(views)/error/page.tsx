"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { PublicPageShell } from "@/app/components/PublicPageShell";
import { LandingAmbientBackground } from "@/app/components/ui";
import { FOCUS_RING } from "@/app/components/public-page-shell.constants";
import { cn } from "@/lib/utils";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const EASE = [0.22, 1, 0.36, 1] as const;

const ErrorPage = () => {
  const reduce = useReducedMotion();

  return (
    <PublicPageShell contentClassName="justify-center">
      <div className="relative flex w-full flex-1 flex-col justify-center">
        <LandingAmbientBackground />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={reduce ? undefined : container}
          className="relative mx-auto flex w-full max-w-md flex-col px-4 py-24"
        >
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-6 rounded-[2rem] bg-gradient-to-r from-cyan-500/[0.12] via-transparent to-emerald-500/[0.12] blur-2xl"
            />

            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950 p-8 text-center shadow-2xl shadow-black/50 sm:p-10">
              <div
                aria-hidden
                className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent"
              />

              <motion.div
                variants={reduce ? undefined : fadeUp}
                transition={{ duration: 0.5, ease: EASE }}
                className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/[0.08] text-amber-300"
              >
                <AlertTriangle className="h-6 w-6" aria-hidden />
              </motion.div>

              <motion.h1
                variants={reduce ? undefined : fadeUp}
                transition={{ duration: 0.5, ease: EASE }}
                className="relative mt-6 text-2xl font-semibold tracking-tight text-white sm:text-3xl"
              >
                Something went wrong
              </motion.h1>

              <motion.p
                variants={reduce ? undefined : fadeUp}
                transition={{ duration: 0.5, ease: EASE }}
                className="relative mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base"
              >
                An unexpected error occurred. Please try again, or head back to
                the home page.
              </motion.p>

              <motion.div
                variants={reduce ? undefined : fadeUp}
                transition={{ duration: 0.5, ease: EASE }}
                className="relative mt-8"
              >
                <Link
                  href="/"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-zinc-900 shadow-lg shadow-cyan-950/40 transition hover:bg-zinc-100 active:scale-[0.99]",
                    FOCUS_RING,
                  )}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Go back to the home page
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </PublicPageShell>
  );
};

export default ErrorPage;
