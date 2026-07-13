"use client";

import React from "react";
import { AlertTriangle, RotateCcw, X } from "lucide-react";

type ChatErrorMessageProps = {
  message: string;
  canRetry?: boolean;
  onRetry?: () => void | Promise<void>;
  onDismiss?: () => void;
};

/**
 * Fixed top banner for send/stream failures — system chrome, not a chat message.
 */
export function ChatErrorMessage({
  message,
  canRetry = false,
  onRetry,
  onDismiss,
}: ChatErrorMessageProps) {
  const handleRetry = () => {
    if (!onRetry) return;
    void onRetry();
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[1100] flex justify-center px-3 pt-3 sm:px-4 sm:pt-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="pointer-events-auto flex w-full max-w-xl items-start gap-3 border border-[color:var(--app-border-soft)] bg-[var(--app-panel)] px-3 py-2.5 shadow-[var(--app-shadow-soft)] backdrop-blur-sm sm:px-4 sm:py-3">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
          aria-hidden
        />
        <p className="min-w-0 flex-1 text-sm leading-snug text-[color:var(--app-ink-900)]">
          {message}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {canRetry && onRetry ? (
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[color:var(--app-ink-700)] transition-colors hover:text-[color:var(--app-ink-900)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive"
              aria-label="Try again"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Try again</span>
            </button>
          ) : null}
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex h-7 w-7 items-center justify-center text-[color:var(--chat-muted-fg)] transition-colors hover:text-[color:var(--app-ink-900)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
