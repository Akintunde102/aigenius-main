import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ChatMessage as ChatMessageType,
  Model,
  OrphanReplyTrigger,
  StickyThreadMarker,
} from "@/app/components/model-interface/shared/types";
import { Loader2 } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { TypingIndicator } from "./TypingIndicator";
import {
  ChatAreaVirtualizedList,
  type ChatAreaVirtualizedListProps,
} from "./ChatAreaVirtualizedList";
import { isVisibleChatMessage } from "@/lib/utils/messageContentUtils";
import type { MessageEditDraft } from "../../messages/utils/messageEdit.utils";
import type { RewritePromptOptions } from "../hooks/chatOperations.types";
import { useChatAreaPinchZoom } from "../hooks/useChatAreaPinchZoom";

interface ChatAreaProps {
  chat: ChatMessageType[];
  selectedModel: Model | null;
  models: Model[];
  showCosts: boolean;
  showNaira: boolean;
  showTyping: boolean;
  loading: boolean;
  imagePreview: import('@/app/components/model-interface/features/message-types/components/ImagePreviewActionsContext').ImagePreviewOpenTarget | null;
  setImagePreview: (url: import('@/app/components/model-interface/features/message-types/components/ImagePreviewActionsContext').ImagePreviewOpenTarget | null) => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
  chatAreaRef: React.MutableRefObject<HTMLDivElement | null>;
  onDeleteMessage: (idx: number) => void;
  onDeleteMessageById?: (id: string) => void;
  onSaveMessage: (msg: ChatMessageType) => void;
  onReplayMessage: (message: ChatMessageType, idx: number) => void;
  editingIdx?: number | null;
  editDraft?: MessageEditDraft | null;
  onStartEditMessage?: (message: ChatMessageType, idx: number) => void;
  onCancelEditMessage?: () => void;
  onUpdateEditDraft?: (draft: MessageEditDraft) => void;
  onCommitEditMessage?: (idx: number) => void;
  conversationId?: string | null;
  supportsFileUpload?: boolean;
  onStartOrphanReply?: (trigger: OrphanReplyTrigger) => void;
  orphanMarkersByMessageId?: Record<string, StickyThreadMarker[]>;
  hiddenMarkerMessageIds?: Record<string, boolean>;
  onOpenOrphanMarker?: (marker: StickyThreadMarker) => void;
  onToggleOrphanMarkers?: (messageId: string) => void;
  streaming?: boolean;
  selectedPersonalityName?: string;
  selectedPersonalityIconUrl?: string;
  isTranscriptHydrating?: boolean;
  onScrolledUpChange?: (scrolledUp: boolean) => void;
  onPromptButtonSelect?: (label: string) => void;
  onRewritePrompt?: (options?: RewritePromptOptions) => void;
  rewritePromptInProgress?: boolean;
  composerHeight?: number;
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
  editingIdx = null,
  editDraft = null,
  onStartEditMessage,
  onCancelEditMessage,
  onUpdateEditDraft,
  onCommitEditMessage,
  conversationId = null,
  supportsFileUpload = true,
  onStartOrphanReply,
  orphanMarkersByMessageId,
  hiddenMarkerMessageIds,
  onOpenOrphanMarker,
  onToggleOrphanMarkers,
  streaming = false,
  selectedPersonalityName,
  selectedPersonalityIconUrl,
  isTranscriptHydrating = false,
  onScrolledUpChange,
  onPromptButtonSelect,
  onRewritePrompt,
  rewritePromptInProgress,
  composerHeight = 96,
}: ChatAreaProps) {
  const bindPinchZoom = useChatAreaPinchZoom();
  const [isScrolledUp, setIsScrolledUp] = React.useState(false);

  const handleScroll = useCallback(() => {
    const chatArea = chatAreaRef.current;
    if (!chatArea) return;
    const distanceToBottom = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight;
    setIsScrolledUp(distanceToBottom > 80);
  }, [chatAreaRef]);

  useEffect(() => {
    onScrolledUpChange?.(isScrolledUp);
  }, [isScrolledUp, onScrolledUpChange]);

  const handleChatAreaRef = useCallback(
    (node: HTMLDivElement | null) => {
      chatAreaRef.current = node;
      bindPinchZoom(node);
    },
    [bindPinchZoom, chatAreaRef],
  );

  const visibleNonSystemCount = useMemo(
    () => chat.filter(isVisibleChatMessage).length,
    [chat],
  );

  const prevShowTypingRef = useRef(showTyping);

  // Only scroll when the typing indicator appears (connecting), not when it
  // disappears at stream end — that second scroll caused a visible flash.
  useEffect(() => {
    const didShowTyping = showTyping && !prevShowTypingRef.current;
    prevShowTypingRef.current = showTyping;

    if (!didShowTyping || !chatEndRef.current) return;

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

    if (chatArea) {
      chatArea.scrollTop = chatArea.scrollHeight;
    } else {
      chatEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
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
    editingIdx,
    editDraft,
    onStartEditMessage,
    onCancelEditMessage,
    onUpdateEditDraft,
    onCommitEditMessage,
    conversationId,
    supportsFileUpload,
    onStartOrphanReply,
    orphanMarkersByMessageId,
    hiddenMarkerMessageIds,
    onOpenOrphanMarker,
    onToggleOrphanMarkers,
    streaming,
    selectedPersonalityName,
    selectedPersonalityIconUrl,
    onPromptButtonSelect,
    onRewritePrompt,
    rewritePromptInProgress,
  };

  return (
    <div
      ref={handleChatAreaRef}
      onScroll={handleScroll}
      className="chat-area relative flex flex-1 min-h-0 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain bg-transparent px-2 py-3 sm:px-4 md:px-6 md:py-6 chat-scrollbar"
      style={{
        position: "relative",
        zIndex: 40,
        flex: "1 1 auto",
        minHeight: "0",
        overflowY: "auto",
        overflowX: "hidden",
        overscrollBehaviorY: "contain",
        WebkitMaskImage: "linear-gradient(to bottom, black 90%, transparent 100%)",
        maskImage: "linear-gradient(to bottom, black 90%, transparent 100%)",
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

      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col min-w-0">
        {visibleNonSystemCount === 0 && isTranscriptHydrating ? (
          <div
            className="flex flex-1 items-center justify-center py-16"
            aria-busy="true"
            aria-live="polite"
          >
            <Loader2
              className="h-6 w-6 animate-spin text-[color:var(--chat-muted-fg)]"
              aria-hidden
            />
          </div>
        ) : null}

        {visibleNonSystemCount === 0 && !isTranscriptHydrating ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <EmptyState />
          </div>
        ) : null}

        {visibleNonSystemCount > 0 && (
          <ChatAreaVirtualizedList {...listProps} />
        )}

        <TypingIndicator
          loading={loading}
          streaming={streaming}
          showTyping={showTyping}
          chat={chat}
        />
      </div>

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

      {/* Dynamic bottom anchor to ensure the last message clears the composer and bottom gradient mask */}
      <div
        className="chat-scroll-anchor w-full shrink-0 pointer-events-none"
        style={{ minHeight: `calc(${composerHeight}px + 24px)` }}
        aria-hidden
      />

      <div ref={chatEndRef} />
    </div>
  );
}
