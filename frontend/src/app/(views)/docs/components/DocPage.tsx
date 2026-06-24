"use client";

import Link from "next/link";
import { FiList } from "react-icons/fi";
import {
  DOCS_FOCUS,
  DOCS_LINK_CLASS,
  DOCS_PROSE_BODY,
  DOCS_SCROLL_MARGIN,
} from "../docs-shell.constants";
import { cn } from "@/lib/utils";

export type DocSectionMeta = { id: string; title: string };

function TocLink({
  href,
  children,
  compact = false,
  rail = false,
}: {
  href: string;
  children: React.ReactNode;
  compact?: boolean;
  /** Desktop right TOC — matches left-rail nav density and surface */
  rail?: boolean;
}) {
  return (
    <a
      href={href}
      className={cn(
        compact
          ? "inline-flex max-w-[min(100%,14rem)] shrink-0 rounded-full border border-stone-200/90 bg-white/95 px-3 py-1.5 text-left text-xs font-medium leading-snug text-stone-700 shadow-sm transition hover:border-cyan-300/60 hover:bg-cyan-50/50 hover:text-cyan-900"
          : rail
            ? "group block w-full rounded-xl border border-transparent px-2 py-2.5 text-center text-[13px] font-medium leading-relaxed text-stone-700 transition-colors hover:border-teal-300/45 hover:bg-gradient-to-br hover:from-teal-50/90 hover:to-amber-50/50 hover:text-stone-900 hover:shadow-[0_1px_8px_-2px_rgba(20,60,50,0.12)]"
            : "group block rounded-lg border-l-2 border-transparent py-2 pl-3 pr-2 text-sm leading-snug text-stone-600 transition hover:border-cyan-400/50 hover:bg-cyan-50/40 hover:text-cyan-900",
        DOCS_FOCUS,
      )}
    >
      {children}
    </a>
  );
}

