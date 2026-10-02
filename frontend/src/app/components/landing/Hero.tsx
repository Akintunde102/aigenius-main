"use client";

import {
  motion,
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
import { H1 } from "./typography";

const EASE = [0.23, 1, 0.32, 1] as const;
const POINTER_SPRING = { stiffness: 120, damping: 20, mass: 0.6 } as const;
const OFFSCREEN = -400;

const HEADLINE = ["Every frontier model.", "One workspace.", "No subscription."] as const;

/** Floating model chips sit at different depths, so they drift by different amounts with the cursor. */
const CHIPS = [
  { id: "claude", label: "Claude", position: "left-[2%] top-[30%]", depth: 38, floatDelay: 0 },
  { id: "gpt", label: "GPT", position: "right-[3%] top-[22%]", depth: 56, floatDelay: 0.9 },
  { id: "gemini", label: "Gemini", position: "right-[10%] top-[56%]", depth: 30, floatDelay: 1.7 },
  { id: "deepseek", label: "DeepSeek", position: "left-[8%] top-[62%]", depth: 46, floatDelay: 2.4 },
] as const;

interface FloatingChipProps {
  label: string;
  position: string;
  depth: number;
  floatDelay: number;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
}

function FloatingChip({ label, position, depth, floatDelay, pointerX, pointerY }: FloatingChipProps) {
  const reduceMotion = useReducedMotion();
  const x = useTransform(pointerX, [-0.5, 0.5], [-depth, depth]);
  const y = useTransform(pointerY, [-0.5, 0.5], [-depth, depth]);

  return (
    <motion.div
      aria-hidden="true"
      style={reduceMotion ? undefined : { x, y }}
      className={`absolute hidden lg:block ${position}`}
    >
      <motion.div
        animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: floatDelay }}
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
  const reduceMotion = useReducedMotion();
  const container = useLandingScroll();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    container: container ?? undefined,
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  /* Pointer position inside the hero, normalised to -0.5..0.5, smoothed by a spring.
     Only used for floating chips — not the app preview (which is interactive). */
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, POINTER_SPRING);
  const smoothY = useSpring(pointerY, POINTER_SPRING);

  /* Scroll parallax: copy leaves faster and fades, the product rises slower. */
  const copyY = useTransform(scrollYProgress, [0, 0.6], [0, -90]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0]);
  const shotY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (reduceMotion || event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set(event.clientX / rect.width - 0.5);
    pointerY.set(event.clientY / rect.height - 0.5);
  };
  const handlePointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <>
      <section
        ref={sectionRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="relative isolate text-center text-white"
      >
        {/* The photo: its own clipped layer so the app can overhang the section edge. */}
        <div className="absolute inset-0 -z-10">
          <ParallaxPhoto progress={scrollYProgress} from="0%" to="16%" mouseX={smoothX} mouseY={smoothY} priority />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/30" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-lp-bg to-transparent" />
        </div>

        <div className="relative mx-auto max-w-6xl px-5 pt-36 sm:pt-44">
          {CHIPS.map((chip) => (
            <FloatingChip key={chip.id} {...chip} pointerX={smoothX} pointerY={smoothY} />
          ))}

          <motion.div style={reduceMotion ? undefined : { y: copyY, opacity: copyOpacity }}>
            <h1 className={`mx-auto max-w-5xl ${H1}`}>
              {HEADLINE.map((line, index) => (
                <span key={line} className="block overflow-hidden pb-[0.1em]">
                  <motion.span
                    className="block"
                    initial={reduceMotion ? false : { y: "110%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.9, ease: EASE, delay: 0.1 + index * 0.12 }}
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </h1>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.6 }}
            >
              <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-white/85">
                Use Claude, GPT and Gemini from one desktop and web app, with direct access to your
                files, code and Gmail. Top up a wallet from $1 and pay for each request.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:items-start">
                <DownloadCta showOtherPlatforms initialPlatform={initialPlatform} onImage />
                <Magnetic strength={0.2}>
                  <Link
                    href="/login"
                    className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-white/15 font-medium text-white backdrop-blur-md hover:bg-white/25 ${BUTTON_SIZE.lg} ${PRESS}`}
                  >
                    Use it on the web
                  </Link>
                </Magnetic>
              </div>

              <p className="mt-6 text-sm text-white/75">
                {FREE_CREDITS} free credits when you sign up. Top up in USD or NGN when you need more.
              </p>
            </motion.div>
          </motion.div>

          {/* The app itself — interactive, straddling the photo and the page. */}
          <motion.div
            style={reduceMotion ? undefined : { y: shotY }}
            initial={reduceMotion ? false : { opacity: 0, y: 60 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.8 }}
            className="relative -mb-32 mt-14"
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
