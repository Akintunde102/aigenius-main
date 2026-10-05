"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useId, useState } from "react";

const EASE = [0.23, 1, 0.32, 1] as const;

/* Palette that matches the real desktop app — same as app-preview/theme.ts */
const APP = {
  frame: "bg-[#fdfdfc] text-[#1f1f1e] dark:bg-[#111114] dark:text-[#e6e6e8]",
  topBar: "bg-[#f6f5f3] dark:bg-[#17171b]",
  line: "border-black/10 dark:border-white/10",
  hover: "hover:bg-black/5 dark:hover:bg-white/[0.07]",
  active: "bg-black/[0.05] dark:bg-white/[0.07]",
  bubble: "bg-black/[0.05] dark:bg-white/[0.06]",
  muted: "text-black/45 dark:text-white/45",
  panel: "bg-[#fafaf9] dark:bg-[#18181c]",
} as const;

const MODELS = [
  {
    id: "claude",
    name: "Claude",
    cost: "$0.0063",
    reply:
      "Clause 7.2 lets the vendor change pricing on 14 days notice. Everything else is standard.",
  },
  {
    id: "gpt",
    name: "GPT",
    cost: "$0.0019",
    reply:
      "One risky clause: 7.2. The vendor can change pricing with only 14 days notice.",
  },
  {
    id: "gemini",
    name: "Gemini",
    cost: "$0.0011",
    reply:
      "Flagged: 7.2 allows price changes on 14 days notice. The other terms look standard.",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    cost: "$0.0004",
    reply:
      "Risk in clause 7.2: pricing can change after 14 days notice. No other issues found.",
  },
] as const;

type ModelId = (typeof MODELS)[number]["id"];

export function ModelSwitcher() {
  const [activeId, setActiveId] = useState<ModelId>("claude");
  const pillId = useId();
  const active = MODELS.find((m) => m.id === activeId) ?? MODELS[0];

  return (
    /* Outer card — matches AppPreview rounded window look */
    <div className={`overflow-hidden rounded-2xl shadow-lp-pop ${APP.frame}`}>
      {/* Title bar */}
      <div className={`flex h-10 shrink-0 items-center gap-3 border-b px-4 ${APP.topBar} ${APP.line}`}>
        <div className="flex items-center gap-[7px]">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <span className={`text-[13px] font-medium ${APP.muted}`}>AIGenius</span>
      </div>

      {/* Chat area */}
      <div className="px-5 pb-5 pt-4">
        {/* User message */}
        <div className="flex justify-end">
          <div className={`max-w-[82%] rounded-3xl rounded-br-md px-4 py-3 text-[14px] leading-relaxed ${APP.bubble}`}>
            Summarize the vendor contract and flag anything risky.
          </div>
        </div>

        {/* Model picker chips */}
        <div
          role="tablist"
          aria-label="Choose a model"
          className={`mt-4 inline-flex flex-wrap gap-1 rounded-xl border p-1 ${APP.line}`}
        >
          {MODELS.map((model) => {
            const selected = model.id === activeId;
            return (
              <button
                key={model.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveId(model.id)}
                className={`relative rounded-lg px-3 py-1 text-[13px] font-medium transition-colors duration-150 ${
                  selected ? APP.active + " text-[#1f1f1e] dark:text-[#e6e6e8]" : APP.muted + " " + APP.hover
                }`}
              >
                {selected && (
                  <motion.span
                    layoutId={`${pillId}-pill`}
                    className={`absolute inset-0 rounded-lg ${APP.active}`}
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <span className="relative">{model.name}</span>
              </button>
            );
          })}
        </div>

        {/* AI reply */}
        <div role="tabpanel" aria-live="polite" className="mt-4 min-h-[6rem]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="max-w-[88%]"
            >
              <p className={`rounded-3xl rounded-bl-md px-4 py-3 text-[14px] leading-relaxed ${APP.bubble}`}>
                {active.reply}
              </p>
              <p className={`mt-2 pl-1 text-[12px] ${APP.muted}`}>
                {active.name} ·{" "}
                <span className="font-mono tabular-nums text-lp-accent">
                  {active.cost}
                </span>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Composer area stub */}
        <div className={`mt-4 rounded-2xl border px-4 py-3 ${APP.panel} ${APP.line}`}>
          <p className={`text-[14px] ${APP.muted}`}>
            Same question, different model, different price. Try them.
          </p>
        </div>
      </div>
    </div>
  );
}
