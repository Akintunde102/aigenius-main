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
import { ChatMessage, Model } from "./shared/types";
import { ERROR_MESSAGES } from "./features/chat/hooks/chatOperations.constants";
import { clearAuthSession } from "@/lib/utils/auth-session";
import type { ChatContainerHandle } from "./features/chat/components/ChatContainer";
import { buildConversationMessageSignature } from "@/lib/utils/conversationScrollMemory";
import { useModelInterfacePersonality } from "./hooks/useModelInterfacePersonality";
import { useModelInterfaceAttachments } from "./hooks/useModelInterfaceAttachments";
import { AttachmentSourcePickerModal } from "./features/file-upload/components/AttachmentSourcePickerModal";
import { AttachmentLibraryModal } from "./features/file-upload/components/AttachmentLibraryModal";
import { useUploadedFilesList } from "@/app/components/user-files/useUploadedFilesList";
import { isUploadErrorMessage } from "./features/file-upload/uploadError.utils";
import { useModelInterfaceWalletGate } from "./hooks/useModelInterfaceWalletGate";
import { useModelInterfaceSessionRouting } from "./hooks/useModelInterfaceSessionRouting";
import { useIsDesktopShell } from "@/lib/hooks/useIsDesktopShell";
import { ModelInterfaceChatColumn } from "./components/ModelInterfaceChatColumn";
import { ModelInterfaceSidebarPanel } from "./components/ModelInterfaceSidebarPanel";
import { ModelInterfaceModalStack } from "./components/ModelInterfaceModalStack";
import { ModelInterfaceChrome } from "./components/ModelInterfaceChrome";
import type { PublishState } from "./ModelInterface.types";
import { chatCanvasSurfaceStyle } from "./chatSurfaceStyle";
import { workflowShellBgStyle } from "@/app/components/workflows/workflow-info";
import { FEATURE_FLAGS } from "@/lib/config/features";
import { openWorkflow } from "@/lib/utils/open-workflow";
import { ChatShellLoadingSkeleton } from "@/app/components/ChatShellLoadingSkeleton";
import { useModelInterfaceSidebarActions } from "./hooks/useModelInterfaceSidebarActions";
import { useModelInterfaceLifecycle } from "./hooks/useModelInterfaceLifecycle";
import { useModelInterfacePersonalitySelection } from "./hooks/useModelInterfacePersonalitySelection";
import { useModelInterfaceModelPick } from "./hooks/useModelInterfaceModelPick";
import { useModelInterfacePublishFlow } from "./hooks/useModelInterfacePublishFlow";
import { useModelInterfaceChatBoxSend } from "./hooks/useModelInterfaceChatBoxSend";
import { getSidebarUserInitials } from "./utils/sidebarUserInitials.utils";

