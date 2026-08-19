import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { updateConversationMessages } from '@/lib/calls/model-chat-conversation';
import { addOrMergeSessionToLocalHistory } from '@/lib/utils/modelChatConversationUtils';
import { chatQueryKeys } from '@/lib/hooks/chat-query-keys';
import type { ChatMessage, ChatSession, Model } from '@/app/components/model-interface/shared/types';

type Params = {
    viewSessionId: string | null;
    selectedModel: Model | null;
    chatHistory: ChatSession[];
};

export function usePersistSessionMessages({
    viewSessionId,
    selectedModel,
    chatHistory,
}: Params) {
    const queryClient = useQueryClient();

    return useCallback(async (messages: ChatMessage[]) => {
        if (!viewSessionId || messages.length === 0) {
            return;
        }

        const sessionMeta = chatHistory.find((session) => session.id === viewSessionId);
        const modelId = sessionMeta?.modelId ?? selectedModel?.id;
        const modelName = selectedModel?.name ?? modelId;

        if (!modelId || !modelName) {
            return;
        }

        queryClient.setQueryData(
            chatQueryKeys.conversation(viewSessionId),
            (existing: unknown) => {
                if (!existing || typeof existing !== 'object') {
                    return existing;
                }

                const conversation = existing as {
                    session?: { messages?: ChatMessage[]; modelId?: string };
                };

                return {
                    ...conversation,
                    session: {
                        ...conversation.session,
                        messages,
                        modelId,
                    },
                };
            },
        );

        try {
            const saved = await updateConversationMessages(
                viewSessionId,
                messages,
                modelId,
                modelName,
            );

            void addOrMergeSessionToLocalHistory({
                id: viewSessionId,
                codeProjectId: sessionMeta?.codeProjectId ?? null,
                session: {
                    messages,
                    modelId,
                    metadata: saved.metadata,
                },
            });

            await queryClient.invalidateQueries({
                queryKey: chatQueryKeys.conversation(viewSessionId),
            });
        } catch (error) {
            console.error('Failed to persist conversation messages:', error);
            await queryClient.invalidateQueries({
                queryKey: chatQueryKeys.conversation(viewSessionId),
            });
        }
    }, [viewSessionId, selectedModel, chatHistory, queryClient]);
}
