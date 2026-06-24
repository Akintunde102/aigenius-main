import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

/** Minimal Next.js app router surface used by session routing. */
type AppNavigationRouter = {
  push: (href: string) => void;
  replace: (href: string) => void;
};
import { getConversationById } from "@/lib/calls/model-chat-conversation";
import { upsertChatHistorySession } from "@/lib/utils/modelChatConversationUtils";
import { normalizeSessionMessages } from "@/lib/utils/messageContentUtils";
import {
  buildConversationMessageSignature,
  clearConversationScrollState,
  getConversationScrollState,
  getStaleConversationIds,
  saveConversationScrollState,
} from "@/lib/utils/conversationScrollMemory";
import { useSyncRouteConversationId } from "../conversation/useSyncRouteConversationId";
import { reduceNullRouteOrchestration } from "../conversation/activeConversationPhase";
import {
  setActiveRouteConversationTarget,
  setPendingDraftMode,
} from "../conversation/conversationViewSession";
import { DRAFT_SESSION_KEY } from "../features/chat/hooks";
import type { AttachmentIndexItem, UploadedFileEntry } from "../ModelInterface.helpers";
import type { ChatMessage, ChatSession, Model } from "../shared/types";
import { getConversationIdFromPath } from "../ModelInterface.types";



type ApplySessionPersonality = (session?: ChatSession | null) => void;

type Params = {
  routeConversationId: string | null;
  router: AppNavigationRouter;
  chatHistory: ChatSession[];
  setChatHistory: Dispatch<SetStateAction<ChatSession[]>>;
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  chat: ChatMessage[];
  chatAreaRef: RefObject<HTMLDivElement | null>;
  currentChatSignature: string;
  models: Model[];
  setSelectedModel: (model: Model | null) => void;
  setError: (message: string) => void;
  setChatForSession: (
    sessionKey: string,
    messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[]),
  ) => void;
  switchToSession: (session: ChatSession) => void;
  setAttachmentIndex: Dispatch<SetStateAction<AttachmentIndexItem[]>>;
  setUploadedFiles: Dispatch<SetStateAction<UploadedFileEntry[]>>;
  applySessionPersonalityState: ApplySessionPersonality;
  handleStop: () => void;
  setTotalSpent: Dispatch<SetStateAction<number>>;
  setLoading: (v: boolean) => void;
  setStreaming: (v: boolean) => void;
  setUploading: (v: boolean) => void;
  setShowTyping: (v: boolean) => void;
  setSelectedPersonalityId: (id: string | undefined) => void;
  setSelectedSystemPrompt: (p: string | undefined) => void;
  setSelectedPersonalityName: (n: string | undefined) => void;
  setSelectedPersonalityIconUrl: (u: string | undefined) => void;
};

