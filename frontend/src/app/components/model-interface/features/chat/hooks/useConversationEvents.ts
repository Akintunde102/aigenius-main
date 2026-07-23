import { authorizedFetch, getAccessToken, subscribeToTokenRefresh } from '@/lib/api/auth-client';
import { startTransition, useEffect, useRef } from 'react';
import { LINKS } from '@/lib/links';
import { addOrMergeSessionToLocalHistory, upsertChatHistorySession } from '@/lib/utils/modelChatConversationUtils';
import { normalizeSessionMessages } from '@/lib/utils/messageContentUtils';
import { ChatSession } from '@/app/components/model-interface/shared/types';

const CONVERSATION_EVENTS_PATH = '/gateway/*/model-chats/conversation-events';

type SetChatHistory = React.Dispatch<React.SetStateAction<ChatSession[]>>;

/**
 * Runs the SSE subscription (used by useConversationEvents; exported for tests).
 */
export async function runConversationEventsSubscription(
    url: string,
    getToken: () => string | undefined,
    setChatHistoryRef: { current: SetChatHistory | undefined },
    signal: AbortSignal
): Promise<void> {
    const jwtToken = getToken();
    if (!jwtToken) return;

    const res = await authorizedFetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${jwtToken}` },
        signal,
    });
    if (!res.ok || !res.body) return;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    let eventType = '';
    let dataBuffer = '';
    let expectingDataContinuation = false;

    const processEvent = (dataJson: string) => {
        if (eventType !== 'conversation_created' && eventType !== 'conversation_updated') return;
        try {
            const data = JSON.parse(dataJson);
            const sessionForList: ChatSession = {
                id: data.conversationId ?? data.id,
                title: data.title ?? 'New chat',
                messages: data.messages ?? [],
                modelId: data.modelId,
                codeProjectId: data.codeProjectId ?? null,
                metadata: data.metadata,
                personalityId: data.personalityId,
                systemPrompt: data.systemPrompt,
                starred: data.starred,
                isPublished: data.isPublished,
                publishedAt: data.publishedAt,
                publishedTitle: data.publishedTitle,
                publishedDescription: data.publishedDescription,
            };
            const normalized = normalizeSessionMessages(sessionForList);

            const updater = setChatHistoryRef.current;
            if (updater) {
                startTransition(() => {
                    updater((prev) =>
                        upsertChatHistorySession(prev, normalized as ChatSession),
                    );
                });
            }

            void addOrMergeSessionToLocalHistory(
                {
                    id: sessionForList.id,
                    codeProjectId: sessionForList.codeProjectId,
                    session: {
                        title: sessionForList.title,
                        modelId: sessionForList.modelId,
                        messages: sessionForList.messages,
                        metadata: sessionForList.metadata,
                        personalityId: sessionForList.personalityId,
                        systemPrompt: sessionForList.systemPrompt,
                    },
                    starred: data.starred,
                    isPublished: data.isPublished,
                    publishedAt: data.publishedAt,
                    publishedTitle: data.publishedTitle,
                    publishedDescription: data.publishedDescription,
                },
                sessionForList.title
            );

            const actionLabel = eventType === 'conversation_created' ? 'Saved' : 'Updated';
            console.log(`[Conversation] ${actionLabel}: ${sessionForList.title}`);
        } catch (_) {
            // ignore parse errors
        }
        eventType = '';
    };

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
            if (line.startsWith('event: ')) {
                eventType = line.slice(7).trim();
                dataBuffer = '';
                expectingDataContinuation = false;
            } else if (line.startsWith('data: ')) {
                dataBuffer = line.slice(6);
                if (dataBuffer) {
                    processEvent(dataBuffer);
                } else {
                    expectingDataContinuation = true;
                }
            } else if (expectingDataContinuation && line.trim().startsWith('{')) {
                dataBuffer = line.trim();
                expectingDataContinuation = false;
                processEvent(dataBuffer);
            }
        }
    }
}

/**
 * Subscribe to SSE conversation_created / conversation_updated events from the backend.
 * Updates IndexedDB and sidebar (setChatHistory) on each event — do not overwrite the open chat messages (§2.6).
 */
const SSE_MAX_RECONNECT_ATTEMPTS = 8;

export function useConversationEvents(setChatHistory?: SetChatHistory): void {
    const setChatHistoryRef = useRef(setChatHistory);
    setChatHistoryRef.current = setChatHistory;

    useEffect(() => {
        if (!setChatHistory) return;

        const url = `${LINKS.noboxAPIRootUrl}${CONVERSATION_EVENTS_PATH}`;
        let controller = new AbortController();
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let reconnectAttempt = 0;
        let disposed = false;

        const clearReconnectTimer = () => {
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
        };

        const scheduleReconnect = () => {
            if (disposed || controller.signal.aborted) return;
            if (reconnectAttempt >= SSE_MAX_RECONNECT_ATTEMPTS) {
                console.warn('Conversation events SSE: max reconnect attempts reached');
                return;
            }

            const delay = Math.min(1000 * 2 ** reconnectAttempt, 30_000);
            reconnectAttempt += 1;
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                void start();
            }, delay);
        };

        const start = async () => {
            if (disposed) return;

            try {
                await runConversationEventsSubscription(
                    url,
                    () => getAccessToken(),
                    setChatHistoryRef,
                    controller.signal,
                );
                reconnectAttempt = 0;
                if (!disposed && !controller.signal.aborted) {
                    scheduleReconnect();
                }
            } catch (err: any) {
                if (err?.name === 'AbortError') return;
                console.warn('Conversation events SSE error', err);
                scheduleReconnect();
            }
        };

        void start();

        const unsubscribe = subscribeToTokenRefresh(() => {
            clearReconnectTimer();
            reconnectAttempt = 0;
            controller.abort();
            controller = new AbortController();
            void start();
        });

        // Cleanup: abort the SSE so the request shows as "canceled" in DevTools.
        // In React 18 Strict Mode (dev) this runs on the first unmount, so you may see one canceled + one active request.
        return () => {
            disposed = true;
            clearReconnectTimer();
            unsubscribe();
            controller.abort();
        };
    }, [setChatHistory]);
}
