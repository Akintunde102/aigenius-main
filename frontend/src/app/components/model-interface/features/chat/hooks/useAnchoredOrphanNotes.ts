import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import getNoboxFunctions from "@/lib/calls/get-nobox-functions";
import {
  getConversationById,
  getOrphanThreadsForConversation,
  removeChatHistorySessionById,
  type ModelChatConversation,
} from "@/lib/calls/model-chat-conversation";
import type {
  ChatMessage,
  Model,
  OrphanReplyTrigger,
  StickyThreadMarker,
} from "@/app/components/model-interface/shared/types";
import { CHAT_CONFIG } from "./chatOperations.constants";
import { createChatMessage } from "./contentProcessing.utils";
import { handleSendError } from "./errorHandling.utils";
import {
  getStickyMarkerMessageId,
  loadDraftStickyThreadMarkers,
  removeDraftStickyThreadMarker,
  upsertDraftStickyThreadMarker,
} from "./orphanNoteAnchors";

type StickyThreadRecord = StickyThreadMarker & {
  messages: ChatMessage[];
};

function toStickyThreadRecord(
  conversation: ModelChatConversation,
): StickyThreadRecord | null {
  const anchor = conversation.metadata?.orphanAnchor;
  if (!conversation.parentConversationId || !conversation.parentMessageId || !anchor) {
    return null;
  }

  return {
    markerId: conversation.id,
    parentConversationId: conversation.parentConversationId,
    parentMessageId: conversation.parentMessageId,
    conversationId: conversation.id,
    draft: false,
    createdAt: new Date(conversation.createdAt).getTime(),
    updatedAt: new Date(conversation.updatedAt).getTime(),
    anchor,
    modelId: conversation.session.modelId,
    title: conversation.session.title,
    messages: conversation.session.messages,
  };
}

