import React, { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  ChatMessage as ChatMessageType,
  Model,
  OrphanReplyTrigger,
  StickyThreadMarker,
} from "@/app/components/model-interface/shared/types";
import { EmptyState } from "./EmptyState";
import { TypingIndicator } from "./TypingIndicator";
import type { ChatAreaVirtualizedListProps } from "./ChatAreaVirtualizedList";

function ChatAreaMessagesChunkFallback() {
  return (
    <div
      className="w-full space-y-4 px-3 py-4 md:px-6"
      aria-busy="true"
      aria-label="Loading messages"
    >
      <div className="h-24 animate-pulse rounded-lg bg-slate-200/50 dark:bg-zinc-700/45" />
      <div className="ml-auto h-20 max-w-sm animate-pulse rounded-lg bg-slate-200/40 dark:bg-zinc-700/35" />
    </div>
  );
}

const ChatAreaVirtualizedListLazy = dynamic(
  () =>
    import("./ChatAreaVirtualizedList").then((m) => ({
      default: m.ChatAreaVirtualizedList,
    })),
  { ssr: false, loading: () => <ChatAreaMessagesChunkFallback /> },
);

interface ChatAreaProps {
  chat: ChatMessageType[];
  selectedModel: Model | null;
  models: Model[];
  showCosts: boolean;
  showNaira: boolean;
  showTyping: boolean;
  loading: boolean;
  imagePreview: string | null;
  setImagePreview: (url: string | null) => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
  chatAreaRef: React.RefObject<HTMLDivElement>;
  onDeleteMessage: (idx: number) => void;
  onDeleteMessageById?: (id: string) => void;
  onSaveMessage: (msg: ChatMessageType) => void;
  onReplayMessage: (message: ChatMessageType, idx: number) => void;
  onStartOrphanReply?: (trigger: OrphanReplyTrigger) => void;
  orphanMarkersByMessageId?: Record<string, StickyThreadMarker[]>;
  hiddenMarkerMessageIds?: Record<string, boolean>;
  onOpenOrphanMarker?: (marker: StickyThreadMarker) => void;
  onToggleOrphanMarkers?: (messageId: string) => void;
  streaming?: boolean;
  selectedPersonalityName?: string;
  selectedPersonalityIconUrl?: string;
}

export function ChatArea({
  chat,
  selectedModel,
  models,
  showCosts,
  showNaira,
  showTyping,
  loading,
  imagePreview,
  setImagePreview,
  chatEndRef,
  chatAreaRef,
  onDeleteMessage,
  onDeleteMessageById,
  onSaveMessage,
  onReplayMessage,
  onStartOrphanReply,
  orphanMarkersByMessageId,
  hiddenMarkerMessageIds,
  onOpenOrphanMarker,
  onToggleOrphanMarkers,
  streaming = false,
  selectedPersonalityName,
  selectedPersonalityIconUrl,
}: ChatAreaProps) {
  const visibleNonSystemCount = useMemo(
    () => chat.filter((m) => m.role !== "system").length,
    [chat],
  );

  useEffect(() => {
    if (!showTyping || !chatEndRef.current) return;

    const chatArea =
      chatAreaRef.current ||
      (chatEndRef.current.parentElement as HTMLElement | null);

    const isNearBottom = () => {
      if (!chatArea) return true;
      return (
        chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight < 60
      );
    };

    if (!isNearBottom()) return;

    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [showTyping, chatEndRef, chatAreaRef]);

  const listProps: ChatAreaVirtualizedListProps = {
    chat,
    selectedModel,
    models,
    showCosts,
    showNaira,
    loading,
    imagePreview,
    setImagePreview,
    chatAreaRef,
    onDeleteMessage,
    onDeleteMessageById,
    onSaveMessage,
    onReplayMessage,
    onStartOrphanReply,
    orphanMarkersByMessageId,
    hiddenMarkerMessageIds,
    onOpenOrphanMarker,
    onToggleOrphanMarkers,
    streaming,
    selectedPersonalityName,
    selectedPersonalityIconUrl,
  };

  return (
    <div
      ref={chatAreaRef}
      className="chat-area relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain bg-transparent px-3 py-4 md:px-6 md:py-6 chat-scrollbar"
      style={{
        position: "relative",
        zIndex: 40,
        flex: "1 1 auto",
        minHeight: "0",
        overflowY: "auto",
        overflowX: "hidden",
        overscrollBehaviorY: "contain",
      }}
    >
      <style jsx>{`
        .chat-scrollbar::-webkit-scrollbar {
          width: 0 !important;
          height: 0 !important;
          background: transparent;
        }
        .chat-scrollbar::-webkit-scrollbar-thumb {
          background: transparent;
        }
        .chat-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .chat-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
          scrollbar-color: transparent transparent;
        }
      `}</style>

      {visibleNonSystemCount === 0 && <EmptyState />}

      {visibleNonSystemCount > 0 && (
        <ChatAreaVirtualizedListLazy {...listProps} />
      )}

      <TypingIndicator
        loading={loading}
        streaming={streaming}
        showTyping={showTyping}
        chat={chat}
      />

      <style jsx>{`
        .typing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #3b82f6;
          animation: typing 1.4s infinite ease-in-out;
        }

        .typing-dot:nth-child(1) {
          animation-delay: -0.32s;
        }

        .typing-dot:nth-child(2) {
          animation-delay: -0.16s;
        }

        .typing-dot:nth-child(3) {
          animation-delay: 0s;
        }

        @keyframes typing {
          0%,
          80%,
          100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>

      <div ref={chatEndRef} />

      <style>{`
        .scroll-to-bottom-fade {
          transition: opacity 0.3s;
          opacity: 0;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.95) 0%,
            rgba(239, 246, 255, 0.98) 100%
          );
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
        }
        .group:hover .scroll-to-bottom-fade {
          opacity: 0.8;
        }
        .scroll-to-bottom-fade svg {
          color: #2563eb;
        }
      `}</style>
    </div>
  );
}
