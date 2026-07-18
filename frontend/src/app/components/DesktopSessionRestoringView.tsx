"use client";

import { Loader2 } from "lucide-react";

/**
 * Shown while an existing desktop session is being restored (avoids flashing the sign-in form).
 */
export function DesktopSessionRestoringView({ message = "Opening AIGenius…" }: { message?: string }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center bg-[#0c0d0f] px-6 text-center text-zinc-100">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
        <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
      </div>
      <p className="mt-5 text-sm font-medium text-zinc-300">{message}</p>
      <p className="mt-2 max-w-xs text-xs leading-relaxed text-zinc-500">
        Verifying your saved session…
      </p>
    </div>
  );
}
