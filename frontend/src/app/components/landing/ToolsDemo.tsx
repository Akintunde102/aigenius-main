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

const LOOP_MS = 12500;
const SETTLED_MS = 9800;
const FADE_OUT_MS = 11900;

const AT = {
  prompt: 300,
  pdfStart: 1100,
  pdfDone: 1900,
  webStart: 2300,
  webDone: 3200,
  mailStart: 3600,
  allow: 5600,
  mailDone: 6000,
  answer: 6600,
  footer: 8000,
} as const;

type Phase = "hidden" | "running" | "done";

function phase(time: number, start: number, done: number): Phase {
  if (time < start) return "hidden";
  return time >= done ? "done" : "running";
}

/** Illustrative conversation. Credits are example figures. */
export function ToolsDemo() {
  const { ref, time } = useLoopClock(LOOP_MS, SETTLED_MS);
  const pdf = phase(time, AT.pdfStart, AT.pdfDone);
  const web = phase(time, AT.webStart, AT.webDone);
  const mail = phase(time, AT.mailStart, AT.mailDone);

  return (
    <AppWindow
      windowRef={ref}
      modelName="Claude Sonnet 4.5"
      faded={time >= FADE_OUT_MS}
    >
      {time >= AT.prompt && (
        <Appear>
          <UserBubble>
            Summarize annual-report.pdf, check what competitors charge, and find
            the Acme invoice in my email.
          </UserBubble>
        </Appear>
      )}
      {pdf !== "hidden" && (
        <Appear>
          <ToolLine
            label="read_file"
            status={pdf === "done" ? "done" : "running"}
          />
        </Appear>
      )}
      {web !== "hidden" && (
        <Appear>
          <ToolLine
            label="web_search"
            status={web === "done" ? "done" : "running"}
          />
        </Appear>
      )}
      {mail === "running" && (
        <Appear>
          <ApprovalCard
            tool="gmail_search"
            target='"Acme invoice"'
            allowed={time >= AT.allow}
          />
        </Appear>
      )}
      {mail === "done" && (
        <Appear>
          <ToolLine label="gmail_search" status="done" />
        </Appear>
      )}
      {time >= AT.answer && (
        <Appear>
          <AssistantText>
            <strong className="font-semibold">Report:</strong> revenue grew and
            margins held flat.{" "}
            <strong className="font-semibold">Competitors:</strong> most charge
            a flat monthly plan.{" "}
            <strong className="font-semibold">Email:</strong> the Acme invoice
            arrived on Tuesday.
          </AssistantText>
        </Appear>
      )}
      {time >= AT.footer && (
        <Appear>
          <MetaFooter
            credits={31}
            calls={3}
            model="Anthropic: Claude Sonnet 4.5"
          />
        </Appear>
      )}
    </AppWindow>
  );
}
