import { useCallback, useRef } from 'react';
import { ChatMessage } from '@/app/components/model-interface/shared/types';
import { OpenRouterMessage } from '@/nobox-client/functions/access-model';
import { ChatCompletionRequestOverrides, UseNonStreamingResponseProps, AccessModelFn } from './chatOperations.types';
import { DRAFT_SESSION_KEY } from './chatOperations.constants';
import { getClientDraftSessionId } from '@/app/components/model-interface/conversation/clientDraftSession';
import { createChatMessage, processBackendContent, generateMessageId } from './contentProcessing.utils';
import { shouldApplyStreamToOpenTranscript } from '@/app/components/model-interface/conversation/streamTranscriptGuard';
import { getDraftConversationEpoch } from '@/app/components/model-interface/conversation/conversationViewSession';
import { resolveRequestConversationId } from './requestConversationId.utils';
import { finalizeNonStreamingTurn } from './chatTurnFinalizer.utils';

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
        accessModel: AccessModelFn,
        messages: OpenRouterMessage[],
        /** When the send used an explicit transcript (replay), React state may not have committed yet. */
        uiChatBase?: ChatMessage[],
        requestOverrides?: ChatCompletionRequestOverrides,
    ): Promise<void> => {
        const modelForRequest = requestOverrides?.modelOverride ?? selectedModel;
        if (!modelForRequest) return;

        // null for new chats — used for guard comparisons and API conversationId.
        const requestSessionId = resolveRequestConversationId(requestOverrides, currentSessionId);
        const clientDraftKeyAtDispatch = requestOverrides?.clientDraftMapKey
            ?? (requestSessionId === null ? getClientDraftSessionId() : undefined);
        // Always a string — used as the chatMap slot key.
        const chatMapKey = requestSessionId ?? clientDraftKeyAtDispatch ?? DRAFT_SESSION_KEY;
        const abortMapKeyAtStart = chatMapKey;
        let abortCleanupKey = chatMapKey;

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
                options: { model: modelForRequest.id },
                signal: abortController.signal
            });

            if (!result) {
                return;
            }

            // Draft sends also require the draft generation to be unchanged — a New
            // Chat reset since dispatch means this response belongs to an older draft.
            const sameDraftGeneration = requestSessionId !== null
                || requestOverrides?.draftEpoch === undefined
                || requestOverrides.draftEpoch === getDraftConversationEpoch();
            const ownsView = sameDraftGeneration
                && shouldApplyStreamToOpenTranscript(requestSessionId, activeViewSessionIdRef.current, result.conversationId);

            const processedContent = processBackendContent(result.content);

            const assistantMsg = createChatMessage(
                'assistant',
                processedContent,
                modelForRequest.id,
                modelForRequest.name || modelForRequest.id,
                requestSessionId ?? undefined,
                result.usage,
                result.cost_credits,
                selectedPersonalityName,
                selectedPersonalityIconUrl,
                result.tool_executions,
                result.tool_usage_charges,
                assistantMessageId,
                assistantTimestamp,
            );

            const fullMessages = uiChatBase
                ? [...uiChatBase, assistantMsg]
                : [...messages.map((m): ChatMessage => ({
                    role: m.role,
                    content: m.content,
                    messageId: m.messageId,
                    modelId: m.modelId,
                    modelName: m.modelName,
                    timestamp: m.timestamp ?? Date.now(),
                })), assistantMsg];

            abortCleanupKey = finalizeNonStreamingTurn({
                result,
                assistantMsg,
                processedContent,
                fullMessages,
                modelForRequest,
                requestSessionId,
                ownsView,
                sameDraftGeneration,
                chatMapKey,
                uiChatBase,
                clientDraftKeyAtDispatch,
                abortMapKeyAtStart,
                abortControllers: abortControllersRef.current,
                setChatForSession,
                updateSessionMessages,
                setCurrentSessionId,
                onDraftCompleted,
                logMetrics,
            });
        } finally {
            const currentController = abortControllersRef.current.get(abortCleanupKey);
            if (currentController === abortController) {
                abortControllersRef.current.delete(abortCleanupKey);
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
