"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import { AppPreview } from "./app-preview/AppPreview";
import { BUTTON_SIZE, PRESS } from "./constants";
import { DownloadCta } from "./DownloadCta";
import { useLandingScroll } from "./LandingShell";
import type { Platform } from "./platforms";
import { DISPLAY } from "./typography";
import { useLanguage } from "@/lib/providers/LanguageProvider";

const EASE = [0.23, 1, 0.32, 1] as const;

/**
 * The way Cursor sets its hero: a plain page, a two-line statement, then straight to the two
 * buttons, with the working app underneath. No paragraph, no photo, no floating labels, no
 * pointer effects. Both headline lines use the full text colour so they stay readable.
 */
const HEADLINE_CLASS = `${DISPLAY} text-[clamp(2.5rem,5.5vw,4.5rem)] font-medium leading-[1.04] tracking-[-0.04em] text-lp-fg`;
const HEADLINE_LINES = [
  { key: "landing.headline1", fallback: "One app. Every model." },
  { key: "landing.headline2", fallback: "Your files. Your machine." },
] as const;

interface HeroProps {
  initialPlatform: Platform | null;
}

export function Hero({ initialPlatform }: HeroProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const container = useLandingScroll();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    container: container ?? undefined,
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  /* Scroll parallax only: the copy drifts up and fades, the app rises slightly slower. */
  const copyY = useTransform(scrollYProgress, [0, 0.6], [0, -70]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const appY = useTransform(scrollYProgress, [0, 1], [0, -50]);

  return (
    <section ref={sectionRef} className="relative text-lp-fg">
      <div className="mx-auto max-w-6xl px-5 pt-32 sm:pt-40">
        <motion.div
          style={reduceMotion ? undefined : { y: copyY, opacity: copyOpacity }}
          className="max-w-3xl text-left"
        >
          <h1 className={HEADLINE_CLASS}>
            {HEADLINE_LINES.map((line, index) => (
              <span key={line.key} className="block overflow-hidden pb-[0.1em]">
                <motion.span
                  className="block"
                  initial={reduceMotion ? false : { y: "110%" }}
                  animate={{ y: 0 }}
                  transition={{
                    duration: 0.9,
                    ease: EASE,
                    delay: 0.1 + index * 0.12,
                  }}
                >
                  {t(line.key, line.fallback)}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.4 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-start"
          >
            <div className="[&>div]:items-start">
              <DownloadCta initialPlatform={initialPlatform} />
            </div>
            <Link
              href="/login"
              className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-black/[0.06] font-medium text-lp-fg hover:bg-black/[0.1] dark:bg-white/[0.1] dark:hover:bg-white/[0.15] ${BUTTON_SIZE.lg} ${PRESS}`}
            >
              {t("landing.useOnWeb", "Use it on the web")}
            </Link>
          </motion.div>
        </motion.div>

        {/* The working app, visible without scrolling, straight under the buttons. */}
        <motion.div
          style={reduceMotion ? undefined : { y: appY }}
          className="relative mt-8 pb-24"
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.6 }}
          >
            <AppPreview />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
