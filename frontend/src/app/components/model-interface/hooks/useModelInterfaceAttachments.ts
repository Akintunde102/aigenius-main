import { useEffect, useMemo, useState } from "react";
import type { RefObject } from "react";
import { useFileUpload } from "../features/file-upload/hooks";
import {
  ATTACHMENT_INDEX_SYSTEM_MESSAGE_ID,
  AttachmentIndexItem,
  UploadedFileEntry,
  createSystemChatMessage,
  formatAttachmentIndexSystemMessage,
  getAssistantImageUrlsFromChat,
} from "../ModelInterface.helpers";
import type { ChatMessage, Model } from "../shared/types";
import type { ChatContainerHandle } from "../features/chat/components/ChatContainer";

type Params = {
  chat: ChatMessage[];
  setChat: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  selectedModel: Model | null;
  currentSessionId: string | null;
  setUploading: (value: boolean) => void;
  setUploadProgress: (value: number | null) => void;
  setError: (value: string) => void;
  chatContainerRef: RefObject<ChatContainerHandle | null>;
};

export function useModelInterfaceAttachments({
  chat,
  setChat,
  selectedModel,
  currentSessionId,
  setUploading,
  setUploadProgress,
  setError,
  chatContainerRef,
}: Params) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileEntry[]>([]);
  const [attachmentIndex, setAttachmentIndex] = useState<AttachmentIndexItem[]>(
    [],
  );

  useEffect(() => {
    setAttachmentIndex([]);
  }, [currentSessionId]);

  const { handleFileUpload, handleCancelUpload } = useFileUpload({
    setUploading,
    setUploadProgress,
    setError,
    conversationId: currentSessionId,
    onFileUploaded: (fileInfo) => {
      setUploadedFiles((prev) => [...prev, fileInfo]);
      setAttachmentIndex((prev) => {
        const nextItem: AttachmentIndexItem = {
          name: fileInfo.file.name,
          url: fileInfo.fileUrl,
          isImage: fileInfo.isImage,
          mimeType: fileInfo.file.type,
          uploadedAt: Date.now(),
        };

        if (prev.some((it) => it.url === nextItem.url)) {
          return prev;
        }
        return [...prev, nextItem];
      });
    },
  });

  const assistantImageUrlsKey = useMemo(
    () => getAssistantImageUrlsFromChat(chat).join("|"),
    [chat],
  );
  const attachmentIndexKey = useMemo(
    () => attachmentIndex.map((a) => a.url).join("|"),
    [attachmentIndex],
  );

  useEffect(() => {
    const assistantImageUrls = getAssistantImageUrlsFromChat(chat);
    const newContent = formatAttachmentIndexSystemMessage(
      attachmentIndex,
      assistantImageUrls,
    );

    setChat((prev) => {
      const withoutIndexMsg = prev.filter(
        (m) => m.id !== ATTACHMENT_INDEX_SYSTEM_MESSAGE_ID,
      );
      if (newContent === "") {
        return withoutIndexMsg;
      }

      const existingSysMsg = prev.find(
        (m) => m.id === ATTACHMENT_INDEX_SYSTEM_MESSAGE_ID,
      );
      if (
        existingSysMsg &&
        typeof existingSysMsg.content === "string" &&
        existingSysMsg.content === newContent
      ) {
        return prev;
      }

      const modelId = selectedModel?.id;
      const modelName = selectedModel?.name || selectedModel?.id;
      const systemMsg: ChatMessage = {
        ...createSystemChatMessage({
          content: newContent,
          model: selectedModel
            ? {
                id: modelId ?? selectedModel.id,
                name: modelName ?? modelId ?? selectedModel.id,
              }
            : null,
          sessionId: currentSessionId,
        }),
        id: ATTACHMENT_INDEX_SYSTEM_MESSAGE_ID,
      };

      return [...withoutIndexMsg, systemMsg];
    });
  }, [
    assistantImageUrlsKey,
    attachmentIndexKey,
    setChat,
    selectedModel?.id,
    selectedModel?.name,
    currentSessionId,
  ]);

  const handleQueuedFiles = (files: File[]) => {
    if (!files || files.length === 0) {
      return;
    }

    const queueFiles = chatContainerRef.current?.queueFiles;
    if (queueFiles) {
      queueFiles(files);
      return;
    }

    files.forEach((file) => handleFileUpload(file));
  };

  return {
    uploadedFiles,
    setUploadedFiles,
    attachmentIndex,
    setAttachmentIndex,
    handleFileUpload,
    handleCancelUpload,
    handleQueuedFiles,
  };
}
