/**
 * Composes model list, chat/session state, UI chrome, and wires useChatOperationsRefined.
 * Entry point for everything the chat page needs below ModelInterface.
 */
import { useModelData, useComputedValues } from "../../features/models/hooks";
import {
  useChatData,
  useChatOperationsRefined,
  useSessionSwitcher,
  useConversationEvents,
  useActiveConversationSync,
} from "../../features/chat/hooks";
import { DRAFT_SESSION_KEY } from "../../features/chat/hooks/chatOperations.constants";
import { useUIState, useScrollAndKeyboard } from "../../shared/hooks";
import { useModelInterfacePersonality } from "../../hooks/useModelInterfacePersonality";
import {
  AudioStatus,
} from "../../features/chat/hooks/audioMode.utils";
import { useConversationalMode } from "../../features/chat/hooks/useConversationalMode";
import { useSentenceStreaming } from "../../features/chat/hooks/useSentenceStreaming";
import { useAudioSTT } from "../../features/chat/hooks/useAudioSTT";
import { useAudioSocket } from "../../features/chat/hooks/useAudioSocket";
import {
  getSavedChatItems,
  saveChatItem,
  removeSavedChatItemById,
} from "@/lib/utils/modelChatConversationUtils";
import { getUserDetails } from "@/lib/calls/get-logged-user-details";
import { FEATURE_FLAGS } from "@/lib/config/features";
import {
  ChatMessage,
  PendingOrphanReply,
  ChatSession,
} from "@/app/components/model-interface/shared/types";
import { LINKS } from "@/lib/links";
import { authorizedFetch } from "@/lib/api/auth-client";
import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import {
  listPersonalities,
  Personality as PersonaType,
} from "@/lib/calls/model-chat-conversation";
import { resolveViewSessionId } from "../../conversation/conversationViewSession";

