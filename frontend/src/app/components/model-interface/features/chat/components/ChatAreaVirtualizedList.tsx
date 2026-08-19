"use client";

import React, { useCallback, useMemo } from "react";
import {
  ChatMessage as ChatMessageType,
  Model,
  OrphanReplyTrigger,
  StickyThreadMarker,
} from "@/app/components/model-interface/shared/types";
import { ChatMessageWrapper } from "../../messages/components/ChatMessageWrapper";
import copy from "copy-to-clipboard";
import { isVisibleChatMessage } from "@/lib/utils/messageContentUtils";
import type { MessageEditDraft } from "../../messages/utils/messageEdit.utils";

export interface ChatAreaVirtualizedListProps {
  chat: ChatMessageType[];
  selectedModel: Model | null;
  models: Model[];
  showCosts: boolean;
  showNaira: boolean;
  loading: boolean;
  imagePreview: string | null;
  setImagePreview: (url: string | null) => void;
  chatAreaRef?: React.RefObject<HTMLDivElement | null>;
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
  disableOrphanThreads?: boolean;
}

/**
 * Renders chat messages in normal document flow.
 *
 * Previously used @tanstack/react-virtual with position:absolute + translateY.
 * That approach caused persistent overlap bugs: when a new message was added,
 * the virtualizer's estimateSize (140px) was stale relative to the actual
 * heights of streaming messages, so `virtualRow.start` for the new item was
 * computed incorrectly, placing it on top of existing messages. ResizeObserver
 * is async so no synchronous `measure()` call could reliably fix it.
 *
 * Normal flow is immune: the browser stacks items naturally. Scrolling is
 * delegated entirely to useScrollAndKeyboard via chatEndRef.
 */
export const ChatAreaVirtualizedList = React.memo(function ChatAreaVirtualizedList({
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
  disableOrphanThreads = false,
}: ChatAreaVirtualizedListProps) {
  const handleCopy = useCallback((content: string) => {
    copy(content);
  }, []);

  const MAX_MESSAGES = 150;
  const totalVisible = chat.filter(isVisibleChatMessage).length;
  const isCapped = totalVisible > MAX_MESSAGES;

  const visibleMessages = useMemo(
    () => {
      const allVisible = chat
        .map((msg, actualIdx) => ({ msg, actualIdx }))
        .filter(({ msg }) => isVisibleChatMessage(msg));
      
      return isCapped ? allVisible.slice(-MAX_MESSAGES) : allVisible;
    },
    [chat, isCapped],
  );

  return (
    <div className="w-full flex flex-col">
      {isCapped && (
        <div className="flex justify-center p-4">
          <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-lg border border-amber-200 shadow-sm">
             Performance Note: Only the last {MAX_MESSAGES} messages are being displayed.
          </div>
        </div>
      )}
      {visibleMessages.map(({ msg, actualIdx }, displayIdx) => {
        const prevVisible =
          displayIdx > 0 ? visibleMessages[displayIdx - 1].msg : undefined;
        const key = msg.id ?? `${msg.role}-${msg.timestamp}-${actualIdx}`;

        return (
          <div
            key={key}
            data-chat-message-index={actualIdx}
            className="w-full pb-3 md:pb-5"
          >
            <ChatMessageWrapper
              msg={msg}
              idx={actualIdx}
              displayIdx={displayIdx}
              prevVisibleMsg={prevVisible}
              isLastVisibleMessage={displayIdx === visibleMessages.length - 1}
              selectedModel={selectedModel}
              models={models}
              showCosts={showCosts}
              showNaira={showNaira}
              onDeleteMessage={onDeleteMessage}
              onDeleteMessageById={onDeleteMessageById}
              onSaveMessage={onSaveMessage}
              onReplayMessage={onReplayMessage}
              editingIdx={editingIdx}
              editDraft={editDraft}
              onStartEditMessage={onStartEditMessage}
              onCancelEditMessage={onCancelEditMessage}
              onUpdateEditDraft={onUpdateEditDraft}
              onCommitEditMessage={onCommitEditMessage}
              conversationId={conversationId}
              supportsFileUpload={supportsFileUpload}
              onStartOrphanReply={onStartOrphanReply}
              orphanMarkers={orphanMarkersByMessageId?.[msg.messageId ?? msg.id ?? `ts_${msg.timestamp}`] ?? []}
              orphanMarkersHidden={Boolean(hiddenMarkerMessageIds?.[msg.messageId ?? msg.id ?? `ts_${msg.timestamp}`])}
              onOpenOrphanMarker={onOpenOrphanMarker}
              onToggleOrphanMarkers={onToggleOrphanMarkers}
              onCopy={handleCopy}
              imagePreview={imagePreview}
              setImagePreview={setImagePreview}
              loading={loading}
              streaming={streaming}
              selectedPersonalityName={selectedPersonalityName}
              selectedPersonalityIconUrl={selectedPersonalityIconUrl}
              disableOrphanThreads={disableOrphanThreads}
            />
          </div>
        );
      })}
    </div>
  );
});
