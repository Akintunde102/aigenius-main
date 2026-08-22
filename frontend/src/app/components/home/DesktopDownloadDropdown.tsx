"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { FOCUS_RING } from "@/app/components/public-page-shell.constants";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  { id: "macos", label: "macOS" },
  { id: "windows", label: "Windows" },
  { id: "linux", label: "Linux" },
] as const;

/**
 * Primary desktop download CTA — platform picker (macOS, Windows, Linux).
 */
export function DesktopDownloadDropdown({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3.5 text-sm font-semibold text-zinc-50 shadow-[0_14px_36px_rgba(0,0,0,0.2)] transition hover:bg-zinc-800 active:scale-[0.99] dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 sm:w-auto",
          FOCUS_RING,
        )}
      >
        <Download className="h-4 w-4" aria-hidden />
        Download desktop app
        <ChevronDown
          className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          role="menu"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-900 py-1 shadow-xl shadow-black/35 dark:border-white/10 dark:bg-[#121214] sm:left-auto sm:right-0 sm:min-w-[11.5rem]"
        >
          {PLATFORMS.map((platform) => (
            <li key={platform.id} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => setOpen(false)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm text-zinc-200 transition hover:bg-white/[0.06]",
                  FOCUS_RING,
                )}
              >
                <span>{platform.label}</span>
                <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  Soon
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
