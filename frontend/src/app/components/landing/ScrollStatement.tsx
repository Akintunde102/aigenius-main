"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";
import { useLandingScroll } from "./LandingShell";
import { DISPLAY } from "./typography";

const STATEMENT =
  "Most AI subscriptions bill you for a month whether you open them or not. AIGenius gives you every frontier model in one workspace, and charges only for the requests you actually send.";
const WORDS = STATEMENT.split(" ");
const DIM_OPACITY = 0.18;

interface WordProps {
  word: string;
  progress: MotionValue<number>;
  range: readonly [number, number];
}

function Word({ word, progress, range }: WordProps) {
  const opacity = useTransform(progress, [range[0], range[1]], [DIM_OPACITY, 1]);
  return (
    <motion.span style={{ opacity }} className="mr-[0.25em] inline-block">
      {word}
    </motion.span>
  );
}

/** Words light up one by one as the paragraph scrolls through the screen. */
export function ScrollStatement() {
  const reduceMotion = useReducedMotion();
  const container = useLandingScroll();
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    container: container ?? undefined,
    target: ref,
    offset: ["start 0.85", "end 0.45"],
  });

  return (
    <section className="mx-auto max-w-5xl px-5 py-28 lg:py-40">
      <p
        ref={ref}
        className={`${DISPLAY} text-[clamp(2rem,4.6vw,3.75rem)] leading-[1.12] tracking-[-0.025em]`}
      >
        <span className="sr-only">{STATEMENT}</span>
        <span aria-hidden="true">
          {reduceMotion
            ? STATEMENT
            : WORDS.map((word, index) => (
                <Word
                  key={`${index}-${word}`}
                  word={word}
                  progress={scrollYProgress}
                  range={[index / WORDS.length, (index + 1) / WORDS.length]}
                />
              ))}
        </span>
      </p>
    </section>
  );
}
