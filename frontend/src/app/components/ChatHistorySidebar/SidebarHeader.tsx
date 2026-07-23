"use client";

import React from "react";
import { FiHome, FiPlus, FiX } from "react-icons/fi";
import { FolderPlus, PanelLeft, Search } from "lucide-react";
import ChatHistorySearchBar from "../ChatHistorySearchBar";
import { useRouter } from "next/navigation";
import { LINKS } from "@/lib/links";
import { clearAuthSession } from "@/lib/utils/auth-session";

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
          : "flex h-8 w-9 shrink-0 items-center justify-center rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 sm:h-7"
      }
      style={isMobile
        ? { minWidth: 40, minHeight: 40, color: "var(--sidebar-muted-fg)" }
        : {
          border: "1px solid var(--sidebar-icon-btn-border)",
          backgroundColor: "var(--sidebar-icon-btn-bg)",
          color: "var(--sidebar-fg)",
        }
      }
      onMouseEnter={e => {
        if (!isMobile) e.currentTarget.style.backgroundColor = "var(--sidebar-icon-btn-hover-bg)";
      }}
      onMouseLeave={e => {
        if (!isMobile) e.currentTarget.style.backgroundColor = "var(--sidebar-icon-btn-bg)";
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
    const router = useRouter();

    const [draftHistorySearch, setDraftHistorySearch] =
      React.useState(historySearch);
    const skipDebouncedPushRef = React.useRef(true);

    React.useEffect(() => {
      setDraftHistorySearch(historySearch);
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

    return (
      <header
        className="aigenius-desktop-sidebar-chrome sticky top-0 z-30 w-full shrink-0"
        style={{
          backgroundColor: "var(--sidebar-bg)",
          borderBottom: "1px solid var(--sidebar-border)",
          color: "var(--sidebar-fg)",
          boxShadow: "0 1px 0 0 rgba(0,0,0,0.08)",
        }}
      >
        <div className="flex min-h-9 flex-nowrap items-center gap-x-1.5 px-2 py-2 sm:min-h-10 sm:px-2.5">
          {isMobile && setMobileSidebarOpen ? (
            <button
              aria-label="Close Sidebar"
              type="button"
              className="flex shrink-0 touch-manipulation items-center justify-center rounded p-2 text-slate-400 transition hover:bg-white/10 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
              style={{ minWidth: 40, minHeight: 40 }}
              onClick={() => setMobileSidebarOpen(false)}
            >
              <FiX size={20} />
            </button>
          ) : null}

          {!isMobile && setMobileSidebarOpen ? (
            <button
              type="button"
              aria-label="Close sidebar"
              title="Close sidebar"
              className="flex h-8 w-9 shrink-0 items-center justify-center rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 sm:h-7"
              style={{
                border: "1px solid var(--sidebar-icon-btn-border)",
                backgroundColor: "var(--sidebar-icon-btn-bg)",
                color: "var(--sidebar-fg)",
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--sidebar-icon-btn-hover-bg)")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--sidebar-icon-btn-bg)")}
              onClick={() => setMobileSidebarOpen(false)}
            >
              <PanelLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          ) : null}

          {onNewChat ? (
            <SidebarIconButton
              isMobile={isMobile}
              ariaLabel="New chat"
              title="New chat"
              onClick={onNewChat}
            >
              <FiPlus size={isMobile ? 20 : 18} strokeWidth={2} aria-hidden />
            </SidebarIconButton>
          ) : null}

          {onNewProject ? (
            <SidebarIconButton
              isMobile={isMobile}
              ariaLabel="New project"
              title="New project"
              onClick={onNewProject}
            >
              <FolderPlus
                className={isMobile ? "h-5 w-5" : "h-[18px] w-[18px]"}
                strokeWidth={2}
                aria-hidden
              />
            </SidebarIconButton>
          ) : null}

          <div className="relative min-h-8 min-w-0 flex-1 sm:min-h-7">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
              style={{ color: "var(--sidebar-muted-fg)" }}
              aria-hidden
            />
            <ChatHistorySearchBar
              value={draftHistorySearch}
              onChange={setDraftHistorySearch}
              className="h-8 w-full rounded-md py-1.5 pl-8 pr-2.5 text-[12px] outline-none ring-0 focus:ring-1 focus:ring-sky-500/30 sm:h-7"
              style={{
                backgroundColor: "var(--sidebar-search-bg)",
                border: "1px solid var(--sidebar-search-border)",
                color: "var(--sidebar-search-fg)",
              }}
            />
          </div>

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
                className="flex items-center justify-center rounded-md p-2 text-slate-400 transition hover:bg-white/10 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
                style={{ width: 40, height: 40 }}
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
