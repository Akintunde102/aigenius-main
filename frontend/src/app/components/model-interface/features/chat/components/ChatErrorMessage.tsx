"use client";

import React from "react";
import { AlertTriangle, RotateCcw, WifiOff, X } from "lucide-react";
import type { ChatErrorTone, ChatUiError } from "@/app/components/model-interface/features/chat/hooks/chatUiError";
import { retryLabelFor } from "@/app/components/model-interface/features/chat/hooks/chatUiError";

type ChatErrorMessageProps = {
  error: ChatUiError;
  canRetry?: boolean;
  onRetry?: () => void | Promise<void>;
  onDismiss?: () => void;
};

const TONE_STYLES: Record<ChatErrorTone, { panel: string; icon: string }> = {
  danger: {
    panel:
      "border-[color:color-mix(in_srgb,hsl(var(--destructive))_38%,var(--app-border-soft))] bg-[color:color-mix(in_srgb,hsl(var(--destructive))_9%,var(--app-panel))]",
    icon: "text-destructive",
  },
  warning: {
    panel:
      "border-[color:color-mix(in_srgb,#d97706_35%,var(--app-border-soft))] bg-[color:color-mix(in_srgb,#d97706_10%,var(--app-panel))]",
    icon: "text-amber-600 dark:text-amber-400",
  },
  muted: {
    panel: "border-[color:var(--app-border-soft)] bg-[var(--app-panel)]",
    icon: "text-[color:var(--chat-muted-fg)]",
  },
};

/**
 * Top banner for chat-shell failures — title, cause, and a matching recovery action.
 */
export function ChatErrorMessage({
  error,
  canRetry = false,
  onRetry,
  onDismiss,
}: ChatErrorMessageProps) {
  const retryLabel = retryLabelFor(error);
  const showRetry = canRetry && Boolean(onRetry) && Boolean(retryLabel);
  const tone = TONE_STYLES[error.tone] ?? TONE_STYLES.danger;
  const Icon = error.kind === "network" ? WifiOff : AlertTriangle;

  const handleRetry = () => {
    if (!onRetry) return;
    void onRetry();
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[1100] flex justify-center px-3 sm:px-4"
      style={{
        paddingTop: "calc(0.75rem + var(--aigenius-desktop-titlebar-top, 0px))",
      }}
      role="alert"
      aria-live="assertive"
    >
      <div
        className={`pointer-events-auto flex w-full max-w-2xl items-start gap-3 rounded-lg border px-3 py-2.5 shadow-[var(--app-shadow-soft)] sm:px-4 ${tone.panel}`}
      >
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.icon}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-[color:var(--app-ink-900)]">
            {error.title}
          </p>
          {error.message !== error.title ? (
            <p className="mt-0.5 text-sm leading-snug text-[color:var(--app-ink-700)]">
              {error.message}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {showRetry ? (
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[color:var(--app-ink-700)] transition-colors hover:text-[color:var(--app-ink-900)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive"
              aria-label={retryLabel ?? "Try again"}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">{retryLabel}</span>
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
