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
import { resolveViewSessionId } from '@/app/components/model-interface/conversation/conversationViewSession';

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
    selectedPersonalityId,
    selectedSystemPrompt,
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
        handleStreamResult: (result, streamingSessionId) => {
            // streamingSessionId is null for new chats, string for existing sessions.
            updateWalletFromResponse(result.wallet);

            // Only touch active-view UI state if this stream still owns the open session.
            const ownsView = shouldApplyStreamToOpenTranscript(
                streamingSessionId,
                activeViewSessionIdRef.current,
            );

            const chatMapKey = streamingSessionId ?? DRAFT_SESSION_KEY;
            setStreamingForSession(chatMapKey, false);

            // Only clear the live typing text when this stream owns the visible session.
            if (ownsView) {
                setTimeout(() => {
                    setAssistantResponse('');
                }, 100);
            }

            if (ownsView && result.conversationId && setCurrentSessionId) {
                if (streamingSessionId === null) {
                    // New chat: atomically migrate draft → real slot before switching the key.
                    setChatForSession(result.conversationId, currentChatRef.current);
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
        onDraftCompleted: (realId, assistantMsg) => {
            // Atomically migrate draft → real slot and update the session pointer.
            const draftMessages = [...currentChatRef.current, assistantMsg];
            setChatForSession(realId, draftMessages);
            setChatForSession(DRAFT_SESSION_KEY, []);
            setCurrentSessionId?.(realId);
            updateSessionMessages?.(realId, draftMessages, {
                modelId: selectedModel?.id,
                title: draftMessages[0]?.content as string || 'New chat'
            });
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
    ) => {
        const shouldStream = enableStreaming !== undefined ? enableStreaming : streamingEnabled;
        const inputToSend = resolveInputToSend(content, input);
        const chatForBuild = chatSnapshot ?? chat;

        console.log('[useChatOperationsRefined] handleSend entered', { hasSelectedModel: !!selectedModel, inputLength: inputToSend.length, shouldStream });

        if (!selectedModel) {
            console.warn('[useChatOperationsRefined] No selected model');
            return;
        }
        if (!preCreatedMessage && !inputToSend.trim()) {
            console.log('[useChatOperationsRefined] Empty input, returning');
            return;
        }

        const projectValidation = validateProject(project);
        if (!projectValidation.isValid) {
            console.error('[useChatOperationsRefined] Project validation failed', projectValidation.error);
            setError(projectValidation.error!);
            return;
        }

        const requiredBalance = computeRequiredBalance(selectedModel);
        const walletValidation = validateBalance(wallet, requiredBalance, selectedModel?.name || selectedModel?.id);
        if (!walletValidation) {
            console.warn('[useChatOperationsRefined] Wallet validation failed');
            return;
        }

        setError('');

        const sendingViewId = resolveViewSessionId(routeConversationId, currentSessionId ?? null);
        const sendingSessionId = sendingViewId ?? DRAFT_SESSION_KEY;

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

        setInput('');
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

            let rawMessages = orderMessagesForApi(updatedChat);
            if (selectedSystemPrompt) {
                const hasSystem = rawMessages.some(m => m.role === 'system');
                if (!hasSystem) {
                    rawMessages = [
                        {
                            role: 'system',
                            content: selectedSystemPrompt,
                            id: `system_${Date.now()}`,
                            personaName: selectedPersonalityName,
                            personaIconUrl: selectedPersonalityIconUrl,
                        } as any,
                        ...rawMessages
                    ];
                }
            }
            const { messages, message: optimizationMsg } = optimizeMessagesForAPI(rawMessages);
            const requestOverrides = {
                conversationId: sendingViewId,
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
            handleSendError(err, chatForBuild, streaming, setChat, setError, {
                setWallet,
                onInsufficientFunds,
            });
        } finally {
            console.log('[useChatOperationsRefined] handleSend finished', { sessionId: sendingSessionId });
            setLoadingForSession(sendingSessionId, false);
            setStreamingForSession(sendingSessionId, false);

            // Optimization: Only clear the live typing bubble if the stream finished successfully.
            // If it crashed, we leave the partial text visible so the user doesn't lose context
            // and the TTS engine can finish reading the last sentence.
            if (!wasError && shouldApplyStreamToOpenTranscript(sendingViewId, activeViewSessionIdRef.current)) {
                setTimeout(() => {
                    setAssistantResponse('');
                }, 100);
            }
        }
    }, [
        selectedModel, input, project, wallet, currentSessionId, routeConversationId,
        streamingEnabled, chat, setChat, setChatForSession, setInput,
        setLoadingForSession, setStreamingForSession, setError,
        setAssistantResponse, chatEndRef,
        handleStreamingResponse, handleNonStreamingResponse, pendingOrphanReply, clearPendingOrphanReply, onInsufficientFunds,
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
