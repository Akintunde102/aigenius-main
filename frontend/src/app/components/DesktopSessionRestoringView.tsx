"use client";

import { type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { DISPLAY } from "@/app/components/landing/typography";

/**
 * Shown while an existing desktop session is being restored (avoids flashing the sign-in form).
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
    <div className="flex w-full flex-col items-center text-center">
      <div
        className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-black/[0.05] text-lp-muted dark:bg-white/[0.07]"
        aria-hidden
      >
        <Loader2 size={32} className="animate-spin" />
      </div>
      <h1
        className={`${DISPLAY} text-2xl font-normal leading-[1.1] tracking-[-0.02em] sm:text-3xl`}
      >
        {message}
      </h1>
      {detail ? (
        <p className="mt-3 max-w-sm text-base leading-relaxed text-lp-muted">{detail}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
