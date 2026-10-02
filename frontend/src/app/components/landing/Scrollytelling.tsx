"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useRef, useState, type ReactNode } from "react";
import { CheckIcon } from "./icons";
import { useLandingScroll } from "./LandingShell";
import { Reveal } from "./Reveal";
import { H2, TITLE_SM } from "./typography";
import { useMediaQuery } from "./useMediaQuery";

const EASE = [0.23, 1, 0.32, 1] as const;

/**
 * Pinned layout maths. The section is 440vh tall and the stage is 100vh, so the pinned scroll
 * distance is 340vh, which is exactly 4 segments of 85vh. Anchors sit at the segment starts so
 * the header links (#models and so on) land on the right slide. Change all three together.
 */
const PIN_HEIGHT = "h-[440vh]";
const ANCHOR_TOP = ["top-0", "top-[85vh]", "top-[170vh]", "top-[255vh]"] as const;

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  points: readonly string[];
  /** Decorative visuals are hidden from assistive tech; interactive ones must not be. */
  decorative: boolean;
  visual: ReactNode;
}

function PointList({ points }: { points: readonly string[] }) {
  return (
    <ul className="mt-6 space-y-3 text-[15px]">
      {points.map((point) => (
        <li key={point} className="flex gap-3">
          <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-lp-accent" />
          {point}
        </li>
      ))}
    </ul>
  );
}

function Pinned({ items }: { items: readonly FeatureItem[] }) {
  const container = useLandingScroll();
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({
    container: container ?? undefined,
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    const index = Math.floor(progress * items.length + 0.02);
    setActive(Math.min(items.length - 1, Math.max(0, index)));
  });

  const jumpTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const current = items[active] ?? items[0];

  return (
    <section ref={sectionRef} className={`relative ${PIN_HEIGHT}`}>
      {items.map((item, index) => (
        <span key={item.id} id={item.id} aria-hidden="true" className={`absolute ${ANCHOR_TOP[index] ?? "top-0"}`} />
      ))}

      <div className="sticky top-0 flex h-screen items-center">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-12 items-center gap-16 px-5 pt-16">
          <div className="col-span-5">
            <ol className="space-y-6">
              {items.map((item, index) => {
                const isActive = index === active;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => jumpTo(item.id)}
                      aria-current={isActive}
                      className={`${TITLE_SM} text-left transition-colors duration-300 ${
                        isActive ? "text-lp-fg" : "text-lp-muted hover:text-lp-fg"
                      }`}
                    >
                      {item.title}
                    </button>
                    <AnimatePresence initial={false}>
                      {isActive && (
                        <motion.div
                          key="detail"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease: EASE }}
                          className="overflow-hidden"
                        >
                          <p className="mt-4 text-[17px] leading-relaxed text-lp-muted">{item.description}</p>
                          <PointList points={item.points} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ol>
            <div className="mt-10 h-0.5 bg-lp-tint">
              <motion.div style={{ scaleX: scrollYProgress }} className="h-full origin-left bg-lp-accent" />
            </div>
          </div>

          <div className="col-span-7">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current?.id}
                aria-hidden={current?.decorative ? "true" : undefined}
                initial={{ opacity: 0, y: 28, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                {current?.visual}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Small screens and no-JS: the same content as plain stacked sections. */
function Stacked({ items }: { items: readonly FeatureItem[] }) {
  return (
    <>
      {items.map((item) => (
        <section key={item.id} id={item.id} className="scroll-mt-16">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16">
            <Reveal>
              <h2 className={H2}>{item.title}</h2>
              <p className="mt-5 text-lg leading-relaxed text-lp-muted">{item.description}</p>
              <PointList points={item.points} />
            </Reveal>
            <div aria-hidden={item.decorative ? "true" : undefined}>{item.visual}</div>
          </div>
        </section>
      ))}
    </>
  );
}

export function Scrollytelling({ items }: { items: readonly FeatureItem[] }) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  return isDesktop ? <Pinned items={items} /> : <Stacked items={items} />;
}
