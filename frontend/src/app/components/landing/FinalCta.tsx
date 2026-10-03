"use client";

import { useScroll } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import { BUTTON_SIZE, FREE_CREDITS, PRESS } from "./constants";
import { DownloadCta } from "./DownloadCta";
import { useLandingScroll } from "./LandingShell";
import { Magnetic } from "./Magnetic";
import { ParallaxPhoto } from "./ParallaxPhoto";
import type { Platform } from "./platforms";
import { DISPLAY } from "./typography";

interface FinalCtaProps {
  initialPlatform: Platform | null;
}

/** Bookends the hero: the same photo, parallaxing the other way as it scrolls past. */
export function FinalCta({ initialPlatform }: FinalCtaProps) {
  const container = useLandingScroll();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    container: container ?? undefined,
    target: ref,
    offset: ["start end", "end start"],
  });

  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 pt-4">
      <div ref={ref} className="relative isolate overflow-hidden rounded-3xl px-6 py-28 text-center text-white sm:py-40">
        <ParallaxPhoto progress={scrollYProgress} from="-12%" to="12%" />
        <h2
          className={`${DISPLAY} mx-auto max-w-2xl text-[clamp(2.25rem,5.4vw,4rem)] font-normal leading-[1.02] tracking-[-0.035em]`}
        >
          Start with {FREE_CREDITS} free credits.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-lg text-white/85">
          Download the app or open it in your browser. There is no subscription to cancel.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:items-start">
          <DownloadCta initialPlatform={initialPlatform} onImage />
          <Magnetic strength={0.2}>
            <Link
              href="/login"
              className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-white/15 font-medium text-white backdrop-blur-md hover:bg-white/25 ${BUTTON_SIZE.lg} ${PRESS}`}
            >
              Use it on the web
            </Link>
          </Magnetic>
        </div>
      </div>
    </section>
  );
}
