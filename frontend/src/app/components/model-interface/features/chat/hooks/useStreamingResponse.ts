import { useCallback, useRef } from 'react';
import { ChatMessage, MessageEvent, TextEvent, ToolEvent } from '@/app/components/model-interface/shared/types';
import { OpenRouterMessage, ToolStreamEvent } from '@/nobox-client/functions/access-model';
import {
    UseStreamingResponseProps,
    ProcessedContent,
    ChatCompletionRequestOverrides,
} from './chatOperations.types';
import { CHAT_CONFIG, DRAFT_SESSION_KEY, ERROR_MESSAGES } from './chatOperations.constants';
import {
    contentToDisplayText,
    mergeContentBlocks,
    createChatMessage,
    updateLastAssistantMessage,
    generateMessageId,
} from './contentProcessing.utils';
import { addOrMergeSessionToLocalHistory } from '@/lib/utils/modelChatConversationUtils';
import { shouldApplyStreamToOpenTranscript } from '@/app/components/model-interface/conversation/streamTranscriptGuard';
import { resolveRequestConversationId } from './requestConversationId.utils';
import { deriveChatSessionTitle } from '@/lib/utils/messageTextUtils';

/**
 * SSE/streaming assistant path: merges chunks, updates the open transcript, aborts per session.
 * Pair with {@link useNonStreamingResponse} for non-streaming models; shared helpers live in
 * `contentProcessing.utils.ts` and `streamTranscriptGuard.ts`.
 */
