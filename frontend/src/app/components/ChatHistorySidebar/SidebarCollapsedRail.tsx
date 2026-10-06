"use client";

import React from "react";
import { PanelLeftOpen } from "lucide-react";
import { FiPlus } from "react-icons/fi";
import { useLanguage } from "@/lib/providers/LanguageProvider";

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
    const { t } = useLanguage();
    const letter = userInitials.trim().slice(0, 2).toUpperCase() || "U";

    return (
      <div className="aigenius-desktop-sidebar-chrome flex h-full min-h-0 flex-col items-center px-3 py-2">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <button
            type="button"
            data-mobile-toggle
            aria-label={t("sidebar.openSidebar", "Open sidebar")}
            title={`${t("sidebar.showConversations", "Show conversations")} (⌘B)`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 sm:h-7 sm:w-7"
            style={{
              backgroundColor: "transparent",
              color: "var(--sidebar-muted-fg)",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--sidebar-menu-row-hover)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            onClick={onExpand}
          >
            <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
          </button>
          <button
            type="button"
            aria-label={t("sidebar.newChat", "New chat")}
            title={t("sidebar.newChat", "New chat")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 sm:h-7 sm:w-7"
            style={{
              backgroundColor: "transparent",
              color: "var(--sidebar-muted-fg)",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--sidebar-menu-row-hover)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            onClick={onNewChat}
          >
            <FiPlus size={18} strokeWidth={1.5} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1" aria-hidden />

        <div className="relative flex shrink-0 flex-col justify-end">
          <button
            type="button"
            aria-label={t("sidebar.openAccountMenu", "Open account menu")}
            aria-haspopup="menu"
            title={t("sidebar.account", "Account")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-normal transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 sm:h-7 sm:w-7"
            style={{
              backgroundColor: "transparent",
              color: "var(--sidebar-muted-fg)",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--sidebar-menu-row-hover)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
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
