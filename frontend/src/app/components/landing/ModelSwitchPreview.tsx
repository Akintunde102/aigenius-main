"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpIcon,
  ChevronDownIcon,
  CloseIcon,
  PaperclipIcon,
  PlusIcon,
  SearchIcon,
  UserIcon,
} from "./app-preview/appIcons";
import { PREVIEW } from "./app-preview/previewTheme";
import { CheckIcon } from "./icons";

const EASE = [0.23, 1, 0.32, 1] as const;
const THINK_MS = 600;
const WORD_MS = 45;
const PROMPT = "Summarize the vendor contract and flag anything risky.";

interface ModelEntry {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  /** Credits per message, as the real app lists them ("8 / msg"). */
  readonly credits: number;
  /** Shown in the quick picks menu until the visitor switches it off in All Models. */
  readonly quickPick: boolean;
  readonly reply: string;
}

/* Model names and per-message credits match the real model list. Replies are scripted. */
const MODELS: readonly ModelEntry[] = [
  {
    id: "gpt-6-astra",
    name: "GPT-6 Astra",
    provider: "OpenAI",
    credits: 102,
    quickPick: true,
    reply:
      "Two clauses need attention. 7.2 lets the vendor change pricing on 14 days notice, and 11.4 auto-renews for 12 months unless you cancel 60 days ahead.",
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    credits: 20,
    quickPick: true,
    reply:
      "Main risk is clause 7.2: pricing can change on only 14 days notice. Clause 11.4 also auto-renews the contract.",
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "OpenAI",
    credits: 4,
    quickPick: true,
    reply:
      "One risky clause: 7.2. The vendor can change pricing with 14 days notice.",
  },
  {
    id: "claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    provider: "Anthropic",
    credits: 31,
    quickPick: true,
    reply:
      "Clause 7.2 lets the vendor change pricing on 14 days notice. Clause 14 caps their liability at one month of fees. Everything else is standard.",
  },
  {
    id: "gemini-2-5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    provider: "Google",
    credits: 1,
    quickPick: true,
    reply:
      "Flagged: 7.2 allows price changes on 14 days notice. The other terms look standard.",
  },
  {
    id: "deepseek-v3-1",
    name: "DeepSeek V3.1 Terminus",
    provider: "DeepSeek",
    credits: 2,
    quickPick: true,
    reply:
      "Risk in clause 7.2: pricing can change after 14 days notice. No other issues found.",
  },
  {
    id: "o1",
    name: "o1",
    provider: "OpenAI",
    credits: 123,
    quickPick: true,
    reply:
      "Reading the full agreement, three terms deserve a second look: 7.2 on price changes, 11.4 on auto-renewal, and 14 on the liability cap. 7.2 is the one to negotiate first.",
  },
  {
    id: "gemini-3-8-flash",
    name: "Gemini 3.8 Flash",
    provider: "Google",
    credits: 8,
    quickPick: false,
    reply:
      "Clause 7.2 is the risky one. The vendor can change pricing on 14 days notice, so ask for 90.",
  },
  {
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5",
    provider: "Anthropic",
    credits: 20,
    quickPick: false,
    reply:
      "I would flag 7.2 first. A 14 day price change window is short for a 24 month agreement. Clause 11.4 is the next one to push back on.",
  },
];

const DEFAULT_MODEL_ID = "claude-sonnet-4-5";
const DEFAULT_QUICK_IDS: readonly string[] = MODELS.filter(
  (model) => model.quickPick,
).map((model) => model.id);

function findModel(id: string): ModelEntry {
  return MODELS.find((model) => model.id === id) ?? MODELS[0]!;
}

const SECTION_LABEL = `px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-[0.1em] ${PREVIEW.muted}`;
const ROW = `flex w-full items-center justify-between gap-3 rounded-md px-3 py-1.5 text-left text-[13px] transition-colors duration-150 ${PREVIEW.hover}`;

interface SwitchProps {
  readonly checked: boolean;
  readonly label: string;
  readonly onChange: () => void;
}

