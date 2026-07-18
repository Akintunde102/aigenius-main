"use client";
/**
 * Main chat shell: history sidebar, model column, modals, and composer wiring.
 *
 * Orchestration lives in useModelInterface; this component mostly composes layout,
 * passes routeConversationId, and bridges wallet/personality/attachment hooks.
 *
 * @see core/hooks/useModelInterface.ts — state composition and chat operations
 * @see AuthenticatedChatPage — auth gate and dynamic import of this module
 */
import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
  startTransition,
} from "react";
import { useModelInterface } from "./core/hooks";
import { useRouter } from "next/navigation";
import { LINKS } from "@/lib/links";
import {
  getChatHistory,
} from "@/lib/utils/modelChatConversationUtils";
import {
  DragDropHandler,
  MobileToggleButton,
  MobileSidebarHandler,
} from "./features";
import "./chat-layout.scss";
import styles from "./ModelInterface.module.scss";
import { useMobileSidebar } from "@/app/components/MobileSidebarContext";
import { useBrowserDetection } from "./shared/hooks";

import AddToWallet from "../modals/AddToWallet";
import useTokenHandler from "@/lib/hooks/useTokenHandler";
import { useWalletTopUpReturn } from "@/lib/hooks/useWalletTopUpReturn";
import { useWalletManagement } from "./features/chat/hooks";
import { useKeyboardShortcuts } from "./shared/hooks";
import { publishConversation } from "@/lib/calls/model-chat-conversation";
import { ChatMessage, ChatSession, Model } from "./shared/types";
import { normalizeWalletForGating } from "./features/chat/hooks";
import { ERROR_MESSAGES } from "./features/chat/hooks/chatOperations.constants";
import { clearAuthSession } from "@/lib/utils/auth-session";
import type { ChatContainerHandle } from "./features/chat/components/ChatContainer";
import {
  ModelPickResolver,
} from "./ModelInterface.helpers";
import { buildConversationMessageSignature } from "@/lib/utils/conversationScrollMemory";
import { useModelInterfacePersonality } from "./hooks/useModelInterfacePersonality";
import { useModelInterfaceAttachments } from "./hooks/useModelInterfaceAttachments";
import { useModelInterfaceWalletGate } from "./hooks/useModelInterfaceWalletGate";
import { useModelInterfaceSessionRouting } from "./hooks/useModelInterfaceSessionRouting";
import { useIsDesktopShell } from "@/lib/hooks/useIsDesktopShell";
import { ModelInterfaceChatColumn } from "./components/ModelInterfaceChatColumn";
import { ModelInterfaceSidebarPanel } from "./components/ModelInterfaceSidebarPanel";
import { ModelInterfaceModalStack } from "./components/ModelInterfaceModalStack";
import type { PublishState } from "./ModelInterface.types";
import { chatCanvasSurfaceStyle } from "./chatSurfaceStyle";
import { workflowShellBgStyle } from "@/app/components/workflows/workflow-info";
import { ChatShellLoadingSkeleton } from "@/app/components/ChatShellLoadingSkeleton";
import { useModelInterfaceSidebarActions } from "./hooks/useModelInterfaceSidebarActions";
import { useModelInterfaceLifecycle } from "./hooks/useModelInterfaceLifecycle";
import { useModelInterfacePersonalitySelection } from "./hooks/useModelInterfacePersonalitySelection";

interface ModelInterfaceProps {
  routeConversationId?: string | null;
}

function getSidebarUserInitials(user: unknown): string {
  if (!user || typeof user !== "object") return "U";
  const u = user as Record<string, unknown>;
  const fn = typeof u.firstName === "string" ? u.firstName.trim() : "";
  const ln = typeof u.lastName === "string" ? u.lastName.trim() : "";
  if (fn && ln) return `${fn[0]!}${ln[0]!}`.toUpperCase();
  if (fn) return fn.slice(0, 2).toUpperCase();
  const email = typeof u.email === "string" ? u.email.trim() : "";
  if (email) return email.slice(0, 2).toUpperCase();
  return "U";
}

