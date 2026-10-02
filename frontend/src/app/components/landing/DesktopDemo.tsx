"use client";

import { motion } from "framer-motion";
import { useLoopClock } from "./useLoopClock";

const EASE = [0.23, 1, 0.32, 1] as const;

const LOOP_MS = 10500;
const SETTLED_MS = 7000;
const FADE_OUT_MS = 9900;
const APPROVE_MS = 5000;

/* Illustrative tool calls. */
const CALLS = [
  { id: "t1", tool: "read_file", target: "./proposals/acme.docx", start: 300, done: 1000, needsApproval: false },
  { id: "t2", tool: "shell", target: "git status", start: 1600, done: 2300, needsApproval: false },
  { id: "t3", tool: "write_file", target: "./acme-summary.md", start: 2900, done: 5700, needsApproval: true },
] as const;

type CallStatus = "pending" | "running" | "waiting" | "done";

const STATUS_LABEL: Record<Exclude<CallStatus, "pending">, string> = {
  running: "Running",
  waiting: "Waiting for your approval",
  done: "Done",
};

const TERMINAL_LINE = "border border-[color-mix(in_srgb,currentColor_22%,transparent)]";

function statusAt(call: (typeof CALLS)[number], time: number): CallStatus {
  if (time < call.start) return "pending";
  if (time >= call.done) return "done";
  return call.needsApproval ? "waiting" : "running";
}

export function DesktopDemo() {
  const { ref, time } = useLoopClock(LOOP_MS, SETTLED_MS);
  const approved = time >= APPROVE_MS;

  return (
    <motion.div
      ref={ref}
      animate={{ opacity: time >= FADE_OUT_MS ? 0 : 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-[19rem] rounded-3xl bg-lp-fg p-6 font-mono text-xs leading-relaxed text-lp-bg sm:p-10"
    >
      <ul className="space-y-3">
        {CALLS.map((call) => {
          const status = statusAt(call, time);
          if (status === "pending") return null;
          return (
            <motion.li
              key={call.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className={`rounded-xl px-4 py-3.5 ${TERMINAL_LINE}`}
            >
              <p>
                <span className="opacity-50">$</span> {call.tool} {call.target}
              </p>
              <p className={`mt-1 opacity-60 ${status === "waiting" && !approved ? "motion-safe:animate-pulse" : ""}`}>
                {STATUS_LABEL[status]}
              </p>
              {status === "waiting" && (
                <div className="mt-3 flex items-center gap-2">
                  <motion.span
                    animate={{ scale: approved ? 0.92 : 1, opacity: approved ? 0.6 : 1 }}
                    transition={{ duration: 0.15 }}
                    className="rounded-full bg-lp-bg px-4 py-1.5 text-lp-fg"
                  >
                    Allow
                  </motion.span>
                  <span className={`rounded-full px-4 py-1.5 opacity-70 ${TERMINAL_LINE}`}>Deny</span>
                </div>
              )}
            </motion.li>
          );
        })}
      </ul>
    </motion.div>
  );
}
