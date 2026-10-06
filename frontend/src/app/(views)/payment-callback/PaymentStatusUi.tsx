import type { ReactNode } from "react";
import { DISPLAY } from "@/app/components/landing/typography";

/**
 * Presentation only, moved out of PaymentCallbackClient. Same component names and props, so the
 * verification and polling logic in that file is untouched.
 */

export type StatusTone = "loading" | "success" | "confirming" | "failed";

export const STATUS_TITLE = `${DISPLAY} text-3xl font-normal leading-[1.1] tracking-[-0.02em] sm:text-4xl`;
export const STATUS_TEXT =
  "mt-3 max-w-sm text-base leading-relaxed text-lp-muted";

/** Plain stone colours instead of bg-lp-fg: that background was not rendering in the browser. */
export const PRIMARY_BUTTON =
  "mt-8 inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-stone-900 px-6 text-sm font-medium text-white transition-[transform,opacity] duration-150 ease-out-strong hover:opacity-90 active:scale-[0.97] dark:bg-white dark:text-stone-900";

export function StatusCard({
  tone,
  children,
}: {
  tone: StatusTone;
  children: ReactNode;
}) {
  return (
    <div data-tone={tone} className="flex flex-col items-center text-center">
      {children}
    </div>
  );
}

export function StatusShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 py-24 text-center">
      {children}
    </div>
  );
}

const TONE_CLASS: Record<StatusTone, string> = {
  loading: "bg-black/[0.05] text-lp-muted dark:bg-white/[0.07]",
  success: "bg-emerald-500/10 text-emerald-500",
  confirming: "bg-amber-500/10 text-amber-500",
  failed: "bg-rose-500/10 text-rose-500",
};

export function StatusIcon({
  tone,
  children,
}: {
  tone: StatusTone;
  children: ReactNode;
}) {
  return (
    <div
      className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${TONE_CLASS[tone]}`}
    >
      {children}
    </div>
  );
}
