"use client";

import { type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { DISPLAY } from "@/app/components/landing/typography";

/**
 * Shown while an existing desktop session is being restored (avoids flashing the sign-in form).
 * Also used inline under the sign-in button while the browser sign-in is in progress, so it
 * carries no logo or page frame of its own.
 */
export function DesktopSessionRestoringView({
  message = "Opening AIGenius…",
  detail = "Verifying your saved session…",
  action,
}: {
  message?: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[22rem] flex-col items-center px-6 py-10 text-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-black/[0.05] text-lp-muted dark:bg-white/[0.07]">
        <Loader2
          size={28}
          className="animate-spin motion-reduce:animate-none"
          aria-hidden
        />
      </div>
      <h1
        className={`${DISPLAY} text-2xl font-normal leading-[1.1] tracking-[-0.02em]`}
      >
        {message}
      </h1>
      {detail ? (
        <p className="mt-3 text-sm leading-relaxed text-lp-muted">{detail}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
