"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Appear, AppWindow, MetaFooter, ToolLine, UserBubble } from "./app-preview/AppWindow";
import type { Block, ModelName, Segment } from "./app-preview/data";
import { PREVIEW } from "./app-preview/previewTheme";
import type { UseCaseDemoData } from "./use-case-demos";

const TICK_MS = 60;
const TYPE_START_MS = 300;
const TYPE_MS_PER_CHAR = 22;
const SEND_PAUSE_MS = 350;
const THINK_MS = 700;
const BLOCK_MS = 650;
const FOOTER_PAUSE_MS = 300;

/** The chip shows the real model names the app lists. */
const CHIP_NAME: Readonly<Record<ModelName, string>> = {
  Claude: "Claude Sonnet 4.5",
  GPT: "GPT-5 Mini",
  Gemini: "Gemini 2.5 Flash Lite",
  DeepSeek: "DeepSeek V3.1 Terminus",
};

function Segments({ segments }: { segments: readonly Segment[] }) {
  return (
    <>
      {segments.map((segment, index) =>
        segment.bold ? (
          <strong key={index} className="font-semibold">
            {segment.text}
          </strong>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

function ReplyBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "heading":
      return <h4 className={`border-b pb-1.5 text-base font-medium ${PREVIEW.line}`}>{block.text}</h4>;
    case "paragraph":
      return (
        <p className="leading-relaxed">
          <Segments segments={block.segments} />
        </p>
      );
    case "list":
      return (
        <ul className="list-disc space-y-1.5 pl-6 leading-relaxed">
          {block.items.map((item, index) => (
            <li key={index}>
              <Segments segments={item} />
            </li>
          ))}
        </ul>
      );
    case "tool":
      return (
        <div>
          <ToolLine label={block.label} status={block.status} />
          {block.detail && (
            <pre className={`mt-2 whitespace-pre-wrap rounded-lg p-3 font-mono text-[13px] ${PREVIEW.bubble} ${PREVIEW.muted}`}>
              {block.detail}
            </pre>
          )}
        </div>
      );
    case "table":
      return (
        <div className="overflow-x-auto">
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                {block.headers.map((header) => (
                  <th key={header} className={`border px-4 py-2 text-center font-medium ${PREVIEW.line} ${PREVIEW.bubble}`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className={`border px-4 py-2 ${PREVIEW.line} ${cellIndex === 0 ? "font-medium" : ""}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

/**
 * The app window sits on a stage that contrasts with whatever is behind it. In the modal the window
 * (near-black) used to blend into the modal surface; the lighter stage and the ring make the edge visible.
 */
function Stage({ framed, children }: { framed: boolean; children: ReactNode }) {
  if (!framed) return <>{children}</>;
  return (
    <div className="rounded-2xl bg-stone-200 p-3 dark:bg-stone-600/40 sm:p-6">
      <div className="rounded-xl shadow-2xl ring-1 ring-black/10 dark:ring-white/20">{children}</div>
    </div>
  );
}

interface UseCaseDemoProps {
  readonly demo: UseCaseDemoData;
  /** Draws a contrasting stage behind the app window. Turn off where the demo already sits on its own stage. */
  readonly framed?: boolean;
}

/**
 * A self-playing chat for one use case, shown in the real app window: the prompt is typed into
 * the composer, sent, answered block by block, and costed. Mount it with key={demo.id} so each
 * use case starts from the beginning.
 */
export function UseCaseDemo({ demo, framed = true }: UseCaseDemoProps) {
  const reduceMotion = useReducedMotion();
  const [time, setTime] = useState(0);
  const [run, setRun] = useState(0);

  const typeEnd = TYPE_START_MS + demo.prompt.length * TYPE_MS_PER_CHAR;
  const sendAt = typeEnd + SEND_PAUSE_MS;
  const answerAt = sendAt + THINK_MS;
  const footerAt = answerAt + demo.blocks.length * BLOCK_MS + FOOTER_PAUSE_MS;
  const now = reduceMotion ? footerAt : time;

  useEffect(() => {
    setTime(0);
  }, [run]);

  useEffect(() => {
    if (reduceMotion || time >= footerAt) return;
    const timer = window.setTimeout(() => setTime((value) => value + TICK_MS), TICK_MS);
    return () => window.clearTimeout(timer);
  }, [time, footerAt, reduceMotion]);

  const typedChars = Math.min(demo.prompt.length, Math.max(0, Math.floor((now - TYPE_START_MS) / TYPE_MS_PER_CHAR)));
  const sent = now >= sendAt;
  const draft = sent ? "" : demo.prompt.slice(0, typedChars);
  const thinking = sent && now < answerAt;
  const visibleBlocks = now < answerAt ? 0 : Math.min(demo.blocks.length, Math.floor((now - answerAt) / BLOCK_MS) + 1);
  const finished = now >= footerAt;

  return (
    <div>
      <Stage framed={framed}>
      <AppWindow modelName={CHIP_NAME[demo.model]} draft={draft} typing={!sent && typedChars > 0}>
        {sent && (
          <Appear>
            <UserBubble>{demo.prompt}</UserBubble>
          </Appear>
        )}

        {thinking && (
          <span className="inline-flex items-center gap-1" role="status" aria-label="Thinking">
            {[0, 1, 2].map((dot) => (
              <motion.span
                key={dot}
                className="h-1.5 w-1.5 rounded-full bg-current opacity-50"
                animate={{ opacity: [0.2, 0.8, 0.2] }}
                transition={{ duration: 1, repeat: Infinity, delay: dot * 0.15 }}
              />
            ))}
          </span>
        )}

        {demo.blocks.slice(0, visibleBlocks).map((block, index) => (
          <Appear key={index}>
            <ReplyBlock block={block} />
          </Appear>
        ))}

        {finished && (
          <Appear>
            <MetaFooter credits={demo.credits} calls={demo.calls} model={CHIP_NAME[demo.model]} />
          </Appear>
        )}
      </AppWindow>
      </Stage>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setRun((value) => value + 1)}
          className="inline-flex h-11 items-center justify-center rounded-full bg-stone-900/[0.07] px-6 text-[15px] font-medium text-stone-900 transition-[background-color,transform] duration-150 ease-out-strong hover:bg-stone-900/[0.12] active:scale-[0.97] dark:bg-white/[0.1] dark:text-stone-100 dark:hover:bg-white/[0.16]"
        >
          Replay
        </button>
        <Link
          href="/login"
          className="inline-flex h-11 items-center justify-center rounded-full bg-stone-900 px-6 text-[15px] font-medium text-white transition-[transform,opacity] duration-150 ease-out-strong hover:opacity-90 active:scale-[0.97] dark:bg-white dark:text-stone-900"
        >
          Try this with your own files
        </Link>
      </div>
    </div>
  );
}