export default function ModelInterface({ routeConversationId = null }: ModelInterfaceProps) {
  useTokenHandler();
  const { mainSidebarVisible } = useMobileSidebar();
  const router = useRouter();
  const { isMobile } = useBrowserDetection();
  const isDesktopShell = useIsDesktopShell();

  const handleLogout = useCallback(() => {
    clearAuthSession();
    router.push(LINKS.internalPages.login.github);
  }, [router]);

  useEffect(() => {
    router.prefetch("/workflows");
  }, [router]);

  const handleOpenWorkflows = useCallback(() => {
    startTransition(() => {
      router.push("/workflows");
    });
  }, [router]);

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletModalFromServerAbort, setWalletModalFromServerAbort] =
    useState(false);
  useWalletTopUpReturn(setShowWalletModal, 'inline');

  const modelInterface = useModelInterface({
    routeConversationId,
    onInsufficientFunds: () => {
      setWalletModalFromServerAbort(true);
      setShowWalletModal(true);
    },
  });
  const {
    modelState,
    personalityState,
    chatState,
    uiState,
    modalState,
    filterState,
    walletState,
    refs,
    computed,
    sessionState,
    audioState,
    actions,
  } = modelInterface;

  const { models, modelsLoading, selectedModel, setSelectedModel, recentModels, modalSortedModels, supportsImageUpload, selectedModelForDetails, setSelectedModelForDetails, handleShowModelDetails, isModelPinned, togglePinModel } = modelState;
  const {
    personalities,
    setPersonalities,
    selectedPersonalityName,
    setSelectedPersonalityName,
    selectedPersonalityIconUrl,
    setSelectedPersonalityIconUrl,
  } = personalityState;
  const { input, setInput, chat, setChat, pendingOrphanReply, clearPendingOrphanReply, setChatForSession, chatHistory, setChatHistory, savedChats, currentSessionId, viewSessionId, setCurrentSessionId, showTyping, setShowTyping, showScrollToBottom } = chatState;
  const { loading, setLoading, error, setError, streaming, setStreaming, streamingEnabled, setStreamingEnabled, imagePreview, setImagePreview, uploading, setUploading, uploadProgress, setUploadProgress, dragActive, setDragActive, showCosts, showNaira, showSaved, setShowSaved, setTotalSpent, optimizationMessage } = uiState;
  const { showModelDetailsModal, setShowModelDetailsModal, showModelSelectionModal, setShowModelSelectionModal } = modalState;
  const { search, setSearch, historySearch, setHistorySearch, orderByCost, setOrderByCost, allModalities, selectedModalities, allOutputModalities, selectedOutputModalities, showWebSearch, setShowWebSearch, showToolsOnly, setShowToolsOnly, pinnedModelIds, favoritesLoaded, orderBy, setOrderBy, orderDir, setOrderDir, selectedProviders, setSelectedProviders, imageFilterOnly, setImageFilterOnly, toggleModality, toggleOutputModality } = filterState;
  const { wallet, setWallet, refreshWalletFromBackend } = walletState;
  const { chatEndRef, chatAreaRef } = refs;
  const { currentChatCostUSD, currentChatCostNaira } = computed;
  const { switchToSession, isSessionActive, project } = sessionState;
  const { isAudioMode, isSTTActive, isDictationTranscribing, audioTranscription, audioStatus, audioNotice, audioVolume, handleAudioModeToggle, isMiniMode, handleMiniModeToggle, handleStartSTT, analyzer } = audioState;
  const { handleSend, handleStop, handleSave, handleInsertSaved, handleRemoveSaved } = actions;

  const chatContainerRef = useRef<ChatContainerHandle | null>(null);
  const [showPersonalityModal, setShowPersonalityModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<Record<string, unknown> | null>(null);
  const [pendingModelPick, setPendingModelPick] =
    useState<ModelPickResolver | null>(null);
  const pendingModelPickRejectRef = useRef<((reason?: unknown) => void) | null>(
    null,
  );
  const [publishState, setPublishState] = useState<PublishState>({
    kind: "closed",
  });

  const {
    refreshWalletBalance,
    handlePaymentSuccess,
    paymentModalLoading,
    setPaymentModalLoading,
  } = useWalletManagement({
    setWallet,
    setError,
    error: error || "",
    setShowWalletModal,
    refreshWalletFromBackend,
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
    uploadedFiles,
    setUploadedFiles,
    setAttachmentIndex,
    handleFileUpload,
    handleCancelUpload,
    handleQueuedFiles,
  } = useModelInterfaceAttachments({
    chat,
    setChat,
    selectedModel,
    currentSessionId,
    setUploading,
    setUploadProgress,
    setError,
    chatContainerRef,
  });

  const handleQueuedFilesRef = useRef(handleQueuedFiles);
  handleQueuedFilesRef.current = handleQueuedFiles;

  const currentChatSignature = useMemo(
    () => buildConversationMessageSignature(chat),
    [chat],
  );

  const {
    requiredWalletBalance,
    insufficientFundsMessage,
    isInsufficientCredits,
  } = useModelInterfaceWalletGate({
    selectedModel,
    wallet,
    error,
    setError,
  });

  const {
    createNewSessionAndSwitchWrapper,
    handleSessionSwitch,
  } = useModelInterfaceSessionRouting({
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
  });

  const { handleGlobalKeyDown } = useKeyboardShortcuts({
    chatContainerRef,
    chat,
    onOpenModelSelection: () => setShowModelSelectionModal(true),
  });

  const requestModelPick = useCallback(async (): Promise<{
    id: string;
    name?: string;
  } | null> => {
    return new Promise((resolve, reject) => {
      setPendingModelPick(() => resolve);
      pendingModelPickRejectRef.current = reject;
      setShowModelSelectionModal(true);
    });
  }, [setShowModelSelectionModal]);

  useEffect(() => {
    return () => {
      if (pendingModelPickRejectRef.current) {
        pendingModelPickRejectRef.current(new Error("Model picker disposed"));
        pendingModelPickRejectRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (showModelSelectionModal || !pendingModelPick) {
      return;
    }
    pendingModelPick(null);
    setPendingModelPick(null);
    pendingModelPickRejectRef.current = null;
  }, [pendingModelPick, showModelSelectionModal]);

  const { handleStarToggle, handleRemoveChatHistorySession, handleRemoveChatHistorySessionById, handleWalletUpdateFromSidebar } = useModelInterfaceSidebarActions({
    currentSessionId,
    models,
    setError,
    setChatHistory,
    createNewSessionAndSwitchWrapper,
    refreshWalletFromBackend,
    refreshWalletBalance,
    setWallet,
  });

  useModelInterfaceLifecycle({
    isDesktopShell,
    supportsImageUpload: Boolean(supportsImageUpload),
    isMobile,
    chatLength: chat.length,
    lastChatRole: chat[chat.length - 1]?.role,
    setCurrentUser,
    setError,
    handleGlobalKeyDown,
    requestModelPick,
    handleQueuedFiles: (files) => handleQueuedFilesRef.current(files),
    chatContainerRef,
  });

  const { handlePersonalitySelect } = useModelInterfacePersonalitySelection({
    models,
    selectedModel,
    setSelectedModel,
    setSelectedPersonalityId,
    setSelectedSystemPrompt,
    setSelectedPersonalityName,
    setSelectedPersonalityIconUrl,
    setChat,
    setShowPersonalityModal,
    createNewSessionAndSwitchWrapper,
  });

  const handleChatBoxSend = useCallback(async (
    message: string,
    _model: Model | null,
  ): Promise<boolean | void> => {
    if (!selectedModel) return false;
    if (!message.trim() && uploadedFiles.length === 0) return false;
    if (!project) {
      setError("No project found. Please create or select a project.");
      return false;
    }

    if (isInsufficientCredits) {
      const roundedRequired = Math.ceil(requiredWalletBalance);
      const modelLabel = selectedModel.name || selectedModel.id;
      const currentBalance = normalizeWalletForGating(wallet) ?? 0;
      const currentBalanceDisplay = currentBalance
        .toFixed(2)
        .replace(/\.00$/, "");
      setError(
        `You need at least ${roundedRequired} credits to use ${modelLabel}. Current balance: ${currentBalanceDisplay} credits.`,
      );
      setShowWalletModal(true);
      return false;
    }

    if (uploadedFiles.length > 0) {
      const { createChatMessage } = await import("./features/chat/hooks");
      const contentParts: ChatMessage["content"] extends infer T
        ? T extends Array<infer U>
        ? U[]
        : never
        : never = [];

      if (message.trim()) {
        contentParts.push({ type: "text", text: message.trim() });
      }

      for (const uploadedFile of uploadedFiles) {
        if (uploadedFile.isImage) {
          contentParts.push({
            type: "image_url",
            image_url: { url: uploadedFile.fileUrl },
          });
        } else {
          contentParts.push({
            type: "text",
            text: `${uploadedFile.file.name}: ${uploadedFile.fileUrl}`,
          });
        }
      }

      const userMsg = createChatMessage(
        "user",
        contentParts,
        selectedModel.id,
        selectedModel.name || selectedModel.id,
        viewSessionId ?? currentSessionId,
      );

      const filesBeingSent = uploadedFiles;
      setChat((prev) => [...prev, userMsg]);
      setUploadedFiles([]);

      const sent = await handleSend("", undefined, userMsg);
      if (sent === false) {
        setChat((prev) => prev.filter((m) => m !== userMsg));
        setUploadedFiles(filesBeingSent);
      }
      return sent;
    }

    return await handleSend(message);
  }, [
    selectedModel,
    uploadedFiles,
    project,
    isInsufficientCredits,
    requiredWalletBalance,
    wallet,
    viewSessionId,
    currentSessionId,
    handleSend,
    setChat,
    setUploadedFiles,
    setError,
  ]);

  const handlePublishFromSidebar = useCallback(
    (session: ChatSession, isRepublishing = false, existingUrl = "") => {
      setPublishState({
        kind: isRepublishing ? "republish" : "new",
        session,
        existingUrl,
      });
    },
    [],
  );

  const handlePublishConversation = async (
    title: string,
    description?: string,
  ): Promise<string> => {
    try {
      if (publishState.kind === "closed" || !publishState.session.id) {
        throw new Error("No session selected for publishing");
      }

      const conversationId = await publishConversation(
        publishState.session.id,
        title,
        description,
        {
          id: publishState.session.id,
          title: publishState.session.title,
          modelId: publishState.session.modelId,
          messages: publishState.session.messages,
          starred: publishState.session.starred,
        },
      );

      setChatHistory((prevHistory) =>
        prevHistory.map((session) =>
          session.id === publishState.session.id
            ? {
              ...session,
              isPublished: true,
              publishedAt: new Date().toISOString(),
              publishedTitle: title,
              publishedDescription: description,
            }
            : session,
        ),
      );

      return conversationId;
    } catch (err) {
      console.error("Failed to publish conversation:", err);
      setError("Failed to publish conversation. Please try again.");
      throw err;
    }
  };

  const renderWalletModal = () =>
    showWalletModal && (
      <AddToWallet
        paymentModalLoading={paymentModalLoading}
        reopenTarget="inline"
        closeModal={() => {
          setShowWalletModal(false);
          setWalletModalFromServerAbort(false);
        }}
        onSuccessfulPayment={handlePaymentSuccess}
        onClosingPaymentModal={() => setPaymentModalLoading(false)}
        showInsufficientFundsWarning={
          isInsufficientCredits || walletModalFromServerAbort
        }
        insufficientFundsMessage={
          walletModalFromServerAbort
            ? ERROR_MESSAGES.REQUEST_ABORTED_LOW_BALANCE
            : insufficientFundsMessage
        }
      />
    );

  const setSelectedModelWrapper = (model: Model | null) => {
    if (pendingModelPick) {
      pendingModelPick(model);
      setPendingModelPick(null);
      pendingModelPickRejectRef.current = null;
      setShowModelSelectionModal(false);
      return;
    }
    setSelectedModel(model);
  };

  if (modelsLoading && chatHistory.length === 0) {
    return (
      <ChatShellLoadingSkeleton
        outerMinHeightStyle={
          isDesktopShell
            ? { minHeight: 0, height: "100%", flex: 1 }
            : { minHeight: "calc(var(--vh, 1vh) * 100)" }
        }
      />
    );
  }

  return (
    <DragDropHandler
      onFilesDropped={handleQueuedFiles}
      onDragActiveChange={setDragActive}
      dragActive={dragActive}
    >
      {renderWalletModal()}

      {optimizationMessage && (
        <div className={`${styles.optimizationMessage} ${styles.fadeIn}`}>
          <div className={styles.optimizationContent}>
            <span className={styles.optimizationIcon}>⚡</span>
            <span>{optimizationMessage}</span>
          </div>
        </div>
      )}

      <div
        className={
          isDesktopShell ? "flex min-h-0 flex-1 flex-col" : "flex flex-col"
        }
        style={{
          ...workflowShellBgStyle(),
          ...(isDesktopShell
            ? { minHeight: 0, height: "100%", flex: 1 }
            : {
              minHeight: "calc(var(--vh, 1vh) * 100)",
              height: "calc(var(--vh, 1vh) * 100)",
            }),
        }}
      >
        <div
          className="flex min-h-0 flex-1 flex-col"
          style={chatCanvasSurfaceStyle()}
        >
          <div
            className={`${styles.modelInterfaceContainer} ${isMobile ? styles.mobile : ""} ${!isMobile && mainSidebarVisible ? styles.sidebarVisible : styles.fullWidth}`}
          >
            <MobileSidebarHandler>
              {({ mobileSidebarOpen, setMobileSidebarOpen }) => (
                <div
                  className={`${styles.mobileSidebarContainer} ${isMobile ? styles.mobile : ""}`}
                >
                  <MobileToggleButton
                    isOpen={mobileSidebarOpen}
                    onToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                    hide={
                      showModelSelectionModal ||
                      mobileSidebarOpen ||
                      !isMobile
                    }
                  />
                  <ModelInterfaceSidebarPanel
                    isMobile={isMobile}
                    mobileSidebarOpen={mobileSidebarOpen}
                    setMobileSidebarOpen={setMobileSidebarOpen}
                    chatHistory={chatHistory}
                    setChat={setChat}
                    setSelectedModel={setSelectedModel}
                    models={models}
                    historySearch={historySearch}
                    setHistorySearch={setHistorySearch}
                    removeChatHistorySession={handleRemoveChatHistorySession}
                    removeChatHistorySessionById={handleRemoveChatHistorySessionById}
                    setChatHistory={setChatHistory}
                    getChatHistory={getChatHistory}
                    setTotalSpent={setTotalSpent}
                    setError={setError}
                    currentSessionId={currentSessionId}
                    setCurrentSessionId={setCurrentSessionId}
                    setShowSaved={setShowSaved}
                    wallet={wallet}
                    onWalletUpdate={handleWalletUpdateFromSidebar}
                    onStarToggle={handleStarToggle}
                    onPublish={handlePublishFromSidebar}
                    onOpenWorkflows={handleOpenWorkflows}
                    onOpenNotifications={() => router.push("/notifications")}
                    switchToSession={handleSessionSwitch}
                    createNewSessionAndSwitch={createNewSessionAndSwitchWrapper}
                    isSessionActive={isSessionActive}
                    onLogout={handleLogout}
                    userInitials={getSidebarUserInitials(currentUser)}
                  />
                  <ModelInterfaceChatColumn
                    chat={chat}
                    setChat={setChat}
                    handleSend={handleSend}
                    chatEndRef={chatEndRef}
                    chatContainerRef={chatContainerRef}
                    selectedModel={selectedModel}
                    models={models}
                    showCosts={showCosts}
                    showNaira={showNaira}
                    showTyping={showTyping}
                    loading={loading}
                    imagePreview={imagePreview}
                    setImagePreview={setImagePreview}
                    chatAreaRef={chatAreaRef}
                    showScrollToBottom={showScrollToBottom}
                    handleSave={handleSave}
                    handleChatBoxSend={handleChatBoxSend}
                    handleFileUpload={handleFileUpload}
                    uploading={uploading}
                    uploadProgress={uploadProgress}
                    supportsImageUpload={supportsImageUpload || false}
                    uploadedFiles={uploadedFiles}
                    setUploadedFiles={setUploadedFiles}
                    setAttachmentIndex={setAttachmentIndex}
                    setShowModelSelectionModal={setShowModelSelectionModal}
                    setShowPersonalityModal={setShowPersonalityModal}
                    selectedPersonalityIconUrl={selectedPersonalityIconUrl}
                    selectedPersonalityName={selectedPersonalityName}
                    currentSessionId={currentSessionId}
                    requestModelPick={requestModelPick}
                    pendingOrphanReply={pendingOrphanReply}
                    onCancelOrphanReply={clearPendingOrphanReply}
                    createNewSessionAndSwitchWrapper={createNewSessionAndSwitchWrapper}
                    modelsFallback={models}
                    handleCancelUpload={handleCancelUpload}
                    setShowSaved={setShowSaved}
                    setShowTyping={setShowTyping}
                    streaming={streaming}
                    streamingEnabled={streamingEnabled}
                    setStreamingEnabled={setStreamingEnabled}
                    handleStop={handleStop}
                    desktopConversationCentered={!isMobile}
                    setError={setError}
                    setWallet={setWallet}
                    onInsufficientFunds={() => {
                      setWalletModalFromServerAbort(true);
                      setShowWalletModal(true);
                    }}
                    onAudioModeToggle={handleAudioModeToggle}
                    isAudioMode={isAudioMode}
                    onStartSTT={handleStartSTT}
                    isSTTActive={isSTTActive}
                    isDictationTranscribing={isDictationTranscribing}
                    audioTranscription={audioTranscription}
                    audioStatus={audioStatus}
                    audioNotice={audioNotice}
                    audioVolume={audioVolume}
                    inputValue={input}
                    onInputChange={setInput}
                    onMiniModeToggle={handleMiniModeToggle}
                    isMiniMode={isMiniMode}
                    analyzer={analyzer}
                  />
                </div>
              )}
            </MobileSidebarHandler>

            <ModelInterfaceModalStack
              modalContainerProps={{
                showSaved,
                setShowSaved,
                savedChats,
                onInsertSaved: handleInsertSaved,
                onRemoveSaved: handleRemoveSaved,
                showModelDetailsModal,
                setShowModelDetailsModal,
                selectedModelForDetails,
                showModelSelectionModal,
                setShowModelSelectionModal,
                models,
                search,
                setSearch,
                selectedModel,
                setSelectedModel: setSelectedModelWrapper,
                setSelectedModelForDetails,
                handleShowModelDetails,
                allModalities,
                selectedModalities,
                toggleModality,
                allOutputModalities,
                selectedOutputModalities,
                toggleOutputModality,
                showWebSearch,
                setShowWebSearch,
                showToolsOnly,
                setShowToolsOnly,
                orderByCost,
                setOrderByCost,
                pinnedModelIds,
                isModelPinned,
                togglePinModel,
                favoritesLoaded,
                recentModels,
                orderBy,
                setOrderBy,
                orderDir,
                setOrderDir,
                selectedProviders,
                setSelectedProviders,
                imageFilterOnly,
                setImageFilterOnly,
              }}
              showPersonalityModal={showPersonalityModal}
              setShowPersonalityModal={setShowPersonalityModal}
              personalities={personalities}
              setPersonalities={setPersonalities}
              currentUser={currentUser}
              onSelectPersonality={handlePersonalitySelect}
              publishState={publishState}
              setPublishState={setPublishState}
              onPublishConversation={handlePublishConversation}
            />
          </div>
        </div>
      </div>
    </DragDropHandler>
  );
}
