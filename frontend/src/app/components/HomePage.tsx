import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  BotMessageSquare,
  Building2,
  CheckCircle2,
  ChevronDown,
  Gauge,
  Megaphone,
  Wrench,
} from "lucide-react";
import { GoogleSignIn } from "@/app/components/auth/GoogleSignIn";
import { PublicPageShell } from "@/app/components/PublicPageShell";
import { FOCUS_RING } from "@/app/components/public-page-shell.constants";
import { cn } from "@/lib/utils";

const HERO_SIGNUP_SURFACE =
  "rounded-2xl border border-zinc-700/45 bg-zinc-950 text-zinc-100 shadow-2xl shadow-black/35";

const PRODUCT_FEATURES = [
  {
    title: "All the best models",
    description: "GPT, Claude, Gemini, and more—one place, one balance.",
    icon: BotMessageSquare,
    iconClass: "bg-sky-500/15 text-sky-300",
  },
  {
    title: "Automations from a sentence",
    description: "Describe what you need. Get a workflow you can edit.",
    icon: Blocks,
    iconClass: "bg-emerald-500/15 text-emerald-300",
  },
  {
    title: "Edit anything",
    description: "Tweak triggers, steps, and settings on the canvas.",
    icon: Wrench,
    iconClass: "bg-amber-500/15 text-amber-300",
  },
  {
    title: "Run on a schedule",
    description: "Cron jobs and webhooks when you're ready to go live.",
    icon: Gauge,
    iconClass: "bg-cyan-500/15 text-cyan-300",
  },
] as const;

const AUDIENCE_BLOCKS = [
  {
    title: "Builders & founders",
    description: "Ship integrations and agents without starting from scratch.",
    icon: Wrench,
  },
  {
    title: "Operators & creators",
    description: "Automate repetitive work—no code required.",
    icon: Megaphone,
  },
  {
    title: "Growth teams",
    description: "One shared credit pool. No per-seat fees.",
    icon: Building2,
  },
] as const;

const HERO_BULLETS = [
  "Google sign-in",
  "Top models, one balance",
  "Describe it, we build it",
  "Edit every step",
] as const;