function Switch({ checked, label, onChange }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors duration-200 ${
        checked ? "bg-sky-600" : "bg-black/20 dark:bg-white/20"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-transform duration-200 ease-out-strong ${
          checked ? "translate-x-3.5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

/**
 * The model picker as the real app does it: a chip in the composer opens a short menu (current model,
 * quick picks, "Add models"), and "Add models" opens the full list with a per-message credit price and a
 * toggle for each model. Pick another model and the answer is regenerated with its own credit cost.
 */
export function ModelSwitchPreview() {
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [quickIds, setQuickIds] = useState<ReadonlySet<string>>(
    () => new Set(DEFAULT_QUICK_IDS),
  );
  const [menuOpen, setMenuOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [search, setSearch] = useState("");
  const active = findModel(modelId);
  const words = useMemo(() => active.reply.split(" "), [active.reply]);
  const [shown, setShown] = useState(
    () => findModel(DEFAULT_MODEL_ID).reply.split(" ").length,
  );
  const menuRef = useRef<HTMLDivElement>(null);
  const done = shown >= words.length;

  const quickPicks = MODELS.filter(
    (model) => quickIds.has(model.id) && model.id !== modelId,
  );
  const needle = search.trim().toLowerCase();
  const listed = needle
    ? MODELS.filter((model) => model.name.toLowerCase().includes(needle))
    : MODELS;

  useEffect(() => {
    if (done) return;
    const timer = window.setTimeout(
      () => setShown((count) => count + 1),
      shown === 0 ? THINK_MS : WORD_MS,
    );
    return () => window.clearTimeout(timer);
  }, [shown, done]);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointer = (event: MouseEvent) => {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!panelOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanelOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [panelOpen]);

  const choose = (id: string) => {
    setMenuOpen(false);
    setPanelOpen(false);
    if (id === modelId) return;
    setModelId(id);
    setShown(0);
  };

  const toggleQuick = (id: string) =>
    setQuickIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const openPanel = () => {
    setMenuOpen(false);
    setSearch("");
    setPanelOpen(true);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl shadow-lp-lift ${PREVIEW.frame}`}
    >
      <div
        className={`flex h-10 items-center gap-3 border-b px-4 ${PREVIEW.topBar} ${PREVIEW.line}`}
      >
        <div className="flex items-center gap-[7px]" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="flex items-center gap-1 text-sm font-semibold">
          AIGenius
          <ChevronDownIcon className={`h-3.5 w-3.5 ${PREVIEW.muted}`} />
        </span>
      </div>

      <div className="flex h-[34rem] flex-col">
        <div className="flex-1 overflow-hidden px-6 pt-6 text-[15px]">
          <div
            className={`ml-auto w-fit max-w-[85%] rounded-3xl px-5 py-3.5 leading-relaxed ${PREVIEW.bubble}`}
          >
            {PROMPT}
          </div>

          <div className="mt-6 max-w-[92%]">
            {shown === 0 ? (
              <span
                className="inline-flex items-center gap-1"
                role="status"
                aria-label="Thinking"
              >
                {[0, 1, 2].map((dot) => (
                  <motion.span
                    key={dot}
                    className="h-1.5 w-1.5 rounded-full bg-current opacity-50"
                    animate={{ opacity: [0.2, 0.8, 0.2] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: dot * 0.15,
                    }}
                  />
                ))}
              </span>
            ) : (
              <p className="leading-relaxed">
                {words.slice(0, shown).join(" ")}
              </p>
            )}

            <AnimatePresence>
              {done && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className={`mt-4 flex items-center justify-between gap-3 text-[11px] ${PREVIEW.muted}`}
                >
                  <span>
                    <span className={PREVIEW.accent}>
                      {active.credits} credits
                    </span>{" "}
                    · 1 call
                  </span>
                  <span>
                    <span className={PREVIEW.accentSoft}>
                      {active.provider}: {active.name}
                    </span>{" "}
                    · just now
                  </span>
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="px-5 pb-5">
          <div
            className={`rounded-3xl border p-3 ${PREVIEW.panel} ${PREVIEW.line}`}
          >
            <div className="flex items-start gap-3">
              <p
                className={`min-h-10 flex-1 px-3 py-2 text-lg ${PREVIEW.muted}`}
              >
                Type...
              </p>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${PREVIEW.send}`}
              >
                <ArrowUpIcon className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 px-1">
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((open) => !open)}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors duration-150 ${PREVIEW.line} ${PREVIEW.hover}`}
                >
                  {active.name}
                  <ChevronDownIcon
                    className={`h-3 w-3 transition-transform duration-200 ease-out-strong ${menuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: EASE }}
                      className={`absolute bottom-full left-0 z-20 mb-2 w-64 origin-bottom-left rounded-xl border p-1.5 shadow-xl ${PREVIEW.popover} ${PREVIEW.line}`}
                    >
                      <p className={SECTION_LABEL}>Current model</p>
                      <div className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs">
                        <span className="truncate">{active.name}</span>
                        <CheckIcon
                          className={`h-3.5 w-3.5 shrink-0 ${PREVIEW.accent}`}
                        />
                      </div>

                      <div className={`my-1.5 border-t ${PREVIEW.line}`} />
                      <p className={SECTION_LABEL}>Quick picks</p>
                      <div className="max-h-44 overflow-y-auto [scrollbar-width:thin]">
                        {quickPicks.map((model) => (
                          <button
                            key={model.id}
                            type="button"
                            role="menuitem"
                            onClick={() => choose(model.id)}
                            className={ROW}
                          >
                            <span className="truncate">{model.name}</span>
                          </button>
                        ))}
                      </div>

                      <div className={`my-1.5 border-t ${PREVIEW.line}`} />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={openPanel}
                        className={`${ROW} justify-start ${PREVIEW.muted}`}
                      >
                        <PlusIcon className="h-3 w-3" />
                        Add models
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <span
                className={`flex h-7 w-9 items-center justify-center rounded-full border ${PREVIEW.line} ${PREVIEW.muted}`}
              >
                <UserIcon className="h-3.5 w-3.5" />
              </span>
              <span
                className={`flex h-7 w-7 items-center justify-center ${PREVIEW.muted}`}
              >
                <PaperclipIcon className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: EASE }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setPanelOpen(false);
            }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 p-4"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="All models"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2, ease: EASE }}
              className={`flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-xl border shadow-2xl ${PREVIEW.popover} ${PREVIEW.line}`}
            >
              <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
                <div>
                  <h4 className="text-base font-semibold">All Models</h4>
                  <p className={`mt-1 text-xs ${PREVIEW.muted}`}>
                    Browse and select from all available AI models. Default
                    picks appear first.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setPanelOpen(false)}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-150 ${PREVIEW.muted} ${PREVIEW.hover}`}
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>

              <label
                className={`mx-5 flex h-8 items-center gap-2 rounded-lg border px-2.5 ${PREVIEW.line}`}
              >
                <SearchIcon
                  className={`h-3.5 w-3.5 shrink-0 ${PREVIEW.muted}`}
                />
                <span className="sr-only">Search models</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search models..."
                  className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-black/40 dark:placeholder:text-white/40"
                />
              </label>

              <ul className="mt-3 min-h-0 flex-1 overflow-y-auto px-3 pb-3 [scrollbar-width:thin]">
                {listed.length === 0 && (
                  <li
                    className={`px-3 py-6 text-center text-xs ${PREVIEW.muted}`}
                  >
                    No models found
                  </li>
                )}
                {listed.map((model) => (
                  <li
                    key={model.id}
                    className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${
                      model.id === modelId
                        ? `border ${PREVIEW.line} ${PREVIEW.active}`
                        : "border border-transparent"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => choose(model.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-[13px]">
                        {model.name}
                      </span>
                      <span
                        className={`block text-[11px] tabular-nums ${PREVIEW.muted}`}
                      >
                        {model.credits} / msg
                      </span>
                    </button>
                    <Switch
                      checked={quickIds.has(model.id)}
                      label={`Show ${model.name} in quick picks`}
                      onChange={() => toggleQuick(model.id)}
                    />
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
