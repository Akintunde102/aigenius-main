"use client";

import {
  Appear,
  ApprovalCard,
  AppWindow,
  AssistantText,
  MetaFooter,
  ToolLine,
  UserBubble,
} from "./app-preview/AppWindow";
import { useLoopClock } from "./useLoopClock";

const LOOP_MS = 11000;
const SETTLED_MS = 8500;
const FADE_OUT_MS = 10400;

/* Everything below is a pure function of the clock, so the loop can never desync. */
const AT = {
  prompt: 300,
  intro: 1000,
  listed: 1700,
  plan: 2500,
  approval: 3500,
  allow: 5600,
  moved: 6000,
  summary: 6700,
  footer: 7500,
} as const;

/** Illustrative conversation. Credits are example figures. */
export function DesktopDemo() {
  const { ref, time } = useLoopClock(LOOP_MS, SETTLED_MS);
  const has = (at: number) => time >= at;
  const waitingForApproval = has(AT.approval) && !has(AT.moved);

  return (
    <AppWindow
      windowRef={ref}
      modelName="Gemini 2.5 Flash Lite"
      faded={time >= FADE_OUT_MS}
    >
      {has(AT.prompt) && (
        <Appear>
          <UserBubble>
            Sort my Downloads folder into folders by type.
          </UserBubble>
        </Appear>
      )}
      {has(AT.intro) && (
        <Appear>
          <AssistantText>
            I will start by looking at what is in your Downloads folder.
          </AssistantText>
        </Appear>
      )}
      {has(AT.listed) && (
        <Appear>
          <ToolLine label="Listed Downloads" />
        </Appear>
      )}
      {has(AT.plan) && (
        <Appear>
          <AssistantText>
            Found <strong className="font-semibold">142 files</strong>. I will
            group them into Documents, Images, Installers, Archives and Other.
            Moving files needs your approval first.
          </AssistantText>
        </Appear>
      )}
      {waitingForApproval && (
        <Appear>
          <ApprovalCard
            tool="move_files"
            target="~/Downloads  →  5 folders by type"
            allowed={has(AT.allow)}
          />
        </Appear>
      )}
      {has(AT.moved) && (
        <Appear>
          <ToolLine label="move_files" status="done" />
        </Appear>
      )}
      {has(AT.summary) && (
        <Appear>
          <AssistantText>
            Done. 5 folders created and 142 files moved. Nothing was deleted.
          </AssistantText>
        </Appear>
      )}
      {has(AT.footer) && (
        <Appear>
          <MetaFooter
            credits={4}
            calls={2}
            model="Google: Gemini 2.5 Flash Lite"
          />
        </Appear>
      )}
    </AppWindow>
  );
}
