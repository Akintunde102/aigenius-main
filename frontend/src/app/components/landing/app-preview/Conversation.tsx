"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CopyIcon, DotsHorizontalIcon, RepeatIcon, TrashIcon, TriangleIcon } from "./appIcons";
import { SUGGESTIONS, type Block, type Chat, type Message, type ModelName, type Segment } from "./data";
import { APP } from "./theme";

const EASE = [0.23, 1, 0.32, 1] as const;

export interface StreamingReply {
  readonly chatId: string;
  readonly model: ModelName;
  readonly words: readonly string[];
  readonly shown: number;
}

/** Inline pop-up action menu that appears when clicking ⋯ on a user message. */
function MessageMenu({
  onCopy,
  onDelete,
  onClose,
}: {
  onCopy: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 4 }}
      transition={{ duration: 0.12, ease: EASE }}
      className={`absolute bottom-full right-0 z-30 mb-1.5 w-36 origin-bottom-right rounded-xl border p-1 shadow-xl ${APP.popover} ${APP.line}`}
    >
      <button
        type="button"
        onClick={onCopy}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] ${APP.hover}`}
      >
        <CopyIcon className={`h-3.5 w-3.5 ${APP.muted}`} />
        Copy
      </button>
      <button
        type="button"
        onClick={onDelete}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-red-500 ${APP.hover}`}
      >
        <TrashIcon className="h-3.5 w-3.5" />
        Delete
      </button>
    </motion.div>
  );
}

function renderSegments(segments: readonly Segment[]): ReactNode {
  return segments.map((segment, index) =>
    segment.bold ? (
      <strong key={index} className="font-semibold">
        {segment.text}
      </strong>
    ) : (
      <span key={index}>{segment.text}</span>
    ),
  );
}

interface DisclosureProps {
  summary: ReactNode;
  children: ReactNode;
}

/** The "Thought" and tool rows: click to expand the detail, exactly like the real app. */
function Disclosure({ summary, children }: DisclosureProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 text-left"
      >
        {summary}
        <TriangleIcon className={`h-2 w-2 shrink-0 ${APP.muted} transition-transform duration-200 ease-out-strong ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className={`mt-2 ${APP.muted}`}
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "heading":
      return block.level === 1 ? (
        <h3 className={`mt-7 border-b pb-2 text-base font-medium ${APP.tableLine}`}>{block.text}</h3>
      ) : (
        <h4 className={`mt-6 border-b pb-1.5 text-sm font-medium ${APP.tableLine}`}>{block.text}</h4>
      );
    case "paragraph":
      return <p className="mt-3 leading-relaxed">{renderSegments(block.segments)}</p>;
    case "list":
      return (
        <ul className="mt-3 list-disc space-y-1.5 pl-6 leading-relaxed">
          {block.items.map((item, index) => (
            <li key={index}>{renderSegments(item)}</li>
          ))}
        </ul>
      );
    case "thought":
      return (
        <Disclosure
          summary={
            <span className="text-amber-600 dark:text-amber-400 text-[13px]">
              <span className="mr-1 opacity-60">·</span>Thought
            </span>
          }
        >
          <p className="leading-relaxed text-[13px] text-black/50 dark:text-white/50 italic">{block.text}</p>
        </Disclosure>
      );
    case "tool":
      return (
        <Disclosure
          summary={
            <span>
              {block.check && <span className="mr-1 text-emerald-600 dark:text-emerald-400">✓</span>}
              <span className="font-medium">{block.label}</span>
              {block.status && <span className={APP.muted}> · {block.status}</span>}
            </span>
          }
        >
          {block.detail && (
            <pre className={`whitespace-pre-wrap rounded-lg p-3 font-mono text-xs ${APP.bubble}`}>{block.detail}</pre>
          )}
        </Disclosure>
      );
    case "table":
      return (
        <div className="mt-3 overflow-x-auto">
          <table className="border-collapse text-[13px]">
            <thead>
              <tr>
                {block.headers.map((header) => (
                  <th key={header} className={`border px-4 py-2 text-center font-medium ${APP.tableLine} ${APP.bubble}`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`border px-4 py-2 ${APP.tableLine} ${cellIndex === 0 ? "font-medium" : ""}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default: {
      const unreachable: never = block;
      return unreachable;
    }
  }
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Thinking">
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          className="h-1.5 w-1.5 rounded-full bg-current opacity-50"
          animate={{ opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 1, repeat: Infinity, delay: dot * 0.15 }}
        />
      ))}
    </span>
  );
}

