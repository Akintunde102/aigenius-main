import { useState, useCallback, useRef, useEffect } from 'react';
import getNoboxFunctions from '@/lib/calls/get-nobox-functions';
import { getUserDetails } from '@/lib/calls/get-logged-user-details';
import {
    loadComposerDraftMap,
    createDebouncedDraftPersist,
} from '@/lib/utils/composerDraftStorage';

import { UseChatOperationsRefinedProps, UseChatOperationsReturn } from './chatOperations.types';
import { CHAT_CONFIG, DRAFT_SESSION_KEY } from './chatOperations.constants';
import { optimizeMessagesForAPI } from './messageOptimization.utils';
import { updateLastMessageWithMetrics } from './contentProcessing.utils';
import { handleSendError, validateProject, logMetrics } from './errorHandling.utils';
import { useWalletManagement } from './useWalletManagement';
import { useStreamingResponse } from './useStreamingResponse';
import { useNonStreamingResponse } from './useNonStreamingResponse';
import { ChatMessage } from '@/app/components/model-interface/shared/types';
import {
    buildUserMessageState,
    computeRequiredBalance,
    orderMessagesForApi,
    resolveInputToSend,
} from './sendFlow.utils';
import { shouldApplyStreamToOpenTranscript } from '@/app/components/model-interface/conversation/streamTranscriptGuard';
import {
    getDraftConversationEpoch,
    resolveViewSessionId,
} from '@/app/components/model-interface/conversation/conversationViewSession';

/**
 * Send/stop orchestration: wallet validation, composer drafts, message shaping for the API,
 * and delegation to {@link useStreamingResponse} or {@link useNonStreamingResponse}.
 * Do not duplicate stream transcript rules — use {@link shouldApplyStreamToOpenTranscript}.
 */
