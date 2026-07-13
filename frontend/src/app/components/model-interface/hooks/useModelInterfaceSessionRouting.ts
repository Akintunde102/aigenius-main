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
  push: (href: string, options?: { scroll?: boolean }) => void;
  replace: (href: string, options?: { scroll?: boolean }) => void;
  prefetch: (href: string) => void;
};
import { upsertChatHistorySession } from "@/lib/utils/modelChatConversationUtils";
import { normalizeSessionMessages } from "@/lib/utils/messageContentUtils";
import { useFetchConversation } from "@/lib/hooks/useConversationQuery";
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
  conversationTargetRef,
  isPendingDraftMode,
  setActiveRouteConversationTarget,
  setPendingDraftMode,
} from "../conversation/conversationViewSession";
import { DRAFT_SESSION_KEY } from "../features/chat/hooks";
import type { AttachmentIndexItem, UploadedFileEntry } from "../ModelInterface.helpers";
import type { ChatMessage, ChatSession, Model } from "../shared/types";
import { getConversationIdFromPath } from "../ModelInterface.types";

function hasLocalTranscript(
  chatMap: Record<string, ChatMessage[]>,
  sessionId: string | null,
): boolean {
  if (!sessionId) {
    return false;
  }
  return (chatMap[sessionId]?.length ?? 0) > 0;
}



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
  streamingMap: Record<string, boolean>;
  chatMap: Record<string, ChatMessage[]>;
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
  streamingMap,
  chatMap,
}: Params) {
  const fetchConversation = useFetchConversation();
  const pendingScrollRestoreSessionIdRef = useRef<string | null>(null);
  const lastKnownConversationSignaturesRef = useRef<Record<string, string>>({});
  const pendingDraftModeRef = useRef(false);
  const lastAutoRoutedSessionIdRef = useRef<string | null>(null);
  const pendingRouteAfterStreamRef = useRef<string | null>(null);
  const lastInitiatedSwitchIdRef = useRef<string | null>(null);
  const prevSessionIdRef = useRef<string | null | undefined>(undefined);

  const isDraftOrSessionStreaming = useCallback(
    (sessionId: string | null) => {
      if (streamingMap[DRAFT_SESSION_KEY]) {
        return true;
      }
      if (sessionId && streamingMap[sessionId]) {
        return true;
      }
      return false;
    },
    [streamingMap],
  );

  const navigateToConversation = useCallback(
    (sessionId: string) => {
      if (lastAutoRoutedSessionIdRef.current === sessionId) {
        return;
      }
      lastAutoRoutedSessionIdRef.current = sessionId;
      router.prefetch(`/chat/${sessionId}`);
      router.replace(`/chat/${sessionId}`, { scroll: false });
    },
    [router],
  );

  const adoptLocalTranscript = useCallback(
    (sessionId: string) => {
      if (currentSessionId !== sessionId) {
        setCurrentSessionId(sessionId);
      }
      setActiveRouteConversationTarget(sessionId);
      setActiveRouteConversationId(sessionId);
      lastInitiatedSwitchIdRef.current = sessionId;

      const localSession = chatHistory.find((session) => session.id === sessionId);
      if (localSession) {
        applySessionPersonalityState(localSession);
        if (localSession.modelId) {
          const sessionModel = models.find((m) => m.id === localSession.modelId);
          if (sessionModel) {
            setSelectedModel(sessionModel);
          }
        }
      }
    },
    [
      applySessionPersonalityState,
      chatHistory,
      currentSessionId,
      models,
      setCurrentSessionId,
      setSelectedModel,
    ],
  );

  const [activeRouteConversationId, setActiveRouteConversationId] = useState<
    string | null
  >(routeConversationId);

  useSyncRouteConversationId(routeConversationId, setActiveRouteConversationId);

  useEffect(() => {
    if (
      conversationTargetRef.current.routeTargetInitialized
      && conversationTargetRef.current.activeRouteConversationId !== null
      && activeRouteConversationId === null
    ) {
      return;
    }
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

    pendingDraftModeRef.current = false;
    setPendingDraftMode(false);

    pendingScrollRestoreSessionIdRef.current = currentSessionId;
    setActiveRouteConversationId(currentSessionId);

    if (routeConversationId === currentSessionId) {
      pendingRouteAfterStreamRef.current = null;
      return;
    }

    if (isDraftOrSessionStreaming(currentSessionId)) {
      pendingRouteAfterStreamRef.current = currentSessionId;
      return;
    }

    if (routeConversationId === null) {
      navigateToConversation(currentSessionId);
      pendingRouteAfterStreamRef.current = null;
    }
  }, [
    currentSessionId,
    routeConversationId,
    isDraftOrSessionStreaming,
    navigateToConversation,
  ]);

  useEffect(() => {
    const pending = pendingRouteAfterStreamRef.current;
    if (!pending || !currentSessionId || pending !== currentSessionId) {
      return;
    }
    if (isDraftOrSessionStreaming(currentSessionId)) {
      return;
    }
    if (routeConversationId === currentSessionId) {
      pendingRouteAfterStreamRef.current = null;
      return;
    }
    if (routeConversationId === null) {
      navigateToConversation(currentSessionId);
      pendingRouteAfterStreamRef.current = null;
    }
  }, [
    currentSessionId,
    routeConversationId,
    streamingMap,
    isDraftOrSessionStreaming,
    navigateToConversation,
  ]);

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

      // Use replace (not history.replaceState) so Next's route prop stays in sync.
      router.replace("/", { scroll: false });
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
    // New Chat clears the route target in a ref immediately; React state can lag one frame.
    if (
      conversationTargetRef.current.routeTargetInitialized
      && conversationTargetRef.current.activeRouteConversationId === null
      && activeRouteConversationId !== null
    ) {
      return;
    }

    // While a draft stream is in flight, ignore route-driven session switches.
    if (
      (streamingMap[DRAFT_SESSION_KEY] ?? false)
      && currentSessionId === null
      && activeRouteConversationId !== null
    ) {
      return;
    }

    if (activeRouteConversationId === null) {
      const pathIsRoot =
        typeof window === "undefined" || window.location.pathname === "/";
      const action = reduceNullRouteOrchestration({
        currentSessionId,
        pendingDraftMode: isPendingDraftMode(),
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

    // Pending draft with no promoted session — only the null-route branch above may run.
    if (isPendingDraftMode() && currentSessionId === null) {
      return;
    }

    if (!pendingDraftModeRef.current && !isPendingDraftMode()) {
      pendingDraftModeRef.current = false;
      setPendingDraftMode(false);
    }

    if (activeRouteConversationId === currentSessionId) {
      lastInitiatedSwitchIdRef.current = null;
      return;
    }

    if (hasLocalTranscript(chatMap, activeRouteConversationId)) {
      adoptLocalTranscript(activeRouteConversationId);
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
        const conversation = await fetchConversation(activeRouteConversationId);
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
          const serverMessages = (normalizedSession.messages || []) as ChatMessage[];
          setChatForSession(loadedId, (prev) => {
            if (prev.length >= serverMessages.length) {
              return prev;
            }
            return serverMessages;
          });
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
    adoptLocalTranscript,
    applySessionPersonalityState,
    chatHistory,
    chatMap,
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
    streamingMap,
    switchToSession,
    fetchConversation,
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