interface ConversationProps {
  chat: Chat;
  streaming: StreamingReply | null;
  onSuggest: (text: string) => void;
  onResend?: (message: Message) => void;
  onDeleteMessage?: (messageId: string) => void;
}

export function Conversation({ chat, streaming, onSuggest, onResend, onDeleteMessage }: ConversationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const activeStream = streaming && streaming.chatId === chat.id ? streaming : null;

  // A chat you open starts at the top. New activity (you send, words stream in, a reply lands)
  // scrolls the message list itself to the bottom. scrollIntoView would also scroll the whole page.
  const messageCount = chat.messages.length;
  const streamedWords = activeStream?.shown ?? 0;
  const previous = useRef({ chatId: chat.id, count: messageCount });
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const last = previous.current;
    if (last.chatId !== chat.id) {
      element.scrollTop = 0;
    } else if (messageCount > last.count || streamedWords > 0) {
      element.scrollTop = element.scrollHeight;
    }
    previous.current = { chatId: chat.id, count: messageCount };
  }, [chat.id, messageCount, streamedWords]);

  const isEmpty = chat.messages.length === 0 && !activeStream;

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pb-6 pt-12 sm:px-12">
      {isEmpty ? (
        <motion.div
          key={chat.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="mx-auto mt-10 max-w-xl text-center"
        >
          <p className="text-2xl font-medium tracking-tight">What can I help with?</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSuggest(suggestion)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors duration-150 ${APP.line} ${APP.hover}`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div
          key={chat.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="mx-auto max-w-3xl space-y-6 text-[13.5px]"
        >
          {chat.messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className={`relative ml-auto w-fit max-w-[85%] rounded-3xl px-5 py-3.5 ${APP.bubble}`}>
                <p className="leading-relaxed">{message.text}</p>
                <p className={`mt-2 flex items-center justify-end gap-2 text-[11px] ${APP.muted}`}>
                  {message.ago ?? "just now"}
                  <button
                    type="button"
                    aria-label="Resend message"
                    onClick={() => onResend?.(message)}
                    className={`rounded transition-colors duration-100 ${APP.hover} hover:text-current`}
                  >
                    <RepeatIcon className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="Message options"
                    onClick={() => setMenuOpenId((prev) => (prev === message.id ? null : message.id))}
                    className={`rounded transition-colors duration-100 ${APP.hover} hover:text-current`}
                  >
                    <DotsHorizontalIcon className="h-3.5 w-3.5" />
                  </button>
                </p>
                <AnimatePresence>
                  {menuOpenId === message.id && (
                    <MessageMenu
                      onCopy={() => {
                        void navigator.clipboard?.writeText(message.text);
                        setMenuOpenId(null);
                      }}
                      onDelete={() => {
                        onDeleteMessage?.(message.id);
                        setMenuOpenId(null);
                      }}
                      onClose={() => setMenuOpenId(null)}
                    />
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div key={message.id}>
                {message.blocks.map((block, index) => (
                  <BlockView key={index} block={block} />
                ))}
                <p className={`mt-4 flex items-center justify-between gap-3 text-[11px] ${APP.muted}`}>
                  <span>
                    <span className="text-sky-600 dark:text-sky-400">
                      {(message.id.charCodeAt(0) + message.id.charCodeAt(message.id.length - 1)) % 14 + 2} credits
                    </span>
                    {" · "}
                    {message.id.length % 3 + 1} {message.id.length % 3 + 1 === 1 ? "call" : "calls"}
                  </span>
                  <span>{message.model} · {message.ago ?? "just now"}</span>
                </p>
              </div>
            ),
          )}

          {activeStream && (
            <div>
              {activeStream.shown === 0 ? (
                <ThinkingDots />
              ) : (
                <p className="leading-relaxed">{activeStream.words.slice(0, activeStream.shown).join(" ")}</p>
              )}
              <p className={`mt-4 flex items-center justify-between gap-3 text-[11px] ${APP.muted}`}>
                <span>
                  <span className="text-sky-600 dark:text-sky-400">— credits</span>
                  {" · "}
                  — calls
                </span>
                <span>{activeStream.model} · just now</span>
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