export function useModelInterface(options?: {
  onInsufficientFunds?: () => void;
  routeConversationId?: string | null;
  onPrefetchConversationRoute?: (conversationId: string) => void;
}) {
  const routeConversationId = options?.routeConversationId ?? null;

  const {
    models,
    modelsLoading,
    selectedModel,
    setSelectedModel,
    recentModels,
  } = useModelData();

  const {
    search,
    setSearch,
    orderByCost,
    setOrderByCost,
    showWebSearch,
    setShowWebSearch,
    showToolsOnly,
    setShowToolsOnly,
    selectedModalities,
    toggleModality,
    selectedOutputModalities,
    toggleOutputModality,
    allModalities,
    allOutputModalities,
    pinnedModelIds,
    favoritesLoaded,
    isModelPinned,
    togglePinModel,
    imageFilterOnly,
    setImageFilterOnly,
    selectedProviders,
    setSelectedProviders,
    orderBy,
    setOrderBy,
    orderDir,
    setOrderDir,
    loadingMap,
    streamingMap,
    setLoadingForSession,
    setStreamingForSession,
    streamingEnabled,
    setStreamingEnabled,
    showSaved,
    setShowSaved,
    showTyping,
    setShowTyping,
    showScrollToBottom,
    setShowScrollToBottom,
    totalSpent,
    setTotalSpent,
    imagePreview,
    setImagePreview,
    uploading,
    setUploading,
    uploadProgress,
    setUploadProgress,
    dragActive,
    setDragActive,
    historySearch,
    setHistorySearch,
    showCosts,
    setShowCosts,
    showNaira,
    setShowNaira,
  } = useUIState(models);

  // Define currentSessionId here since it's not in useUIState
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const isPassiveSyncBlocked = useCallback((sessionId: string) => {
    return Boolean(
      streamingMap[sessionId] ||
      loadingMap[sessionId] ||
      streamingMap[DRAFT_SESSION_KEY],
    );
  }, [streamingMap, loadingMap]);

  const {
    chatMap,
    setChatForSession,
    chatHistory,
    setChatHistory,
    refreshChatHistory,
    populateFromBackend,
    updateSessionMessages,
  } = useChatData({ isPassiveSyncBlocked });

  const viewSessionId = resolveViewSessionId(routeConversationId, currentSessionId);
  const activeKey = viewSessionId ?? DRAFT_SESSION_KEY;
  const chat = chatMap[activeKey] || [];
  const loading = loadingMap[activeKey] || false;
  const streaming = streamingMap[activeKey] || false;

  useActiveConversationSync({
    conversationId: viewSessionId,
    chat,
    setChatForSession,
    setChatHistory,
    isSyncBlocked: viewSessionId ? isPassiveSyncBlocked(viewSessionId) : true,
  });

  const setChat = useCallback((updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setChatForSession(activeKey, updater);
  }, [activeKey, setChatForSession]);

  const getChatForSession = useCallback((sessionKey: string) => {
    return chatMap[sessionKey] || [];
  }, [chatMap]);

  const [modelError, setModelError] = useState("");
  const [personalities, setPersonalities] = useState<PersonaType[]>([]);
  const [selectedPersonalityName, setSelectedPersonalityName] = useState<
    string | undefined
  >(undefined);
  const [selectedPersonalityIconUrl, setSelectedPersonalityIconUrl] = useState<
    string | undefined
  >(undefined);
  const [pendingOrphanReply, setPendingOrphanReply] =
    useState<PendingOrphanReply | null>(null);

  const [savedChats, setSavedChats] = useState<ChatMessage[]>([]);
  const [savedFullChats, setSavedFullChats] = useState<ChatMessage[]>([]);

  const [showModelDetailsModal, setShowModelDetailsModal] = useState(false);
  const [selectedModelForDetails, setSelectedModelForDetails] = useState<
    (typeof models)[0] | null
  >(null);
  const [showModelSelectionModal, setShowModelSelectionModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const startOrphanReply = useCallback((reply: PendingOrphanReply) => {
    setPendingOrphanReply(reply);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [ps, sc] = await Promise.all([
          listPersonalities(),
          getSavedChatItems(),
        ]);
        setPersonalities(ps);
        setSavedChats(sc);
      } catch (err) {
        console.error("Failed to load personalities or saved chats:", err);
      }
    })();
  }, [setModelError]);

  const {
    chatEndRef,
    chatAreaRef,
    inputRef,
    handleInputKeyDown,
  } = useScrollAndKeyboard({
    chat,
    loading,
    streaming,
    input: "",
    setShowScrollToBottom,
    setShowTyping,
  });

  const {
    selectedPersonalityId,
    setSelectedPersonalityId,
    selectedSystemPrompt,
    setSelectedSystemPrompt,
    applySessionPersonalityState,
  } = useModelInterfacePersonality({
    currentSessionId,
    chatHistory,
    personalities,
    setSelectedPersonalityName,
    setSelectedPersonalityIconUrl,
    setChatHistory,
  });

  const {
    input,
    setInput,
    wallet,
    setWallet,
    assistantResponse,
    optimizationMessage,
    handleSend,
    handleStop,
    canRetryLastSend,
    retryLastFailedSend,
  } = useChatOperationsRefined({
    selectedModel,
    chat,
    setChat,
    setChatForSession,
    streaming,
    setStreamingForSession,
    setLoadingForSession,
    setError: setModelError,
    streamingEnabled,
    chatEndRef,
    refreshChatHistory,
    currentSessionId,
    routeConversationId,
    setCurrentSessionId,
    setChatHistory,
    updateSessionMessages,
    selectedPersonalityName,
    selectedPersonalityIconUrl,
    selectedPersonalityId,
    selectedSystemPrompt,
    pendingOrphanReply,
    clearPendingOrphanReply: () => setPendingOrphanReply(null),
    onInsufficientFunds: options?.onInsufficientFunds,
    onPrefetchConversationRoute: options?.onPrefetchConversationRoute,
    getChatForSession,
  });

  const audioSession = useAudioSocket();

  const dictationMicLiveRef = useRef(false);
  const conversationalMicLiveRef = useRef(false);

  const {
    isSTTActive,
    isTranscribing,
    toggleSTT,
    cancelSTT,
    confirmSTT,
    exitDictation,
    isRecording: isDictationRecording,
  } = useAudioSTT({
    input,
    setInput,
    socket: audioSession.socket,
    connect: audioSession.connect,
    disconnect: audioSession.disconnect,
    peerMicSuppressRef: conversationalMicLiveRef,
  });

  // Audio & Conversational Features
  const {
    isAudioMode,
    audioTranscription,
    audioStatus,
    audioNotice,
    audioVolume,
    toggleAudioMode,
    isMiniMode,
    toggleMiniMode,
    playAISpeech,
    speakTextNative,
    stopAISpeech,
    socket: audioSocket,
    analyzer,
    isConversationalRecording,
    streamFlushPendingRef,
  } = useConversationalMode({
    onTranscriptionComplete: handleSend,
    isLoading: loading,
    isStreaming: streaming,
    audioSession,
    onEnterAudioMode: exitDictation,
    onBargeIn: handleStop,
    peerMicSuppressRef: dictationMicLiveRef,
  });

  useLayoutEffect(() => {
    dictationMicLiveRef.current = isSTTActive && isDictationRecording;
  }, [isSTTActive, isDictationRecording]);

  useLayoutEffect(() => {
    conversationalMicLiveRef.current = isAudioMode && isConversationalRecording;
  }, [isAudioMode, isConversationalRecording]);

  useSentenceStreaming({
    isAudioMode,
    isStreaming: streaming,
    assistantResponse,
    playAISpeech,
    speakTextNative,
    stopAISpeech,
    socket: audioSocket,
    streamFlushPendingRef,
  });

  const handleAudioModeToggle = useCallback((enabled: boolean) => {
    if (!FEATURE_FLAGS.AUDIO_CONVERSATION) return;
    toggleAudioMode(enabled);
  }, [toggleAudioMode]);

  const handleStartSTT = useCallback(() => {
    if (isAudioMode) {
      toggleAudioMode(false);
    }
    toggleSTT();
  }, [isAudioMode, toggleAudioMode, toggleSTT]);

  // Session switching
  const { switchToSession, createAndSwitchToNewSession, isSessionActive } =
    useSessionSwitcher({ currentSessionId, chatMap, setChatForSession });

  // Methods
  const handleSaveWithUpdate = useCallback(async (msg: ChatMessage) => {
    await saveChatItem(msg);
    const updatedSavedChats = await getSavedChatItems();
    setSavedChats(updatedSavedChats);
  }, [setSavedChats]);

  const handleRemoveSavedWithUpdate = useCallback(async (mongoId: string) => {
    await removeSavedChatItemById(mongoId);
    const updatedSavedChats = await getSavedChatItems();
    setSavedChats(updatedSavedChats);
  }, [setSavedChats]);

  const handleSendWithKeyboard = useCallback((
    content?: string,
    enableStreaming?: boolean,
    preCreatedMessage?: ChatMessage,
    chatSnapshot?: ChatMessage[],
  ): Promise<void> => {
    return handleSend(content, enableStreaming, preCreatedMessage, chatSnapshot);
  }, [handleSend]);

  const handleInputKeyDownWithSend = useCallback((
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (handleInputKeyDown(e)) {
      handleSend();
    }
  }, [handleInputKeyDown, handleSend]);

  const handleShowModelDetails = useCallback((model: typeof selectedModel) => {
    setSelectedModelForDetails(model);
    setShowModelDetailsModal(true);
  }, [setSelectedModelForDetails, setShowModelDetailsModal]);

  const handleInsertSaved = useCallback(async (msg: ChatMessage) => {
    setChat((prev) => [...prev, msg]);
  }, [setChat]);

  const refreshWalletFromBackend = useCallback(async () => {
    try {
      const userDetails = await getUserDetails(true);
      const newWalletBalance = userDetails?.config?.wallet ?? null;
      setWallet(newWalletBalance);
      return newWalletBalance;
    } catch (error) {
      console.error("Failed to refresh wallet:", error);
      return null;
    }
  }, [setWallet]);

  const enhancedSwitchToSession = useCallback((session: ChatSession) => {
    setPendingOrphanReply(null);
    switchToSession(session, setCurrentSessionId, setChatHistory);
  }, [switchToSession, setCurrentSessionId, setChatHistory]);

  const enhancedCreateNewSession = useCallback((_modelId: string) => {
    setPendingOrphanReply(null);
    createAndSwitchToNewSession(setCurrentSessionId);
  }, [createAndSwitchToNewSession, setCurrentSessionId]);

  const {
    modalSortedModels,
    currentChatCostUSD,
    currentChatCostNaira,
    supportsImageUpload,
  } = useComputedValues({
    models,
    chat,
    selectedModel,
    search,
    selectedModalities,
    selectedOutputModalities,
    showWebSearch,
    showToolsOnly,
    orderByCost,
    imageFilterOnly,
    orderBy,
    orderDir,
    selectedProviders,
  });

  return {
    modelState: {
      models,
      modelsLoading,
      selectedModel,
      setSelectedModel,
      recentModels,
      modalSortedModels,
      supportsImageUpload,
      selectedModelForDetails,
      setSelectedModelForDetails,
      handleShowModelDetails,
      isModelPinned,
      togglePinModel,
    },
    personalityState: {
      personalities,
      setPersonalities,
      selectedPersonalityName,
      setSelectedPersonalityName,
      selectedPersonalityIconUrl,
      setSelectedPersonalityIconUrl,
      selectedPersonalityId,
      setSelectedPersonalityId,
      selectedSystemPrompt,
      setSelectedSystemPrompt,
      applySessionPersonalityState,
    },
    chatState: {
      input,
      setInput,
      chat,
      setChat,
      pendingOrphanReply,
      clearPendingOrphanReply: () => setPendingOrphanReply(null),
      setChatForSession,
      assistantResponse,
      chatMap,
      chatHistory,
      setChatHistory,
      savedChats,
      setSavedChats,
      savedFullChats,
      setSavedFullChats,
      currentSessionId,
      viewSessionId,
      setCurrentSessionId,
      refreshChatHistory,
      populateFromBackend,
      showTyping,
      setShowTyping,
      showScrollToBottom,
      setShowScrollToBottom,
    },
    uiState: {
      loading,
      setLoading: (l: boolean) => setLoadingForSession(activeKey, l),
      error: modelError,
      setError: setModelError,
      streaming,
      streamingMap,
      setStreaming: (s: boolean) => setStreamingForSession(activeKey, s),
      streamingEnabled,
      setStreamingEnabled,
      imagePreview,
      setImagePreview,
      uploading,
      setUploading,
      uploadProgress,
      setUploadProgress,
      dragActive,
      setDragActive,
      showCosts,
      setShowCosts,
      showNaira,
      setShowNaira,
      showSaved,
      setShowSaved,
      totalSpent,
      setTotalSpent,
      optimizationMessage,
    },
    modalState: {
      showModelDetailsModal,
      setShowModelDetailsModal,
      showModelSelectionModal,
      setShowModelSelectionModal,
    },
    filterState: {
      search,
      setSearch,
      historySearch,
      setHistorySearch,
      orderByCost,
      setOrderByCost,
      allModalities,
      selectedModalities,
      allOutputModalities,
      selectedOutputModalities,
      showWebSearch,
      setShowWebSearch,
      showToolsOnly,
      setShowToolsOnly,
      pinnedModelIds,
      favoritesLoaded,
      orderBy,
      setOrderBy,
      orderDir,
      setOrderDir,
      selectedProviders,
      setSelectedProviders,
      imageFilterOnly,
      setImageFilterOnly,
      toggleModality,
      toggleOutputModality,
    },
    walletState: {
      wallet,
      setWallet,
      refreshWalletFromBackend,
    },
    refs: {
      chatEndRef,
      fileInputRef,
      chatAreaRef,
    },
    computed: {
      currentChatCostUSD,
      currentChatCostNaira,
    },
    sessionState: {
      switchToSession: enhancedSwitchToSession,
      createNewSessionAndSwitch: enhancedCreateNewSession,
      isSessionActive,
      startOrphanReply,
      project: "projectt",
    },
    audioState: {
      isAudioMode,
      audioTranscription,
      audioStatus,
      audioNotice,
      audioVolume,
      handleAudioModeToggle,
      isMiniMode,
      handleMiniModeToggle: toggleMiniMode,
      isSTTActive,
      handleStartSTT,
      handleCancelSTT: cancelSTT,
      handleConfirmSTT: confirmSTT,
      isDictationTranscribing: isTranscribing,
      analyzer,
    },
    actions: {
      handleSend: handleSendWithKeyboard,
      handleStop,
      handleInputKeyDown: handleInputKeyDownWithSend,
      handleSave: handleSaveWithUpdate,
      handleInsertSaved,
      handleRemoveSaved: handleRemoveSavedWithUpdate,
      canRetryLastSend,
      retryLastFailedSend,
    },
  };
}
