"use client";

import Link from "next/link";
import type { UserFilesBrowserVariant } from "./user-files-browser.types";


export function EmptyLibraryState({
  variant,
  onRequestClose,
}: {
  variant: UserFilesBrowserVariant;
  onRequestClose?: () => void;
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/30">
      <div className="p-6 sm:p-8 flex flex-col items-center text-center">
        <h3 className="text-base font-semibold text-gray-900 dark:text-zinc-100">No uploads yet</h3>
        <p className="mt-2 max-w-sm text-[13px] text-gray-500 dark:text-zinc-400 leading-relaxed">
          Attach files from chat. When a conversation is linked, use the menu on
          each file to jump back.
        </p>
      </div>
      <div className="border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-transparent px-6 py-4">
        {variant === "modal" && onRequestClose ? (
          <button
            type="button"
            onClick={onRequestClose}
            className="w-full rounded-lg bg-zinc-900 dark:bg-zinc-100 py-2.5 text-[13px] font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white transition-colors"
          >
            Back to chat
          </button>
        ) : (
          <Link
            href="/"
            className="block w-full rounded-lg bg-zinc-900 dark:bg-zinc-100 py-2.5 text-center text-[13px] font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white transition-colors"
          >
            Open chat
          </Link>
        )}
      </div>
    </div>
  );
}