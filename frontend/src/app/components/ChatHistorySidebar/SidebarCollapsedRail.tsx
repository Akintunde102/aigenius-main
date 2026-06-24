"use client";

import React from "react";
import { ChevronsRight } from "lucide-react";
import { FiPlus } from "react-icons/fi";

export interface SidebarCollapsedRailProps {
  userInitials: string;
  onExpand: () => void;
  /** Start a new chat (same as expanded sidebar “Create new chat”). */
  onNewChat: () => void;
  /** Expand the sidebar and surface account actions in the expanded footer menu. */
  onOpenAccountMenu: () => void;
}

/**
 * Minimal desktop collapsed state: open control + user avatar (account menu).
 */
export const SidebarCollapsedRail = React.memo<SidebarCollapsedRailProps>(
  ({ userInitials, onExpand, onNewChat, onOpenAccountMenu }) => {
    const letter = userInitials.trim().slice(0, 2).toUpperCase() || "U";

    return (
      <div className="aigenius-desktop-sidebar-chrome flex h-full min-h-0 flex-col items-center py-3">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <button
            type="button"
            data-mobile-toggle
            aria-label="Open sidebar"
            title="Show conversations"
            className="flex h-8 w-9 shrink-0 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
            style={{
              border: "1px solid var(--sidebar-icon-btn-border)",
              backgroundColor: "var(--sidebar-icon-btn-bg)",
              color: "var(--sidebar-fg)",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--sidebar-icon-btn-hover-bg)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--sidebar-icon-btn-bg)")}
            onClick={onExpand}
          >
            <ChevronsRight className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="New chat"
            title="New chat"
            className="flex h-8 w-9 shrink-0 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
            style={{
              border: "1px solid var(--sidebar-icon-btn-border)",
              backgroundColor: "var(--sidebar-icon-btn-bg)",
              color: "var(--sidebar-fg)",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--sidebar-icon-btn-hover-bg)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--sidebar-icon-btn-bg)")}
            onClick={onNewChat}
          >
            <FiPlus className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1" aria-hidden />

        <div className="relative flex shrink-0 flex-col justify-end">
          <button
            type="button"
            aria-label="Open account menu"
            aria-haspopup="menu"
            title="Account"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
            style={{
              border: "1px solid var(--sidebar-icon-btn-border)",
              backgroundColor: "var(--sidebar-icon-btn-bg)",
              color: "var(--sidebar-fg)",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--sidebar-icon-btn-hover-bg)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--sidebar-icon-btn-bg)")}
            onClick={(e) => {
              e.stopPropagation();
              onOpenAccountMenu();
            }}
          >
            {letter}
          </button>
        </div>
      </div>
    );
  },
);

SidebarCollapsedRail.displayName = "SidebarCollapsedRail";
