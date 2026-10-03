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
    <div
      className="m-4 overflow-hidden rounded-xl border border-dashed text-center"
      style={{
        borderColor: "var(--modal-border)",
        background: "var(--surface-muted)",
      }}
    >
      <div className="flex flex-col items-center p-6 sm:p-8">
        <h3
          className="text-base font-semibold"
          style={{ color: "var(--modal-fg)" }}
        >
          No uploads yet
        </h3>
        <p
          className="mt-2 max-w-sm text-[13px] leading-relaxed"
          style={{ color: "var(--modal-muted-fg)" }}
        >
          Attach files from chat. When a conversation is linked, use the menu on
          each file to jump back.
        </p>
      </div>
      <div
        className="border-t px-6 py-4"
        style={{
          borderColor: "var(--modal-border)",
          background: "var(--modal-bg)",
        }}
      >
        {variant === "modal" && onRequestClose ? (
          <button
            type="button"
            onClick={onRequestClose}
            className="app-modal-btn-primary w-full py-2 text-[13px]"
          >
            Back to chat
          </button>
        ) : (
          <Link
            href="/"
            className="app-modal-btn-primary block w-full py-2 text-center text-[13px]"
          >
            Open chat
          </Link>
        )}
      </div>
    </div>
  );
}