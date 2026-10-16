"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  MoreVertical,
  ChevronDown,
  SquarePen,
} from "lucide-react";
import {
  FiStar,
  FiGlobe,
  FiFileText,
  FiTag,
  FiTrash2,
} from "react-icons/fi";
import type { Model, ChatSession, ChatMessage } from "@/app/components/model-interface/shared/types";
import { ModelQuickPickDropdown } from "@/app/components/ChatBoxInput/ModelQuickPickDropdown";
import { ConversationTranscriptModal } from "@/app/components/ChatHistoryListItem/components/ConversationTranscriptModal";
import { AssignLabelsModal } from "@/app/components/ChatHistoryListItem/components/AssignLabelsModal";
import { setConversationLabels } from "@/lib/calls/model-chat-conversation";
import { useChatResourcesQuery } from "@/lib/hooks/useChatResourcesQuery";
import { chatQueryKeys } from "@/lib/hooks/chat-query-keys";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export interface MobileChatHeaderProps {
  onOpenSidebar: () => void;
  selectedModel: Model | null;
  onModelNameClick?: () => void;
  onNewChat: () => void;
  currentSession: ChatSession | null;
  chat?: ChatMessage[];
  onStarToggle?: (sessionId: string, isStarred: boolean) => Promise<void>;
  isStarred?: boolean;
  onPublish?: (session: ChatSession) => void;
  onRename?: (sessionId: string, newTitle: string) => Promise<void> | void;
  onDelete?: (sessionId: string) => Promise<void> | void;
  quickPickModels?: Model[];
  favoritesLoaded?: boolean;
  onSelectModel?: (model: Model) => void;
  onOpenFullModelPicker?: () => void;
  wallet?: number | null;
  onAddCredits?: () => void;
}

