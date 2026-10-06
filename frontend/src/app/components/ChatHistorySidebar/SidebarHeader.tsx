"use client";

import React from "react";
import { FiHome, FiPlus, FiX } from "react-icons/fi";
import { FolderPlus, PanelLeft, PanelLeftClose, Search } from "lucide-react";
import ChatHistorySearchBar from "../ChatHistorySearchBar";
import { useRouter } from "next/navigation";
import { LINKS } from "@/lib/links";
import { clearAuthSession } from "@/lib/utils/auth-session";
import { useLanguage } from "@/lib/providers/LanguageProvider";

interface SidebarHeaderProps {
  isMobile: boolean;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen?: (open: boolean) => void;
  historySearch: string;
  setHistorySearch: (s: string) => void;
  onNewChat?: () => void;
  onNewProject?: () => void;
}

type SidebarIconButtonProps = {
  isMobile: boolean;
  ariaLabel: string;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
};

function SidebarIconButton({
  isMobile,
  ariaLabel,
  title,
  onClick,
  children,
}: SidebarIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title}
      onClick={onClick}
      className={
        isMobile
          ? "flex shrink-0 touch-manipulation items-center justify-center rounded p-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
          : "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 sm:h-7 sm:w-7"
      }
      style={{
        minWidth: isMobile ? 40 : undefined,
        minHeight: isMobile ? 40 : undefined,
        backgroundColor: "transparent",
        color: "var(--sidebar-muted-fg)",
      }}
      onMouseEnter={e => {
        if (!isMobile) e.currentTarget.style.backgroundColor = "var(--sidebar-menu-row-hover)";
      }}
      onMouseLeave={e => {
        if (!isMobile) e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      {children}
    </button>
  );
}

