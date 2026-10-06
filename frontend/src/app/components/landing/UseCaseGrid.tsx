"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import { SpotlightCard } from "./SpotlightCard";
import { DISPLAY } from "./typography";
import { UseCaseDemo } from "./UseCaseDemo";
import { USE_CASE_DEMOS } from "./use-case-demos";

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <polygon points="10 8 16 12 10 16" fill="currentColor" />
    </svg>
  );
}

/**
 * Every card opens a working preview of that task, so nothing here looks like a link that goes nowhere.
 */
export function UseCaseGrid() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const lastId = useRef<string | null>(null);
  useEffect(() => {
    if (activeId) lastId.current = activeId;
  }, [activeId]);

  // Keep the last demo mounted while the dialog plays its exit transition.
  const shownId = activeId ?? lastId.current;
  const demo = USE_CASE_DEMOS.find((entry) => entry.id === shownId) ?? null;

  return (
    <>
      <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {USE_CASE_DEMOS.map((entry) => (
          <li key={entry.id}>
            <SpotlightCard className="h-full min-h-40">
              <button
                type="button"
                onClick={() => setActiveId(entry.id)}
                className="flex h-full w-full flex-col justify-between gap-8 p-6 text-left"
              >
                <span
                  className={`${DISPLAY} text-[1.35rem] leading-[1.15] tracking-[-0.015em]`}
                >
                  {entry.title}
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm text-lp-muted transition-colors duration-200 group-hover:text-lp-fg">
                  <PlayGlyph />
                  See it work
                </span>
              </button>
            </SpotlightCard>
          </li>
        ))}
      </ul>

      <Modal
        open={activeId !== null}
        onClose={() => setActiveId(null)}
        title={demo?.title ?? "Preview"}
        description="A short example of what this looks like in the app."
        size="lg"
      >
        {demo && <UseCaseDemo key={demo.id} demo={demo} />}
      </Modal>
    </>
  );
}