export function DocPage({
  effectiveDate,
  effectiveDateIso,
  sections = [],
  children,
}: {
  effectiveDate: string;
  /** ISO-8601 date for `<time dateTime>` (e.g. 2025-02-15) */
  effectiveDateIso?: string;
  sections?: DocSectionMeta[];
  children: React.ReactNode;
}) {
  const hasToc = sections.length > 0;

  return (
    <article
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      aria-labelledby="docs-document-title"
    >
      {hasToc && (
        <div className="shrink-0 border-b border-stone-200/70 bg-[#f6f3ed]/80 px-4 py-3 sm:px-6 md:hidden">
          <details className="group rounded-xl border border-stone-200/90 bg-white/95 shadow-sm backdrop-blur-sm">
            <summary className="cursor-pointer list-none px-4 py-2.5 font-semibold text-stone-900 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-2">
                On this page
                <span className="inline-block text-stone-400 transition group-open:rotate-180" aria-hidden>
                  ▼
                </span>
              </span>
            </summary>
            <nav className="border-t border-stone-100 px-2 pb-2 pt-1" aria-label="On this page">
              <ul className="max-h-[min(50vh,20rem)] space-y-0.5 overflow-y-auto overscroll-contain py-2">
                {sections.map(({ id, title: sectionTitle }) => (
                  <li key={id}>
                    <TocLink href={`#${id}`}>{sectionTitle}</TocLink>
                  </li>
                ))}
              </ul>
            </nav>
          </details>
        </div>
      )}

      {hasToc && (
        <div className="hidden shrink-0 border-b border-stone-200/70 bg-[#f6f3ed]/50 px-4 py-3 md:block xl:hidden sm:px-6">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            On this page
          </p>
          <div className="-mx-1 flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]">
            {sections.map(({ id, title: sectionTitle }) => (
              <TocLink key={id} href={`#${id}`} compact>
                {sectionTitle}
              </TocLink>
            ))}
          </div>
        </div>
      )}

      {/* Only this region scrolls (xl+: right rail is fixed beside it) */}
      <div
        className={cn(
          "min-h-0 flex-1 basis-0 overflow-y-auto overscroll-y-contain",
          hasToc && "xl:pr-[calc(17rem+2.25rem)] 2xl:pr-[calc(18rem+2.75rem)]",
        )}
      >
        <div
          className={cn(
            "mx-auto max-w-7xl px-4 pb-12 pt-5 sm:px-6 sm:pt-6 lg:px-8",
            hasToc && "xl:pr-0",
          )}
        >
          <div className="mx-auto w-full max-w-[min(100%,42rem)] space-y-10 xl:mx-0">
            <div
              className={cn(
                DOCS_PROSE_BODY,
                "space-y-10 [&_p:first-child]:text-stone-700 [&_strong]:font-semibold [&_strong]:text-stone-900",
              )}
            >
              <p className="mt-0 text-[15px] leading-relaxed text-stone-600 sm:text-base">
                <span className="font-medium text-stone-700">Effective date:</span>{" "}
                <time dateTime={effectiveDateIso ?? undefined}>{effectiveDate}</time>
              </p>
              {children}
            </div>
          </div>

          <footer className="mx-auto mt-12 flex w-full max-w-[min(100%,42rem)] flex-col gap-6 border-t border-stone-200/90 pt-8 xl:mx-0 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/"
              className={cn("inline-flex items-center text-sm", DOCS_LINK_CLASS, DOCS_FOCUS)}
            >
              <svg
                className="mr-1.5 h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to AIGenius
            </Link>
            <div className="flex flex-wrap gap-6 text-sm">
              <Link href="/docs/privacy-policy" className={cn("text-sm", DOCS_LINK_CLASS, DOCS_FOCUS)}>
                Privacy Policy
              </Link>
              <Link href="/docs/terms-and-conditions" className={cn("text-sm", DOCS_LINK_CLASS, DOCS_FOCUS)}>
                Terms of Service
              </Link>
            </div>
          </footer>
        </div>
      </div>

      {/* Right rail — aligned to main column (after w-56 left rail); independent scroll inside */}
      {hasToc && (
        <div className="pointer-events-none fixed right-0 top-[3.75rem] z-30 hidden h-[calc(100dvh-3.75rem-5.25rem)] xl:left-56 xl:block">
          <div className="mx-auto flex h-full max-w-7xl justify-end px-4 lg:px-8">
            <aside className="pointer-events-auto flex h-full w-[17rem] shrink-0 flex-col pb-2 2xl:w-[18rem]">
              <nav
                className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-2xl border border-t-0 border-stone-200/75 bg-gradient-to-b from-[#fbfaf7]/98 via-[#f3eee6] to-[#e5dfd5]/95 shadow-[0_20px_50px_-22px_rgba(40,35,30,0.22),inset_0_1px_0_rgba(255,252,248,0.65)] ring-1 ring-inset ring-stone-200/30"
                aria-label="On this page"
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-stone-400/35 to-transparent"
                  aria-hidden
                />
                <div className="shrink-0 border-b border-stone-200/55 bg-gradient-to-br from-teal-50/25 via-stone-100/30 to-amber-50/20 px-3 pb-3.5 pt-4 text-center">
                  <div className="mx-auto flex max-w-[15rem] flex-col items-center gap-2">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-200/50 bg-gradient-to-b from-teal-50/90 to-stone-50/90 text-teal-800/90 shadow-[0_2px_6px_-2px_rgba(20,80,70,0.15)]"
                      aria-hidden
                    >
                      <FiList size={17} strokeWidth={2.25} />
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-600">
                        On this page
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
                        Jump to a section
                      </p>
                    </div>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-3 py-3 [scrollbar-color:rgba(120,113,108,0.32)_transparent] [scrollbar-width:thin]">
                  <ul className="flex flex-col gap-1.5">
                    {sections.map(({ id, title: sectionTitle }) => (
                      <li key={id}>
                        <TocLink href={`#${id}`} rail>
                          {sectionTitle}
                        </TocLink>
                      </li>
                    ))}
                  </ul>
                </div>
              </nav>
            </aside>
          </div>
        </div>
      )}
    </article>
  );
}

export function DocSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={DOCS_SCROLL_MARGIN}>
      <h2 className="mb-5 border-b border-stone-200/70 pb-3 text-xl font-semibold tracking-tight text-stone-900 sm:text-[1.35rem]">
        {title}
      </h2>
      <div className={cn(DOCS_PROSE_BODY, "space-y-4")}>{children}</div>
    </section>
  );
}

export function DocList({
  items,
  variant = "bullet",
}: {
  items: React.ReactNode[];
  variant?: "bullet" | "numbered";
}) {
  const ListTag = variant === "numbered" ? "ol" : "ul";
  return (
    <ListTag
      className={cn(
        DOCS_PROSE_BODY,
        "list-outside space-y-3 pl-6 marker:text-stone-500",
        variant === "numbered" ? "list-decimal" : "list-disc",
      )}
    >
      {items.map((item, i) => (
        <li key={i} className="pl-1">
          {item}
        </li>
      ))}
    </ListTag>
  );
}

export function DocLink({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className={cn(DOCS_LINK_CLASS, DOCS_FOCUS)}
    >
      {children}
    </a>
  );
}