export function useChatOperationsRefined({
    selectedModel,
    chat,
    setChat,
    setChatForSession,
    streaming,
    setStreamingForSession,
    setLoadingForSession,
    setError,
    streamingEnabled,
    chatEndRef,
    refreshChatHistory,
    currentSessionId,
    routeConversationId = null,
    setCurrentSessionId,
    setChatHistory,
    updateSessionMessages,
    selectedPersonalityName,
    selectedPersonalityIconUrl,
    pendingOrphanReply,
    clearPendingOrphanReply,
    onInsufficientFunds,
}: UseChatOperationsRefinedProps): UseChatOperationsReturn {

    const viewSessionId = resolveViewSessionId(routeConversationId, currentSessionId ?? null);
    const activeViewSessionId = viewSessionId;

    // Always reflects the latest open view so completion callbacks
    // can check whether they still own the visible session.
    const activeViewSessionIdRef = useRef(viewSessionId);
    activeViewSessionIdRef.current = viewSessionId;

    // Always reflects the latest chat messages for the active session.
    // Used by completion callbacks to capture the final draft messages before migration.
    const currentChatRef = useRef(chat);
    currentChatRef.current = chat;

    // Monotonic per-session send counter. A newer send to the same chatMap slot
    // (e.g. after New Chat reuses __draft__) must not have its loading/streaming
    // flags cleared by an older in-flight request's finally/completion handler.
    const sessionSendGenerationRef = useRef<Map<string, number>>(new Map());

    // Per-session input drafts — switching sessions restores the in-progress text.
    // Hydrate from sessionStorage so drafts survive reloads (WhatsApp-style).
    const [inputMap, setInputMap] = useState<Record<string, string>>(
        () => loadComposerDraftMap(),
    );
    const schedulePersistDraftsRef = useRef(
        createDebouncedDraftPersist(),
    );
    useEffect(() => {
        schedulePersistDraftsRef.current(inputMap);
    }, [inputMap]);

    const activeKey = viewSessionId ?? DRAFT_SESSION_KEY;
    const input = inputMap[activeKey] ?? '';
    const setInput = useCallback((val: string | ((prev: string) => string)) => {
        setInputMap(prev => ({
            ...prev,
            [activeKey]: typeof val === 'function' ? val(prev[activeKey] ?? '') : val,
        }));
    }, [activeKey]);

    const [wallet, setWallet] = useState<number | null>(null);
    const [assistantResponse, setAssistantResponse] = useState('');
    const [optimizationMessage, setOptimizationMessage] = useState<string>('');
    const project = CHAT_CONFIG.DEFAULT_PROJECT;

    const {
        validateBalance,
        updateWalletFromResponse
    } = useWalletManagement({ setError, setWallet, skipVisibilityRefetch: true });

    const { handleStreamingResponse, abortRequest: abortStreamingRequest } = useStreamingResponse({
        selectedModel: selectedModel!,
        setChatForSession,
        setStreamingForSession,
        setLoadingForSession,
        setAssistantResponse,
        currentSessionId,
        activeViewSessionId,
        updateSessionMessages,
        handleStreamResult: (result, streamingSessionId, draftEpoch, sendGeneration) => {
            // streamingSessionId is null for new chats, string for existing sessions.
            updateWalletFromResponse(result.wallet);

            // A draft stream only still owns the draft view if no New Chat reset
            // happened since it was dispatched (`null === null` alone can't tell
            // two different drafts apart).
            const sameDraftGeneration = streamingSessionId !== null
                || draftEpoch === undefined
                || draftEpoch === getDraftConversationEpoch();

            // Only touch active-view UI state if this stream still owns the open session.
            const ownsView = sameDraftGeneration && shouldApplyStreamToOpenTranscript(
                streamingSessionId,
                activeViewSessionIdRef.current,
            );

            const chatMapKey = streamingSessionId ?? DRAFT_SESSION_KEY;
            const ownsSendGeneration = sendGeneration !== undefined
                ? sessionSendGenerationRef.current.get(chatMapKey) === sendGeneration
                : sameDraftGeneration;
            if (ownsSendGeneration) {
                setStreamingForSession(chatMapKey, false);
            }
            if (ownsView) {
                setTimeout(() => {
                    setAssistantResponse('');
                }, 100);
            }

            if (ownsView && result.conversationId && setCurrentSessionId) {
                if (streamingSessionId === null) {
                    // New chat: the stream already materialized the full transcript
                    // under the real id — just clear the draft slot and switch the key.
                    // (Re-writing from the committed view here could drop the final chunk.)
                    setChatForSession(DRAFT_SESSION_KEY, []);
                }
                setCurrentSessionId(result.conversationId);
            }

            if (
                result.usage
                || result.cost !== undefined
                || (result.tool_usage_charges !== undefined && result.tool_usage_charges.length > 0)
            ) {
                // Draft completions should always attach metrics to the real session id
                // once available, even when they finished in background.
                const metricsKey = (streamingSessionId === null && result.conversationId)
                    ? result.conversationId
                    : chatMapKey;
                setChatForSession(metricsKey, prev =>
                    updateLastMessageWithMetrics(prev, result.usage, result.cost, result.tool_usage_charges),
                );
            }
        },
        handleSendError: (error) => {
            // setChat here targets the active session — correct for error cleanup on the visible view.
            handleSendError(error, chat, streaming, setChat, setError, {
                setWallet,
                onInsufficientFunds,
            });
        },
        selectedPersonalityName,
        selectedPersonalityIconUrl
    });

    const { handleNonStreamingResponse, abortRequest: abortNonStreamingRequest } = useNonStreamingResponse({
        selectedModel: selectedModel!,
        setChatForSession,
        currentSessionId,
        activeViewSessionId,
        updateSessionMessages,
        setCurrentSessionId,
        onDraftCompleted: (realId) => {
            // The response handler already persisted the full transcript under the
            // real id — just clear the draft slot and switch the session pointer.
            setChatForSession(DRAFT_SESSION_KEY, []);
            setCurrentSessionId?.(realId);
        },
        setWallet,
        wallet,
        logMetrics: (usage, cost) => logMetrics(usage, cost, selectedModel),
        selectedPersonalityName,
        selectedPersonalityIconUrl
    });

    const handleSend = useCallback(async (
        content?: string,
        enableStreaming?: boolean,
        preCreatedMessage?: ChatMessage,
        chatSnapshot?: ChatMessage[],
    ): Promise<boolean> => {
        const shouldStream = enableStreaming !== undefined ? enableStreaming : streamingEnabled;
        const inputToSend = resolveInputToSend(content, input);
        // Read the transcript through the ref so a send triggered from a stale
        // closure (memoized composer, deferred tick) still uses the messages of
        // the conversation that is open right now.
        const chatForBuild = chatSnapshot ?? currentChatRef.current;

        console.log('[useChatOperationsRefined] handleSend entered', { hasSelectedModel: !!selectedModel, inputLength: inputToSend.length, shouldStream });

        if (!selectedModel) {
            console.warn('[useChatOperationsRefined] No selected model');
            return false;
        }
        if (!preCreatedMessage && !inputToSend.trim()) {
            console.log('[useChatOperationsRefined] Empty input, returning');
            return false;
        }

        const projectValidation = validateProject(project);
        if (!projectValidation.isValid) {
            console.error('[useChatOperationsRefined] Project validation failed', projectValidation.error);
            setError(projectValidation.error!);
            return false;
        }

        const requiredBalance = computeRequiredBalance(selectedModel);
        const walletValidation = validateBalance(wallet, requiredBalance, selectedModel?.name || selectedModel?.id);
        if (!walletValidation) {
            console.warn('[useChatOperationsRefined] Wallet validation failed');
            return false;
        }

        setError('');

        const sendingViewId = resolveViewSessionId(routeConversationId, currentSessionId ?? null);
        const sendingSessionId = sendingViewId ?? DRAFT_SESSION_KEY;
        // For draft sends, remember which draft generation this request belongs to.
        const draftEpochAtSend = sendingViewId === null ? getDraftConversationEpoch() : undefined;
        const sendGeneration = (sessionSendGenerationRef.current.get(sendingSessionId) ?? 0) + 1;
        sessionSendGenerationRef.current.set(sendingSessionId, sendGeneration);

        const { userMsg, updatedChat } = (
            chatSnapshot && preCreatedMessage
                ? {
                    userMsg: preCreatedMessage,
                    updatedChat: chatForBuild,
                }
                : buildUserMessageState({
                    preCreatedMessage,
                    inputToSend,
                    selectedModel,
                    currentSessionId: sendingViewId,
                    chat: chatForBuild,
                })
        );

        if (!preCreatedMessage) {
            setChatForSession(sendingSessionId, prev => [...prev, userMsg]);
        }

        // Clear the composer draft for the session being sent (not whichever
        // key a stale closure would resolve).
        setInputMap(prev => ({ ...prev, [sendingSessionId]: '' }));
        setLoadingForSession(sendingSessionId, true);

        setTimeout(() => {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, CHAT_CONFIG.SCROLL_DELAY);

        if (shouldStream) {
            setStreamingForSession(sendingSessionId, true);
            setAssistantResponse('');
        }

        let wasError = false;
        try {
            console.log('[useChatOperationsRefined] Fetching nobox functions...');
            const { accessModel, accessModelStream } = await getNoboxFunctions({ project });

            const rawMessages = orderMessagesForApi(updatedChat);
            const { messages, message: optimizationMsg } = optimizeMessagesForAPI(rawMessages);
            const requestOverrides = {
                conversationId: sendingViewId,
                sendGeneration,
                ...(draftEpochAtSend !== undefined ? { draftEpoch: draftEpochAtSend } : {}),
                ...(pendingOrphanReply ? { orphanReply: pendingOrphanReply } : {}),
            };

            if (optimizationMsg) {
                setOptimizationMessage(optimizationMsg);
                setTimeout(() => setOptimizationMessage(''), CHAT_CONFIG.OPTIMIZATION_MESSAGE_TIMEOUT);
            }

            console.log('[useChatOperationsRefined] Triggering API call', { shouldStream, messageCount: messages.length });
            if (shouldStream) {
                await handleStreamingResponse(accessModelStream, messages, updatedChat, requestOverrides);
            } else {
                await handleNonStreamingResponse(accessModel, messages, updatedChat, requestOverrides);
            }
            clearPendingOrphanReply?.();
            console.log('[useChatOperationsRefined] API call completed');
        } catch (err: unknown) {
            wasError = true;
            console.error('[useChatOperationsRefined] Caught error in handleSend:', err);

            const stillOwnsView = sendOwnsView();
            const isAbort = (err as { name?: string })?.name === 'AbortError'
                || (err as { message?: string })?.message === 'Request aborted';

            // An abort after the user already moved to another chat (Stop on switch,
            // New Chat reset) is intentional — don't surface it in the new view.
            if (!(isAbort && !stillOwnsView)) {
                // Clean up the session that actually errored, not whatever is open now.
                const setChatForSendingSession: React.Dispatch<React.SetStateAction<ChatMessage[]>> =
                    (updater) => setChatForSession(sendingSessionId, updater);
                handleSendError(err, chatForBuild, shouldStream, setChatForSendingSession, setError, {
                    setWallet,
                    onInsufficientFunds,
                });
            }
        } finally {
            console.log('[useChatOperationsRefined] handleSend finished', { sessionId: sendingSessionId });
            // Only clear in-flight indicators when no newer send has started on this slot.
            if (sessionSendGenerationRef.current.get(sendingSessionId) === sendGeneration) {
                setLoadingForSession(sendingSessionId, false);
                setStreamingForSession(sendingSessionId, false);
            }

            // Optimization: Only clear the live typing bubble if the stream finished successfully.
            // If it crashed, we leave the partial text visible so the user doesn't lose context
            // and the TTS engine can finish reading the last sentence.
            if (!wasError && sendOwnsView()) {
                setTimeout(() => {
                    setAssistantResponse('');
                }, 100);
            }
        }
        return true;

        function sendOwnsView(): boolean {
            const sameDraftGeneration = draftEpochAtSend === undefined
                || draftEpochAtSend === getDraftConversationEpoch();
            return sameDraftGeneration
                && shouldApplyStreamToOpenTranscript(sendingViewId, activeViewSessionIdRef.current);
        }
    }, [
        selectedModel, input, project, wallet, currentSessionId, routeConversationId,
        streamingEnabled, setChatForSession,
        setLoadingForSession, setStreamingForSession, setError,
        setAssistantResponse, chatEndRef,
        handleStreamingResponse, handleNonStreamingResponse, pendingOrphanReply, clearPendingOrphanReply, onInsufficientFunds,
        setWallet, validateBalance,
    ]);

    const handleStop = useCallback(() => {
        const sid = resolveViewSessionId(routeConversationId, currentSessionId ?? null) ?? DRAFT_SESSION_KEY;
        abortStreamingRequest(sid);
        abortNonStreamingRequest(sid);
        setLoadingForSession(sid, false);
        setStreamingForSession(sid, false);
        setAssistantResponse('');
    }, [abortStreamingRequest, abortNonStreamingRequest, currentSessionId, routeConversationId, setLoadingForSession, setStreamingForSession]);

    return {
        input,
        setInput: setInput as React.Dispatch<React.SetStateAction<string>>,
        wallet,
        setWallet,
        assistantResponse,
        optimizationMessage,
        handleSend,
        handleStop,
        refreshWalletBalance: useCallback(async () => {
            try {
                const userDetails = await getUserDetails();
                const newWalletBalance = userDetails?.config?.wallet ?? null;
                setWallet(newWalletBalance);
                return newWalletBalance;
            } catch (error) {
                console.error('Failed to refresh wallet:', error);
                return null;
            }
        }, [setWallet])
    };
}
