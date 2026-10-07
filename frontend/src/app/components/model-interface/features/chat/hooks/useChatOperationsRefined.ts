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
    setActiveRouteConversationTarget,
} from '@/app/components/model-interface/conversation/conversationViewSession';
import {
    getClientDraftSessionId,
    isClientDraftSessionId,
    migrateLegacyDraftStorageKey,
    resolveActiveChatMapKey,
} from '@/app/components/model-interface/conversation/clientDraftSession';
import { enforceOutgoingChatProjectScope } from '@/lib/code-projects/apply-chat-project-scope';
import {
  trackChatMessageSent,
  trackChatResponseCompleted,
  trackChatResponseFailed,
  trackChatSendBlockedInsufficientBalance,
} from '@/lib/analytics/product-events';
import { messageHasAttachments } from '@/lib/analytics/analytics-props.utils';
import { getChatProjectScopeId } from '@/lib/code-projects/chat-project-scope';
import type { HandleSendQueueOptions } from './messageSendQueue.types';
import { notifyBackgroundConversationReady } from '@/lib/utils/background-conversation-notify';
import { deriveChatSessionTitle } from '@/lib/utils/messageTextUtils';
import { abortSubagentConversation } from '@/lib/calls/model-chat-conversation';

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
    chatHistory = [],
    updateSessionMessages,
    selectedPersonalityName,
    selectedPersonalityIconUrl,
    pendingOrphanReply,
    clearPendingOrphanReply,
    onInsufficientFunds,
    getChatForSession,
    isAudioModeRef,
    onDraftSessionMaterialized,
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
    const [inputMap, setInputMap] = useState<Record<string, string>>(() =>
        migrateLegacyDraftStorageKey(loadComposerDraftMap(), (v) => !v.trim()),
    );
    const schedulePersistDraftsRef = useRef(
        createDebouncedDraftPersist(),
    );
    useEffect(() => {
        schedulePersistDraftsRef.current(inputMap);
    }, [inputMap]);

    const activeKey = resolveActiveChatMapKey(viewSessionId);
    const input = inputMap[activeKey] ?? '';
    const setInput = useCallback((val: string | ((prev: string) => string)) => {
        setInputMap(prev => ({
            ...prev,
            [activeKey]: typeof val === 'function' ? val(prev[activeKey] ?? '') : val,
        }));
    }, [activeKey]);

    const commitComposerDraftForKey = useCallback((key: string, val: string) => {
        setInputMap((prev) => ({ ...prev, [key]: val }));
    }, []);

    const migrateDraftComposerToSession = useCallback((realId: string, fromDraftKey?: string) => {
        setInputMap((prev) => {
            const sourceKey = fromDraftKey ?? getClientDraftSessionId();
            const draftText = prev[sourceKey] ?? prev[DRAFT_SESSION_KEY] ?? '';
            if (!draftText || (prev[realId] ?? '').length > 0) {
                return prev;
            }
            return {
                ...prev,
                [realId]: draftText,
                [sourceKey]: '',
                [DRAFT_SESSION_KEY]: '',
            };
        });
    }, []);

    const hasDraftSession = useCallback((sessionId: string) => {
        if (!sessionId) return false;
        const val = inputMap[sessionId];
        return typeof val === 'string' && val.trim().length > 0;
    }, [inputMap]);

    const [wallet, setWallet] = useState<number | null>(null);
    const [assistantResponse, setAssistantResponse] = useState('');
    const [optimizationMessage, setOptimizationMessage] = useState<string>('');
    const project = CHAT_CONFIG.DEFAULT_PROJECT;

    const {
        validateBalance,
        updateWalletFromResponse
    } = useWalletManagement({ setError, setWallet, skipVisibilityRefetch: true });

    const currentMaterializedIdRef = useRef<string | null>(null);

    const { handleStreamingResponse, abortRequest: abortStreamingRequest } = useStreamingResponse({
        selectedModel,
        setChatForSession,
        setStreamingForSession,
        setLoadingForSession,
        setAssistantResponse,
        currentSessionId,
        activeViewSessionId,
        updateSessionMessages,
        isAudioModeRef,
        onDraftMaterialized: (realId, clientDraftMapKey) => {
            currentMaterializedIdRef.current = realId;
            setActiveRouteConversationTarget(realId);
            const draftGen = sessionSendGenerationRef.current.get(clientDraftMapKey) ?? 0;
            sessionSendGenerationRef.current.set(realId, draftGen);
            setStreamingForSession(realId, true);
            setLoadingForSession(realId, true);
            setStreamingForSession(clientDraftMapKey, false);
            setLoadingForSession(clientDraftMapKey, false);
            setChatForSession(clientDraftMapKey, []);
            migrateDraftComposerToSession(realId, clientDraftMapKey);
            onDraftSessionMaterialized?.(realId, clientDraftMapKey);
            setCurrentSessionId?.(realId);
        },
        handleStreamResult: (result, streamingSessionId, draftEpoch, sendGeneration, clientDraftMapKey) => {
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
                result.conversationId,
            );

            const chatMapKey = streamingSessionId ?? clientDraftMapKey ?? getClientDraftSessionId();
            const ownsSendGeneration = sendGeneration !== undefined
                ? (sessionSendGenerationRef.current.get(chatMapKey) === sendGeneration ||
                   (result.conversationId && sessionSendGenerationRef.current.get(result.conversationId) === sendGeneration))
                : sameDraftGeneration;
            if (ownsSendGeneration) {
                setStreamingForSession(chatMapKey, false);
                setLoadingForSession(chatMapKey, false);
                if (result.conversationId) {
                    setStreamingForSession(result.conversationId, false);
                    setLoadingForSession(result.conversationId, false);
                }
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
                    const fromDraftKey = clientDraftMapKey ?? getClientDraftSessionId();
                    setChatForSession(fromDraftKey, []);
                    migrateDraftComposerToSession(result.conversationId, fromDraftKey);
                    onDraftSessionMaterialized?.(result.conversationId, fromDraftKey);
                }
                setCurrentSessionId(result.conversationId);
            }

            if (!ownsView) {
                const resolvedId = streamingSessionId ?? result.conversationId ?? null;
                const sessionTitle = resolvedId
                    ? chatHistory.find((s) => s.id === resolvedId)?.title?.trim()
                    : undefined;
                void notifyBackgroundConversationReady({
                    title: sessionTitle || deriveChatSessionTitle(
                        getChatForSession(resolvedId ?? chatMapKey)?.[0]?.content,
                    ) || 'Chat',
                });
            }

            if (
                result.usage
                || result.cost_credits !== undefined
                || (result.tool_usage_charges !== undefined && result.tool_usage_charges.length > 0)
            ) {
                // Draft completions should always attach metrics to the real session id
                // once available, even when they finished in background.
                const metricsKey = (streamingSessionId === null && result.conversationId)
                    ? result.conversationId
                    : chatMapKey;
                setChatForSession(metricsKey, prev =>
                    updateLastMessageWithMetrics(prev, result.usage, result.cost_credits, result.tool_usage_charges),
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
        selectedModel,
        setChatForSession,
        currentSessionId,
        activeViewSessionId,
        updateSessionMessages,
        setCurrentSessionId,
        onDraftCompleted: (realId, _assistantMsg, clientDraftMapKey) => {
            // The response handler already persisted the full transcript under the
            // real id — just clear the draft slot and switch the session pointer.
            const fromDraftKey = clientDraftMapKey ?? getClientDraftSessionId();
            setChatForSession(fromDraftKey, []);
            migrateDraftComposerToSession(realId, fromDraftKey);
            onDraftSessionMaterialized?.(realId, fromDraftKey);
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
        sendOptions?: HandleSendQueueOptions,
    ): Promise<boolean> => {
        currentMaterializedIdRef.current = null;
        const modelForSend = sendOptions?.modelOverride ?? selectedModel;
        const shouldStream = enableStreaming !== undefined ? enableStreaming : streamingEnabled;
        const inputToSend = resolveInputToSend(content, input);
        if (!modelForSend) {
            return false;
        }
        if (!preCreatedMessage && !inputToSend.trim()) {
            return false;
        }

        const projectValidation = validateProject(project);
        if (!projectValidation.isValid) {
            console.error('[useChatOperationsRefined] Project validation failed', projectValidation.error);
            setError(projectValidation.error!);
            return false;
        }

        const requiredBalance = computeRequiredBalance(modelForSend);
        const walletValidation = validateBalance(wallet, requiredBalance, modelForSend?.name || modelForSend?.id);
        if (!walletValidation) {
            trackChatSendBlockedInsufficientBalance({
                model: modelForSend,
                requiredBalance,
                walletBalance: wallet,
            });
            return false;
        }

        setError('');

        const sendingViewId = sendOptions?.targetSessionKey !== undefined
            ? (sendOptions.targetSessionKey === DRAFT_SESSION_KEY || isClientDraftSessionId(sendOptions.targetSessionKey)
                ? null
                : sendOptions.targetSessionKey)
            : resolveViewSessionId(routeConversationId, currentSessionId ?? null);
        const sendingSessionId = sendingViewId ?? getClientDraftSessionId();
        const activeComposerKey = resolveActiveChatMapKey(viewSessionId);
        const clientDraftMapKey = sendingViewId === null ? sendingSessionId : undefined;
        const isBackgroundSend = sendOptions?.targetSessionKey !== undefined
            && sendOptions.targetSessionKey !== activeComposerKey;
        // Build from the captured session slot, not whichever transcript is
        // currently rendered after navigation or a delayed send callback.
        const chatForBuild = chatSnapshot ?? getChatForSession(sendingSessionId) ?? currentChatRef.current;
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
                    selectedModel: modelForSend,
                    currentSessionId: sendingViewId,
                    chat: chatForBuild,
                })
        );

        if (!preCreatedMessage) {
            setChatForSession(sendingSessionId, prev => [...prev, userMsg]);
        }

        if (sendOptions?.targetSessionKey === undefined) {
            // Clear the composer draft for the session being sent (including
            // attachment sends that use preCreatedMessage but still typed text).
            setInputMap(prev => ({ ...prev, [sendingSessionId]: '' }));
        }
        setLoadingForSession(sendingSessionId, true);

        if (!isBackgroundSend) {
            setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, CHAT_CONFIG.SCROLL_DELAY);
        }

        if (shouldStream) {
            setStreamingForSession(sendingSessionId, true);
            if (!isBackgroundSend) {
                setAssistantResponse('');
            }
        }

        let wasError = false;
        const sendStartedAt = Date.now();
        let requestStarted = false;
        try {
            // Validation already returned above. From here, keep the user turn
            // (including image URLs) even if the model request fails, so retry
            // and replay resend the same uploads.
            requestStarted = true;
            const { accessModel, accessModelStream } = await getNoboxFunctions({ project });

            const rawMessages = orderMessagesForApi(updatedChat);
            const { messages, message: optimizationMsg } = optimizeMessagesForAPI(rawMessages);

            const sendingSession = sendingViewId
                ? chatHistory.find((s) => s.id === sendingViewId)
                : null;
            const sessionProjectId = sendingSession
                ? (sendingSession.codeProjectId ?? null)
                : getChatProjectScopeId();
            enforceOutgoingChatProjectScope(sessionProjectId);

            const requestOverrides = {
                conversationId: sendingViewId,
                sendGeneration,
                ...(clientDraftMapKey ? { clientDraftMapKey } : {}),
                ...(draftEpochAtSend !== undefined ? { draftEpoch: draftEpochAtSend } : {}),
                ...(pendingOrphanReply ? { orphanReply: pendingOrphanReply } : {}),
                ...(sendOptions?.modelOverride ? { modelOverride: sendOptions.modelOverride } : {}),
            };

            if (optimizationMsg) {
                setOptimizationMessage(optimizationMsg);
                setTimeout(() => setOptimizationMessage(''), CHAT_CONFIG.OPTIMIZATION_MESSAGE_TIMEOUT);
            }

            trackChatMessageSent({
                model: modelForSend,
                streaming: shouldStream,
                conversationId: sendingViewId,
                messageCount: messages.length,
                hasAttachments: messageHasAttachments(userMsg.content),
            });
            if (shouldStream) {
                await handleStreamingResponse(accessModelStream, messages, updatedChat, requestOverrides);
            } else {
                await handleNonStreamingResponse(accessModel, messages, updatedChat, requestOverrides);
            }
            clearPendingOrphanReply?.();
            trackChatResponseCompleted({
                model: modelForSend,
                streaming: shouldStream,
                durationMs: Date.now() - sendStartedAt,
                conversationId: sendingViewId,
            });
        } catch (err: unknown) {
            wasError = true;
            console.error('[useChatOperationsRefined] Caught error in handleSend:', err);

            const stillOwnsView = sendOwnsView();
            const isAbort = (err as { name?: string })?.name === 'AbortError'
                || (err as { message?: string })?.message === 'Request aborted';

            if (!(isAbort && !stillOwnsView)) {
                trackChatResponseFailed({
                    model: modelForSend,
                    streaming: shouldStream,
                    durationMs: Date.now() - sendStartedAt,
                    error: err,
                    conversationId: sendingViewId,
                });
            }

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
            // Only clear in-flight indicators when no newer send has started on this slot.
            const sessionsToClear = new Set<string>([sendingSessionId]);
            if (currentMaterializedIdRef.current) {
                sessionsToClear.add(currentMaterializedIdRef.current);
            }
            sessionsToClear.forEach((sid) => {
                if (sessionSendGenerationRef.current.get(sid) === sendGeneration) {
                    setLoadingForSession(sid, false);
                    setStreamingForSession(sid, false);
                }
            });

            // Optimization: Only clear the live typing bubble if the stream finished successfully.
            // If it crashed, we leave the partial text visible so the user doesn't lose context
            // and the TTS engine can finish reading the last sentence.
            if (!wasError && sendOwnsView()) {
                setTimeout(() => {
                    setAssistantResponse('');
                }, 100);
            }
        }
        return requestStarted;

        function sendOwnsView(): boolean {
            const sameDraftGeneration = draftEpochAtSend === undefined
                || draftEpochAtSend === getDraftConversationEpoch();
            return sameDraftGeneration
                && shouldApplyStreamToOpenTranscript(
                    sendingViewId,
                    activeViewSessionIdRef.current,
                    currentMaterializedIdRef.current,
                );
        }
    }, [
        selectedModel, input, project, wallet, currentSessionId, routeConversationId, viewSessionId,
        streamingEnabled, setChatForSession,
        setLoadingForSession, setStreamingForSession, setError,
        setAssistantResponse, chatEndRef,
        handleStreamingResponse, handleNonStreamingResponse, pendingOrphanReply, clearPendingOrphanReply, onInsufficientFunds,
        setWallet, validateBalance, getChatForSession,
    ]);

    const handleStop = useCallback(() => {
        const sid = resolveActiveChatMapKey(
            resolveViewSessionId(routeConversationId, currentSessionId ?? null),
        );
        const isViewingDraftOrMaterialized =
            !sid
            || isClientDraftSessionId(sid)
            || sid === DRAFT_SESSION_KEY
            || sid === currentMaterializedIdRef.current;
        abortStreamingRequest(sid);
        abortNonStreamingRequest(sid);
        setLoadingForSession(sid, false);
        setStreamingForSession(sid, false);
        if (isViewingDraftOrMaterialized && currentMaterializedIdRef.current) {
            abortStreamingRequest(currentMaterializedIdRef.current);
            abortNonStreamingRequest(currentMaterializedIdRef.current);
            setLoadingForSession(currentMaterializedIdRef.current, false);
            setStreamingForSession(currentMaterializedIdRef.current, false);
        }
        const abortIds = new Set<string>();
        if (sid && !isClientDraftSessionId(sid) && sid !== DRAFT_SESSION_KEY) {
            abortIds.add(sid);
        }
        if (isViewingDraftOrMaterialized && currentMaterializedIdRef.current) {
            abortIds.add(currentMaterializedIdRef.current);
        }
        if (setChatHistory && abortIds.size > 0) {
            setChatHistory((prev) =>
                prev.map((session) =>
                    session.id && abortIds.has(session.id) && session.metadata?.subagentRunStatus === 'running'
                        ? {
                            ...session,
                            metadata: { ...session.metadata, subagentRunStatus: 'completed' },
                        }
                        : session,
                ),
            );
        }
        abortIds.forEach((conversationId) => {
            void abortSubagentConversation(conversationId).catch(() => undefined);
        });
        setAssistantResponse('');
    }, [abortStreamingRequest, abortNonStreamingRequest, currentSessionId, routeConversationId, setChatHistory, setLoadingForSession, setStreamingForSession]);

    return {
        input,
        setInput: setInput as React.Dispatch<React.SetStateAction<string>>,
        composerSessionKey: activeKey,
        commitComposerDraftForKey,
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
        }, [setWallet]),
        canRetryLastSend: false,
        retryLastFailedSend: useCallback(async () => {}, []),
        hasDraftSession,
    };
}
