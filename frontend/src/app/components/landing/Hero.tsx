"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import Link from "next/link";
import { useRef, type PointerEvent } from "react";
import { AppPreview } from "./app-preview/AppPreview";
import { BUTTON_SIZE, FREE_CREDITS, PRESS } from "./constants";
import { DownloadCta } from "./DownloadCta";
import { useLandingScroll } from "./LandingShell";
import { Magnetic } from "./Magnetic";
import { ParallaxPhoto } from "./ParallaxPhoto";
import type { Platform } from "./platforms";
import { DISPLAY } from "./typography";
import { useLanguage } from "@/lib/providers/LanguageProvider";

const EASE = [0.23, 1, 0.32, 1] as const;
const POINTER_SPRING = { stiffness: 120, damping: 20, mass: 0.6 } as const;
const OFFSCREEN = -400;

/**
 * Compact on purpose: the headline, one line of copy and the buttons take about 450px, so the
 * working app starts inside the first screen and you can see it without scrolling (the Cursor approach).
 * The headline is a statement about what the product does, in two tones: the first line at full
 * strength and the second softer, the way Cursor sets its own.
 */
const HEADLINE_CLASS = `${DISPLAY} text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[1.06] tracking-[-0.04em]`;
const HEADLINE_LINES = [
  {
    key: "landing.headline1",
    fallback: "One app. Every model.",
    className: "",
  },
  {
    key: "landing.headline2",
    fallback: "Your files. Your machine.",
    className: "text-white/60",
  },
] as const;

/** Decorative model chips sit at different depths, so they drift by different amounts with the cursor. */
const CHIPS = [
  {
    id: "claude",
    label: "Claude",
    position: "right-[26%] top-40",
    depth: 38,
    floatDelay: 0,
  },
  {
    id: "gpt",
    label: "GPT",
    position: "right-[6%] top-32",
    depth: 56,
    floatDelay: 0.9,
  },
  {
    id: "gemini",
    label: "Gemini",
    position: "right-[15%] top-60",
    depth: 30,
    floatDelay: 1.7,
  },
] as const;

interface FloatingChipProps {
  label: string;
  position: string;
  depth: number;
  floatDelay: number;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
}

function FloatingChip({
  label,
  position,
  depth,
  floatDelay,
  pointerX,
  pointerY,
}: FloatingChipProps) {
  const reduceMotion = useReducedMotion();
  const x = useTransform(pointerX, [-0.5, 0.5], [-depth, depth]);
  const y = useTransform(pointerY, [-0.5, 0.5], [-depth, depth]);

  return (
    <motion.div
      aria-hidden="true"
      style={reduceMotion ? undefined : { x, y }}
      className={`pointer-events-none absolute hidden lg:block ${position}`}
    >
      <motion.div
        animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
          delay: floatDelay,
        }}
        className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm text-white backdrop-blur-md"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-lp-accent" />
        {label}
      </motion.div>
    </motion.div>
  );
}

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

  /* Pointer position inside the hero, normalised to -0.5..0.5, smoothed by a spring. It only moves
     the photo and the chips behind the app. The app itself never tilts or reacts, so it stays easy to click. */
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, POINTER_SPRING);
  const smoothY = useSpring(pointerY, POINTER_SPRING);
  const spotX = useMotionValue(OFFSCREEN);
  const spotY = useMotionValue(OFFSCREEN);
  const spotlight = useMotionTemplate`radial-gradient(520px circle at ${spotX}px ${spotY}px, rgb(255 255 255 / 0.18), transparent 60%)`;

  /* Scroll parallax: the copy drifts up and fades, the app rises slower, the photo lags behind. */
  const copyY = useTransform(scrollYProgress, [0, 0.6], [0, -70]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const appY = useTransform(scrollYProgress, [0, 1], [0, -50]);

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (reduceMotion || event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    spotX.set(px);
    spotY.set(py);
    pointerX.set(px / rect.width - 0.5);
    pointerY.set(py / rect.height - 0.5);
  };
  const handlePointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
    spotX.set(OFFSCREEN);
    spotY.set(OFFSCREEN);
  };

  return (
    <>
      <section
        ref={sectionRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="relative isolate text-white"
      >
        {/* The photo: its own clipped layer so the app can overhang the section edge. */}
        <div className="absolute inset-0 -z-10">
          <ParallaxPhoto
            progress={scrollYProgress}
            from="0%"
            to="16%"
            mouseX={smoothX}
            mouseY={smoothY}
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/30" />
          {reduceMotion ? null : (
            <motion.div
              aria-hidden="true"
              style={{ background: spotlight }}
              className="pointer-events-none absolute inset-0"
            />
          )}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-lp-bg to-transparent" />
        </div>

        <div className="relative mx-auto max-w-6xl px-5 pt-28 sm:pt-32">
          {CHIPS.map((chip) => (
            <FloatingChip
              key={chip.id}
              {...chip}
              pointerX={smoothX}
              pointerY={smoothY}
            />
          ))}

          <motion.div
            style={
              reduceMotion ? undefined : { y: copyY, opacity: copyOpacity }
            }
            className="max-w-3xl text-left"
          >
            <h1 className={HEADLINE_CLASS}>
              {HEADLINE_LINES.map((line, index) => (
                <span
                  key={line.key}
                  className="block overflow-hidden pb-[0.1em]"
                >
                  <motion.span
                    className={`block ${line.className}`}
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
              transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
            >
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/85">
                {t(
                  "landing.heroSubtitle",
                  "Use Claude, GPT and Gemini from one desktop and web app, with direct access to your files, code and Gmail. Top up a wallet from $1 and pay for each request.",
                )}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-start">
                <Magnetic strength={0.2}>
                  <div className="[&>div]:items-start">
                    <DownloadCta
                      showOtherPlatforms
                      initialPlatform={initialPlatform}
                      onImage
                    />
                  </div>
                </Magnetic>
                <Magnetic strength={0.2}>
                  <Link
                    href="/login"
                    className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-white/15 font-medium text-white backdrop-blur-md hover:bg-white/25 ${BUTTON_SIZE.lg} ${PRESS}`}
                  >
                    {t("landing.useOnWeb", "Use it on the web")}
                  </Link>
                </Magnetic>
              </div>

              <p className="mt-4 text-sm text-white/75">
                {t(
                  "landing.heroCreditsNotice",
                  `${FREE_CREDITS} free credits when you sign up. Top up in USD or NGN when you need more.`,
                  { credits: FREE_CREDITS },
                )}
              </p>
            </motion.div>
          </motion.div>

          {/* The working app, visible without scrolling and straddling the photo and the page. */}
          <motion.div
            style={reduceMotion ? undefined : { y: appY }}
            initial={reduceMotion ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.6 }}
            className="relative -mb-32 mt-10"
          >
            <AppPreview />
          </motion.div>
        </div>
      </section>

      {/* Clears the app overhang. */}
      <div aria-hidden="true" className="h-40" />
    </>
  );
}