function mergeMarkerRecords(
  persistedMarkers: StickyThreadRecord[],
  draftMarkers: StickyThreadRecord[],
): StickyThreadRecord[] {
  const merged = new Map<string, StickyThreadRecord>();

  [...persistedMarkers, ...draftMarkers].forEach((marker) => {
    const key = marker.conversationId ?? marker.markerId;
    const previous = merged.get(key);
    if (!previous || previous.updatedAt <= marker.updatedAt) {
      merged.set(key, marker);
    }
  });

  return Array.from(merged.values()).sort((left, right) => left.createdAt - right.createdAt);
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function computeModalPosition(anchor: StickyThreadMarker["anchor"]): {
  left: number;
  top: number;
} {
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : anchor.viewportWidth ?? 1280;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : anchor.viewportHeight ?? 720;
  const isMobile = viewportWidth < 768;

  // Constants for the algorithm
  const modalWidth = isMobile ? viewportWidth - 24 : 552;
  const modalHeight = isMobile ? viewportHeight - 40 : Math.min(680, viewportHeight - 120);
  const margin = 20; // Safe distance from viewport edges
  const hOffset = 48; // How far to the side of the tap point
  const vOffset = 20; // How far down (or up) from the tap point

  // 1. Calculate horizontal position
  // Try Right first, then Left
  let left = anchor.tapClientX + hOffset;
  if (left + modalWidth > viewportWidth - margin) {
    // Doesn't fit on right, try left
    const leftTry = anchor.tapClientX - modalWidth - hOffset;
    if (leftTry >= margin) {
      left = leftTry;
    } else {
      // Doesn't fit left either, just keep it within boundaries
      left = Math.max(margin, viewportWidth - modalWidth - margin);
    }
  }

  // 2. Calculate vertical position
  // In Electron, we must account for the custom title bar height
  const desktopOffset = typeof document !== "undefined" 
    ? parseInt(getComputedStyle(document.documentElement).getPropertyValue("--aigenius-desktop-titlebar-top") || "0") 
    : 0;
    
  const effectiveTopMargin = margin + desktopOffset;

  // Try Down first, then Up
  let top = anchor.tapClientY + vOffset;
  if (top + modalHeight > viewportHeight - margin) {
    // Doesn't fit below, try above
    const topTry = anchor.tapClientY - modalHeight - vOffset;
    if (topTry >= effectiveTopMargin) {
      top = topTry;
    } else {
      // Doesn't fit above either, center it as much as possible while respecting boundaries
      top = Math.max(effectiveTopMargin, viewportHeight - modalHeight - margin);
    }
  }

  // Final sanity clamp to ensure we never exit the viewport
  return {
    left: Math.round(clamp(left, margin, viewportWidth - modalWidth - margin)),
    top: Math.round(clamp(top, effectiveTopMargin, viewportHeight - modalHeight - margin)),
  };
}

export function useAnchoredOrphanNotes(params: {
  currentSessionId: string | null;
  selectedModel: Model | null;
  models: Model[];
  setError?: (error: string | ((prev: string) => string)) => void;
  setWallet?: (wallet: number | null | ((prev: number | null) => number | null)) => void;
  onInsufficientFunds?: () => void;
}) {
  const { currentSessionId, selectedModel, models, setError, setWallet, onInsufficientFunds } = params;
  const [markers, setMarkers] = useState<StickyThreadRecord[]>([]);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [activeInput, setActiveInput] = useState("");
  const [hiddenMessageIds, setHiddenMessageIds] = useState<Record<string, boolean>>({});
  const [isSending, setIsSending] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setDragOffset({ x: 0, y: 0 });
  }, [activeMarkerId]);

  useEffect(() => {
    let cancelled = false;

    if (!currentSessionId) {
      setMarkers([]);
      setActiveMarkerId(null);
      setActiveInput("");
      setHiddenMessageIds({});
      return;
    }

    setHiddenMessageIds({});

    void (async () => {
      try {
        const orphanThreads = await getOrphanThreadsForConversation(currentSessionId);
        console.log(`[useAnchoredOrphanNotes] Fetched ${orphanThreads.length} orphan threads for session ${currentSessionId}`);
        
        const persistedMarkers = orphanThreads
          .map((conv) => {
            const marker = toStickyThreadRecord(conv);
            if (!marker) {
              console.warn(`[useAnchoredOrphanNotes] Failed to convert orphan thread ${conv.id} to marker. Metadata:`, conv.metadata);
            }
            return marker;
          })
          .filter((m): m is StickyThreadRecord => m !== null);

        console.log(`[useAnchoredOrphanNotes] Resolved ${persistedMarkers.length} markers from API`);

        const draftMarkers = loadDraftStickyThreadMarkers(currentSessionId).map((marker) => ({
          ...marker,
          messages: [],
        }));
        const nextMarkers = mergeMarkerRecords(persistedMarkers, draftMarkers);
        setMarkers(nextMarkers);
        setActiveMarkerId((previousId) => (
          previousId && nextMarkers.some((marker) => marker.markerId === previousId)
            ? previousId
            : null
        ));
      } catch (error) {
        console.error("Failed to load anchored orphan notes:", error);
        if (!cancelled) {
          const draftMarkers = loadDraftStickyThreadMarkers(currentSessionId).map((marker) => ({
            ...marker,
            messages: [],
          }));
          setMarkers(draftMarkers);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentSessionId]);

  const markersByMessageId = useMemo(() => {
    return markers.reduce<Record<string, StickyThreadRecord[]>>((accumulator, marker) => {
      const currentMarkers = accumulator[marker.parentMessageId] ?? [];
      currentMarkers.push(marker);
      accumulator[marker.parentMessageId] = currentMarkers;
      return accumulator;
    }, {});
  }, [markers]);

  const activeMarker = useMemo(
    () => markers.find((marker) => marker.markerId === activeMarkerId) ?? null,
    [markers, activeMarkerId],
  );

  const activeModalPosition = useMemo(() => {
    if (!activeMarker) return null;
    // Fix #4: Use the dynamic markerViewportPos if available to prevent drift on scroll
    // But computeModalPosition needs the raw tap coordinates for the initial layout
    const base = computeModalPosition(activeMarker.anchor);
    return {
      left: base.left + dragOffset.x,
      top: base.top + dragOffset.y,
    };
  }, [activeMarker, dragOffset]);

  const openMarker = useCallback((marker: StickyThreadMarker) => {
    setActiveMarkerId((prev) => (prev === marker.markerId ? null : marker.markerId));
    setActiveInput("");
  }, []);

  const closeActiveMarker = useCallback(() => {
    setActiveMarkerId(null);
    setActiveInput("");
  }, []);

  const toggleMessageVisibility = useCallback((messageId: string) => {
    setHiddenMessageIds((previous) => ({
      ...previous,
      [messageId]: !previous[messageId],
    }));
  }, []);

  const setActiveMarkerModelId = useCallback((modelId: string) => {
    if (!activeMarkerId) return;
    setMarkers((previous) => previous.map((marker) => {
      if (marker.markerId === activeMarkerId) {
        const updated = { ...marker, modelId, updatedAt: Date.now() };
        if (updated.draft) {
          upsertDraftStickyThreadMarker(updated);
        }
        return updated;
      }
      return marker;
    }));
  }, [activeMarkerId]);

  const createOrphanNoteFromTrigger = useCallback((trigger: OrphanReplyTrigger) => {
    if (!currentSessionId) {
      return;
    }

    const parentMessageId = getStickyMarkerMessageId(trigger.message);
    const markerId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const draftMarker: StickyThreadRecord = {
      markerId,
      parentConversationId: currentSessionId,
      parentMessageId,
      draft: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      anchor: trigger.anchor,
      modelId: selectedModel?.id ?? trigger.message.modelId,
      title: "Side thread",
      messages: [],
    };

    upsertDraftStickyThreadMarker(draftMarker);
    setMarkers((previous) => [...previous, draftMarker]);
    setHiddenMessageIds((previous) => {
      if (!previous[parentMessageId]) {
        return previous;
      }

      const nextValue = { ...previous };
      delete nextValue[parentMessageId];
      return nextValue;
    });
    setActiveMarkerId(markerId);
    setActiveInput("");
  }, [currentSessionId, selectedModel?.id]);

  const deleteMarker = useCallback(async (marker: StickyThreadMarker | null) => {
    if (!marker) {
      return;
    }

    if (marker.draft || !marker.conversationId) {
      removeDraftStickyThreadMarker({
        parentConversationId: marker.parentConversationId,
        markerId: marker.markerId,
      });
      setMarkers((previous) => previous.filter((existingMarker) => existingMarker.markerId !== marker.markerId));
      setActiveMarkerId((previousId) => (previousId === marker.markerId ? null : previousId));
      return;
    }

    try {
      await removeChatHistorySessionById(marker.conversationId);
      setMarkers((previous) => previous.filter((existingMarker) => existingMarker.markerId !== marker.markerId));
      setActiveMarkerId((previousId) => (previousId === marker.markerId ? null : previousId));
    } catch (error) {
      console.error("Failed to delete anchored orphan note:", error);
    }
  }, []);

  const refreshMarkerConversation = useCallback(async (
    marker: StickyThreadRecord,
    conversationId: string,
  ): Promise<StickyThreadRecord> => {
    const refreshedConversation = await getConversationById(conversationId);
    if (!refreshedConversation?.session) {
      removeDraftStickyThreadMarker({
        parentConversationId: marker.parentConversationId,
        markerId: marker.markerId,
      });

      return {
        ...marker,
        conversationId,
        draft: false,
        updatedAt: Date.now(),
      };
    }

    removeDraftStickyThreadMarker({
      parentConversationId: marker.parentConversationId,
      markerId: marker.markerId,
    });

    return {
      markerId: marker.markerId,
      parentConversationId: marker.parentConversationId,
      parentMessageId: marker.parentMessageId,
      conversationId,
      draft: false,
      createdAt: marker.createdAt,
      updatedAt: Date.now(),
      anchor: marker.anchor,
      modelId: refreshedConversation.session.modelId,
      title: refreshedConversation.session.title,
      messages: refreshedConversation.session.messages,
    };
  }, []);

  const stopActiveMarkerMessage = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsSending(false);
  }, []);

  const sendActiveMarkerMessage = useCallback(async () => {
    if (!activeMarker || isSending) {
      return;
    }

    const trimmedInput = activeInput.trim();
    if (!trimmedInput) {
      return;
    }

    const modelId = activeMarker.modelId ?? selectedModel?.id;
    const model = models.find((candidate) => candidate.id === modelId)
      ?? selectedModel
      ?? models[0]
      ?? null;

    if (!model) {
      return;
    }

    const userMessage = createChatMessage(
      "user",
      trimmedInput,
      model.id,
      model.name || model.id,
      activeMarker.conversationId ?? activeMarker.parentConversationId,
    );
    const streamingMessage = createChatMessage(
      "assistant",
      "",
      model.id,
      model.name || model.id,
      activeMarker.conversationId ?? activeMarker.parentConversationId,
    );

    const optimisticMessages = [...activeMarker.messages, userMessage, streamingMessage];
    setMarkers((previous) => previous.map((marker) => (
      marker.markerId === activeMarker.markerId
        ? {
            ...marker,
            messages: optimisticMessages,
            modelId: model.id,
            updatedAt: Date.now(),
          }
        : marker
    )));
    setActiveInput("");
    setIsSending(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const { accessModelStream } = await getNoboxFunctions({
        project: CHAT_CONFIG.DEFAULT_PROJECT,
      });

      const requestMessages = [...activeMarker.messages, userMessage].map((message) => ({
        role: message.role,
        content: message.content,
        ...(message.messageId ? { messageId: message.messageId } : {}),
        ...(message.timestamp ? { timestamp: message.timestamp } : {}),
        ...(message.modelId ? { modelId: message.modelId } : {}),
        ...(message.modelName ? { modelName: message.modelName } : {}),
      }));

      // Insert highlight context as system prompt for ALL turns to prevent context decay (Fix #5)
      if (activeMarker.anchor.anchorText) {
        requestMessages.unshift({
          role: "system" as any,
          content: `CONTEXT: The user has highlighted the following text from the main conversation: "${activeMarker.anchor.anchorText}". Focus your response on this context.`,
        } as any);
      }

      const streamResult = await accessModelStream({
        body: {
          messages: requestMessages as any,
          ...(activeMarker.conversationId ? { conversationId: activeMarker.conversationId } : {}),
          ...(!activeMarker.conversationId
            ? {
                conversationKind: "orphan_question" as const,
                parentConversationId: activeMarker.parentConversationId,
                parentMessageId: activeMarker.parentMessageId,
                anchor: activeMarker.anchor,
              }
            : {}),
        },
        options: { model: model.id },
        signal: abortController.signal,
        onData: (chunk, reasoning, reasoningDetails) => {
          setMarkers((previous) => {
            const now = Date.now();
            return previous.map((m) => {
              if (m.markerId !== activeMarker.markerId) return m;
              const updatedMessages = [...m.messages];
              const lastMessage = updatedMessages[updatedMessages.length - 1];
              if (!lastMessage || lastMessage.role !== "assistant") return m;
              
              const nextContent = typeof chunk === "string" 
                ? `${typeof lastMessage.content === "string" ? lastMessage.content : ""}${chunk}`
                : lastMessage.content;
              
              const nextReasoning = reasoning 
                ? `${lastMessage.reasoning || ""}${reasoning}`
                : lastMessage.reasoning;

              const nextReasoningDetails = reasoningDetails?.length
                ? [{
                    ...(lastMessage.reasoning_details?.[0] || reasoningDetails[0]),
                    text: `${lastMessage.reasoning_details?.[0]?.text || ""}${reasoningDetails[0]?.text || ""}`
                  }]
                : lastMessage.reasoning_details;

              updatedMessages[updatedMessages.length - 1] = { 
                ...lastMessage, 
                content: nextContent,
                reasoning: nextReasoning,
                reasoning_details: nextReasoningDetails
              };
              
              return {
                ...m,
                messages: updatedMessages,
                updatedAt: now,
              };
            });
          });
        },
      });

      const conversationId = streamResult.conversationId ?? activeMarker.conversationId;
      if (!conversationId) {
        return;
      }

      // Finalize marker state locally instead of fetching from DB to avoid race conditions/stale data
      // Fix #1: Align markerId with conversationId to prevent duplicate dots on reload
      setMarkers((previous) => previous.map((m) => {
        if (m.markerId !== activeMarker.markerId) return m;
        return {
          ...m,
          markerId: conversationId, // Update markerId to match persisted conversationId
          conversationId,
          draft: false,
          updatedAt: Date.now(),
        };
      }));

      // Cleanup draft from storage
      removeDraftStickyThreadMarker({
        parentConversationId: activeMarker.parentConversationId,
        markerId: activeMarker.markerId,
      });

      setActiveMarkerId(conversationId); // Update active ID to match the new markerId
    } catch (error) {
      console.error("Failed to send sticky note message:", error);
      
      const noop = () => {};
      handleSendError(
        error, 
        activeMarker.messages, 
        false, 
        noop as any, 
        (setError || noop) as any, 
        { 
          setWallet: setWallet as any, 
          onInsufficientFunds 
        }
      );

      setMarkers((previous) => previous.map((marker) => (
        marker.markerId === activeMarker.markerId
          ? {
              ...marker,
              messages: marker.messages.slice(0, Math.max(0, marker.messages.length - 2)),
              updatedAt: Date.now(),
            }
          : marker
      )));
      setActiveInput(trimmedInput);
    } finally {
      setIsSending(false);
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [
    activeInput,
    activeMarker,
    isSending,
    models,
    selectedModel,
    setError,
    setWallet,
    onInsufficientFunds,
    currentSessionId
  ]);

  return {
    markersByMessageId,
    hiddenMessageIds,
    activeMarker,
    activeModalPosition,
    activeInput,
    setActiveInput,
    isSending,
    openMarker,
    closeActiveMarker,
    toggleMessageVisibility,
    createOrphanNoteFromTrigger,
    deleteMarker,
    sendActiveMarkerMessage,
    stopActiveMarkerMessage,
    setActiveMarkerModelId,
    dragOffset,
    setDragOffset,
  };
}
