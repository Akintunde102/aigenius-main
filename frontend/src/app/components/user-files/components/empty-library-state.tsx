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
    <div className="mt-6 overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50/50">
      <div className="p-6 sm:p-8">
        <h3 className="text-lg font-bold text-gray-900">No uploads yet</h3>
        <p className="mt-2 max-w-lg text-sm text-gray-600">
          Attach files from chat. When a conversation is linked, use the menu on
          each file to jump back.
        </p>
      </div>
      <div className="border-t border-gray-200 bg-white px-6 py-4">
        {variant === "modal" && onRequestClose ? (
          <button
            type="button"
            onClick={onRequestClose}
            className="w-full rounded-lg bg-cyan-600 py-3 text-sm font-semibold text-white hover:bg-cyan-700"
          >
            Back to chat
          </button>
        ) : (
          <Link
            href="/"
            className="block w-full rounded-lg bg-cyan-600 py-3 text-center text-sm font-semibold text-white hover:bg-cyan-700"
          >
            Open chat
          </Link>
        )}
      </div>
    </div>
  );
}