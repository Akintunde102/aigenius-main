"use client";

import { GoogleSignIn } from "@/app/components/auth/GoogleSignIn";
import { FOCUS_RING } from "@/app/components/public-page-shell.constants";
import { PublicPageShell } from "@/app/components/PublicPageShell";
import { FEATURE_FLAGS } from "@/lib/config/features";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BotMessageSquare,
  Blocks,
  ChevronDown,
  Download,
  Gauge,
  LayoutTemplate,
  Mic,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  BentoCard,
  BentoGrid,
  LandingAmbientBackground,
} from "@/app/components/ui";
import {
  BentoDemoChat,
  BentoDemoDesktop,
  BentoDemoModels,
  BentoDemoSchedule,
  BentoDemoWorkflow,
} from "@/app/components/ui/bento-grid-product-demo";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function SectionIntro({
  eyebrow,
  title,
  description,
  centered = true,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  centered?: boolean;
}) {
  return (
    <div className={cn(centered && "mx-auto max-w-2xl text-center")}>
      {eyebrow ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400/80">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className={cn("mt-4 text-base leading-7 text-zinc-400", centered && "mx-auto max-w-xl")}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

const HomePage = () => {
  const workflowsEnabled = FEATURE_FLAGS.WORKFLOWS;
  const reduce = useReducedMotion();

  return (
    <PublicPageShell>
      <div className="relative">
        <LandingAmbientBackground />

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section className="relative border-b border-white/[0.06]">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-16 pt-14 text-center sm:px-6 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-28">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={reduce ? undefined : fadeUp}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {workflowsEnabled
                  ? "AI chat + workflows · desktop app · pay as you go"
                  : "AI chat · desktop app · pay as you go"}
              </span>
            </motion.div>

            <motion.h1
              initial="hidden"
              animate="visible"
              variants={reduce ? undefined : fadeUp}
              transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 max-w-3xl text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              Every top AI model,{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                in one workspace
              </span>
            </motion.h1>

            <motion.p
              initial="hidden"
              animate="visible"
              variants={reduce ? undefined : fadeUp}
              transition={{ duration: 0.6, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="mt-5 max-w-2xl text-balance text-base leading-7 text-zinc-400 sm:text-lg"
            >
              {workflowsEnabled
                ? "Chat with GPT, Claude, Gemini and more. Turn sentences into automations you can edit and schedule. Pay only for what you use."
                : "Chat with GPT, Claude, Gemini and more — with files, images and voice. Pay only for what you use."}
            </motion.p>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={reduce ? undefined : fadeUp}
              transition={{ duration: 0.6, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="mt-9 flex flex-wrap items-center justify-center gap-3"
            >
              <Link
                prefetch
                href="/signup"
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-zinc-900 shadow-lg shadow-cyan-950/40 transition hover:bg-zinc-100 active:scale-[0.99]",
                  FOCUS_RING,
                )}
              >
                Start chatting free
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>

              {/* Desktop download — placeholder for now */}
              <button
                type="button"
                onClick={() => {}}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-zinc-100 backdrop-blur transition hover:border-cyan-400/40 hover:bg-white/[0.06] active:scale-[0.99]",
                  FOCUS_RING,
                )}
              >
                <Download className="h-4 w-4" aria-hidden />
                Download desktop app
              </button>
            </motion.div>

            <motion.p
              initial="hidden"
              animate="visible"
              variants={reduce ? undefined : fadeUp}
              transition={{ duration: 0.6, delay: 0.32 }}
              className="mt-4 text-xs text-zinc-500"
            >
              No credit card required · macOS, Windows & Linux
            </motion.p>

            {/* Scroll hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="pointer-events-none mt-14 hidden flex-col items-center gap-1 text-zinc-500/70 lg:flex"
            >
              <span className="text-[11px] font-medium tracking-wide">Scroll to explore</span>
              <ChevronDown className="h-4 w-4 animate-bounce text-zinc-600" aria-hidden />
            </motion.div>
          </div>
        </section>

        {/* ── PRODUCT BENTO — what AIGenius actually does ─────── */}
        <section className="relative border-b border-white/[0.06] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionIntro
              eyebrow="The product"
              title="See what AIGenius does"
              description="Chat with any model, attach files and images, and turn requests into running automations — all in one place."
            />

            <div className="mt-12">
              <BentoGrid>
                {/* Large cards */}
                <BentoCard className="md:col-span-2 md:row-span-3 min-h-[22rem]" delay={0}>
                  <BentoDemoChat />
                  <CardCaption
                    title="Chat with every top model"
                    description="One conversation for GPT, Claude, Gemini and more — with files, images and voice built in."
                  />
                </BentoCard>

                {workflowsEnabled ? (
                  <BentoCard className="md:row-span-3 min-h-[22rem]" delay={0.1}>
                    <BentoDemoWorkflow />
                    <CardCaption
                      title="Automations from a sentence"
                      description="Describe the task. Get an editable workflow on the canvas."
                    />
                  </BentoCard>
                ) : (
                  <BentoCard className="md:row-span-3 min-h-[22rem]" delay={0.1}>
                    <BentoDemoModels />
                    <CardCaption
                      title="One balance, every model"
                      description="Top up once. Use any model. Pay per request."
                    />
                  </BentoCard>
                )}

                {/* Small cards */}
                <BentoCard className="md:row-span-2 min-h-[13rem]" delay={0.15}>
                  <BentoDemoModels />
                </BentoCard>
                <BentoCard className="md:row-span-2 min-h-[13rem]" delay={0.2}>
                  <BentoDemoDesktop />
                </BentoCard>
                <BentoCard className="md:row-span-2 min-h-[13rem]" delay={0.25}>
                  <BentoDemoSchedule />
                </BentoCard>
              </BentoGrid>
            </div>
          </div>
        </section>

        {/* ── WHY / PRICING ────────────────────────────────────── */}
        <section className="relative border-b border-white/[0.06] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionIntro
              eyebrow="Why AIGenius"
              title="Professional AI, without subscriptions"
              description="No seats, no plans, no lock-in. A single balance that works across chat, workflows and the desktop app."
            />

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: BotMessageSquare,
                  title: "All the best models",
                  description: "GPT, Claude, Gemini and more — one place, one balance.",
                },
                {
                  icon: Blocks,
                  title: "Automate in plain English",
                  description: "Describe a task, get a workflow you can edit and run on a schedule.",
                },
                {
                  icon: Wallet,
                  title: "Pay only for what you use",
                  description: "Top up when you need. No monthly fees or per-seat pricing.",
                },
              ].map(({ icon: Icon, title, description }, i) => (
                <motion.article
                  key={title}
                  initial={{ opacity: 0, y: reduce ? 0 : 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="rounded-2xl border border-white/[0.07] bg-zinc-950/60 p-6 backdrop-blur-sm transition-colors hover:border-white/[0.12]"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/[0.08] text-cyan-300">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="text-base font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* ── DESKTOP SECTION ──────────────────────────────────── */}
        <section className="relative border-b border-white/[0.06] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
            <motion.div
              initial={{ opacity: 0, x: reduce ? 0 : -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6 }}
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/80">
                Desktop app
              </p>
              <h2 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                AIGenius on your machine
              </h2>
              <p className="mt-4 max-w-lg text-base leading-7 text-zinc-400">
                Chat on top of your projects, dictate with your voice, and keep your
                conversations and balance in sync with the web app.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-zinc-300">
                {[
                  { icon: Mic, label: "Voice dictation & audio conversations" },
                  { icon: LayoutTemplate, label: "Works with your local files & projects" },
                  { icon: Gauge, label: "Fast, native experience on macOS, Windows & Linux" },
                ].map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-emerald-300">
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {}}
                className={cn(
                  "mt-8 inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-zinc-100 backdrop-blur transition hover:border-emerald-400/40 hover:bg-white/[0.06] active:scale-[0.99]",
                  FOCUS_RING,
                )}
              >
                <Download className="h-4 w-4" aria-hidden />
                Download desktop app
              </button>
            </motion.div>

            {/* Desktop app mock */}
            <motion.div
              initial={{ opacity: 0, x: reduce ? 0 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative"
            >
              <div className="overflow-hidden rounded-xl border border-white/[0.09] bg-zinc-950 shadow-2xl shadow-black/50">
                <div className="flex items-center gap-2 border-b border-white/[0.07] bg-zinc-900/60 px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                  </div>
                  <span className="mx-auto text-[11px] text-zinc-500">AIGenius Desktop</span>
                </div>
                <div className="grid min-h-[16rem] grid-cols-[3.5rem_1fr] divide-x divide-white/[0.06]">
                  <div className="flex flex-col items-center gap-3 bg-zinc-950/80 py-4">
                    {["C", "P", "F", "S"].map((letter) => (
                      <div
                        key={letter}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.06] bg-zinc-900/70 text-[10px] font-medium text-zinc-500"
                      >
                        {letter}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="ml-auto max-w-[80%] rounded-xl rounded-br-sm border border-cyan-500/20 bg-cyan-500/[0.08] px-3 py-2 text-[12px] text-zinc-100">
                      Index this project and summarize the architecture.
                    </div>
                    <div className="max-w-[85%] rounded-xl rounded-tl-sm border border-white/[0.07] bg-zinc-900/70 px-3 py-2 text-[12px] text-zinc-300">
                      Done — I mapped 3 services, their entry points, and key data flows. Here's a high-level overview…
                    </div>
                    <div className="rounded-lg border border-white/[0.07] bg-zinc-900/60 px-3 py-2 text-[11px] text-zinc-500">
                      Ask about this codebase…
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────────── */}
        <section className="relative py-16 sm:py-20 lg:py-24">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: reduce ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6 }}
              className="relative overflow-hidden rounded-3xl border border-white/[0.09] bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 px-6 py-12 text-center sm:px-12 sm:py-16"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                  background:
                    "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(8,145,178,0.18), transparent 70%)",
                }}
                aria-hidden
              />
              <h2 className="relative text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Start building with AIGenius
              </h2>
              <p className="relative mx-auto mt-3 max-w-lg text-base leading-7 text-zinc-400">
                Free to start. Pay only when you run.
              </p>
              <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
                <GoogleSignIn
                  variant="signup"
                  className="!h-11 !rounded-xl !px-6 !text-sm !font-semibold !border-zinc-500 !bg-white !text-zinc-900 hover:!bg-zinc-100"
                />
                <Link
                  prefetch
                  href="/published-conversations"
                  className={cn(
                    "text-sm font-medium text-zinc-400 underline underline-offset-4 transition hover:text-white",
                    FOCUS_RING,
                  )}
                >
                  Browse public conversations
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </PublicPageShell>
  );
};

function CardCaption({ title, description }: { title: string; description: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-white/[0.06] bg-gradient-to-t from-zinc-950/95 via-zinc-950/70 to-transparent px-4 pb-4 pt-8">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-zinc-400">{description}</p>
    </div>
  );
}

export default HomePage;
