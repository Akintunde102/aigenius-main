import { useCallback, useRef } from 'react';
import { ChatMessage } from '@/app/components/model-interface/shared/types';
import { OpenRouterMessage } from '@/nobox-client/functions/access-model';
import { ChatCompletionRequestOverrides, UseNonStreamingResponseProps } from './chatOperations.types';
import { DRAFT_SESSION_KEY } from './chatOperations.constants';
import { createChatMessage, processBackendContent, generateMessageId } from './contentProcessing.utils';
import { addOrMergeSessionToLocalHistory } from '@/lib/utils/modelChatConversationUtils';
import { shouldApplyStreamToOpenTranscript } from '@/app/components/model-interface/conversation/streamTranscriptGuard';
import { clearUserDetailsCache } from '@/lib/calls/get-logged-user-details';
import { resolveRequestConversationId } from './requestConversationId.utils';
import { deriveChatSessionTitle } from '@/lib/utils/messageTextUtils';

/**
 * Full-response (non-streaming) assistant path: single payload handling and session updates.
 * For streaming behavior see {@link useStreamingResponse}.
 */
export function useNonStreamingResponse({
    selectedModel,
    setChatForSession,
    currentSessionId,
    activeViewSessionId,
    updateSessionMessages,
    setCurrentSessionId,
    onDraftCompleted,
    setWallet,
    wallet,
    logMetrics,
    selectedPersonalityName,
    selectedPersonalityIconUrl
}: UseNonStreamingResponseProps) {
    const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

    const activeViewSessionIdRef = useRef(activeViewSessionId);
    if (activeViewSessionIdRef.current !== activeViewSessionId) {
        activeViewSessionIdRef.current = activeViewSessionId;
    }

    const abortRequest = useCallback((sessionKey?: string) => {
        if (sessionKey) {
            const controller = abortControllersRef.current.get(sessionKey);
            if (controller) {
                controller.abort();
                abortControllersRef.current.delete(sessionKey);
            }
            return;
        }

        abortControllersRef.current.forEach((controller) => controller.abort());
        abortControllersRef.current.clear();
    }, []);

    const handleNonStreamingResponse = useCallback(async (
        accessModel: any,
        messages: OpenRouterMessage[],
        /** When the send used an explicit transcript (replay), React state may not have committed yet. */
        uiChatBase?: ChatMessage[],
        requestOverrides?: ChatCompletionRequestOverrides,
    ): Promise<void> => {
        if (!selectedModel) return;

        // null for new chats — used for guard comparisons and API conversationId.
        const requestSessionId = resolveRequestConversationId(requestOverrides, currentSessionId);
        // Always a string — used as the chatMap slot key.
        const chatMapKey = requestSessionId ?? DRAFT_SESSION_KEY;

        const existingController = abortControllersRef.current.get(chatMapKey);
        if (existingController) {
            existingController.abort();
            abortControllersRef.current.delete(chatMapKey);
        }

        const abortController = new AbortController();
        abortControllersRef.current.set(chatMapKey, abortController);

        const assistantMessageId = generateMessageId();
        const assistantTimestamp = Date.now();

        try {
            const result = await accessModel({
                body: {
                    messages,
                    ...(requestSessionId ? { conversationId: requestSessionId } : {}),
                    ...(requestOverrides?.orphanReply ?? {}),
                    assistantMessageId,
                    assistantTimestamp,
                },
                options: { model: selectedModel.id },
                signal: abortController.signal
            });

            const ownsView = shouldApplyStreamToOpenTranscript(requestSessionId, activeViewSessionIdRef.current);

            const processedContent = processBackendContent(result.content);

            const assistantMsg = createChatMessage(
                'assistant',
                processedContent,
                selectedModel.id,
                selectedModel.name || selectedModel.id,
                requestSessionId ?? undefined,
                result.usage,
                result.cost,
                selectedPersonalityName,
                selectedPersonalityIconUrl,
                result.tool_executions,
                result.tool_usage_charges,
                assistantMessageId,
                assistantTimestamp,
            );

            const fullMessages = uiChatBase
                ? [...uiChatBase, assistantMsg]
                : [...messages.map(m => ({
                    role: m.role as any,
                    content: m.content as any,
                    messageId: m.messageId,
                    modelId: m.modelId,
                    modelName: m.modelName,
                    timestamp: m.timestamp ?? Date.now()
                })), assistantMsg];

            if (requestSessionId === null && result.conversationId) {
                // Always persist draft completions under the real id so they are visible
                // in history even when the user has already moved to another chat.
                setChatForSession(result.conversationId, fullMessages);
                updateSessionMessages?.(result.conversationId, fullMessages, {
                    modelId: selectedModel.id,
                    title: deriveChatSessionTitle(fullMessages[0]?.content),
                });
                void addOrMergeSessionToLocalHistory({
                    id: result.conversationId,
                    session: { messages: fullMessages }
                });

                // If the user is still on this draft view, perform UI migration/switch.
                if (ownsView) {
                    onDraftCompleted?.(result.conversationId, assistantMsg);
                }
            } else {
                // Existing session (or background new chat — write to draft slot and leave it).
                if (uiChatBase) {
                    setChatForSession(chatMapKey, [...uiChatBase, assistantMsg]);
                } else {
                    setChatForSession(chatMapKey, prev => [...prev, assistantMsg]);
                }

                if (requestSessionId && ownsView && result.conversationId && setCurrentSessionId) {
                    setCurrentSessionId(result.conversationId);
                }

                if (requestSessionId && updateSessionMessages) {
                    updateSessionMessages(requestSessionId, fullMessages, {
                        modelId: selectedModel.id,
                        title: deriveChatSessionTitle(fullMessages[0]?.content),
                    });
                }

                if (requestSessionId) {
                    void addOrMergeSessionToLocalHistory({
                        id: requestSessionId,
                        session: { messages: undefined }
                    });
                }
            }

            if (result.wallet !== undefined && wallet !== result.wallet) {
                clearUserDetailsCache();
                setWallet(result.wallet);
            }

            logMetrics(result.usage, result.cost);
        } finally {
            const currentController = abortControllersRef.current.get(chatMapKey);
            if (currentController === abortController) {
                abortControllersRef.current.delete(chatMapKey);
            }
        }
    }, [
        selectedModel?.id,
        currentSessionId,
        activeViewSessionId,
        updateSessionMessages,
        setCurrentSessionId,
        onDraftCompleted,
        setChatForSession,
        setWallet,
        wallet,
        logMetrics,
        selectedPersonalityName,
        selectedPersonalityIconUrl
    ]);

    return {
        handleNonStreamingResponse,
        abortRequest
    };
}
