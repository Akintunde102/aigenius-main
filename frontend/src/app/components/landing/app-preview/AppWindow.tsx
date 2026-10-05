"use client";

import { motion } from "framer-motion";
import type { ReactNode, Ref } from "react";
import { CheckIcon } from "../icons";
import {
  ArrowUpIcon,
  ChevronDownIcon,
  PaperclipIcon,
  UserIcon,
} from "./appIcons";
import { PREVIEW } from "./previewTheme";

const EASE = [0.23, 1, 0.32, 1] as const;

/** Fades and lifts a chat row in when it first mounts. Transform and opacity only. */
export function Appear({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

interface AppWindowProps {
  /** Needed by useLoopClock, which watches the demo to pause it off screen. */
  readonly windowRef?: Ref<HTMLDivElement>;
  readonly modelName: string;
  /** Used by looping demos to fade out just before the loop restarts. */
  readonly faded?: boolean;
  /** Text being typed into the composer. Empty shows the "Type..." placeholder. */
  readonly draft?: string;
  /** Shows a blinking caret after the draft. */
  readonly typing?: boolean;
  readonly children: ReactNode;
}

/** The desktop app window: title bar, a chat area, and the composer with its model chip. */
export function AppWindow({
  windowRef,
  modelName,
  faded = false,
  draft = "",
  typing = false,
  children,
}: AppWindowProps) {
  return (
    <div
      ref={windowRef}
      className={`overflow-hidden rounded-xl shadow-lp-lift transition-opacity duration-300 motion-reduce:transition-none ${
        faded ? "opacity-0" : "opacity-100"
      } ${PREVIEW.frame}`}
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

      <div className="flex h-[34rem] flex-col">
        <div className="flex-1 space-y-3.5 overflow-hidden px-7 pt-7 text-[15px]">
          {children}
        </div>

        <div className="px-6 pb-6">
          <div
            className={`rounded-3xl border p-3.5 ${PREVIEW.panel} ${PREVIEW.line}`}
          >
            <div className="flex items-start gap-3">
              <p
                className={`min-h-10 flex-1 truncate px-3 py-2 text-lg ${draft ? "" : PREVIEW.muted}`}
              >
                {draft || "Type..."}
                {typing && (
                  <span className="ml-px inline-block h-5 w-px translate-y-0.5 bg-current motion-safe:animate-pulse" />
                )}
              </p>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  draft ? PREVIEW.sendActive : PREVIEW.send
                }`}
              >
                <ArrowUpIcon className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 px-1">
              <span
                className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${PREVIEW.line}`}
              >
                {modelName}
                <ChevronDownIcon className="h-3 w-3" />
              </span>
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
    </div>
  );
}

export function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div
      className={`ml-auto w-fit max-w-[85%] rounded-3xl px-5 py-3.5 leading-relaxed ${PREVIEW.bubble}`}
    >
      {children}
    </div>
  );
}

export function AssistantText({ children }: { children: ReactNode }) {
  return <p className="leading-relaxed">{children}</p>;
}

interface ToolLineProps {
  readonly label: string;
  /** For example "done". Left out while the tool is still starting. */
  readonly status?: string;
  /** Pulses the status, used while the tool waits for the person. */
  readonly waiting?: boolean;
}

/** The collapsed tool row the app shows in a reply, for example "local_shell · done". */
export function ToolLine({ label, status, waiting = false }: ToolLineProps) {
  return (
    <p className="flex items-center gap-2 text-sm">
      <span className="font-medium">{label}</span>
      {status && (
        <span
          className={`${PREVIEW.muted} ${waiting ? "motion-safe:animate-pulse" : ""}`}
        >
          · {status}
        </span>
      )}
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`h-2 w-2 shrink-0 ${PREVIEW.muted}`}
        aria-hidden="true"
      >
        <polygon points="8 4 20 12 8 20" />
      </svg>
    </p>
  );
}

interface ApprovalCardProps {
  readonly tool: string;
  readonly target: string;
  /** True for a moment once the demo "clicks" Allow. */
  readonly allowed: boolean;
}

/** Shown while a tool that changes or reads something sensitive waits for the person. Not clickable. */
export function ApprovalCard({ tool, target, allowed }: ApprovalCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${PREVIEW.panel} ${PREVIEW.line}`}>
      <p className="text-sm font-medium">{tool}</p>
      <p
        className={`mt-2 rounded-lg px-3 py-2 font-mono text-[13px] ${PREVIEW.bubble}`}
      >
        {target}
      </p>
      <p className={`mt-3 text-[13px] ${PREVIEW.muted}`}>
        Waiting for your approval
      </p>
      <div className="mt-3 flex items-center gap-2">
        <span
          className={`rounded-full px-5 py-1.5 text-[13px] font-medium transition-[transform,opacity] duration-150 ease-out-strong ${PREVIEW.sendActive} ${
            allowed ? "scale-[0.96] opacity-70" : ""
          }`}
        >
          Allow
        </span>
        <span
          className={`rounded-full border px-5 py-1.5 text-[13px] ${PREVIEW.line} ${PREVIEW.muted}`}
        >
          Deny
        </span>
      </div>
    </div>
  );
}

interface MetaFooterProps {
  readonly credits: number;
  readonly calls: number;
  readonly model: string;
}

/** The credits line under a finished reply. */
export function MetaFooter({ credits, calls, model }: MetaFooterProps) {
  return (
    <p
      className={`flex items-center justify-between gap-3 pt-1 text-xs ${PREVIEW.muted}`}
    >
      <span>
        <span className={PREVIEW.accent}>{credits} credits</span> · {calls}{" "}
        {calls === 1 ? "call" : "calls"}
      </span>
      <span>{model} · just now</span>
    </p>
  );
}

/** Green tick used by the "6 subagent" style rows. */
export function DoneTick() {
  return <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />;
}
