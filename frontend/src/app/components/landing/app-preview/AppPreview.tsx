"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDownIcon, PanelIcon } from "./appIcons";
import { Composer } from "./Composer";
import { Conversation, type StreamingReply } from "./Conversation";
import {
  DEFAULT_CHAT_ID,
  DEFAULT_PROJECT_ID,
  INITIAL_CHATS,
  INITIAL_OPEN_PROJECT_IDS,
  INITIAL_PROJECTS,
  NEW_CHAT_TITLE,
  pickReply,
  type Chat,
  type Message,
  type ModelName,
  type Project,
} from "./data";
import { Sidebar } from "./Sidebar";
import { APP } from "./theme";

const EASE = [0.23, 1, 0.32, 1] as const;
const NOTICE_MS = 2600;
const THINK_MS = 600;
const WORD_MS = 55;
const TITLE_MAX = 28;
const LIVE_PREVIEW_NOTICE = "This is a live preview, so the window stays put.";

const INITIAL_CHAT_MAP: Readonly<Record<string, Chat>> = Object.fromEntries(
  INITIAL_CHATS.map((chat) => [chat.id, chat]),
);

interface WindowControlProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
}

function WindowControl({ label, onClick, children }: WindowControlProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex h-7 w-9 items-center justify-center ${APP.muted} transition-colors duration-150 ${APP.hover}`}
    >
      {children}
    </button>
  );
}

/**
 * A working replica of the desktop app, built in code instead of a screenshot. Everything in it
 * is state: open and close groups, pick a conversation, search, start a new chat or project,
 * change the model, send a message and watch a scripted reply stream in.
 * Controls that need the real backend show a short notice instead of doing nothing.
 */
export function AppPreview() {
  const [chats, setChats] = useState<Readonly<Record<string, Chat>>>(INITIAL_CHAT_MAP);
  const [projects, setProjects] = useState<readonly Project[]>(INITIAL_PROJECTS);
  const [activeId, setActiveId] = useState(DEFAULT_CHAT_ID);
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(new Set(INITIAL_OPEN_PROJECT_IDS));
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [model, setModel] = useState<ModelName>("Claude");
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState<StreamingReply | null>(null);
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const counter = useRef(1);

  const activeChat = chats[activeId] ?? chats[DEFAULT_CHAT_ID];
  const nextId = (prefix: string) => `${prefix}-${counter.current++}`;
  const showNotice = (text: string) => setNotice((prev) => ({ id: (prev?.id ?? 0) + 1, text }));

  /* Toast: auto-hide. A new id each time so repeated clicks restart the timer. */
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  /* Scripted reply: a short "thinking" beat, then one word at a time, then it is committed to the chat. */
  useEffect(() => {
    if (!streaming) return;

    if (streaming.shown >= streaming.words.length) {
      const { chatId, model: replyModel, words } = streaming;
      const messageId = nextId("reply");
      setChats((prev) => {
        const chat = prev[chatId];
        if (!chat) return prev;
        return {
          ...prev,
          [chatId]: {
            ...chat,
            messages: [
              ...chat.messages,
              {
                id: messageId,
                role: "assistant",
                model: replyModel,
                blocks: [{ type: "paragraph", segments: [{ text: words.join(" ") }] }],
              },
            ],
          },
        };
      });
      setStreaming(null);
      return;
    }

    const delay = streaming.shown === 0 ? THINK_MS : WORD_MS;
    const timer = window.setTimeout(
      () => setStreaming((current) => (current ? { ...current, shown: current.shown + 1 } : current)),
      delay,
    );
    return () => window.clearTimeout(timer);
    // nextId only touches a ref, so it is safe to leave out of the dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const selectChat = (chatId: string) => {
    setActiveId(chatId);
    setMobileOpen(false);
  };

  const toggleProject = (projectId: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });

  const newChat = () => {
    const id = nextId("chat");
    setChats((prev) => ({ ...prev, [id]: { id, title: NEW_CHAT_TITLE, age: "now", messages: [] } }));
    setProjects((prev) =>
      prev.map((project) => (project.id === DEFAULT_PROJECT_ID ? { ...project, chatIds: [id, ...project.chatIds] } : project)),
    );
    setOpenIds((prev) => new Set(prev).add(DEFAULT_PROJECT_ID));
    setQuery("");
    setActiveId(id);
    setMobileOpen(false);
  };

  const newProject = () => {
    const id = nextId("project");
    setProjects((prev) => [{ id, name: `New project ${prev.length + 1}`, chatIds: [] }, ...prev]);
    setOpenIds((prev) => new Set(prev).add(id));
    setQuery("");
  };

  const togglePanel = () => {
    // Each flag only matters at its own breakpoint, so flipping both is correct.
    setDesktopOpen((open) => !open);
    setMobileOpen((open) => !open);
  };

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming || !activeChat) return;
    const chatId = activeChat.id;
    const messageId = nextId("user");
    setChats((prev) => {
      const chat = prev[chatId];
      if (!chat) return prev;
      const isFirst = chat.messages.length === 0 && chat.title === NEW_CHAT_TITLE;
      const title = isFirst ? trimmed.slice(0, TITLE_MAX) : chat.title;
      return {
        ...prev,
        [chatId]: { ...chat, title, messages: [...chat.messages, { id: messageId, role: "user", text: trimmed }] },
      };
    });
    setDraft("");
    setStreaming({ chatId, model, words: pickReply(trimmed, model).split(" "), shown: 0 });
  };

  const resendMessage = (message: Message) => {
    if (message.role !== "user" || streaming) return;
    send(message.text);
  };

  const deleteMessage = (messageId: string) => {
    if (!activeChat) return;
    const chatId = activeChat.id;
    setChats((prev) => {
      const chat = prev[chatId];
      if (!chat) return prev;
      return { ...prev, [chatId]: { ...chat, messages: chat.messages.filter((m) => m.id !== messageId) } };
    });
  };

  if (!activeChat) return null;

const sidebarClass = [
  "absolute inset-y-0 left-0 z-20 flex w-64 flex-col",
  "transition-[transform,visibility] duration-300 ease-out motion-reduce:transition-none",
  mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full",
  "md:visible md:static md:z-auto md:w-60 md:shrink-0 md:translate-x-0 md:transition-none",
  desktopOpen ? "" : "md:hidden",
].join(" ");

  return (
    <div
      role="group"
      aria-label="Interactive preview of the AIGenius app"
      className={`relative flex h-[34rem] flex-col overflow-hidden rounded-xl text-left shadow-lp-lift md:h-[41rem] ${APP.frame}`}
    >
      <header
        className={`flex h-11 shrink-0 items-center gap-3 border-b px-4 ${APP.topBar} ${APP.line}`}
      >
        {/* macOS traffic lights */}
        <div className="flex shrink-0 items-center gap-[7px]">
          <button
            type="button"
            aria-label="Close"
            onClick={() => showNotice(LIVE_PREVIEW_NOTICE)}
            className="h-3 w-3 rounded-full bg-[#ff5f57] transition-opacity duration-150 hover:opacity-80"
          />
          <button
            type="button"
            aria-label="Minimize"
            onClick={() => showNotice(LIVE_PREVIEW_NOTICE)}
            className="h-3 w-3 rounded-full bg-[#febc2e] transition-opacity duration-150 hover:opacity-80"
          />
          <button
            type="button"
            aria-label="Maximize"
            onClick={() => showNotice(LIVE_PREVIEW_NOTICE)}
            className="h-3 w-3 rounded-full bg-[#28c840] transition-opacity duration-150 hover:opacity-80"
          />
        </div>

        <button
          type="button"
          onClick={() =>
            showNotice("Switching workspaces is part of the full app.")
          }
          className="flex items-center gap-1 text-sm font-semibold"
        >
          AIGenius
          <ChevronDownIcon className={`h-3.5 w-3.5 ${APP.muted}`} />
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {mobileOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            aria-hidden={!mobileOpen}
            tabIndex={mobileOpen ? 0 : -1}
            onClick={() => setMobileOpen(false)}
            className={`absolute inset-0 z-10 bg-black/30 transition-opacity duration-300 motion-reduce:transition-none md:hidden ${
              mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          />
        )}

        <Sidebar
          className={sidebarClass}
          projects={projects}
          chats={chats}
          activeId={activeChat.id}
          openIds={openIds}
          query={query}
          searchOpen={searchOpen}
          onToggleSearch={() => {
            setSearchOpen((open) => !open);
            setQuery("");
          }}
          onQuery={setQuery}
          onSelect={selectChat}
          onToggleProject={toggleProject}
          onNewChat={newChat}
          onNewProject={newProject}
          onTogglePanel={togglePanel}
          onNotice={showNotice}
        />

        <section className="relative flex min-w-0 flex-1 flex-col">
          <button
            type="button"
            aria-label="Open sidebar"
            onClick={togglePanel}
            className={`absolute left-3 top-3 z-10 h-8 w-8 items-center justify-center rounded-md ${APP.muted} ${APP.hover} ${
              mobileOpen ? "hidden" : "flex"
            } ${desktopOpen ? "md:hidden" : "md:flex"}`}
          >
            <PanelIcon className="h-[18px] w-[18px]" />
          </button>

          <Conversation
            chat={activeChat}
            streaming={streaming}
            onSuggest={setDraft}
            onResend={resendMessage}
            onDeleteMessage={deleteMessage}
          />
          <Composer
            draft={draft}
            model={model}
            disabled={streaming !== null}
            onDraft={setDraft}
            onModel={setModel}
            onSend={() => send(draft)}
            onNotice={showNotice}
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-32 z-30 flex justify-center px-4">
            <AnimatePresence>
              {notice && (
                <motion.p
                  key={notice.id}
                  role="status"
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.2, ease: EASE }}
                  className={`rounded-full px-4 py-2 text-xs shadow-lg ${APP.toast}`}
                >
                  {notice.text}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  );
}