interface ModelInterfaceProps {
  routeConversationId?: string | null;
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
    openWorkflow("/workflows");
  }, []);

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletModalFromServerAbort, setWalletModalFromServerAbort] =
    useState(false);
  const [showAttachmentSourcePicker, setShowAttachmentSourcePicker] = useState(false);
  const [showAttachmentLibrary, setShowAttachmentLibrary] = useState(false);
  const attachmentLibrary = useUploadedFilesList();
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
  const { input, setInput, chat, setChat, pendingOrphanReply, clearPendingOrphanReply, setChatForSession, assistantResponse, chatHistory, setChatHistory, isInitialLoading, savedChats, currentSessionId, viewSessionId, setCurrentSessionId, updateSessionMessages, persistSessionMessages, isPassiveSyncBlocked, showTyping, setShowTyping, showScrollToBottom, queuedMessages, handleQueueMessage, removeQueuedMessage } = chatState;
  const { loading, setLoading, error, setError, streaming, setStreaming, streamingEnabled, setStreamingEnabled, imagePreview, setImagePreview, uploading, setUploading, uploadProgress, setUploadProgress, dragActive, setDragActive, showCosts, showNaira, showSaved, setShowSaved, setTotalSpent, optimizationMessage } = uiState;
  const { showModelDetailsModal, setShowModelDetailsModal, showModelSelectionModal, setShowModelSelectionModal } = modalState;
  const { search, setSearch, historySearch, setHistorySearch, orderByCost, setOrderByCost, allModalities, selectedModalities, allOutputModalities, selectedOutputModalities, showWebSearch, setShowWebSearch, showToolsOnly, setShowToolsOnly, pinnedModelIds, favoritesLoaded, orderBy, setOrderBy, orderDir, setOrderDir, selectedProviders, setSelectedProviders, imageFilterOnly, setImageFilterOnly, toggleModality, toggleOutputModality } = filterState;
  const { wallet, setWallet, refreshWalletFromBackend } = walletState;
  const { chatEndRef, chatAreaRef } = refs;
  const { currentChatCostUSD, currentChatCostNaira } = computed;
  const { switchToSession, isSessionActive, project, onClearDraftQueueRef } = sessionState;
  const {
    isAudioMode,
    isSTTActive,
    isDictationTranscribing,
    audioTranscription,
    audioStatus,
    audioNotice,
    audioVolume,
    handleAudioModeToggle,
    isMiniMode,
    handleMiniModeToggle,
    handleStartSTT,
    handleCancelSTT,
    handleConfirmSTT,
    analyzer,
  } = audioState;
  const { handleSend, handleStop, handleSave, handleInsertSaved, handleRemoveSaved } = actions;

  const chatContainerRef = useRef<ChatContainerHandle | null>(null);
  const [showPersonalityModal, setShowPersonalityModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<Record<string, unknown> | null>(null);
  const [publishState, setPublishState] = useState<PublishState>({
    kind: "closed",
  });

  const { requestModelPick, resolveModelPick } = useModelInterfaceModelPick(
    showModelSelectionModal,
    setShowModelSelectionModal,
  );

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
    clearConversationPersonality,
  } = useModelInterfacePersonality({
    currentSessionId,
    chatHistory,
    personalities,
    setSelectedPersonalityName,
    setSelectedPersonalityIconUrl,
    setChatHistory,
    setChatForSession,
  });

  const {
    uploadedFiles,
    setUploadedFiles,
    setAttachmentIndex,
    handleFileUpload,
    handleCancelUpload,
    failedUploads,
    retryFailedUpload,
    retryAllFailedUploads,
    removeFailedUpload,
    handleQueuedFiles,
    handleAttachSavedFiles,
    openLocalFilePicker,
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

  const handleAttachmentMenuRequest = useCallback(() => {
    setShowAttachmentSourcePicker(true);
  }, []);

  useEffect(() => {
    if (failedUploads.length === 0 && error && isUploadErrorMessage(error)) {
      setError("");
    }
  }, [failedUploads.length, error, setError]);

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
    isPassiveSyncBlocked,
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
    onClearDraftQueue: () => onClearDraftQueueRef.current(),
  });

  const { handleGlobalKeyDown } = useKeyboardShortcuts({
    chatContainerRef,
    chat,
    onOpenModelSelection: () => setShowModelSelectionModal(true),
  });

  const { handlePublishFromSidebar, handlePublishConversation } = useModelInterfacePublishFlow(
    publishState,
    setPublishState,
    setChatHistory,
    setError,
  );

  const handleChatBoxSend = useModelInterfaceChatBoxSend({
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
    setShowWalletModal,
  });

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

  const setSelectedModelWrapper = (model: Model | null) => {
    if (resolveModelPick(model)) {
      return;
    }

    const resolved = model
      ? models.find((m) => m.id === model.id) ?? model
      : null;

    setSelectedModel(resolved);

    if (resolved && currentSessionId) {
      setChatHistory((prev) =>
        prev.map((session) =>
          session.id === currentSessionId
            ? { ...session, modelId: resolved.id }
            : session,
        ),
      );
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

  const isWorkspaceBootstrapping =
    (modelsLoading && models.length === 0) ||
    (isInitialLoading && chatHistory.length === 0);

  if (isWorkspaceBootstrapping) {
    return (
      <ChatShellLoadingSkeleton
        outerMinHeightStyle={
          isDesktopShell
            ? { minHeight: 0, height: "100%", flex: 1 }
            : { minHeight: "calc(var(--vh, 1vh) * 100)" }
        }
        statusMessage={
          modelsLoading && models.length === 0
            ? "Loading models…"
            : "Loading conversations…"
        }
      />
    );
  }

  return (
    <DragDropHandler
      onFilesDropped={handleQueuedFiles}
      onDragActiveChange={setDragActive}
      dragActive={dragActive}
      supportsFileUpload={supportsImageUpload || false}
    >
      {renderWalletModal()}

      <ModelInterfaceChrome
        error={error || ""}
        optimizationMessage={optimizationMessage}
        input={input}
        chat={chat}
        canRetryError={
          /wallet/i.test(error)
            ? true
            : isUploadErrorMessage(error)
              ? failedUploads.some((entry) => entry.status !== 'retrying')
              : true
        }
        onDismissError={() => setError("")}
        onRetryError={async () => {
          const isWalletError = /wallet/i.test(error);
          if (isWalletError && refreshWalletFromBackend) {
            const balance = await refreshWalletFromBackend();
            if (balance !== null) {
              setError("");
            } else {
              setError("Failed to load wallet balance");
            }
            return;
          }

          if (isUploadErrorMessage(error)) {
            retryAllFailedUploads();
            return;
          }

          setError("");
          if (input.trim()) {
            await handleSend(input.trim());
          } else {
            const lastUserMsgIdx = chat.map((m) => m.role).lastIndexOf("user");
            if (lastUserMsgIdx !== -1) {
              const lastUserMsg = chat[lastUserMsgIdx];
              const nextChat = chat.slice(0, lastUserMsgIdx + 1);
              setChat(nextChat);
              await handleSend(undefined, undefined, lastUserMsg, nextChat);
            } else if (refreshWalletFromBackend) {
              const balance = await refreshWalletFromBackend();
              if (balance === null) {
                setError("Failed to load wallet balance");
              }
            }
          }
        }}
      />

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
                    onOpenWorkflows={FEATURE_FLAGS.WORKFLOWS ? handleOpenWorkflows : undefined}
                    onOpenNotifications={() => router.push("/notifications")}
                    switchToSession={handleSessionSwitch}
                    createNewSessionAndSwitch={createNewSessionAndSwitchWrapper}
                    isSessionActive={isSessionActive}
                    isInitialLoading={isInitialLoading || (modelsLoading && models.length === 0)}
                    onLogout={handleLogout}
                    userInitials={getSidebarUserInitials(currentUser)}
                  />
                  <ModelInterfaceChatColumn
                    chat={chat}
                    chatHistory={chatHistory}
                    setChat={setChat}
                    handleSend={handleSend}
                    chatEndRef={chatEndRef}
                    chatContainerRef={chatContainerRef}
                    viewSessionId={viewSessionId}
                    updateSessionMessages={updateSessionMessages}
                    persistSessionMessages={persistSessionMessages}
                    setLoading={setLoading}
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
                    onAttachmentMenuRequest={handleAttachmentMenuRequest}
                    uploading={uploading}
                    uploadProgress={uploadProgress}
                    supportsImageUpload={supportsImageUpload || false}
                    uploadedFiles={uploadedFiles}
                    failedUploadFiles={failedUploads}
                    onRetryFailedUpload={retryFailedUpload}
                    onRemoveFailedUpload={removeFailedUpload}
                    setUploadedFiles={setUploadedFiles}
                    setAttachmentIndex={setAttachmentIndex}
                    setShowModelSelectionModal={setShowModelSelectionModal}
                    pinnedModelIds={pinnedModelIds}
                    favoritesLoaded={favoritesLoaded}
                    onSelectModel={setSelectedModelWrapper}
                    setShowPersonalityModal={setShowPersonalityModal}
                    selectedPersonalityIconUrl={selectedPersonalityIconUrl}
                    selectedPersonalityName={selectedPersonalityName}
                    currentSessionId={currentSessionId}
                    requestModelPick={requestModelPick}
                    pendingOrphanReply={pendingOrphanReply}
                    onCancelOrphanReply={clearPendingOrphanReply}
                    onClearPersonality={clearConversationPersonality}
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
                    onCancelSTT={handleCancelSTT}
                    onConfirmSTT={handleConfirmSTT}
                    isSTTActive={isSTTActive}
                    isDictationTranscribing={isDictationTranscribing}
                    audioTranscription={audioTranscription}
                    audioStatus={audioStatus}
                    audioNotice={audioNotice}
                    audioVolume={audioVolume}
                    inputValue={input}
                    onInputChange={setInput}
                    queuedMessages={queuedMessages}
                    onQueueMessage={handleQueueMessage}
                    onRemoveQueuedMessage={removeQueuedMessage}
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

            {showAttachmentSourcePicker && (
              <AttachmentSourcePickerModal
                onClose={() => setShowAttachmentSourcePicker(false)}
                onPickLocal={() => {
                  setShowAttachmentSourcePicker(false);
                  openLocalFilePicker();
                }}
                onPickLibrary={() => {
                  setShowAttachmentSourcePicker(false);
                  setShowAttachmentLibrary(true);
                }}
              />
            )}

            {showAttachmentLibrary && (
              <AttachmentLibraryModal
                library={attachmentLibrary}
                onClose={() => setShowAttachmentLibrary(false)}
                onConfirm={handleAttachSavedFiles}
              />
            )}
          </div>
        </div>
      </div>
    </DragDropHandler>
  );
}
