import {
  DOCS_FOCUS,
  DOCS_LINK_CLASS,
  DOCS_PROSE_BODY,
  DOCS_SCROLL_MARGIN,
  DOCS_SURFACE_CARD,
} from "../docs-shell.constants";
import { cn } from "@/lib/utils";
import { DocTitle } from "./DocTitle";

export type DocSectionMeta = { id: string; title: string };

const TOC_LINK =
  "block rounded-lg px-3 py-1.5 text-sm leading-snug text-lp-muted transition-colors duration-150 hover:bg-black/[0.05] hover:text-lp-fg dark:hover:bg-white/[0.07]";

function TocLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className={cn(TOC_LINK, DOCS_FOCUS)}>
      {children}
    </a>
  );
}

/**
 * Presentation only. A normal page: the site header above, a large title, one readable column,
 * and the window scrolls. This is how Linear and Cursor lay out their terms. The contents list is
 * sticky beside the text on wide screens and a collapsible block above it on small ones.
 * Lists of links are plain divs: a global list rule in the project CSS was indenting <ul>.
 */
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
      className={cn(
        "mx-auto w-full px-5 pb-28 pt-14 sm:px-8 lg:pt-24",
        hasToc ? "max-w-[42rem] xl:max-w-6xl" : "max-w-[42rem]"
      )}
      aria-labelledby="docs-document-title"
    >
      <header>
        <DocTitle />
        <p className="mt-5 text-lg text-lp-muted">
          Effective date: <time dateTime={effectiveDateIso ?? undefined}>{effectiveDate}</time>
        </p>
      </header>

      {hasToc && (
        <details className={cn("group mt-10 xl:hidden", DOCS_SURFACE_CARD)}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            On this page
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-lp-muted transition-transform duration-200 ease-out-strong group-open:rotate-180"
              aria-hidden
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </summary>
          <nav aria-label="On this page" className="max-h-[min(50vh,20rem)] overflow-y-auto overscroll-contain px-2 pb-2">
            <div className="flex flex-col">
              {sections.map(({ id, title }) => (
                <TocLink key={id} href={`#${id}`}>
                  {title}
                </TocLink>
              ))}
            </div>
          </nav>
        </details>
      )}

      <div
        className={cn(
          "mt-12 lg:mt-16",
          hasToc && "xl:grid xl:grid-cols-[minmax(0,42rem)_15rem] xl:justify-between xl:gap-16",
        )}
      >
        <div
          className={cn(
            "min-w-0 max-w-[42rem] space-y-12",
            DOCS_PROSE_BODY,
            "[&_code]:rounded [&_code]:bg-black/[0.06] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em] dark:[&_code]:bg-white/[0.08] [&_strong]:font-semibold",
          )}
        >
          {children}
        </div>

        {hasToc && (
          <aside className="hidden xl:block">
            <nav aria-label="On this page" className="sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain">
              <p className="px-3 pb-2 text-sm font-medium">On this page</p>
              <div className="flex flex-col">
                {sections.map(({ id, title }) => (
                  <TocLink key={id} href={`#${id}`}>
                    {title}
                  </TocLink>
                ))}
              </div>
            </nav>
          </aside>
        )}
      </div>
    </article>
  );
}

export function DocSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className={DOCS_SCROLL_MARGIN}>
      <h2 className="mb-4 text-xl font-semibold leading-snug tracking-tight sm:text-[1.375rem]">{title}</h2>
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
        "list-outside space-y-3 pl-6 marker:text-lp-muted",
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