export function useModelInterfaceSessionRouting({
  routeConversationId,
  router,
  chatHistory,
  setChatHistory,
  currentSessionId,
  setCurrentSessionId,
  chat,
  chatAreaRef,
  currentChatSignature,
  models,
  setSelectedModel,
  setError,
  setChatForSession,
  switchToSession,
  setAttachmentIndex,
  setUploadedFiles,
  applySessionPersonalityState,
  handleStop,
  setTotalSpent,
  setLoading,
  setStreaming,
  setUploading,
  setShowTyping,
  setSelectedPersonalityId,
  setSelectedSystemPrompt,
  setSelectedPersonalityName,
  setSelectedPersonalityIconUrl,
}: Params) {
  const pendingScrollRestoreSessionIdRef = useRef<string | null>(null);
  const lastKnownConversationSignaturesRef = useRef<Record<string, string>>({});
  const pendingDraftModeRef = useRef(false);
  const lastAutoRoutedSessionIdRef = useRef<string | null>(null);
  const lastInitiatedSwitchIdRef = useRef<string | null>(null);
  const prevSessionIdRef = useRef<string | null | undefined>(undefined);

  const [activeRouteConversationId, setActiveRouteConversationId] = useState<
    string | null
  >(routeConversationId);

  useSyncRouteConversationId(routeConversationId, setActiveRouteConversationId);

  useEffect(() => {
    setActiveRouteConversationTarget(activeRouteConversationId);
  }, [activeRouteConversationId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePopState = () => {
      const newConversationId = getConversationIdFromPath(window.location.pathname);

      // Only update if we're actually on a different conversation path
      // This prevents unwanted state changes when navigating between tabs
      if (newConversationId !== activeRouteConversationId) {
        setActiveRouteConversationId(newConversationId);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [activeRouteConversationId]);

  const persistCurrentConversationScroll = useCallback(() => {
    const chatArea = chatAreaRef.current;
    if (!chatArea || !currentSessionId) {
      return;
    }

    saveConversationScrollState(currentSessionId, {
      scrollTop: chatArea.scrollTop,
      messageSignature: currentChatSignature,
    });
  }, [chatAreaRef, currentChatSignature, currentSessionId]);

  const resetDraftConversation = useCallback(() => {
    handleStop();
    setPendingDraftMode(false);
    setCurrentSessionId(null);
    lastInitiatedSwitchIdRef.current = null;
    setSelectedPersonalityId(undefined);
    setSelectedSystemPrompt(undefined);
    setSelectedPersonalityName(undefined);
    setSelectedPersonalityIconUrl(undefined);
    setChatForSession(DRAFT_SESSION_KEY, []);
    setAttachmentIndex([]);
    setTotalSpent(0);
    setError("");
    setLoading(false);
    setStreaming(false);
    setUploading(false);
    setShowTyping(false);
  }, [
    handleStop,
    setAttachmentIndex,
    setChatForSession,
    setCurrentSessionId,
    setError,
    setLoading,
    setStreaming,
    setUploading,
    setShowTyping,
    setSelectedPersonalityIconUrl,
    setSelectedPersonalityId,
    setSelectedPersonalityName,
    setSelectedSystemPrompt,
    setTotalSpent,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || !currentSessionId) {
      return;
    }

    if (prevSessionIdRef.current === currentSessionId) {
      return;
    }
    prevSessionIdRef.current = currentSessionId;

    pendingScrollRestoreSessionIdRef.current = currentSessionId;
    setActiveRouteConversationId(currentSessionId);

    if (
      window.location.pathname === "/" &&
      lastAutoRoutedSessionIdRef.current !== currentSessionId
    ) {
      lastAutoRoutedSessionIdRef.current = currentSessionId;
      window.history.replaceState(null, "", `/chat/${currentSessionId}`);
    }
  }, [currentSessionId]);

  useEffect(() => {
    const chatArea = chatAreaRef.current;
    if (!chatArea || !currentSessionId) {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        saveConversationScrollState(currentSessionId, {
          scrollTop: chatArea.scrollTop,
          messageSignature: currentChatSignature,
        });
      }, 80);
    };

    chatArea.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      chatArea.removeEventListener("scroll", handleScroll);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [chatAreaRef, currentChatSignature, currentSessionId]);

  useEffect(() => {
    if (!currentSessionId || pendingScrollRestoreSessionIdRef.current !== currentSessionId) {
      return;
    }

    const chatArea = chatAreaRef.current;
    if (!chatArea) {
      return;
    }

    let frameId = 0;
    let attemptCount = 0;

    const restoreScrollPosition = () => {
      if (pendingScrollRestoreSessionIdRef.current !== currentSessionId) {
        return;
      }

      const storedScrollState = getConversationScrollState(currentSessionId);
      const shouldRestore =
        storedScrollState &&
        storedScrollState.messageSignature === currentChatSignature;

      const hasVisibleMessages =
        chat.filter((message) => message.role !== "system").length > 0;
      const maxScrollTop = Math.max(
        0,
        chatArea.scrollHeight - chatArea.clientHeight,
      );
      const shouldRetryLayout =
        hasVisibleMessages &&
        maxScrollTop === 0 &&
        attemptCount < 8;

      if (shouldRetryLayout) {
        attemptCount += 1;
        frameId = window.requestAnimationFrame(restoreScrollPosition);
        return;
      }

      if (shouldRestore) {
        chatArea.scrollTop = Math.min(storedScrollState.scrollTop, maxScrollTop);
      } else if (hasVisibleMessages) {
        chatArea.scrollTop = chatArea.scrollHeight;
      } else {
        chatArea.scrollTop = 0;
      }

      pendingScrollRestoreSessionIdRef.current = null;
    };

    frameId = window.requestAnimationFrame(restoreScrollPosition);
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [chat, chatAreaRef, currentChatSignature, currentSessionId]);

  useEffect(() => {
    const nextSignatures: Record<string, string> = {};

    chatHistory.forEach((session) => {
      if (!session.id) {
        return;
      }

      const nextSignature = buildConversationMessageSignature(session.messages || []);
      const previousSignature = lastKnownConversationSignaturesRef.current[session.id];

      if (
        session.id !== currentSessionId &&
        previousSignature &&
        previousSignature !== nextSignature
      ) {
        clearConversationScrollState(session.id);
      }

      nextSignatures[session.id] = nextSignature;
    });

    const staleConversationIds = getStaleConversationIds({
      previousSignatures: lastKnownConversationSignaturesRef.current,
      nextSignatures,
      activeConversationId: currentSessionId,
    });

    staleConversationIds.forEach((conversationId) => {
      clearConversationScrollState(conversationId);
    });

    lastKnownConversationSignaturesRef.current = nextSignatures;
  }, [chatHistory, currentSessionId]);

  useEffect(() => {
    setUploadedFiles([]);
  }, [activeRouteConversationId, setUploadedFiles]);

  const createNewSessionAndSwitchWrapper = useCallback(
    (_modelId: string) => {
      persistCurrentConversationScroll();
      resetDraftConversation();
      pendingDraftModeRef.current = true;
      setPendingDraftMode(true);
      setSelectedPersonalityId(undefined);
      setSelectedSystemPrompt(undefined);
      setSelectedPersonalityName(undefined);
      setSelectedPersonalityIconUrl(undefined);
      setActiveRouteConversationId(null);
      setActiveRouteConversationTarget(null);
      pendingScrollRestoreSessionIdRef.current = null;

      // Clear all session-related refs to prevent state leakage
      lastAutoRoutedSessionIdRef.current = null;
      lastInitiatedSwitchIdRef.current = null;
      prevSessionIdRef.current = null;

      // Force URL reset to ensure clean state
      if (typeof window !== "undefined") {
        // Use replace to avoid adding to browser history
        router.replace("/");
        // Also update the active route state immediately
        window.history.replaceState(null, "", "/");
      }
    },
    [
      activeRouteConversationId,
      currentSessionId,
      persistCurrentConversationScroll,
      resetDraftConversation,
      router,
      setSelectedPersonalityId,
      setSelectedSystemPrompt,
      setSelectedPersonalityName,
      setSelectedPersonalityIconUrl,
    ],
  );

  const enterDraftConversationMode = useCallback(() => {
    pendingDraftModeRef.current = true;
    setPendingDraftMode(true);
    setActiveRouteConversationId(null);
    setActiveRouteConversationTarget(null);
    pendingScrollRestoreSessionIdRef.current = null;

    // Clear session tracking refs to prevent state leakage
    lastAutoRoutedSessionIdRef.current = null;
    lastInitiatedSwitchIdRef.current = null;

    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      router.replace("/");
    }
  }, [router]);

  const handleSessionSwitch = useCallback(
    (session: ChatSession) => {
      pendingDraftModeRef.current = false;
      setPendingDraftMode(false);
      persistCurrentConversationScroll();
      applySessionPersonalityState(session);
      setAttachmentIndex([]);
      lastInitiatedSwitchIdRef.current = session.id || null;
      setActiveRouteConversationId(session.id || null);
      pendingScrollRestoreSessionIdRef.current = session.id || null;
      switchToSession(session);
      if (session.modelId) {
        const sessionModel = models.find((m) => m.id === session.modelId);
        if (sessionModel) setSelectedModel(sessionModel);
      }
      if (
        typeof window !== "undefined" &&
        session.id &&
        window.location.pathname !== `/chat/${session.id}`
      ) {
        const href = `/chat/${session.id}`;
        startTransition(() => {
          router.push(href);
        });
      }
    },
    [
      applySessionPersonalityState,
      currentSessionId,
      persistCurrentConversationScroll,
      switchToSession,
      setAttachmentIndex,
      models,
      setSelectedModel,
      router,
    ],
  );

  useEffect(() => {
    if (activeRouteConversationId === null) {
      const pathIsRoot =
        typeof window === "undefined" || window.location.pathname === "/";
      const action = reduceNullRouteOrchestration({
        currentSessionId,
        pendingDraftMode: pendingDraftModeRef.current,
        pathnameIsRoot: pathIsRoot,
      });
      switch (action.kind) {
        case "wait":
          return;
        case "clear_pending_draft_marker":
          pendingDraftModeRef.current = false;
          setPendingDraftMode(false);
          return;
        case "reset_stale_session_on_root":
          resetDraftConversation();
          return;
        case "noop":
          return;
        case "align_route_to_open_session":
          setActiveRouteConversationId(action.sessionId);
          return;
      }
    }

    pendingDraftModeRef.current = false;
    setPendingDraftMode(false);

    if (activeRouteConversationId === currentSessionId) {
      lastInitiatedSwitchIdRef.current = null;
      return;
    }

    if (lastInitiatedSwitchIdRef.current === activeRouteConversationId) {
      return;
    }

    const localSession = chatHistory.find(
      (session) => session.id === activeRouteConversationId,
    );

    if (localSession) {
      lastInitiatedSwitchIdRef.current = activeRouteConversationId;
      applySessionPersonalityState(localSession);
      setAttachmentIndex([]);
      switchToSession(localSession);
      if (localSession.modelId) {
        const sessionModel = models.find((m) => m.id === localSession.modelId);
        if (sessionModel) setSelectedModel(sessionModel);
      }
      return;
    }

    lastInitiatedSwitchIdRef.current = activeRouteConversationId;
    let cancelled = false;

    const loadConversation = async () => {
      try {
        const conversation = await getConversationById(activeRouteConversationId);
        if (cancelled || !conversation?.session) {
          if (!cancelled) {
            setError("Conversation not found.");
            setActiveRouteConversationId(null);
            if (typeof window !== "undefined") {
              router.replace("/");
            }
            resetDraftConversation();
          }
          return;
        }

        const normalizedSession = normalizeSessionMessages({
          id: conversation.id,
          title: conversation.session.title,
          modelId: conversation.session.modelId,
          messages: conversation.session.messages,
          metadata: conversation.metadata,
          personalityId: conversation.personalityId,
          systemPrompt: conversation.systemPrompt,
          starred: conversation.starred,
          isPublished: conversation.isPublished,
          publishedAt: conversation.publishedAt,
          publishedTitle: conversation.publishedTitle,
          publishedDescription: conversation.publishedDescription,
        }) as ChatSession;

        applySessionPersonalityState(normalizedSession);
        const loadedId = normalizedSession.id || null;
        setCurrentSessionId(loadedId);
        if (loadedId) {
          setChatForSession(loadedId, (normalizedSession.messages || []) as ChatMessage[]);
        }
        setChatHistory((prevHistory) =>
          upsertChatHistorySession(prevHistory, normalizedSession),
        );

        const restoredModel = models.find(
          (model) => model.id === normalizedSession.modelId,
        );
        if (restoredModel) {
          setSelectedModel(restoredModel);
        }
      } catch {
        if (!cancelled) {
          setError("Conversation not found.");
          setActiveRouteConversationId(null);
          if (typeof window !== "undefined") {
            router.replace("/");
          }
          resetDraftConversation();
        }
      }
    };

    void loadConversation();

    return () => {
      cancelled = true;
      lastInitiatedSwitchIdRef.current = null;
    };
  }, [
    activeRouteConversationId,
    applySessionPersonalityState,
    chatHistory,
    currentSessionId,
    models,
    resetDraftConversation,
    router,
    setChatForSession,
    setChatHistory,
    setCurrentSessionId,
    setError,
    setSelectedModel,
    setAttachmentIndex,
    switchToSession,
  ]);

  return {
    activeRouteConversationId,
    setActiveRouteConversationId,
    persistCurrentConversationScroll,
    resetDraftConversation,
    createNewSessionAndSwitchWrapper,
    enterDraftConversationMode,
    handleSessionSwitch,
  };
}
