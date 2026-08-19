"use client";

import Link from "next/link";
import { MessageSquare, MoreHorizontal } from "lucide-react";
import { FiCopy, FiExternalLink } from "react-icons/fi";
import type { CloudFile } from "@/app/components/file/file.interface";


export function FileActionsMenu({
  compact,
  file,
  onCopy,
  onRequestClose,
  tone = "dark",
  conversationOnly = false,
}: {
  compact?: boolean;
  file: CloudFile;
  onCopy: () => void;
  onRequestClose?: () => void;
  tone?: "dark" | "light";
  /** When true, only “Open conversation” is shown (Open/Copy live on the card). */
  conversationOnly?: boolean;
}) {
  const conv = file.sourceConversationId?.trim();

  if (conversationOnly && !conv) {
    return null;
  }

  const triggerClass =
    tone === "dark"
      ? "bg-black/40 text-white hover:bg-black/55"
      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/10";

  const menuPanelClass =
    "absolute right-0 bottom-full z-[200] mb-1 w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-[var(--modal-border)] dark:bg-[var(--modal-bg-muted)]";
  const menuItemClass =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-[var(--modal-fg)] dark:hover:bg-white/10";
  const menuLinkClass =
    "flex items-center gap-2 px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 dark:text-[var(--modal-fg)] dark:hover:bg-white/10";

  return (
    <details className="relative z-20 open:z-30" onClick={(e) => e.stopPropagation()}>
      <summary
        className={`flex cursor-pointer list-none items-center justify-center rounded-md [&::-webkit-details-marker]:hidden ${compact ? "h-7 w-7" : "h-8 w-8"
          } ${triggerClass}`}
      >
        <MoreHorizontal
          className={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
          aria-hidden
        />
        <span className="sr-only">More file actions</span>
      </summary>
      <div className={menuPanelClass}>
        {!conversationOnly ? (
          <>
            <a
              href={file.s3Link}
              target="_blank"
              rel="noopener noreferrer"
              className={menuLinkClass}
              onClick={() =>
                (
                  document.activeElement as HTMLElement | null
                )?.closest("details")?.removeAttribute("open")
              }
            >
              <FiExternalLink size={14} className="opacity-70" aria-hidden />
              Open file
            </a>
            <button
              type="button"
              className={menuItemClass}
              onClick={() => {
                onCopy();
                (
                  document.activeElement as HTMLElement | null
                )?.closest("details")?.removeAttribute("open");
              }}
            >
              <FiCopy size={14} className="opacity-70" aria-hidden />
              Copy link
            </button>
          </>
        ) : null}
        {conv ? (
          <Link
            href={`/chat/${conv}`}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
            onClick={() => {
              onRequestClose?.();
              (
                document.activeElement as HTMLElement | null
              )?.closest("details")?.removeAttribute("open");
            }}
          >
            <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />
            Open conversation
          </Link>
        ) : null}
      </div>
    </details>
  );
}