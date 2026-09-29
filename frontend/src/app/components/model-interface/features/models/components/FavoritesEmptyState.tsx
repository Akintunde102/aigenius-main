import React from "react";
import { FiZap, FiArrowRight } from "react-icons/fi";

interface FavoritesEmptyStateProps {
  onBrowse: () => void;
}

export function FavoritesEmptyState({ onBrowse }: FavoritesEmptyStateProps) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl border"
        style={{
          background: "color-mix(in srgb, var(--chat-accent) 12%, var(--surface-muted))",
          borderColor: "color-mix(in srgb, var(--chat-accent) 24%, var(--modal-border))",
          color: "var(--chat-accent)",
        }}
      >
        <FiZap size={22} strokeWidth={2} />
      </div>
      <div>
        <p className="font-semibold text-[15px] mb-1.5" style={{ color: "var(--modal-fg)" }}>
          No quick models yet
        </p>
        <p className="text-[13px] leading-relaxed max-w-sm" style={{ color: "var(--modal-muted-fg)" }}>
          Toggle models on in <span className="font-medium" style={{ color: "var(--sidebar-fg)" }}>All Models</span> to keep your favorites right in your chat composer.
        </p>
      </div>
      <button
        type="button"
        onClick={onBrowse}
        className="app-modal-btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium shadow-sm transition-all hover:brightness-105 active:scale-[0.98]"
      >
        <span>Browse All Models</span>
        <FiArrowRight size={13} strokeWidth={2} />
      </button>
    </div>
  );
}
