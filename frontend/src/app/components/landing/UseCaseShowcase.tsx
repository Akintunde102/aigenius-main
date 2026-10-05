"use client";

import { useState } from "react";
import { UseCaseDemo } from "./UseCaseDemo";
import { USE_CASE_DEMOS } from "./use-case-demos";

/**
 * Pick a task on the left and watch it run in the app on the right. No modal and no click-through:
 * the preview is always on screen and already playing. On small screens the tasks become a
 * horizontal strip above the preview.
 */
export function UseCaseShowcase() {
  const [activeId, setActiveId] = useState(USE_CASE_DEMOS[0]?.id ?? "");
  const demo =
    USE_CASE_DEMOS.find((entry) => entry.id === activeId) ?? USE_CASE_DEMOS[0];
  if (!demo) return null;

  return (
    <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:gap-12">
      <div
        role="group"
        aria-label="Tasks"
        className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:col-span-4 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0"
      >
        {USE_CASE_DEMOS.map((entry) => {
          const selected = entry.id === demo.id;
          return (
            <button
              key={entry.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setActiveId(entry.id)}
              className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors duration-200 lg:whitespace-normal lg:rounded-xl lg:px-4 lg:py-3 lg:text-left lg:text-[17px] lg:leading-snug ${
                selected
                  ? "bg-lp-tint text-lp-fg"
                  : "text-lp-muted hover:text-lp-fg"
              }`}
            >
              {entry.title}
            </button>
          );
        })}
      </div>

      <div className="lg:col-span-8">
        <div className="rounded-3xl bg-gradient-to-br from-lp-tint via-lp-tint to-lp-surface p-3 sm:p-8 lg:p-10">
          <UseCaseDemo key={demo.id} demo={demo} />
        </div>
      </div>
    </div>
  );
}
