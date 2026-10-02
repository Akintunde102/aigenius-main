"use client";

import { useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const TICK_MS = 60;

/**
 * A looping clock for scripted demos. Everything on screen is a pure function of `time`, so
 * there is no timeout choreography to desync. It only runs while the demo is on screen, and
 * for reduced motion it returns the settled end state instead of animating.
 */
export function useLoopClock(loopMs: number, settledMs: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const reduceMotion = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (reduceMotion || !inView) return;
    const id = window.setInterval(() => setElapsed((prev) => (prev + TICK_MS) % loopMs), TICK_MS);
    return () => window.clearInterval(id);
  }, [inView, reduceMotion, loopMs]);

  return { ref, time: reduceMotion ? settledMs : elapsed };
}
