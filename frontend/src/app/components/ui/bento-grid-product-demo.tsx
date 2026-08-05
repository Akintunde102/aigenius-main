"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BotMessageSquare,
  CalendarClock,
  FileText,
  Image as ImageIcon,
  LayoutTemplate,
  Mic,
  Paperclip,
  Search,
  Slack,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Product previews that live inside bento cards.
 * These are intentionally simplified (not full replicas) but mirror the real app:
 * chat composer with attachments, workflow canvas, models, scheduling.
 */

/* ------------------------------------------------------------------ */
/* 1. Multi-model chat (large card)                                    */
/* ------------------------------------------------------------------ */
export function BentoDemoChat() {
  const reduce = useReducedMotion();
  return (
    <div className="flex h-full flex-col p-4">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
        Chat
      </p>

      <div className="flex-1 space-y-2.5 text-[13px] leading-relaxed">
        <motion.div
          initial={{ opacity: 0, x: reduce ? 0 : 10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="ml-auto max-w-[85%] rounded-xl rounded-br-sm border border-cyan-500/20 bg-cyan-500/[0.08] px-3 py-2 text-zinc-100"
        >
          Summarize this PDF and draft a reply to the team.
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: reduce ? 0 : -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex items-start gap-2"
        >
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500 to-emerald-500">
            <BotMessageSquare className="h-3 w-3 text-white" />
          </div>
          <div className="max-w-[85%] rounded-xl rounded-tl-sm border border-white/[0.07] bg-zinc-900/70 px-3 py-2 text-zinc-300">
            Here's a 5-bullet summary of the proposal, plus a draft reply you can
            edit. Key risk: pricing on page 3.
          </div>
        </motion.div>
      </div>

      {/* Composer mock */}
      <motion.div
        initial={{ opacity: 0, y: reduce ? 0 : 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.45, duration: 0.4 }}
        className="mt-3 rounded-xl border border-white/[0.08] bg-zinc-900/60 p-2"
      >
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-black/30 px-1.5 py-0.5 text-[10px] text-zinc-400">
            <FileText className="h-2.5 w-2.5 text-cyan-400" /> proposal.pdf
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-black/30 px-1.5 py-0.5 text-[10px] text-zinc-400">
            <ImageIcon className="h-2.5 w-2.5 text-emerald-400" /> chart.png
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-zinc-500">
            Ask anything across GPT, Claude, Gemini…
          </span>
          <div className="flex items-center gap-1">
            <Paperclip className="h-3.5 w-3.5 text-zinc-500" />
            <Mic className="h-3.5 w-3.5 text-zinc-500" />
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
              <ArrowRight className="h-3 w-3 text-zinc-900" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Workflows from a sentence (large card)                           */
/* ------------------------------------------------------------------ */
export function BentoDemoWorkflow() {
  const reduce = useReducedMotion();
  const nodes = [
    { icon: CalendarClock, label: "Schedule", detail: "Daily · 6:00 PM", tone: "border-cyan-500/30 bg-cyan-500/[0.06]" },
    { icon: Search, label: "Summarize", detail: "AI step", tone: "border-emerald-500/30 bg-emerald-500/[0.06]" },
    { icon: Slack, label: "Slack", detail: "#sales", tone: "border-amber-500/30 bg-amber-500/[0.06]" },
  ];

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
          Workflow canvas
        </p>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
          Built from chat
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
        {nodes.map((node, i) => {
          const Icon = node.icon;
          return (
            <React.Fragment key={node.label}>
              {i > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.15 }}
                  className="hidden text-zinc-600 sm:block"
                >
                  <ArrowRight className="h-4 w-4" />
                </motion.div>
              )}
              <motion.div
                initial={{ opacity: 0, scale: reduce ? 1 : 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + i * 0.15, duration: 0.35 }}
                className={cn(
                  "w-full max-w-[9rem] rounded-lg border p-2.5 text-center sm:w-32",
                  node.tone
                )}
              >
                <Icon className="mx-auto mb-1 h-4 w-4 text-zinc-200" />
                <p className="text-[11px] font-medium text-white">{node.label}</p>
                <p className="mt-0.5 text-[10px] text-zinc-500">{node.detail}</p>
              </motion.div>
            </React.Fragment>
          );
        })}
      </div>

      <p className="mt-3 text-center text-[11px] text-zinc-500">
        “Send me a daily sales summary to Slack at 6pm.”
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Every top model (small card)                                     */
/* ------------------------------------------------------------------ */
export function BentoDemoModels() {
  const models = ["GPT", "Claude", "Gemini", "Llama", "Grok", "DeepSeek"];
  return (
    <div className="flex h-full flex-col justify-center p-4">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
        One balance
      </p>
      <div className="flex flex-wrap gap-1.5">
        {models.map((m, i) => (
          <motion.span
            key={m}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="rounded-lg border border-white/[0.08] bg-zinc-900/70 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300"
          >
            {m}
          </motion.span>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-zinc-500">
        Switch models mid-conversation. Pay per use — no subscription.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Desktop & local files (small card)                               */
/* ------------------------------------------------------------------ */
export function BentoDemoDesktop() {
  return (
    <div className="flex h-full flex-col justify-center p-4">
      <div className="mb-3 flex items-center gap-2">
        <LayoutTemplate className="h-4 w-4 text-cyan-400" />
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
          Desktop app
        </p>
      </div>
      <div className="space-y-2 text-[12px] text-zinc-400">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>Chat on top of your projects & files</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
          <span>Voice dictation & audio conversations</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span>Same chats & balance as the web app</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Scheduling & runs (small card)                                   */
/* ------------------------------------------------------------------ */
export function BentoDemoSchedule() {
  return (
    <div className="flex h-full flex-col justify-center p-4">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
        Run on autopilot
      </p>
      <div className="space-y-2">
        {[
          { label: "Daily digest", time: "6:00 PM", active: true },
          { label: "Weekly report", time: "Mon 9:00 AM", active: true },
        ].map((job) => (
          <div
            key={job.label}
            className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-zinc-900/60 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[12px] text-zinc-200">{job.label}</span>
            </div>
            <span className="text-[11px] text-zinc-500">{job.time}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-zinc-500">
        Cron schedules & webhooks when you're ready to go live.
      </p>
    </div>
  );
}