export function MobileChatHeader({
  onOpenSidebar,
  selectedModel,
  onModelNameClick,
  onNewChat,
  currentSession,
  chat = [],
  onStarToggle,
  isStarred = false,
  onPublish,
  onDelete,
  quickPickModels,
  favoritesLoaded,
  onSelectModel,
  onOpenFullModelPicker,
  wallet,
  onAddCredits,
}: MobileChatHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transcriptModalOpen, setTranscriptModalOpen] = useState(false);
  const [labelsModalOpen, setLabelsModalOpen] = useState(false);

  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: chatResources } = useChatResourcesQuery();
  const conversationLabels = chatResources?.conversationLabels ?? [];

  const toggleMenu = () => {
    if (!menuOpen && moreButtonRef.current) {
      const rect = moreButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: Math.max(12, window.innerWidth - rect.right),
      });
      setMenuOpen(true);
    } else {
      setMenuOpen(false);
    }
  };

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        moreButtonRef.current &&
        !moreButtonRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const rawModelName = selectedModel?.name || "Auto";
  const displayModelName =
    rawModelName.length > 14 ? `${rawModelName.slice(0, 12)}…` : rawModelName;

  const handleStar = useCallback(() => {
    setMenuOpen(false);
    if (!currentSession?.id) {
      toast("Start a conversation first to star it", { icon: "ℹ️" });
      return;
    }
    if (onStarToggle) {
      void onStarToggle(currentSession.id, !isStarred);
      toast.success(!isStarred ? "Conversation starred" : "Conversation unstarred");
    }
  }, [currentSession, isStarred, onStarToggle]);

  const handlePublish = useCallback(() => {
    setMenuOpen(false);
    if (!currentSession) {
      toast("No conversation to publish yet", { icon: "ℹ️" });
      return;
    }
    if (onPublish) {
      const hydratedSession =
        chat.length > 0 && (!currentSession.messages || currentSession.messages.length === 0)
          ? { ...currentSession, messages: chat }
          : currentSession;
      onPublish(hydratedSession);
    }
  }, [currentSession, chat, onPublish]);

  const handleOpenTranscript = useCallback(() => {
    setMenuOpen(false);
    if (!currentSession?.id && chat.length === 0) {
      toast("Start a conversation first to view transcript", { icon: "ℹ️" });
      return;
    }
    setTranscriptModalOpen(true);
  }, [currentSession, chat.length]);

  const handleOpenLabels = useCallback(() => {
    setMenuOpen(false);
    if (!currentSession?.id) {
      toast("Start a conversation first to assign labels", { icon: "ℹ️" });
      return;
    }
    setLabelsModalOpen(true);
  }, [currentSession]);

  const handleSaveLabels = useCallback(async (sessionId: string, labelIds: string[]) => {
    try {
      await setConversationLabels(sessionId, labelIds);
      await queryClient.invalidateQueries({ queryKey: chatQueryKeys.resources() });
      toast.success("Labels updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update labels");
    }
  }, [queryClient]);

  const handleOpenDelete = useCallback(() => {
    setMenuOpen(false);
    if (!currentSession?.id) {
      toast("No conversation to delete", { icon: "ℹ️" });
      return;
    }
    setDeleteConfirmOpen(true);
  }, [currentSession]);

  const handleConfirmDelete = useCallback(() => {
    if (!currentSession?.id) return;
    if (onDelete) {
      void onDelete(currentSession.id);
      toast.success("Conversation deleted");
    }
    setDeleteConfirmOpen(false);
  }, [currentSession, onDelete]);

  const sessionForTranscript: ChatSession | null = currentSession
    ? {
        ...currentSession,
        messages:
          currentSession.messages && currentSession.messages.length > 0
            ? currentSession.messages
            : chat,
      }
    : chat.length > 0
    ? {
        id: "temp-session",
        title: "Current Chat",
        modelId: selectedModel?.id || "auto",
        messages: chat,
      }
    : null;

  return (
    <>
      <header
        role="banner"
        className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b px-4 transition-colors select-none"
        style={{
          backgroundColor: "var(--chat-canvas-bg)",
          borderColor: "var(--sidebar-border)",
        }}
      >
        {/* Left: Hamburger + App Title + Model Selector Dropdown */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Open sidebar"
            title="Open sidebar"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--sidebar-fg)] transition-all hover:bg-black/5 active:scale-95 dark:hover:bg-white/10"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <line x1="4" y1="8" x2="20" y2="8" />
              <line x1="4" y1="16" x2="20" y2="16" />
            </svg>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-[17px] font-semibold tracking-tight text-[var(--app-ink-900)] shrink-0"
              style={{ letterSpacing: "-0.015em" }}
            >
              AIGenius
            </span>

            {quickPickModels && onSelectModel && onOpenFullModelPicker ? (
              <ModelQuickPickDropdown
                variant="header"
                selectedModel={selectedModel}
                quickPickModels={quickPickModels}
                favoritesLoaded={favoritesLoaded ?? true}
                onSelectModel={onSelectModel}
                onOpenFullPicker={onOpenFullModelPicker}
                wallet={wallet}
                onAddCredits={onAddCredits}
              />
            ) : (
              <button
                type="button"
                onClick={onModelNameClick}
                aria-label="Select AI model"
                className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-sm font-normal text-[var(--chat-muted-fg)] transition-colors hover:text-[var(--app-ink-900)]"
              >
                <span className="truncate max-w-[120px] font-normal text-[14px]">{displayModelName}</span>
                <ChevronDown size={13} className="shrink-0 opacity-70" />
              </button>
            )}
          </div>
        </div>

        {/* Right: New Chat button + 3-dots more menu */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onNewChat}
            aria-label="Start new chat"
            title="Start new chat"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--sidebar-fg)] transition-all hover:bg-black/5 active:scale-95 dark:hover:bg-white/10"
          >
            <SquarePen size={20} strokeWidth={1.75} />
          </button>

          <button
            ref={moreButtonRef}
            type="button"
            onClick={toggleMenu}
            aria-label="More conversation options"
            title="More conversation options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--sidebar-fg)] transition-all hover:bg-black/5 active:scale-95 dark:hover:bg-white/10"
          >
            <MoreVertical size={20} strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {/* 3-dots dropdown menu matching sidebar conversation dropdown */}
      {menuOpen && menuPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[10050] min-w-[180px] rounded-2xl border bg-white py-1.5 shadow-2xl backdrop-blur-md dark:bg-zinc-900 animate-in fade-in zoom-in-95 duration-100"
              style={{
                top: `${menuPosition.top}px`,
                right: `${menuPosition.right}px`,
                borderColor: "var(--sidebar-border)",
                boxShadow: "0 14px 40px -10px rgba(0,0,0,0.25)",
              }}
            >
              {/* Star / Unstar */}
              <button
                type="button"
                role="menuitem"
                onClick={handleStar}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] text-zinc-800 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <FiStar
                  size={16}
                  className={`shrink-0 ${isStarred ? "fill-amber-500 text-amber-500" : "text-zinc-600 dark:text-zinc-400"}`}
                />
                <span className={isStarred ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>
                  {isStarred ? "Unstar" : "Star"}
                </span>
              </button>

              {/* Publish / Republish */}
              <button
                type="button"
                role="menuitem"
                onClick={handlePublish}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] text-zinc-800 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <FiGlobe
                  size={16}
                  className={`shrink-0 ${currentSession?.isPublished ? "text-emerald-500" : "text-zinc-600 dark:text-zinc-400"}`}
                />
                <span className={currentSession?.isPublished ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}>
                  {currentSession?.isPublished ? "Republish" : "Publish"}
                </span>
              </button>

              {/* Transcript */}
              <button
                type="button"
                role="menuitem"
                onClick={handleOpenTranscript}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] text-zinc-800 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <FiFileText size={16} className="shrink-0 text-zinc-600 dark:text-zinc-400" />
                <span>Transcript</span>
              </button>

              {/* Labels... */}
              <button
                type="button"
                role="menuitem"
                onClick={handleOpenLabels}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] text-zinc-800 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <FiTag size={16} className="shrink-0 text-zinc-600 dark:text-zinc-400" />
                <span>Labels...</span>
              </button>

              {/* Delete */}
              <button
                type="button"
                role="menuitem"
                onClick={handleOpenDelete}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
              >
                <FiTrash2 size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
                <span>Delete</span>
              </button>
            </div>,
            document.body
          )
        : null}

      {/* Transcript Modal */}
      <ConversationTranscriptModal
        open={transcriptModalOpen}
        session={sessionForTranscript}
        title={currentSession?.title?.trim() || "Transcript"}
        onClose={() => setTranscriptModalOpen(false)}
      />

      {/* Assign Labels Modal */}
      {labelsModalOpen && currentSession && (
        <AssignLabelsModal
          isOpen={labelsModalOpen}
          session={currentSession}
          catalog={conversationLabels}
          onClose={() => setLabelsModalOpen(false)}
          onSave={handleSaveLabels}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            className="w-full max-w-sm rounded-2xl border bg-white p-6 shadow-2xl dark:bg-zinc-900"
            style={{ borderColor: "var(--sidebar-border)" }}
          >
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Delete conversation?
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              This action cannot be undone. This conversation will be permanently removed.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
