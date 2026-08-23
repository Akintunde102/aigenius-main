"use client";

import { useEffect, useRef, useState, useId, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { ChevronDown, Download } from "lucide-react";
import { FOCUS_RING } from "@/app/components/public-page-shell.constants";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  { id: "macos", label: "macOS", status: "Coming soon for macOS" },
  { id: "windows", label: "Windows", status: "Coming soon for Windows" },
  { id: "linux", label: "Linux", status: "Coming soon for Linux" },
] as const;

/**
 * Primary desktop download CTA — platform picker (macOS, Windows, Linux)
 * adhering strictly to the WAI-ARIA Menu Button pattern.
 */
export function DesktopDownloadDropdown({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuItemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const buttonId = useId();
  const menuId = useId();

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  // Focus appropriate item when focusedIndex changes
  useEffect(() => {
    if (open && focusedIndex >= 0 && menuItemsRef.current[focusedIndex]) {
      menuItemsRef.current[focusedIndex]?.focus();
    }
  }, [open, focusedIndex]);

  const handleButtonKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
      setFocusedIndex(0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setFocusedIndex(PLATFORMS.length - 1);
    }
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLUListElement>) => {
    switch (event.key) {
      case "Escape": {
        event.preventDefault();
        setOpen(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
        break;
      }
      case "ArrowDown": {
        event.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % PLATFORMS.length);
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + PLATFORMS.length) % PLATFORMS.length);
        break;
      }
      case "Home": {
        event.preventDefault();
        setFocusedIndex(0);
        break;
      }
      case "End": {
        event.preventDefault();
        setFocusedIndex(PLATFORMS.length - 1);
        break;
      }
      case "Tab": {
        setOpen(false);
        setFocusedIndex(-1);
        break;
      }
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label="Download desktop application for macOS, Windows, or Linux"
        onClick={() => {
          setOpen((prev) => {
            const next = !prev;
            if (next) setFocusedIndex(0);
            return next;
          });
        }}
        onKeyDown={handleButtonKeyDown}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3.5 text-sm font-semibold text-zinc-50 shadow-[0_14px_36px_rgba(0,0,0,0.2)] transition hover:bg-zinc-800 active:scale-[0.99] dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 sm:w-auto",
          FOCUS_RING,
        )}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        <span>Download desktop app</span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <ul
          id={menuId}
          role="menu"
          aria-labelledby={buttonId}
          aria-orientation="vertical"
          onKeyDown={handleMenuKeyDown}
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-900 py-1 shadow-xl shadow-black/35 dark:border-white/10 dark:bg-[#121214] sm:left-auto sm:right-0 sm:min-w-[12.5rem]"
        >
          {PLATFORMS.map((platform, idx) => (
            <li key={platform.id} role="none">
              <button
                ref={(el) => {
                  menuItemsRef.current[idx] = el;
                }}
                type="button"
                role="menuitem"
                tabIndex={focusedIndex === idx ? 0 : -1}
                aria-label={`${platform.label} (${platform.status})`}
                onClick={() => {
                  setOpen(false);
                  setFocusedIndex(-1);
                  buttonRef.current?.focus();
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm text-zinc-200 transition hover:bg-white/[0.08] focus:bg-white/[0.08] focus:outline-none",
                  FOCUS_RING,
                )}
              >
                <span>{platform.label}</span>
                <span
                  aria-hidden="true"
                  className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400"
                >
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
