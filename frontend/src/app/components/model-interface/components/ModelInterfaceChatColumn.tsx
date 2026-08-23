import React, { useCallback, type RefObject, useMemo } from "react";
import {
  MessageHandlers,
  ChatContainer,
} from "../features";
import type { ChatMessage, ChatSession, Model, PendingOrphanReply } from "../shared/types";
import type { QueuedComposerMessage } from "../features/chat/hooks/messageSendQueue.types";
import type { ChatContainerHandle } from "../features/chat/components/ChatContainer";
import type { FailedUploadEntry } from "../features/file-upload/hooks/useFileUpload";
import type { AudioStatus } from "../features/chat/hooks/audioMode.utils";
import { resolveQuickPickModelsForDisplay } from "../shared/constants/quickPickModels";
import type {
  AttachmentIndexItem,
  UploadedFileEntry,
} from "../ModelInterface.helpers";

type MessageHandlerProps = {
  handleDeleteMessage: (idx: number) => void;
  handleDeleteMessageById: (id: string) => void;
  handleReplayMessage: (message: ChatMessage, idx: number) => void;
  editingIdx: number | null;
  editDraft: import("../features/messages/utils/messageEdit.utils").MessageEditDraft | null;
  handleStartEditMessage: (message: ChatMessage, idx: number) => void;
  handleCancelEditMessage: () => void;
  handleUpdateEditDraft: (draft: import("../features/messages/utils/messageEdit.utils").MessageEditDraft) => void;
  handleCommitEditMessage: (idx: number) => void;
};

type Props = {
  chat: ChatMessage[];
  chatHistory?: ChatSession[];
  setChat: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  handleSend: (
    input?: string,
    enableStreaming?: boolean,
    preCreatedMessage?: ChatMessage,
    chatSnapshot?: ChatMessage[],
  ) => void | Promise<boolean | void>;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  chatContainerRef: RefObject<ChatContainerHandle | null>;
  viewSessionId?: string | null;
  updateSessionMessages?: (sessionId: string, messages: ChatMessage[]) => void;
  persistSessionMessages?: (messages: ChatMessage[]) => void | Promise<void>;
  setLoading?: (loading: boolean) => void;
  selectedModel: Model | null;
  models: Model[];
  showCosts: boolean;
  showNaira: boolean;
  showTyping: boolean;
  loading: boolean;
  imagePreview: string | null;
  setImagePreview: (v: string | null) => void;
  chatAreaRef: React.RefObject<HTMLDivElement | null>;
  showScrollToBottom: boolean;
  handleSave: (message: ChatMessage) => void;
  handleChatBoxSend: (
    message: string,
    model: Model | null,
  ) => Promise<boolean | void>;
  handleFileUpload: (file: File) => void;
  onAttachmentMenuRequest?: () => void;
  uploading: boolean;
  uploadProgress: number | null;
  supportsImageUpload: boolean;
  uploadedFiles: UploadedFileEntry[];
  failedUploadFiles?: FailedUploadEntry[];
  onRetryFailedUpload?: (id: string) => void;
  onRemoveFailedUpload?: (id: string) => void;
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFileEntry[]>>;
  setAttachmentIndex: React.Dispatch<
    React.SetStateAction<AttachmentIndexItem[]>
  >;
  setShowModelSelectionModal: (v: boolean) => void;
  pinnedModelIds: string[];
  favoritesLoaded: boolean;
  onSelectModel: (model: Model) => void;
  setShowPersonalityModal: (v: boolean) => void;
  selectedPersonalityIconUrl: string | undefined;
  selectedPersonalityName: string | undefined;
  currentSessionId: string | null;
  pendingOrphanReply?: PendingOrphanReply | null;
  onCancelOrphanReply?: () => void;
  onClearPersonality?: () => void | Promise<void>;
  createNewSessionAndSwitchWrapper: (modelId: string) => void | Promise<void>;
  modelsFallback: Model[];
  handleCancelUpload: () => void;
  setShowSaved: (v: boolean) => void;
  setShowTyping: (v: boolean) => void;
  streaming: boolean;
  streamingEnabled: boolean;
  setStreamingEnabled: (v: boolean) => void;
  handleStop: () => void;
  /** Desktop collapsed rail: center the main chat column. */
  desktopConversationCentered?: boolean;
  setError?: (error: string | ((prev: string) => string)) => void;
  setWallet?: (wallet: number | null | ((prev: number | null) => number | null)) => void;
  onInsufficientFunds?: () => void;
  wallet?: number | null;
  onAddCredits?: () => void;
  isInsufficientCredits?: boolean;
  requestModelPick?: () => Promise<{ id: string; name?: string } | null>;
  onAudioModeToggle?: (enabled: boolean) => void;
  isAudioMode?: boolean;
  onStartSTT?: () => void;
  onCancelSTT?: () => void;
  onConfirmSTT?: () => void;
  isSTTActive?: boolean;
  isDictationTranscribing?: boolean;
  audioTranscription?: string;
  audioStatus?: AudioStatus;
  audioNotice?: string;
  audioVolume?: number;
  /** Controlled value for the chat textarea — drives STT text injection. */
  inputValue?: string;
  onInputChange?: (value: string) => void;
  composerSessionKey?: string;
  commitComposerDraftForKey?: (key: string, value: string) => void;
  queuedMessages?: QueuedComposerMessage[];
  onQueueMessage?: (message: string) => void;
  onRemoveQueuedMessage?: (messageId: string) => void;
  onMiniModeToggle?: () => void;
  isMiniMode?: boolean;
  analyzer?: AnalyserNode | null;
};