function SectionIntro({
  id,
  eyebrow,
  title,
  description,
  centered = false,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  centered?: boolean;
}) {
  return (
    <div className={cn(centered && "mx-auto max-w-2xl text-center")}>
      {eyebrow ? (
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
          {eyebrow}
        </p>
      ) : null}
      <h2
        id={id}
        className="text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl"
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-3 text-sm leading-6 text-zinc-400 sm:text-base",
            centered && "mx-auto max-w-xl",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

const HomePage = () => {
  return (
    <PublicPageShell>
      <section className="relative border-b border-white/[0.06] lg:min-h-[calc(100vh-4.5rem)] lg:flex lg:flex-col lg:justify-center">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:py-14 lg:grid-cols-12 lg:items-center lg:gap-16 lg:px-8 lg:py-16">
          <div className="relative z-[1] order-2 lg:order-1 lg:col-span-7">
            <p className="mb-4 inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-zinc-300">
              AI chat + workflows · pay as you go
            </p>
            <h1 className="max-w-2xl text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
              Talk to top AI models.
              <span className="mt-1 block text-zinc-400">Automate in plain English.</span>
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-zinc-400 sm:text-lg">
              One workspace for chat and visual automations. No subscription—pay only
              for what you use.
            </p>

            <ul className="mt-6 grid gap-2.5 text-sm text-zinc-300 sm:grid-cols-2">
              {HERO_BULLETS.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-emerald-400/90"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside
            className="relative z-[1] order-1 !w-full max-w-none !bg-transparent lg:order-2 lg:col-span-5 lg:flex lg:justify-end lg:self-center"
            style={{ background: "transparent" }}
            aria-label="Sign up panel"
          >
            <div
              className={cn(
                "h-fit w-full max-w-[min(100%,30rem)] overflow-hidden",
                HERO_SIGNUP_SURFACE,
                "space-y-5 p-6 sm:space-y-6 sm:p-8",
              )}
            >
              <div className="space-y-2 text-center">
                <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  Create your account
                </h2>
                <p className="text-sm text-zinc-400">
                  Start chatting with AI models today
                </p>
              </div>

              <GoogleSignIn
                variant="signup"
                className="!h-12 !rounded-xl !text-sm !font-medium !border-zinc-500 !bg-white !text-zinc-900 hover:!border-cyan-400 hover:!bg-cyan-50 focus-visible:!ring-2 focus-visible:!ring-cyan-500 focus-visible:!ring-offset-0"
              />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wide">
                  <span className="bg-zinc-950 px-3 text-zinc-500">Secure authentication</span>
                </div>
              </div>

              <div className="space-y-1.5 text-center text-sm text-zinc-400">
                <p>We use Google&apos;s secure authentication system.</p>
                <p className="text-xs text-zinc-500">
                  Your data is protected and never shared with third parties.
                </p>
              </div>
            </div>
          </aside>
        </div>
        {/* Subtle scroll down indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-1 text-zinc-500/60 text-xs animate-pulse pointer-events-none">
          <span className="font-medium tracking-wide">Scroll to explore</span>
          <ChevronDown className="h-4 w-4 animate-bounce text-zinc-600" />
        </div>
      </section>

      <section className="relative border-b border-white/[0.06] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionIntro
            centered
            eyebrow="Product preview"
            title="Chat your idea. Get a workflow you can run."
            description="Describe a task in the chat—AIGenius builds an editable automation on the canvas."
          />

          <div className="relative mx-auto mt-12 max-w-5xl overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-950 shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2 border-b border-white/[0.06] bg-zinc-900/50 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
              </div>
              <div className="mx-auto hidden h-6 w-64 items-center justify-center rounded-md border border-white/[0.06] bg-black/40 text-[11px] text-zinc-500 sm:flex">
                app.aigenius.com
              </div>
            </div>

            <div className="grid min-h-[420px] divide-y divide-white/[0.06] bg-zinc-950/80 lg:grid-cols-12 lg:divide-x lg:divide-y-0">
              <div className="flex flex-col p-5 lg:col-span-5">
                <p className="mb-4 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Chat
                </p>
                <div className="flex-1 space-y-3 text-sm">
                  <div className="rounded-lg border border-white/[0.06] bg-zinc-900/60 p-3">
                    <p className="text-zinc-300">
                      Send me a daily sales summary to Slack at 6pm.
                    </p>
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
                    <p className="text-zinc-300">
                      Done—I built a scheduled workflow. Edit it on the right.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col p-5 lg:col-span-7">
                <p className="mb-4 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Workflow
                </p>
                <div className="flex flex-1 flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                  {[
                    { label: "Schedule", detail: "Daily · 6:00 PM" },
                    { label: "Summarize", detail: "AI step" },
                    { label: "Slack", detail: "#sales" },
                  ].map((node, index) => (
                    <div key={node.label} className="flex items-center gap-3 sm:flex-col sm:gap-2">
                      {index > 0 ? (
                        <ArrowRight className="hidden h-4 w-4 text-zinc-600 sm:block" aria-hidden />
                      ) : null}
                      <div className="w-36 rounded-lg border border-white/[0.08] bg-zinc-900/80 p-3 text-center">
                        <p className="text-xs font-medium text-white">{node.label}</p>
                        <p className="mt-1 text-[11px] text-zinc-500">{node.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="what-you-get"
        className="relative border-b border-white/[0.06] bg-zinc-950/30 py-16 sm:py-20 lg:py-24"
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionIntro
            id="what-you-get"
            title="Everything included"
            description="Chat, automate, and schedule—from day one."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {PRODUCT_FEATURES.map(({ title, description, icon: Icon, iconClass }) => (
              <article
                key={title}
                className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-5 transition-colors hover:border-white/10 hover:bg-zinc-900/60"
              >
                <div
                  className={cn(
                    "mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg",
                    iconClass,
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <h3 className="text-base font-medium text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-zinc-400">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="for-whom" className="border-b border-white/[0.06] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionIntro
            id="for-whom"
            centered
            title="For people who build and run things"
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {AUDIENCE_BLOCKS.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="rounded-xl border border-white/[0.06] bg-zinc-900/30 p-5"
              >
                <Icon className="h-5 w-5 text-zinc-400" aria-hidden />
                <h3 className="mt-4 text-base font-medium text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-zinc-400">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="final-cta" className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/50 px-6 py-10 sm:px-10 sm:py-12">
            <h2
              id="final-cta"
              className="max-w-xl text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl"
            >
              Start building in seconds
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-400 sm:text-base">
              Free to start. Pay only when you run.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link
                prefetch
                href="/signup"
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 active:scale-[0.99]",
                  FOCUS_RING,
                )}
              >
                Create account
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                prefetch
                href="/published-conversations"
                className={cn(
                  "text-sm font-medium text-zinc-400 underline underline-offset-4 transition hover:text-white",
                  FOCUS_RING,
                )}
              >
                Browse conversations
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
};

export default HomePage;