/** Matches workflow list / studio title bar: dark strip + slate search field. */
const SidebarHeader = React.memo<SidebarHeaderProps>(
  ({
    isMobile,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    historySearch,
    setHistorySearch,
    onNewChat,
    onNewProject,
  }) => {
    void mobileSidebarOpen;
    const { t } = useLanguage();
    const router = useRouter();

    const [draftHistorySearch, setDraftHistorySearch] =
      React.useState(historySearch);
    const [isSearchOpen, setIsSearchOpen] = React.useState(Boolean(historySearch));
    const skipDebouncedPushRef = React.useRef(true);

    React.useEffect(() => {
      setDraftHistorySearch(historySearch);
      if (historySearch) setIsSearchOpen(true);
    }, [historySearch]);

    React.useEffect(() => {
      if (skipDebouncedPushRef.current) {
        skipDebouncedPushRef.current = false;
        return;
      }
      const handle = window.setTimeout(() => {
        setHistorySearch(draftHistorySearch);
      }, 100);
      return () => window.clearTimeout(handle);
    }, [draftHistorySearch, setHistorySearch]);

    const handleLogout = React.useCallback(() => {
      clearAuthSession();
      router.push(LINKS.internalPages.login.github);
    }, [router]);

    const handleCloseSearch = React.useCallback(() => {
      setDraftHistorySearch("");
      setHistorySearch("");
      setIsSearchOpen(false);
    }, [setHistorySearch]);

    const showSearchInput = isSearchOpen || Boolean(draftHistorySearch);

    return (
      <header
        className="aigenius-desktop-sidebar-chrome sticky top-0 z-30 w-full shrink-0"
        style={{
          backgroundColor: "var(--sidebar-bg)",
          color: "var(--sidebar-fg)",
        }}
      >
        <div className="flex min-h-9 flex-nowrap items-center gap-x-1 px-3 py-2 sm:min-h-10">
          {isMobile && setMobileSidebarOpen ? (
            <button
              aria-label={t("sidebar.closeSidebar", "Close sidebar")}
              title={t("sidebar.closeSidebar", "Close sidebar")}
              type="button"
              className="flex shrink-0 touch-manipulation items-center justify-center rounded p-2 transition hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
              style={{ minWidth: 40, minHeight: 40, color: "var(--sidebar-muted-fg)" }}
              onClick={() => setMobileSidebarOpen(false)}
            >
              <FiX size={20} />
            </button>
          ) : null}

          {!isMobile && setMobileSidebarOpen ? (
            <SidebarIconButton
              isMobile={isMobile}
              ariaLabel={t("sidebar.closeSidebar", "Close sidebar")}
              title={`${t("sidebar.closeSidebar", "Close sidebar")} (⌘B)`}
              onClick={() => setMobileSidebarOpen(false)}
            >
              <PanelLeftClose
                className={isMobile ? "h-5 w-5" : "h-[18px] w-[18px]"}
                strokeWidth={1.5}
                aria-hidden
              />
            </SidebarIconButton>
          ) : null}

          {onNewChat ? (
            <SidebarIconButton
              isMobile={isMobile}
              ariaLabel={t("sidebar.newChat", "New Chat")}
              title={t("sidebar.newChat", "New Chat")}
              onClick={onNewChat}
            >
              <FiPlus size={isMobile ? 20 : 18} strokeWidth={1.5} aria-hidden />
            </SidebarIconButton>
          ) : null}

          {onNewProject ? (
            <SidebarIconButton
              isMobile={isMobile}
              ariaLabel={t("sidebar.newProject", "New project")}
              title={t("sidebar.newProject", "New project")}
              onClick={onNewProject}
            >
              <FolderPlus
                className={isMobile ? "h-5 w-5" : "h-[18px] w-[18px]"}
                strokeWidth={1.5}
                aria-hidden
              />
            </SidebarIconButton>
          ) : null}

          {showSearchInput ? (
            <div className="relative min-h-8 min-w-0 flex-1 sm:min-h-7 flex items-center gap-1">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                  style={{ color: "var(--sidebar-muted-fg)" }}
                  strokeWidth={1.5}
                  aria-hidden
                />
                <ChatHistorySearchBar
                  value={draftHistorySearch}
                  onChange={setDraftHistorySearch}
                  className="h-8 w-full rounded-md py-1.5 pl-8 pr-7 text-xs outline-none ring-0 placeholder:text-[color:var(--sidebar-muted-fg)] focus:ring-1 focus:ring-sky-500/30 sm:h-7"
                  style={{
                    backgroundColor: "var(--sidebar-search-bg)",
                    border: "1px solid var(--sidebar-search-border)",
                    color: "var(--sidebar-search-fg)",
                  }}
                />
                <button
                  type="button"
                  aria-label={t("common.close", "Close search")}
                  title={t("common.close", "Close search")}
                  onClick={handleCloseSearch}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded transition hover:opacity-80"
                  style={{ color: "var(--sidebar-muted-fg)" }}
                >
                  <FiX size={13} />
                </button>
              </div>
            </div>
          ) : (
            <SidebarIconButton
              isMobile={isMobile}
              ariaLabel={t("sidebar.searchConversations", "Search conversations")}
              title={t("sidebar.searchConversations", "Search conversations")}
              onClick={() => setIsSearchOpen(true)}
            >
              <Search
                className={isMobile ? "h-5 w-5" : "h-[18px] w-[18px]"}
                strokeWidth={1.5}
                aria-hidden
              />
            </SidebarIconButton>
          )}

          {isMobile && setMobileSidebarOpen ? (
            <a
              className="not-affected shrink-0"
              onClick={() => {
                handleLogout();
              }}
              style={{ padding: 0, margin: 0, display: "block" }}
            >
              <button
                aria-label="Home"
                type="button"
                className="flex items-center justify-center rounded-md p-2 transition hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
                style={{ width: 40, height: 40, color: "var(--sidebar-muted-fg)" }}
              >
                <FiHome size={18} />
              </button>
            </a>
          ) : null}
        </div>
      </header>
    );
  },
);

SidebarHeader.displayName = "SidebarHeader";

export default SidebarHeader;