export function useStreamingResponse({
    selectedModel,
    setChatForSession,
    setStreamingForSession,
    setLoadingForSession,
    setAssistantResponse,
    currentSessionId,
    activeViewSessionId,
    updateSessionMessages,
    handleStreamResult,
    handleSendError,
    onPrefetchConversationRoute,
    selectedPersonalityName,
    selectedPersonalityIconUrl
}: UseStreamingResponseProps) {
    const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

    // Track the latest open session for the setAssistantResponse guard (visual streaming text).
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

    const handleStreamingData = useCallback((
        content: string | any[],
        accumulatedContent: ProcessedContent,
        streamingSessionId: string | null,
        streamPromotedConversationId: string | null,
        setAssistantResponse: React.Dispatch<React.SetStateAction<string>>
    ): ProcessedContent => {
        const mergedContent = mergeContentBlocks(accumulatedContent, content);

        // setAssistantResponse is visual-only (live typing animation) — only update
        // when the stream still owns the open view.
        if (shouldApplyStreamToOpenTranscript(
            streamingSessionId,
            activeViewSessionIdRef.current,
            streamPromotedConversationId,
        )) {
            const responseText = contentToDisplayText(mergedContent);
            setAssistantResponse(responseText);
        }

        return mergedContent;
    }, []);

    const createInitialStreamingMessage = useCallback((
        processedContent: ProcessedContent,
        chatMapKey: string,
        setLoadingForSession: (sid: string, val: boolean) => void,
        /** When set (e.g. replay), React state may not have committed yet — use this instead of `prev`. */
        uiChatBase?: ChatMessage[],
        messageId?: string,
        timestamp?: number,
    ): ChatMessage => {
        const streamingMsg = createChatMessage(
            'assistant',
            processedContent,
            selectedModel.id,
            selectedModel.name || selectedModel.id,
            undefined,
            undefined,
            undefined,
            selectedPersonalityName,
            selectedPersonalityIconUrl,
            undefined,
            undefined,
            messageId,
            timestamp
        );

        // Always write to the stream's own session slot — no guard needed.
        if (uiChatBase) {
            setChatForSession(chatMapKey, [...uiChatBase, streamingMsg]);
        } else {
            setChatForSession(chatMapKey, prev => [...prev, streamingMsg]);
        }
        setLoadingForSession(chatMapKey, false);

        return streamingMsg;
    }, [selectedModel, selectedPersonalityName, selectedPersonalityIconUrl, setChatForSession]);

    const updateStreamingMessage = useCallback((
        processedContent: ProcessedContent,
        chatMapKey: string
    ): void => {
        // Write directly to the stream's session slot — always correct regardless of active view.
        setChatForSession(chatMapKey, prev => updateLastAssistantMessage(prev, processedContent));
    }, [setChatForSession]);

    const processStreamingContent = useCallback((content: any): ProcessedContent => {
        if (Array.isArray(content)) {
            return content.map((block: any) => ({
                type: block.type,
                text: block.text,
                image_url: block.image_url,
                imageText: block.imageText,
                input_audio: block.input_audio
            }));
        }
        return content;
    }, []);

    const handleStreamingResponse = useCallback(async (
        accessModelStream: any,
        messages: OpenRouterMessage[],
        /** When the send used an explicit transcript (replay), state may lag behind — keep UI in sync. */
        uiChatBase?: ChatMessage[],
        requestOverrides?: ChatCompletionRequestOverrides,
    ): Promise<void> => {
        if (!selectedModel) return;

        // null for new chats — used for guard comparisons and API conversationId.
        const streamingSessionId = resolveRequestConversationId(requestOverrides, currentSessionId);
        // Always a string — used as the chatMap slot key.
        const chatMapKey = streamingSessionId ?? DRAFT_SESSION_KEY;

        const existingController = abortControllersRef.current.get(chatMapKey);
        if (existingController) {
            existingController.abort();
            abortControllersRef.current.delete(chatMapKey);
        }

        const abortController = new AbortController();
        abortControllersRef.current.set(chatMapKey, abortController);

        const assistantMessageId = generateMessageId();
        const assistantTimestamp = Date.now();

        let accumulatedContent: ProcessedContent = '';
        let accumulatedReasoning = '';
        let accumulatedReasoningDetails: any[] = [];
        let isFirstChunk = true;
        let streamPromotedConversationId: string | null = null;

        // Ordered event log for the current assistant turn.
        // Mutated in place during streaming; copied into the message object on each update.
        const events: MessageEvent[] = [];

        // Local message tracker for IndexedDB persistence (independent of active view).
        let sessionMessages: ChatMessage[] = uiChatBase
            ? [...uiChatBase]
            : messages.map(m => ({
                role: m.role as any,
                content: m.content as any,
                messageId: m.messageId,
                modelId: m.modelId,
                modelName: m.modelName,
                timestamp: m.timestamp ?? Date.now()
            }));

        let lastUiUpdateTime = 0;
        const flushUiUpdate = (force = false) => {
            const now = Date.now();
            if (force || now - lastUiUpdateTime > 80) {
                setChatForSession(chatMapKey, sessionMessages);
                if (streamPromotedConversationId) {
                    setChatForSession(streamPromotedConversationId, sessionMessages);
                }
                if (chatMapKey !== DRAFT_SESSION_KEY && updateSessionMessages) {
                    updateSessionMessages(chatMapKey, sessionMessages, {
                        modelId: selectedModel.id,
                        title: deriveChatSessionTitle(sessionMessages[0]?.content),
                    });
                }
                lastUiUpdateTime = now;
            }
        };

        /** Patch events onto the last assistant message without clobbering other fields. */
        const patchEventsOnLastMessage = () => {
            const li = sessionMessages.length - 1;
            if (li >= 0 && sessionMessages[li].role === 'assistant') {
                sessionMessages = [
                    ...sessionMessages.slice(0, li),
                    { ...sessionMessages[li], events: [...events] },
                ];
                flushUiUpdate();
            }
        };

        const timeoutId = setTimeout(() => {
            console.warn('Streaming request timed out, aborting...');
            abortController.abort();
        }, CHAT_CONFIG.STREAMING_TIMEOUT);

        try {
            const streamResult = await accessModelStream({
                body: {
                    messages,
                    ...(streamingSessionId ? { conversationId: streamingSessionId } : {}),
                    ...(requestOverrides?.orphanReply ?? {}),
                    assistantMessageId,
                    assistantTimestamp,
                },
                options: { model: selectedModel.id },
                signal: abortController.signal,
                onConversationId: (conversationId: string) => {
                    if (streamingSessionId !== null) {
                        return;
                    }
                    streamPromotedConversationId = conversationId;
                    onPrefetchConversationRoute?.(conversationId);
                },
                onToolStreamEvent: (event: ToolStreamEvent) => {
                    const lastIdx = sessionMessages.length - 1;
                    const hasAssistantRow = lastIdx >= 0 && sessionMessages[lastIdx].role === 'assistant';

                    // If no assistant row yet (tool fired before any text), create one eagerly.
                    // Only 'start' needs a new row; 'log'/'end' with no row are safe no-ops.
                    if (!hasAssistantRow) {
                        if (event.type !== 'start') return;
                        const toolMsg = createChatMessage(
                            'assistant',
                            '',
                            selectedModel.id,
                            selectedModel.name || selectedModel.id,
                            undefined,
                            undefined,
                            undefined,
                            selectedPersonalityName,
                            selectedPersonalityIconUrl,
                            undefined,
                            undefined,
                            assistantMessageId,
                            assistantTimestamp
                        );
                        events.push({
                            type: 'tool',
                            tool: event.tool,
                            displayName: event.displayName,
                            arguments: event.arguments ?? {},
                            logs: [],
                            loading: true,
                            timestamp: Date.now(),
                        } satisfies ToolEvent);
                        toolMsg.events = [...events];
                        sessionMessages = [...sessionMessages, toolMsg];
                        isFirstChunk = false;
                        setLoadingForSession(chatMapKey, false);
                        flushUiUpdate(true);
                        return;
                    }

                    if (event.type === 'start') {
                        events.push({
                            type: 'tool',
                            tool: event.tool,
                            displayName: event.displayName,
                            arguments: event.arguments ?? {},
                            logs: [],
                            loading: true,
                            timestamp: Date.now(),
                        } satisfies ToolEvent);
                    } else if (event.type === 'log') {
                        // Append log to the last loading tool event. Merge consecutive chunks with the
                        // same tag (e.g. streaming local_shell stdout) so the timeline stays readable.
                        for (let i = events.length - 1; i >= 0; i--) {
                            if (events[i].type === 'tool' && (events[i] as ToolEvent).loading) {
                                const te = events[i] as ToolEvent;
                                const last = te.logs.length > 0 ? te.logs[te.logs.length - 1] : null;
                                if (last && last.tag === event.tag) {
                                    last.message = `${String(last.message)}${event.message}`;
                                } else {
                                    te.logs.push({ tag: event.tag, message: event.message });
                                }
                                break;
                            }
                        }
                    } else if (event.type === 'client_delegate') {
                        for (let i = events.length - 1; i >= 0; i--) {
                            if (events[i].type === 'tool' && (events[i] as ToolEvent).loading) {
                                (events[i] as ToolEvent).logs.push({
                                    tag: 'delegate',
                                    message: 'Running on your device…',
                                });
                                break;
                            }
                        }
                    } else if (event.type === 'end') {
                        // Complete the last loading tool event.
                        for (let i = events.length - 1; i >= 0; i--) {
                            if (events[i].type === 'tool' && (events[i] as ToolEvent).loading) {
                                const te = events[i] as ToolEvent;
                                te.loading = false;
                                te.success = event.success;
                                if (event.result !== undefined) te.result = event.result;
                                break;
                            }
                        }
                    }

                    patchEventsOnLastMessage();
                },
                onData: (content: string | any[], reasoning?: string, reasoningDetails?: any[]) => {
                    const processedContent = processStreamingContent(content);
                    accumulatedContent = handleStreamingData(
                        processedContent,
                        accumulatedContent,
                        streamingSessionId,
                        streamPromotedConversationId,
                        setAssistantResponse
                    );

                    // Track this text chunk in the ordered event log.
                    const textStr = typeof processedContent === 'string'
                        ? processedContent
                        : contentToDisplayText(processedContent as any);
                    if (textStr) {
                        const lastEvt = events.length > 0 ? events[events.length - 1] : null;
                        if (lastEvt?.type === 'text') {
                            (lastEvt as TextEvent).content += textStr;
                        } else {
                            events.push({ type: 'text', content: textStr } satisfies TextEvent);
                        }
                    }

                    if (reasoning) {
                        accumulatedReasoning = (accumulatedReasoning || '') + reasoning;
                    }
                    if (reasoningDetails?.length) {
                        const prevText = accumulatedReasoningDetails?.[0]?.text ?? '';
                        const newText = reasoningDetails[0]?.text ?? '';
                        accumulatedReasoningDetails = [{ ...reasoningDetails[0], text: prevText + newText }];
                    }

                    if (isFirstChunk) {
                        isFirstChunk = false;
                        const initialMsg = createInitialStreamingMessage(
                            accumulatedContent,
                            chatMapKey,
                            setLoadingForSession,
                            uiChatBase,
                            assistantMessageId,
                            assistantTimestamp
                        );
                        // Attach events on creation (createInitialStreamingMessage already called
                        // setChatForSession, so we patch and re-set in one shot).
                        initialMsg.events = [...events];
                        sessionMessages = [...sessionMessages, initialMsg];
                        flushUiUpdate(true);
                    } else {
                        sessionMessages = updateLastAssistantMessage(sessionMessages, accumulatedContent);
                        // Patch events alongside the content update.
                        patchEventsOnLastMessage();
                    }

                    if (reasoning || reasoningDetails?.length) {
                        const updated = [...sessionMessages];
                        const lastIdx = updated.length - 1;
                        if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                            updated[lastIdx] = {
                                ...updated[lastIdx],
                                reasoning: accumulatedReasoning,
                                reasoning_details: accumulatedReasoningDetails,
                            };
                        }
                        sessionMessages = updated;
                        flushUiUpdate();
                    }
                },
            });

            // Force a final flush so nothing is missed.
            flushUiUpdate(true);

            const result = streamResult ?? {};

            if (result.endedWithStreamError) {
                throw new Error(ERROR_MESSAGES.GENERIC_CHAT_ERROR);
            }

            // If this started as a draft chat and the backend assigned a real id,
            // always materialize it under that id so background completions are visible.
            const resolvedConversationId =
                result.conversationId ?? streamPromotedConversationId ?? null;
            if (streamingSessionId === null && resolvedConversationId) {
                setChatForSession(resolvedConversationId, sessionMessages);
                if (updateSessionMessages) {
                    updateSessionMessages(resolvedConversationId, sessionMessages, {
                        modelId: selectedModel.id,
                        title: deriveChatSessionTitle(sessionMessages[0]?.content),
                    });
                }
                void addOrMergeSessionToLocalHistory({
                    id: resolvedConversationId,
                    session: { messages: sessionMessages }
                });
            }

            if (streamingSessionId) {
                void addOrMergeSessionToLocalHistory({
                    id: streamingSessionId,
                    session: { messages: sessionMessages }
                });
            }

            handleStreamResult(result, streamingSessionId);
        } finally {
            clearTimeout(timeoutId);
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
        setChatForSession,
        setLoadingForSession,
        setAssistantResponse,
        handleStreamResult,
        handleStreamingData,
        createInitialStreamingMessage,
        updateStreamingMessage,
        processStreamingContent,
        onPrefetchConversationRoute,
    ]);

    return {
        handleStreamingResponse,
        abortRequest
    };
}
