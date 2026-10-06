"use client";

import {
  AnimatePresence,
  motion,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "./app-preview/appIcons";
import { PREVIEW } from "./app-preview/previewTheme";
import { FREE_CREDITS } from "./constants";

const EASE = [0.23, 1, 0.32, 1] as const;
const START_CREDITS = Number(FREE_CREDITS);
const MAX_LEDGER = 5;

/* Per-message prices match the model list in the real app. */
const MODELS = [
  { id: "claude", name: "Claude Sonnet 4.5", cost: 31 },
  { id: "gpt", name: "GPT-5 Mini", cost: 4 },
  { id: "gemini", name: "Gemini 2.5 Flash Lite", cost: 1 },
  { id: "deepseek", name: "DeepSeek V3.1 Terminus", cost: 2 },
] as const;

const PROMPTS = [
  "Summarize the vendor contract",
  "Draft a proposal for Acme",
  "Which invoices are overdue?",
  "Write three pricing headlines",
  "Turn these notes into actions",
] as const;

interface LedgerEntry {
  readonly id: number;
  readonly prompt: string;
  readonly model: string;
  readonly cost: number;
}

/**
 * Pricing, explained by doing it. Tap a model to send a message: the balance and the bar drop by
 * exactly that model's price per message, and the message lands in the list on the right.
 */
export function WalletDemo() {
  const [balance, setBalance] = useState(START_CREDITS);
  const [ledger, setLedger] = useState<readonly LedgerEntry[]>([]);
  const counter = useRef(0);

  const spring = useSpring(balance, { stiffness: 140, damping: 22 });
  const balanceText = useTransform(spring, (value) =>
    Math.round(value).toString(),
  );
  const fill = useTransform(
    spring,
    (value) => Math.max(0, value) / START_CREDITS,
  );
  useEffect(() => {
    spring.set(balance);
  }, [balance, spring]);

  const send = (model: (typeof MODELS)[number]) => {
    if (balance < model.cost) return;
    const index = counter.current++;
    const entry: LedgerEntry = {
      id: index,
      prompt: PROMPTS[index % PROMPTS.length] ?? PROMPTS[0],
      model: model.name,
      cost: model.cost,
    };
    setBalance((value) => value - model.cost);
    setLedger((prev) => [entry, ...prev].slice(0, MAX_LEDGER));
  };

  const reset = () => {
    setBalance(START_CREDITS);
    setLedger([]);
    counter.current = 0;
  };

  const cheapest = Math.min(...MODELS.map((model) => model.cost));
  const outOfCredits = balance < cheapest;

  return (
    <div
      className={`overflow-hidden rounded-xl shadow-lp-lift ${PREVIEW.frame}`}
    >
      <div
        className={`flex h-11 items-center gap-3 border-b px-4 ${PREVIEW.topBar} ${PREVIEW.line}`}
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

      <div className="grid min-h-[34rem] text-[15px] sm:grid-cols-2">
        <div className="p-7">
          <div className="flex items-start justify-between gap-4">
            <p className={`text-sm ${PREVIEW.muted}`}>Wallet</p>
            <button
              type="button"
              onClick={reset}
              className={`-mr-2 -mt-1 rounded-full px-3 py-1 text-xs transition-colors duration-150 ${PREVIEW.muted} ${PREVIEW.hover}`}
            >
              Reset
            </button>
          </div>
          <p className="flex items-baseline gap-2">
            <motion.span className="text-6xl font-medium tabular-nums tracking-tight">
              {balanceText}
            </motion.span>
            <span className={`text-sm ${PREVIEW.muted}`}>credits</span>
          </p>
          <div
            className={`mt-4 h-1.5 overflow-hidden rounded-full ${PREVIEW.bubble}`}
          >
            <motion.div
              style={{ scaleX: fill }}
              className="h-full origin-left rounded-full bg-sky-600"
            />
          </div>

          <p className={`mt-8 text-sm ${PREVIEW.muted}`}>
            Tap a model to send a message
          </p>
          <ul className="mt-2 space-y-1">
            {MODELS.map((model) => {
              const disabled = balance < model.cost;
              return (
                <li key={model.id}>
                  <button
                    type="button"
                    onClick={() => send(model)}
                    disabled={disabled}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition-[transform,background-color,opacity] duration-150 ease-out-strong active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 ${PREVIEW.hover}`}
                  >
                    <span className="truncate">{model.name}</span>
                    <span
                      className={`shrink-0 text-sm tabular-nums ${PREVIEW.muted}`}
                    >
                      {model.cost} / msg
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div
          className={`border-t p-7 sm:border-l sm:border-t-0 ${PREVIEW.line} ${PREVIEW.panel}`}
        >
          <p className={`text-sm ${PREVIEW.muted}`}>Recent messages</p>
          {ledger.length === 0 && (
            <p className={`mt-4 text-sm leading-relaxed ${PREVIEW.muted}`}>
              Nothing yet. Each message you send shows up here with what it
              cost.
            </p>
          )}
          <ul className="mt-4 space-y-2">
            <AnimatePresence initial={false}>
              {ledger.map((entry) => (
                <motion.li
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className={`rounded-xl px-4 py-3 ${PREVIEW.bubble}`}
                >
                  <span className="block truncate">{entry.prompt}</span>
                  <span
                    className={`mt-0.5 flex items-center justify-between gap-3 text-xs ${PREVIEW.muted}`}
                  >
                    <span className="truncate">{entry.model}</span>
                    <span className={`shrink-0 tabular-nums ${PREVIEW.accent}`}>
                      -{entry.cost} credits
                    </span>
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          {outOfCredits && (
            <p className={`mt-4 text-sm ${PREVIEW.muted}`}>
              Out of credits. In the app you top up from $1 and carry on.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
