"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import {
  BoltIcon,
  ChevronDownIcon,
  FolderPlusIcon,
  PanelIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
} from "./appIcons";
import type { Chat, Project } from "./data";
import { APP } from "./theme";

const EASE = [0.23, 1, 0.32, 1] as const;

interface SidebarProps {
  className: string;
  projects: readonly Project[];
  chats: Readonly<Record<string, Chat>>;
  activeId: string;
  openIds: ReadonlySet<string>;
  query: string;
  searchOpen: boolean;
  onToggleSearch: () => void;
  onQuery: (value: string) => void;
  onSelect: (chatId: string) => void;
  onToggleProject: (projectId: string) => void;
  onNewChat: () => void;
  onNewProject: () => void;
  onTogglePanel: () => void;
  onNotice: (text: string) => void;
}

interface VisibleProject {
  readonly project: Project;
  readonly chatIds: readonly string[];
  readonly open: boolean;
}

const TOOL_BUTTON = `flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-150 ${APP.muted} ${APP.hover} hover:text-black dark:hover:text-white`;
const TOOL_ICON = "h-5 w-5";
const TOOL_STROKE = 1.5;

/** Matches the desktop app: icon-only toolbar, collapsible spaced-caps groups, relative time on each row. */
export function Sidebar({
  className,
  projects,
  chats,
  activeId,
  openIds,
  query,
  searchOpen,
  onToggleSearch,
  onQuery,
  onSelect,
  onToggleProject,
  onNewChat,
  onNewProject,
  onTogglePanel,
  onNotice,
}: SidebarProps) {
  const visible = useMemo<readonly VisibleProject[]>(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return projects.map((project) => ({
        project,
        chatIds: project.chatIds,
        open: openIds.has(project.id),
      }));
    }
    return projects.flatMap((project) => {
      const nameMatches = project.name.toLowerCase().includes(needle);
      const matching = project.chatIds.filter((id) =>
        chats[id]?.title.toLowerCase().includes(needle),
      );
      if (!nameMatches && matching.length === 0) return [];
      return [
        {
          project,
          chatIds: nameMatches ? project.chatIds : matching,
          open: true,
        },
      ];
    });
  }, [projects, chats, openIds, query]);

  const isSearching = query.trim() !== "";

  return (
    <aside className={`${APP.sidebar} ${className}`}>
      <div className="flex items-center gap-2 px-1.5 pb-3 pt-3">
        <button
          type="button"
          aria-label="Toggle sidebar"
          onClick={onTogglePanel}
          className={TOOL_BUTTON}
        >
          <PanelIcon className={TOOL_ICON} strokeWidth={TOOL_STROKE} />
        </button>
        <button
          type="button"
          aria-label="New chat"
          onClick={onNewChat}
          className={TOOL_BUTTON}
        >
          <PlusIcon className={TOOL_ICON} strokeWidth={TOOL_STROKE} />
        </button>
        <button
          type="button"
          aria-label="New project"
          onClick={onNewProject}
          className={TOOL_BUTTON}
        >
          <FolderPlusIcon className={TOOL_ICON} strokeWidth={TOOL_STROKE} />
        </button>
        <button
          type="button"
          aria-label="Search conversations"
          aria-expanded={searchOpen}
          onClick={onToggleSearch}
          className={TOOL_BUTTON}
        >
          <SearchIcon className={TOOL_ICON} strokeWidth={TOOL_STROKE} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="overflow-hidden px-2"
          >
            <label
              className={`mb-2 flex h-8 items-center gap-2 rounded-lg border px-2.5 ${APP.line}`}
            >
              <span className="sr-only">Search conversations</span>
              <input
                autoFocus
                value={query}
                onChange={(event) => onQuery(event.target.value)}
                placeholder="Search conversation"
                className="min-w-0 flex-1 bg-transparent text-xs outline-none ring-0 focus:outline-none focus:ring-0 placeholder:text-black/40 dark:placeholder:text-white/40"
              />
            </label>
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        aria-label="Conversations"
        className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2 pt-1 [scrollbar-width:thin]"
      >
        {visible.length === 0 && (
          <p className={`px-2 py-6 text-center text-xs ${APP.muted}`}>
            No conversations found
          </p>
        )}
        {visible.map(({ project, chatIds, open }) => (
          <div key={project.id} className="mb-1 last:mb-0">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => onToggleProject(project.id)}
              className={`flex w-full items-center  rounded-lg px-1 py-1 gap-1.5 text-left transition-colors duration-150 ${APP.hover}`}
            >
              <ChevronDownIcon
                className={`h-3 w-3 shrink-0 ${APP.groupLabel} transition-transform duration-200 ease-out-strong ${
                  open ? "" : "-rotate-90"
                }`}
              />
              <span
                className={`truncate text-[12.5px] font-semibold uppercase leading-4 tracking-[0.14em] ${APP.groupLabel}`}
              >
                {project.name}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {open && (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: EASE }}
                  className="overflow-hidden"
                >
                  {chatIds.map((id) => {
                    const chat = chats[id];
                    if (!chat) return null;
                    const isActive = id === activeId;
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          aria-current={isActive ? "true" : undefined}
                          onClick={() => onSelect(id)}
                          className={`flex w-full items-center justify-between gap-3 rounded-lg py-2 pl-2 pr-2 text-left text-[14px] leading-5 transition-colors duration-150 ${
                            isActive ? APP.active : APP.hover
                          }`}
                        >
                          <span className="truncate">{chat.title}</span>
                          <span
                            className={`shrink-0 text-xs tabular-nums ${APP.muted}`}
                          >
                            {chat.age}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {(project.moreCount ?? 0) > 0 && !isSearching && (
                    <li>
                      <button
                        type="button"
                        onClick={() =>
                          onNotice("Older conversations are in the full app.")
                        }
                        className={`block w-full rounded-lg py-2 pl-6 pr-2 text-left text-[13px] leading-5 ${APP.muted} ${APP.hover}`}
                      >
                        Open more ({project.moreCount})
                      </button>
                    </li>
                  )}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        ))}
      </nav>

      <div
        className={`flex items-center justify-between border-t py-3 pl-2 pr-3 text-sm leading-5 ${APP.line}`}
      >
        <span className="flex items-center gap-1.5">
          <BoltIcon className={`h-3.5 w-3.5 ${APP.brand}`} />
          <span className={APP.muted}>by</span>
          <span className={`font-semibold ${APP.brand}`}>Nobox</span>
        </span>
        <button
          type="button"
          aria-label="Settings"
          onClick={() => onNotice("Settings are part of the full app.")}
          className={TOOL_BUTTON}
        >
          <SettingsIcon className={TOOL_ICON} strokeWidth={TOOL_STROKE} />
        </button>
      </div>
    </aside>
  );
}
