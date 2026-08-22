"use client";

import Link from "next/link";
import { PublicPageShell } from "@/app/components/PublicPageShell";
import { FOCUS_RING } from "@/app/components/public-page-shell.constants";
import { HomeHeroScreenshot } from "@/app/components/home/HomeHeroScreenshot";
import { DesktopDownloadDropdown } from "@/app/components/home/DesktopDownloadDropdown";
import { HomePageNav } from "@/app/components/home/HomePageNav";
import { cn } from "@/lib/utils";

const VALUE_STATEMENTS = [
  "Chat with GPT, Claude, Gemini, and more — in one workspace.",
  "Work on your projects with files, images, and voice.",
  "Pay only for what you use — no subscriptions or seats.",
] as const;

const HomePage = () => {
  const year = new Date().getFullYear();

  return (
    <PublicPageShell
      hideHeader
      hideAmbient
      showFooter={false}
      rootClassName="bg-[#f5f4f0] text-zinc-900 selection:bg-emerald-500 selection:text-zinc-950 dark:bg-[#0b0b0e] dark:text-zinc-100 min-h-screen"
      contentClassName="flex-1"
    >
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#f5f4f0] dark:bg-[#0b0b0e]">
        {/* Full-bleed/Split Background App Screenshot */}
        <div className="relative flex min-h-[100dvh] flex-col sm:flex-row">
          {/* Left / Full App Screenshot Canvas */}
          <div
            className="flex w-full items-start justify-start overflow-hidden bg-[#f5f4f0] dark:bg-[#0b0b0e] sm:w-7/12 sm:min-h-[100dvh] lg:w-3/5"
            aria-hidden
          >
            <div className="relative w-full">
              {/* Subtle ambient lighting behind the screenshot */}
              <div
                className="pointer-events-none absolute -left-20 -top-20 -z-0 h-[400px] w-[500px] opacity-20 blur-[100px] dark:opacity-30"
                style={{
                  background: "radial-gradient(circle, rgba(52, 211, 153, 0.4), transparent 70%)",
                }}
              />
              <HomeHeroScreenshot />
            </div>
          </div>

          {/* Right: Frosted Overlap Marketing Panel */}
          <div className="relative flex min-h-0 flex-1 flex-col border-t border-black/[0.08] bg-[#f5f4f0]/90 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#0b0e14]/92 sm:min-h-[100dvh] sm:border-l sm:border-t-0 sm:shadow-[-20px_0_50px_rgba(0,0,0,0.25)]">
            {/* Top Right Ghost Nav */}
            <HomePageNav />

            {/* Centered Value Proposition & Download CTA */}
            <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-12 sm:py-12 lg:px-16">
              {/* Brand Eyebrow with Luminous Pulse */}
              <div className="mb-6 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75 dark:bg-emerald-400" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-600 dark:bg-emerald-400" />
                </span>
                <p className="text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-sky-600 dark:text-emerald-400">
                  AIGenius
                </p>
              </div>

              {/* Three Value Statements */}
              <ul className="space-y-4">
                {VALUE_STATEMENTS.map((statement, idx) => (
                  <li
                    key={statement}
                    className="relative pl-5 text-[1.0625rem] font-medium leading-relaxed sm:text-lg before:absolute before:left-0 before:top-[0.58em] before:h-2 before:w-2 before:rounded-full before:bg-sky-600 before:content-[''] dark:before:bg-emerald-400 dark:before:shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                  >
                    {statement}
                  </li>
                ))}
              </ul>

              {/* Primary Download Button with Platform Dropdown */}
              <div className="mt-9 sm:mt-10">
                <DesktopDownloadDropdown />
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                  macOS, Windows &amp; Linux · Free to start
                </p>
              </div>

              {/* Bottom Footer */}
              <footer className="mt-12 border-t border-black/[0.06] pt-6 text-xs text-zinc-500 dark:border-white/[0.06] sm:mt-16">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <Link
                    prefetch
                    href="/docs/privacy-policy"
                    className={cn("transition hover:text-zinc-900 dark:hover:text-zinc-200", FOCUS_RING)}
                  >
                    Privacy Policy
                  </Link>
                  <Link
                    prefetch
                    href="/docs/terms-and-conditions"
                    className={cn("transition hover:text-zinc-900 dark:hover:text-zinc-200", FOCUS_RING)}
                  >
                    Terms of Service
                  </Link>
                </div>
                <p className="mt-2 text-[11px] text-zinc-400">© {year} Nobox Labs Limited</p>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </PublicPageShell>
  );
};

export default HomePage;
