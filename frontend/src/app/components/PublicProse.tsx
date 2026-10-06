import type { ReactNode } from "react";
import { DISPLAY } from "./landing/typography";

/**
 * Typography for long-form public pages (privacy policy, terms, docs). Wrap plain headings,
 * paragraphs, lists, links, code and tables and they pick up the landing page's look.
 * Use it only for plain content: it styles descendants by tag, so it would override pages
 * that already style their own elements with Tailwind classes.
 */
const PROSE = [
  "[&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:font-medium [&_h2]:tracking-tight",
  "[&_h3]:mt-8 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:tracking-tight",
  "[&_p]:mt-4 [&_p]:text-lp-muted",
  "[&_a]:text-lp-fg [&_a]:underline [&_a]:underline-offset-4 [&_a]:transition-colors [&_a:hover]:text-lp-accent",
  "[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ul]:text-lp-muted",
  "[&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_ol]:text-lp-muted",
  "[&_strong]:font-semibold [&_strong]:text-lp-fg",
  "[&_code]:rounded-md [&_code]:bg-lp-tint [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:text-lp-fg",
  "[&_pre]:mt-4 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:bg-lp-surface [&_pre]:p-5",
  "[&_blockquote]:mt-6 [&_blockquote]:rounded-2xl [&_blockquote]:bg-lp-surface [&_blockquote]:px-5 [&_blockquote]:py-4",
  "[&_hr]:my-10 [&_hr]:h-px [&_hr]:border-0 [&_hr]:bg-lp-line",
  "[&_table]:mt-6 [&_table]:w-full [&_table]:text-left [&_table]:text-[15px]",
  "[&_th]:bg-lp-surface [&_th]:px-4 [&_th]:py-2.5 [&_th]:font-medium",
  "[&_td]:px-4 [&_td]:py-2.5 [&_td]:text-lp-muted",
].join(" ");

interface PublicProseProps {
  title: string;
  /** For example "Last updated 1 October 2026". */
  updated?: string;
  children: ReactNode;
}

export function PublicProse({ title, updated, children }: PublicProseProps) {
  return (
    <article className="mx-auto max-w-3xl px-5 py-16 text-[17px] leading-relaxed lg:py-24">
      <h1 className={`${DISPLAY} text-[clamp(2.25rem,5vw,3.5rem)] font-normal leading-[1.04] tracking-[-0.03em]`}>
        {title}
      </h1>
      {updated && <p className="mt-4 text-sm text-lp-muted">{updated}</p>}
      <div className={`mt-10 ${PROSE}`}>{children}</div>
    </article>
  );
}