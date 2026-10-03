"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useLoopClock } from "./useLoopClock";

const EASE = [0.23, 1, 0.32, 1] as const;

/* Same palette as the real desktop app */
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

/*
 * Tool calls shown as terminal commands, matching the real app's DesktopDemo style.
 * Each entry appears in order, with a status line below it.
 */
const TOOLS: readonly {
  id: string;
  cmd: string;
  status: "Done" | "Running" | "Waiting for your approval";
  start: number;
  resolve: number;
  needsApproval: boolean;
}[] = [
  {
    id: "read",
    cmd: "read_file ./proposals/acme.docx",
    status: "Done",
    start: 800,
    resolve: 2000,
    needsApproval: false,
  },
  {
    id: "shell",
    cmd: "shell git status",
    status: "Done",
    start: 2400,
    resolve: 4000,
    needsApproval: false,
  },
  {
    id: "write",
    cmd: "write_file ./acme-summary.md",
    status: "Waiting for your approval",
    start: 4500,
    resolve: 99999, // stays waiting until loop resets
    needsApproval: true,
  },
];

const LOOP_MS = 10000;
const SETTLED_MS = 8000;
const FADE_OUT_MS = 9500;

function Appear({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function ToolsDemo() {
  const { ref, time } = useLoopClock(LOOP_MS, SETTLED_MS);

  return (
    <motion.div
      ref={ref}
      animate={{ opacity: time >= FADE_OUT_MS ? 0 : 1 }}
      transition={{ duration: 0.4 }}
      className={`overflow-hidden rounded-2xl shadow-lp-pop ${APP.frame}`}
    >
      {/* Title bar */}
      <div className={`flex h-10 shrink-0 items-center gap-3 border-b px-4 ${APP.topBar} ${APP.line}`}>
        <div className="flex items-center gap-[7px]">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <span className={`text-[13px] font-medium ${APP.muted}`}>AIGenius — Desktop Tools</span>
      </div>

      {/* Terminal tool cards */}
      <div className="space-y-2.5 p-4">
        {TOOLS.map((tool) => {
          if (time < tool.start) return null;
          const resolved = time >= tool.resolve;
          const status = resolved
            ? "Done"
            : tool.needsApproval
            ? "Waiting for your approval"
            : "Running";
          const isWaiting = status === "Waiting for your approval";

          return (
            <Appear key={tool.id}>
              <div
                className={`rounded-xl border px-4 py-3 transition-colors duration-300 ${
                  isWaiting ? "border-lp-accent/60 dark:border-lp-accent/50" : APP.line
                } ${APP.bubble}`}
              >
                {/* Command line */}
                <p className="font-mono text-[13px]">
                  <span className="select-none text-lp-accent">$&nbsp;</span>
                  {tool.cmd}
                </p>
                {/* Status */}
                <p
                  className={`mt-1 font-mono text-[12px] ${
                    isWaiting ? "text-lp-accent" : APP.muted
                  }`}
                >
                  {status}
                </p>

                {/* Allow / Deny buttons for approval-required tools */}
                {isWaiting && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className={`rounded-full bg-[#1f1f1e] px-4 py-1.5 text-[12px] font-medium text-white transition-opacity duration-150 hover:opacity-80 dark:bg-white dark:text-[#1f1f1e]`}
                    >
                      Allow
                    </button>
                    <button
                      type="button"
                      className={`rounded-full border px-4 py-1.5 text-[12px] font-medium transition-colors duration-150 ${APP.line} ${APP.muted} ${APP.hover}`}
                    >
                      Deny
                    </button>
                  </div>
                )}
              </div>
            </Appear>
          );
        })}
      </div>
    </motion.div>
  );
}