export const ModelInterfaceChatColumn = React.memo(function ModelInterfaceChatColumn({
  chat,
  chatHistory = [],
  setChat,
  handleSend,
  chatEndRef,
  chatContainerRef,
  viewSessionId = null,
  updateSessionMessages,
  persistSessionMessages,
  setLoading,
  selectedModel,
  models,
  showCosts,
  showNaira,
  showTyping,
  loading,
  imagePreview,
  setImagePreview,
  chatAreaRef,
  showScrollToBottom,
  handleSave,
  handleChatBoxSend,
  handleFileUpload,
  onAttachmentMenuRequest,
  uploading,
  uploadProgress,
  supportsImageUpload,
  uploadedFiles,
  failedUploadFiles = [],
  onRetryFailedUpload,
  onRemoveFailedUpload,
  setUploadedFiles,
  setAttachmentIndex,
  setShowModelSelectionModal,
  pinnedModelIds,
  favoritesLoaded,
  onSelectModel,
  setShowPersonalityModal,
  selectedPersonalityIconUrl,
  selectedPersonalityName,
  currentSessionId,
  pendingOrphanReply,
  onCancelOrphanReply,
  onClearPersonality,
  createNewSessionAndSwitchWrapper,
  modelsFallback,
  handleCancelUpload,
  setShowSaved,
  setShowTyping,
  streaming,
  streamingEnabled,
  setStreamingEnabled,
  handleStop,
  desktopConversationCentered = false,
  setError,
  setWallet,
  onInsufficientFunds,
  wallet,
  onAddCredits,
  isInsufficientCredits = false,
  requestModelPick,
  onAudioModeToggle,
  isAudioMode,
  onStartSTT,
  onCancelSTT,
  onConfirmSTT,
  isSTTActive,
  isDictationTranscribing,
  audioTranscription,
  audioStatus,
  audioNotice,
  audioVolume,
  inputValue,
  onInputChange,
  composerSessionKey,
  commitComposerDraftForKey,
  queuedMessages,
  onQueueMessage,
  onRemoveQueuedMessage,
  onMiniModeToggle,
  isMiniMode,
  analyzer = null,
}: Props) {
  const handleRemoveUploadedFile = useCallback(
    (idx: number) => {
      setUploadedFiles((prev) => {
        const removed = prev[idx];
        if (removed?.fileUrl) {
          setAttachmentIndex((aiPrev) =>
            aiPrev.filter((it) => it.url !== removed.fileUrl),
          );
        }
        return prev.filter((_, i) => i !== idx);
      });
    },
    [setUploadedFiles, setAttachmentIndex],
  );

  const quickPickModels = useMemo(
    () => resolveQuickPickModelsForDisplay(models, pinnedModelIds, favoritesLoaded),
    [models, pinnedModelIds, favoritesLoaded],
  );

  const handleOpenFullModelPicker = useCallback(() => {
    setShowModelSelectionModal(true);
  }, [setShowModelSelectionModal]);

  return (
    <MessageHandlers
      chat={chat}
      setChat={setChat}
      handleSend={handleSend}
      chatEndRef={chatEndRef as React.RefObject<HTMLDivElement>}
      viewSessionId={viewSessionId}
      updateSessionMessages={updateSessionMessages}
      persistSessionMessages={persistSessionMessages}
      setLoading={setLoading}
      handleStop={handleStop}
      loading={loading}
      streaming={streaming}
    >
      {({
        handleDeleteMessage,
        handleDeleteMessageById,
        handleReplayMessage,
        editingIdx,
        editDraft,
        handleStartEditMessage,
        handleCancelEditMessage,
        handleUpdateEditDraft,
        handleCommitEditMessage,
      }: MessageHandlerProps) => (
        <ChatContainer
          ref={chatContainerRef as React.Ref<ChatContainerHandle>}
          chat={chat}
          chatHistory={chatHistory}
          selectedModel={selectedModel}
          models={models}
          showCosts={showCosts}
          showNaira={showNaira}
          showTyping={showTyping}
          loading={loading}
          imagePreview={imagePreview}
          setImagePreview={setImagePreview}
          chatEndRef={chatEndRef as React.RefObject<HTMLDivElement>}
          chatAreaRef={chatAreaRef as React.RefObject<HTMLDivElement>}
          showScrollToBottom={showScrollToBottom}
          onDeleteMessage={handleDeleteMessage}
          onDeleteMessageById={handleDeleteMessageById}
          onSaveMessage={handleSave}
          onReplayMessage={handleReplayMessage}
          editingIdx={editingIdx}
          editDraft={editDraft}
          onStartEditMessage={handleStartEditMessage}
          onCancelEditMessage={handleCancelEditMessage}
          onUpdateEditDraft={handleUpdateEditDraft}
          onCommitEditMessage={handleCommitEditMessage}
          supportsFileUpload={supportsImageUpload || false}
          currentSessionId={currentSessionId}
          onSendMessage={handleChatBoxSend}
          onFileUpload={handleFileUpload}
          onAttachmentMenuRequest={onAttachmentMenuRequest}
          uploading={uploading}
          uploadProgress={uploadProgress}
          supportsImageUpload={supportsImageUpload || false}
          uploadedFiles={uploadedFiles}
          failedUploadFiles={failedUploadFiles}
          onRetryFailedUpload={onRetryFailedUpload}
          onRemoveFailedUpload={onRemoveFailedUpload}
          onRemoveUploadedFile={handleRemoveUploadedFile}
          onModelNameClick={() => setShowModelSelectionModal(true)}
          onSelectModel={onSelectModel}
          quickPickModels={quickPickModels}
          favoritesLoaded={favoritesLoaded}
          onOpenFullModelPicker={handleOpenFullModelPicker}
          requestModelPick={requestModelPick}
          onPersonalityClick={() => setShowPersonalityModal(true)}
          selectedPersonalityIconUrl={selectedPersonalityIconUrl}
          selectedPersonalityName={selectedPersonalityName}
          pendingOrphanReply={pendingOrphanReply}
          onCancelOrphanReply={onCancelOrphanReply}
          onClearPersonality={onClearPersonality}
          onCancelUpload={handleCancelUpload}
          onShowSavedChats={() => setShowSaved(true)}
          sidebarStyle={true}
          setIsTyping={setShowTyping}
          streaming={streaming}
          streamingEnabled={streamingEnabled}
          onStreamingToggle={setStreamingEnabled}
          onStopGeneration={handleStop}
          desktopConversationCentered={desktopConversationCentered}
          setError={setError}
          setWallet={setWallet}
          onInsufficientFunds={onInsufficientFunds}
          wallet={wallet}
          onAddCredits={onAddCredits}
          isInsufficientCredits={isInsufficientCredits}
          onAudioModeToggle={onAudioModeToggle}
          isAudioMode={isAudioMode}
          onStartSTT={onStartSTT}
          onCancelSTT={onCancelSTT}
          onConfirmSTT={onConfirmSTT}
          isSTTActive={isSTTActive}
          isDictationTranscribing={isDictationTranscribing}
          audioTranscription={audioTranscription}
          audioStatus={audioStatus}
          audioNotice={audioNotice}
          audioVolume={audioVolume}
          inputValue={inputValue}
          onInputChange={onInputChange}
          composerSessionKey={composerSessionKey}
          commitComposerDraftForKey={commitComposerDraftForKey}
          queuedMessages={queuedMessages}
          onQueueMessage={onQueueMessage}
          onRemoveQueuedMessage={onRemoveQueuedMessage}
          onMiniModeToggle={onMiniModeToggle}
          isMiniMode={isMiniMode}
          analyzer={analyzer}
        />
      )}
    </MessageHandlers>
  );
});
