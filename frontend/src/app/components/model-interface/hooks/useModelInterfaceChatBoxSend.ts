import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { UploadedFileEntry } from '../ModelInterface.helpers';
import type { ChatMessage, Model } from '../shared/types';
import { normalizeWalletForGating } from '../features/chat/hooks';

interface UseModelInterfaceChatBoxSendParams {
  selectedModel: Model | null;
  uploadedFiles: UploadedFileEntry[];
  project: unknown;
  isInsufficientCredits: boolean;
  requiredWalletBalance: number;
  wallet: unknown;
  viewSessionId: string | null | undefined;
  currentSessionId: string | null | undefined;
  handleSend: (
    content?: string,
    enableStreaming?: boolean,
    preCreatedMessage?: ChatMessage,
    chatSnapshot?: ChatMessage[],
  ) => Promise<boolean>;
  setChat: Dispatch<SetStateAction<ChatMessage[]>>;
  setUploadedFiles: Dispatch<SetStateAction<UploadedFileEntry[]>>;
  setError: (error: string) => void;
  setShowWalletModal: (open: boolean) => void;
}

export function useModelInterfaceChatBoxSend({
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
}: UseModelInterfaceChatBoxSendParams) {
  return useCallback(
    async (message: string, _model: Model | null): Promise<boolean | void> => {
      if (!selectedModel) return false;
      if (!message.trim() && uploadedFiles.length === 0) return false;
      if (!project) {
        setError('No project found. Please create or select a project.');
        return false;
      }

      if (isInsufficientCredits) {
        const roundedRequired = Math.ceil(requiredWalletBalance);
        const modelLabel = selectedModel.name || selectedModel.id;
        const currentBalance = normalizeWalletForGating(wallet) ?? 0;
        const currentBalanceDisplay = currentBalance.toFixed(2).replace(/\.00$/, '');
        setError(
          `You need at least ${roundedRequired} credits to use ${modelLabel}. Current balance: ${currentBalanceDisplay} credits.`,
        );
        setShowWalletModal(true);
        return false;
      }

      if (uploadedFiles.length > 0) {
        const { createChatMessage } = await import('../features/chat/hooks');
        const contentParts: ChatMessage['content'] extends infer T
          ? T extends Array<infer U>
            ? U[]
            : never
          : never = [];

        if (message.trim()) {
          contentParts.push({ type: 'text', text: message.trim() });
        }

        for (const uploadedFile of uploadedFiles) {
          if (uploadedFile.isImage) {
            contentParts.push({
              type: 'image_url',
              image_url: { url: uploadedFile.fileUrl },
            });
          } else {
            contentParts.push({
              type: 'file_url',
              file_url: {
                url: uploadedFile.fileUrl,
                name: uploadedFile.displayName || uploadedFile.file?.name || 'file',
              },
            });
          }
        }

        const userMsg = createChatMessage(
          'user',
          contentParts,
          selectedModel.id,
          selectedModel.name || selectedModel.id,
          viewSessionId ?? currentSessionId,
        );

        const filesBeingSent = uploadedFiles;
        setChat((prev) => [...prev, userMsg]);
        setUploadedFiles([]);

        const sent = await handleSend('', undefined, userMsg);
        if (sent === false) {
          setChat((prev) => prev.filter((m) => m !== userMsg));
          setUploadedFiles(filesBeingSent);
        }
        return sent;
      }

      return await handleSend(message);
    },
    [
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
    ],
  );
}
