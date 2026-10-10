"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import { DISPLAY } from "./typography";
import { UseCaseDemo } from "./UseCaseDemo";
import { USE_CASE_DEMOS } from "./use-case-demos";

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 translate-x-px" fill="currentColor" aria-hidden="true">
      <polygon points="7 4 20 12 7 20" />
    </svg>
  );
}

/**
 * Compact rows: the task on the left, a play button on the right. Each row opens a working preview of
 * that task. No spotlight effect, no tall cards, and no list element (a global list rule in the project
 * CSS was indenting <ul>, which pushed the whole grid in from the heading).
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
      <div className="mt-10 grid gap-2 sm:grid-cols-2">
        {USE_CASE_DEMOS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-haspopup="dialog"
            onClick={() => setActiveId(entry.id)}
            className="group flex items-center justify-between gap-6 rounded-2xl bg-black/[0.04] px-6 py-5 text-left transition-[background-color,transform] duration-200 ease-out-strong hover:bg-black/[0.07] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] dark:focus-visible:ring-white/50"
          >
            <span className={`${DISPLAY} text-xl font-normal leading-snug tracking-[-0.015em]`}>
              {entry.title}
              <span className="sr-only">. See it work</span>
            </span>
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.07] transition-transform duration-200 ease-out-strong group-hover:scale-110 dark:bg-white/[0.1]"
            >
              <PlayIcon />
            </span>
          </button>
        ))}
      </div>

      <Modal open={activeId !== null} onClose={() => setActiveId(null)} title={demo?.title ?? "Preview"} size="xl">
        {demo && <UseCaseDemo key={demo.id} demo={demo} />}
      </Modal>
    </>
  );
}