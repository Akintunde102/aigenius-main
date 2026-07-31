import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { RefObject } from "react";
import type { CloudFile } from "@/app/components/file/file.interface";
import { useFileUpload } from "../features/file-upload/hooks";
import {
  ATTACHMENT_INDEX_SYSTEM_MESSAGE_ID,
  AttachmentIndexItem,
  UploadedFileEntry,
  createSystemChatMessage,
  formatAttachmentIndexSystemMessage,
  getAssistantImageUrlsFromChat,
  getUploadedFileDisplayName,
} from "../ModelInterface.helpers";
import type { ChatMessage, Model } from "../shared/types";
import type { ChatContainerHandle } from "../features/chat/components/ChatContainer";
import {
  buildCloudFileDisplayName,
  inferMimeTypeFromCloudFile,
  isAttachableCloudFile,
  isImageCloudFile,
} from "@/app/components/user-files/user-files.utils";

import { DRAFT_SESSION_KEY } from "../features/chat/hooks/chatOperations.constants";
import {
  loadComposerFilesMap,
  persistComposerFilesMap,
  StoredUploadedFile,
} from "@/lib/utils/composerDraftStorage";

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
  const activeSessionKey = currentSessionId ?? DRAFT_SESSION_KEY;
  const activeSessionKeyRef = useRef(activeSessionKey);
  activeSessionKeyRef.current = activeSessionKey;

  const [filesMap, setFilesMap] = useState<Record<string, UploadedFileEntry[]>>(() => {
    const loaded = loadComposerFilesMap();
    const result: Record<string, UploadedFileEntry[]> = {};
    for (const [k, list] of Object.entries(loaded)) {
      if (Array.isArray(list)) {
        result[k] = list.map((item) => ({
          fileUrl: item.fileUrl,
          isImage: item.isImage,
          displayName: item.displayName,
          mimeType: item.mimeType,
          source: item.source || "local",
          libraryFileId: item.libraryFileId,
        }));
      }
    }
    return result;
  });

  const uploadedFiles = useMemo(
    () => filesMap[activeSessionKey] || [],
    [filesMap, activeSessionKey]
  );

  const setUploadedFiles = useCallback(
    (action: React.SetStateAction<UploadedFileEntry[]>) => {
      const targetKey = activeSessionKeyRef.current;
      setFilesMap((prev) => {
        const current = prev[targetKey] || [];
        const next = typeof action === "function" ? action(current) : action;
        const updated = {
          ...prev,
          [targetKey]: next,
        };

        const serializableMap: Record<string, StoredUploadedFile[]> = {};
        for (const [key, entries] of Object.entries(updated)) {
          const list = entries as UploadedFileEntry[];
          if (Array.isArray(list) && list.length > 0) {
            serializableMap[key] = list.map((e: UploadedFileEntry) => ({
              fileUrl: e.fileUrl,
              isImage: e.isImage,
              displayName: e.displayName,
              mimeType: e.mimeType,
              source: e.source,
              libraryFileId: e.libraryFileId,
            }));
          }
        }
        persistComposerFilesMap(serializableMap);
        return updated;
      });
    },
    []
  );

  const [attachmentIndex, setAttachmentIndex] = useState<AttachmentIndexItem[]>([]);

  useEffect(() => {
    setAttachmentIndex(
      uploadedFiles.map((entry) => ({
        name: entry.displayName,
        url: entry.fileUrl,
        isImage: entry.isImage,
        mimeType: entry.mimeType,
        uploadedAt: Date.now(),
      }))
    );
  }, [uploadedFiles]);

  const { handleFileUpload, handleCancelUpload } = useFileUpload({
    setUploading,
    setUploadProgress,
    setError,
    conversationId: currentSessionId,
    onFileUploaded: (fileInfo) => {
      const entry: UploadedFileEntry = {
        file: fileInfo.file,
        fileUrl: fileInfo.fileUrl,
        isImage: fileInfo.isImage,
        displayName: fileInfo.file.name,
        mimeType: fileInfo.file.type,
        source: "local",
      };
      setUploadedFiles((prev) => {
        if (prev.some((it) => it.fileUrl === entry.fileUrl)) {
          return prev;
        }
        return [...prev, entry];
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

  const handleAttachSavedFiles = useCallback((cloudFiles: CloudFile[]) => {
    const attachable = cloudFiles.filter(isAttachableCloudFile);
    if (attachable.length === 0) {
      setError("None of the selected files can be attached to chat.");
      return;
    }

    setUploadedFiles((prev) => {
      const next = [...prev];
      for (const cloudFile of attachable) {
        const fileUrl = cloudFile.s3Link;
        if (next.some((entry) => entry.fileUrl === fileUrl)) {
          continue;
        }

        const displayName = buildCloudFileDisplayName(cloudFile);
        const mimeType = inferMimeTypeFromCloudFile(cloudFile);
        next.push({
          fileUrl,
          isImage: isImageCloudFile(cloudFile),
          displayName,
          mimeType,
          source: "library",
          libraryFileId: cloudFile.id,
        });
      }
      return next;
    });

    setAttachmentIndex((prev) => {
      const next = [...prev];
      for (const cloudFile of attachable) {
        const fileUrl = cloudFile.s3Link;
        if (next.some((item) => item.url === fileUrl)) {
          continue;
        }
        next.push({
          name: buildCloudFileDisplayName(cloudFile),
          url: fileUrl,
          isImage: isImageCloudFile(cloudFile),
          mimeType: inferMimeTypeFromCloudFile(cloudFile),
          uploadedAt: Date.now(),
        });
      }
      return next;
    });
  }, [setError]);

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

  const openLocalFilePicker = useCallback(() => {
    chatContainerRef.current?.openLocalFilePicker?.();
  }, [chatContainerRef]);

  return {
    uploadedFiles,
    setUploadedFiles,
    attachmentIndex,
    setAttachmentIndex,
    handleFileUpload,
    handleCancelUpload,
    handleQueuedFiles,
    handleAttachSavedFiles,
    openLocalFilePicker,
    getUploadedFileDisplayName,
  };
}
