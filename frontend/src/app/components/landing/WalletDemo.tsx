"use client";

import { motion } from "framer-motion";
import {
  Appear,
  AppWindow,
  AssistantText,
  MetaFooter,
  ModelMenu,
  UserBubble,
} from "./app-preview/AppWindow";
import { useLanguage } from "@/lib/providers/LanguageProvider";
import { PREVIEW } from "./app-preview/previewTheme";
import { FREE_CREDITS } from "./constants";
import { useLoopClock } from "./useLoopClock";

const START_CREDITS = Number(FREE_CREDITS);

interface TurnData {
  model: string;
  provider: string;
  cost: number;
  prompt: string;
  reply: string;
}

const STATIC_TURNS = [
  {
    model: "Claude Sonnet 4.5",
    provider: "Anthropic",
    cost: 31,
    prompt: "Review this contract for risky clauses",
    reply: "Clause 7.2 lets the vendor change pricing on 14 days notice.",
  },
  {
    model: "GPT-5 Mini",
    provider: "OpenAI",
    cost: 4,
    prompt: "Draft a polite follow-up email",
    reply:
      "Hi Sam, just checking in on the proposal. Happy to answer any questions.",
  },
  {
    model: "DeepSeek V3.1 Terminus",
    provider: "DeepSeek",
    cost: 2,
    prompt: "Fix the off-by-one bug in this function",
    reply: "The loop runs to arr.length + 1. Change it to arr.length.",
  },
  {
    model: "Gemini 2.5 Flash Lite",
    provider: "Google",
    cost: 1,
    prompt: "Which invoices are overdue?",
    reply: "INV-4021 is 12 days overdue. INV-4033 is 5 days overdue.",
  },
] as const;

/** The model the composer starts on, and where it ends up, so the loop restarts seamlessly. */
const INITIAL_MODEL = "Gemini 2.5 Flash Lite";
const MODEL_NAMES = STATIC_TURNS.map((turn) => turn.model);

const BEAT_MS = 4600;
const TYPE_MS_PER_CHAR = 24;
/** Moments inside one beat, in milliseconds from its start. */
const AT = {
  menuOpen: 300,
  highlight: 900,
  select: 1500,
  type: 1700,
  send: 2800,
  reply: 3300,
  cost: 3800,
} as const;

const SETTLED_MS = (STATIC_TURNS.length - 1) * BEAT_MS + AT.cost + 700;
const FADE_OUT_MS = SETTLED_MS + 700;
const LOOP_MS = FADE_OUT_MS + 900;

const at = (turnIndex: number, offset: number) => turnIndex * BEAT_MS + offset;

export function WalletDemo() {
  const { t } = useLanguage();
  const { ref, time } = useLoopClock(LOOP_MS, SETTLED_MS);

  const turns: readonly TurnData[] = [
    {
      model: "Claude Sonnet 4.5",
      provider: "Anthropic",
      cost: 31,
      prompt: t("landing.demoWalletPrompt1", STATIC_TURNS[0].prompt),
      reply: t("landing.demoWalletReply1", STATIC_TURNS[0].reply),
    },
    {
      model: "GPT-5 Mini",
      provider: "OpenAI",
      cost: 4,
      prompt: t("landing.demoWalletPrompt2", STATIC_TURNS[1].prompt),
      reply: t("landing.demoWalletReply2", STATIC_TURNS[1].reply),
    },
    {
      model: "DeepSeek V3.1 Terminus",
      provider: "DeepSeek",
      cost: 2,
      prompt: t("landing.demoWalletPrompt3", STATIC_TURNS[2].prompt),
      reply: t("landing.demoWalletReply3", STATIC_TURNS[2].reply),
    },
    {
      model: "Gemini 2.5 Flash Lite",
      provider: "Google",
      cost: 1,
      prompt: t("landing.demoWalletPrompt4", STATIC_TURNS[3].prompt),
      reply: t("landing.demoWalletReply4", STATIC_TURNS[3].reply),
    },
  ];

  const active = Math.min(turns.length - 1, Math.floor(time / BEAT_MS));
  const turn = turns[active] ?? turns[0];
  const previousModel =
    active === 0 ? INITIAL_MODEL : (turns[active - 1]?.model ?? INITIAL_MODEL);

  const chosen = time >= at(active, AT.select);
  const chipModel = chosen ? turn.model : previousModel;
  const menuVisible = time >= at(active, AT.menuOpen) && !chosen;
  const highlighted = time >= at(active, AT.highlight) ? turn.model : null;
  const options = MODEL_NAMES.filter((name) => name !== chipModel);

  const typeStart = at(active, AT.type);
  const typedChars = Math.floor((time - typeStart) / TYPE_MS_PER_CHAR);
  const draft =
    time >= typeStart && time < at(active, AT.send)
      ? turn.prompt.slice(0, Math.min(turn.prompt.length, typedChars))
      : "";

  const spent = turns.reduce(
    (total, tItem, index) => (time >= at(index, AT.cost) ? total + tItem.cost : total),
    0,
  );
  const balance = START_CREDITS - spent;

  return (
    <AppWindow
      windowRef={ref}
      modelName={chipModel}
      faded={time >= FADE_OUT_MS}
      draft={draft}
      typing={draft.length > 0}
      chipMenu={
        menuVisible ? (
          <ModelMenu
            key="model-menu"
            current={chipModel}
            options={options}
            highlighted={highlighted}
          />
        ) : null
      }
      headerRight={
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${PREVIEW.bubble}`}
        >
          <motion.span
            key={balance}
            initial={{ opacity: 0.4, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="font-medium tabular-nums"
          >
            {balance}
          </motion.span>
          <span className={PREVIEW.muted}>{t("landing.demoCreditsLabel", "credits")}</span>
        </span>
      }
    >
      {turns.map((tItem, index) =>
        time >= at(index, AT.send) ? (
          <div key={tItem.prompt} className="space-y-3.5">
            <Appear>
              <UserBubble>{tItem.prompt}</UserBubble>
            </Appear>
            {time >= at(index, AT.reply) && (
              <Appear>
                <AssistantText>
                  {tItem.reply.slice(0, Math.max(0, Math.floor((time - at(index, AT.reply)) / 8)))}
                </AssistantText>
              </Appear>
            )}
            {time >= at(index, AT.cost) && (
              <Appear>
                <MetaFooter
                  credits={tItem.cost}
                  calls={1}
                  model={`${tItem.provider}: ${tItem.model}`}
                />
              </Appear>
            )}
          </div>
        ) : null,
      )}
    </AppWindow>
  );
}
