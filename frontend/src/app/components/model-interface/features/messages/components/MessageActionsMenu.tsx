"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { FiTrash2, FiInfo, FiCopy, FiRepeat, FiBookmark } from "react-icons/fi";
import { Sparkles } from "lucide-react";
import { GitBranchPlus } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/app/components/model-interface/shared/types";

export type MessageActionsMenuAlign = "start" | "end";

interface MessageActionsMenuProps {
  align: MessageActionsMenuAlign;
  msg: ChatMessageType;
  idx: number;
  isSaved: boolean;
  justSaved: boolean;
  loading: boolean;
  streaming: boolean;
  onDelete: (idx: number) => void;
  onDeleteById?: (id: string) => void;
  onCopy: () => void;
  onSave: () => void;
  onReplay: () => void;
  onStartOrphanReply?: () => void;
  onOpenUsageDetails: () => void;
  /** Lets the parent raise stacking order while open so the menu is not covered by the next message. */
  onOpenChange?: (open: boolean) => void;
}

export function MessageActionsMenu({
  align,
  msg,
  idx,
  isSaved,
  justSaved,
  loading,
  streaming,
  onDelete,
  onDeleteById,
  onCopy,
  onSave,
  onReplay,
  onStartOrphanReply,
  onOpenUsageDetails,
  onOpenChange,
}: MessageActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuVerticalDirection, setMenuVerticalDirection] = useState<"up" | "down">("up");
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const interactionLocked = loading || streaming;

  const updateMenuVerticalDirection = useCallback(() => {
    if (!rootRef.current || !menuRef.current) return;

    const triggerRect = rootRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportMargin = 8;
    const spaceAbove = triggerRect.top - viewportMargin;
    const spaceBelow = window.innerHeight - triggerRect.bottom - viewportMargin;
    const canOpenUp = spaceAbove >= menuRect.height;
    const canOpenDown = spaceBelow >= menuRect.height;

    if (canOpenUp && !canOpenDown) {
      setMenuVerticalDirection("up");
      return;
    }

    if (canOpenDown && !canOpenUp) {
      setMenuVerticalDirection("down");
      return;
    }

    if (!canOpenUp && !canOpenDown) {
      setMenuVerticalDirection(spaceBelow > spaceAbove ? "down" : "up");
      return;
    }

    setMenuVerticalDirection("up");
  }, []);

  useEffect(() => {
    if (!open) return;

    const frameId = window.requestAnimationFrame(updateMenuVerticalDirection);
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onViewportChange = () => {
      updateMenuVerticalDirection();
    };

    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open, updateMenuVerticalDirection]);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  const handleDelete = () => {
    if (onDeleteById && msg.id) {
      onDeleteById(msg.id);
    } else {
      onDelete(idx);
    }
    setOpen(false);
  };

  const menuPos = align === "end" ? "right-0" : "left-0";
  const menuVerticalPos = menuVerticalDirection === "up" ? "bottom-full mb-1" : "top-full mt-1";

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Message actions"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <div
          ref={menuRef}
          role="menu"
          className={`absolute z-[100] min-w-[12rem] rounded-md border border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-800 py-1 shadow-md ${menuPos} ${menuVerticalPos}`}
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-700/50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={interactionLocked}
            onClick={() => {
              handleDelete();
            }}
          >
            <FiTrash2 size={14} className="shrink-0 text-slate-500 dark:text-zinc-400" aria-hidden />
            Delete
          </button>
          {msg.role === "assistant" ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-700/50"
              onClick={() => {
                onOpenUsageDetails();
                setOpen(false);
              }}
            >
              <FiInfo size={14} className="shrink-0 text-slate-500 dark:text-zinc-400" aria-hidden />
              Token details
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-700/50"
            onClick={() => {
              onCopy();
              setOpen(false);
            }}
          >
            <FiCopy size={14} className="shrink-0 text-slate-500 dark:text-zinc-400" aria-hidden />
            Copy
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-700/50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSaved}
            onClick={() => {
              onSave();
              setOpen(false);
            }}
          >
            <span className="relative inline-flex shrink-0 items-center">
              <FiBookmark size={14} className="text-slate-500 dark:text-zinc-400" aria-hidden />
              {justSaved ? (
                <Sparkles
                  size={14}
                  className="absolute -right-3 -top-1 text-amber-400 dark:text-amber-500"
                  aria-hidden
                />
              ) : null}
            </span>
            {isSaved ? "Saved" : "Save message"}
          </button>
          {onStartOrphanReply ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-700/50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={interactionLocked}
              onClick={() => {
                onStartOrphanReply();
                setOpen(false);
              }}
            >
              <GitBranchPlus size={14} className="shrink-0 text-slate-500 dark:text-zinc-400" aria-hidden />
              Reply in side thread
            </button>
          ) : null}
          {msg.role === "user" ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-700/50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={interactionLocked}
              onClick={() => {
                onReplay();
                setOpen(false);
              }}
            >
              <FiRepeat size={14} className="shrink-0 text-slate-500 dark:text-zinc-400" aria-hidden />
              Replay
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
