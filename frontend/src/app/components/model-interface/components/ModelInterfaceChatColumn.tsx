import React, { type RefObject } from "react";
import {
  MessageHandlers,
  ChatContainer,
} from "../features";
import type { ChatMessage, Model, PendingOrphanReply } from "../shared/types";
import type { ChatContainerHandle } from "../features/chat/components/ChatContainer";
import type { AudioStatus } from "../features/chat/hooks/audioMode.utils";
import type {
  AttachmentIndexItem,
  UploadedFileEntry,
} from "../ModelInterface.helpers";

type MessageHandlerProps = {
  handleDeleteMessage: (idx: number) => void;
  handleDeleteMessageById: (id: string) => void;
  handleReplayMessage: (message: ChatMessage, idx: number) => void;
};

type Props = {
  chat: ChatMessage[];
  setChat: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  handleSend: (
    input?: string,
    enableStreaming?: boolean,
    preCreatedMessage?: ChatMessage,
    chatSnapshot?: ChatMessage[],
  ) => void | Promise<void>;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  chatContainerRef: RefObject<ChatContainerHandle | null>;
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
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFileEntry[]>>;
  setAttachmentIndex: React.Dispatch<
    React.SetStateAction<AttachmentIndexItem[]>
  >;
  setShowModelSelectionModal: (v: boolean) => void;
  setShowPersonalityModal: (v: boolean) => void;
  selectedPersonalityIconUrl: string | undefined;
  selectedPersonalityName: string | undefined;
  currentSessionId: string | null;
  pendingOrphanReply?: PendingOrphanReply | null;
  onCancelOrphanReply?: () => void;
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
  onMiniModeToggle?: () => void;
  isMiniMode?: boolean;
  analyzer?: AnalyserNode | null;
};

export const ModelInterfaceChatColumn = React.memo(function ModelInterfaceChatColumn({
  chat,
  setChat,
  handleSend,
  chatEndRef,
  chatContainerRef,
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
  setUploadedFiles,
  setAttachmentIndex,
  setShowModelSelectionModal,
  setShowPersonalityModal,
  selectedPersonalityIconUrl,
  selectedPersonalityName,
  currentSessionId,
  pendingOrphanReply,
  onCancelOrphanReply,
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
  onMiniModeToggle,
  isMiniMode,
  analyzer = null,
}: Props) {
  return (
    <MessageHandlers
      chat={chat}
      setChat={setChat}
      handleSend={handleSend}
      chatEndRef={chatEndRef as React.RefObject<HTMLDivElement>}
    >
      {({
        handleDeleteMessage,
        handleDeleteMessageById,
        handleReplayMessage,
      }: MessageHandlerProps) => (
        <ChatContainer
          ref={chatContainerRef as React.Ref<ChatContainerHandle>}
          chat={chat}
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
          currentSessionId={currentSessionId}
          onSendMessage={handleChatBoxSend}
          onFileUpload={handleFileUpload}
          onAttachmentMenuRequest={onAttachmentMenuRequest}
          uploading={uploading}
          uploadProgress={uploadProgress}
          supportsImageUpload={supportsImageUpload || false}
          uploadedFiles={uploadedFiles}
          onRemoveUploadedFile={(idx) => {
            setUploadedFiles((prev) => {
              const removed = prev[idx];
              if (removed?.fileUrl) {
                setAttachmentIndex((aiPrev) =>
                  aiPrev.filter((it) => it.url !== removed.fileUrl),
                );
              }
              return prev.filter((_, i) => i !== idx);
            });
          }}
          onModelNameClick={() => setShowModelSelectionModal(true)}
          requestModelPick={requestModelPick}
          onPersonalityClick={() => setShowPersonalityModal(true)}
          selectedPersonalityIconUrl={selectedPersonalityIconUrl}
          selectedPersonalityName={selectedPersonalityName}
          pendingOrphanReply={pendingOrphanReply}
          onCancelOrphanReply={onCancelOrphanReply}
          onClearPersonality={async () => {
            if (selectedModel) {
              await createNewSessionAndSwitchWrapper(selectedModel.id);
            } else if (modelsFallback.length > 0) {
              await createNewSessionAndSwitchWrapper(modelsFallback[0].id);
            }
          }}
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
          onMiniModeToggle={onMiniModeToggle}
          isMiniMode={isMiniMode}
          analyzer={analyzer}
        />
      )}
    </MessageHandlers>
  );
});
