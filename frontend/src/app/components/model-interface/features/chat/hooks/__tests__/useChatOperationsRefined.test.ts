import React from 'react';
import { act } from '@testing-library/react';
import { createRoot, Root } from 'react-dom/client';
import { useChatOperationsRefined } from '../useChatOperationsRefined';
import { ChatMessage, MessageEvent, Model } from '@/app/components/model-interface/shared/types';
import {
    conversationTargetRef,
    setPendingDraftMode,
} from '@/app/components/model-interface/conversation/conversationViewSession';
import getNoboxFunctions from '@/lib/calls/get-nobox-functions';
import { useStreamingResponse } from '../useStreamingResponse';
import { useNonStreamingResponse } from '../useNonStreamingResponse';

jest.mock('@/lib/calls/get-nobox-functions', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('@/lib/calls/get-logged-user-details', () => ({
    getUserDetails: jest.fn(),
}));

jest.mock('@/lib/utils/composerDraftStorage', () => ({
    loadComposerDraftMap: jest.fn(() => ({})),
    createDebouncedDraftPersist: jest.fn(() => jest.fn()),
}));

jest.mock('../useWalletManagement', () => ({
    useWalletManagement: jest.fn(() => ({
        validateBalance: jest.fn(() => true),
        updateWalletFromResponse: jest.fn(),
    })),
}));

jest.mock('../useStreamingResponse', () => ({
    useStreamingResponse: jest.fn(),
}));

jest.mock('../useNonStreamingResponse', () => ({
    useNonStreamingResponse: jest.fn(),
}));

describe('useChatOperationsRefined', () => {
    let container: HTMLDivElement;
    let root: Root;
    let resultRef: { current: ReturnType<typeof useChatOperationsRefined> | null };

    const accessModel = jest.fn();
    const accessModelStream = jest.fn();
    const handleStreamingResponse = jest.fn();
    const handleNonStreamingResponse = jest.fn();

    const model: Model = {
        id: 'test-model',
        name: 'Test Model',
        description: 'test',
        context_length: 100000,
    };

    const assistantEvents: MessageEvent[] = [
        { type: 'text', content: 'older assistant output', order: 0 },
        {
            type: 'tool',
            tool: 'search',
            displayName: 'Search',
            arguments: { query: 'hello' },
            logs: [{ tag: 'info', message: 'done' }],
            loading: false,
            success: true,
            result: 'ok',
            timestamp: 1,
            order: 1,
        },
    ];

    const baseChat: ChatMessage[] = [
        { id: 'u1', role: 'user', content: 'previous user', timestamp: 1 },
        { id: 'a1', role: 'assistant', content: 'previous assistant', timestamp: 2, events: assistantEvents },
    ];

    const setChat = jest.fn();
    const setChatForSession = jest.fn();
    const setStreamingForSession = jest.fn();
    const setLoadingForSession = jest.fn();
    const setError = jest.fn();
    const setCurrentSessionId = jest.fn();
    const setChatHistory = jest.fn();
    const updateSessionMessages = jest.fn();
    const clearPendingOrphanReply = jest.fn();
    const chatEndRef = { current: null } as React.RefObject<HTMLDivElement>;

    function renderHookWithProps(extra: Partial<Parameters<typeof useChatOperationsRefined>[0]> = {}) {
        function Wrapper() {
            const result = useChatOperationsRefined({
                selectedModel: model,
                chat: baseChat,
                setChat,
                setChatForSession,
                streaming: false,
                setStreamingForSession,
                setLoadingForSession,
                setError,
                streamingEnabled: true,
                chatEndRef,
                refreshChatHistory: undefined,
                currentSessionId: 'session-1',
                setCurrentSessionId,
                setChatHistory,
                updateSessionMessages,
                selectedPersonalityName: undefined,
                selectedPersonalityIconUrl: undefined,
                clearPendingOrphanReply,
                ...extra,
                getChatForSession:
                    extra.getChatForSession
                    ?? ((sessionKey) => (sessionKey === 'session-1' ? baseChat : [])),
            });
            resultRef.current = result;
            return null;
        }

        root = createRoot(container);
        act(() => {
            root.render(React.createElement(Wrapper));
        });
    }

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        resultRef = { current: null };
        conversationTargetRef.current = {
            pendingDraft: false,
            activeRouteConversationId: null,
            routeTargetInitialized: false,
        };

        jest.clearAllMocks();
        (getNoboxFunctions as jest.Mock).mockResolvedValue({ accessModel, accessModelStream });
        (useStreamingResponse as jest.Mock).mockReturnValue({
            handleStreamingResponse,
            abortRequest: jest.fn(),
        });
        (useNonStreamingResponse as jest.Mock).mockReturnValue({
            handleNonStreamingResponse,
            abortRequest: jest.fn(),
        });
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    it('passes the full ui chat base (with previous events) into streaming handler', async () => {
        renderHookWithProps({ streamingEnabled: true });

        await act(async () => {
            await resultRef.current!.handleSend('new prompt', true);
        });

        expect(handleStreamingResponse).toHaveBeenCalledTimes(1);
        const uiChatBase = handleStreamingResponse.mock.calls[0][2] as ChatMessage[];
        expect(uiChatBase[1].events).toEqual(assistantEvents);
    });

    it('passes the full ui chat base (with previous events) into non-streaming handler', async () => {
        renderHookWithProps({ streamingEnabled: false });

        await act(async () => {
            await resultRef.current!.handleSend('new prompt', false);
        });

        expect(handleNonStreamingResponse).toHaveBeenCalledTimes(1);
        const uiChatBase = handleNonStreamingResponse.mock.calls[0][2] as ChatMessage[];
        expect(uiChatBase[1].events).toEqual(assistantEvents);
    });

    it('passes orphan side-thread request overrides into the response handler and clears them after success', async () => {
        renderHookWithProps({
            streamingEnabled: true,
            pendingOrphanReply: {
                conversationKind: 'orphan_question',
                parentConversationId: 'parent-conv-1',
                parentMessageId: 'parent-msg-1',
                anchor: {
                    surface: 'chat_transcript',
                    anchorZone: 'chat_area',
                    tapClientX: 0,
                    tapClientY: 0,
                    rowRelativeX: 0,
                    rowRelativeY: 0,
                    parentMessageTimestamp: 2,
                    messageExcerpt: 'previous assistant',
                    createdFromRole: 'assistant',
                },
            },
        });

        await act(async () => {
            await resultRef.current!.handleSend('follow-up', true);
        });

        expect(handleStreamingResponse).toHaveBeenCalledTimes(1);
        expect(handleStreamingResponse.mock.calls[0][3]).toEqual({
            conversationId: 'session-1',
            orphanReply: expect.objectContaining({
                conversationKind: 'orphan_question',
                parentConversationId: 'parent-conv-1',
                parentMessageId: 'parent-msg-1',
            }),
        });
        expect(clearPendingOrphanReply).toHaveBeenCalledTimes(1);
    });

    it('freezes a brand-new draft send as conversationId null for streaming', async () => {
        renderHookWithProps({ currentSessionId: null, streamingEnabled: true });

        await act(async () => {
            await resultRef.current!.handleSend('new draft prompt', true);
        });

        expect(handleStreamingResponse).toHaveBeenCalledTimes(1);
        expect(handleStreamingResponse.mock.calls[0][3]).toEqual({
            conversationId: null,
        });
    });

    it('freezes a brand-new draft send as conversationId null for non-streaming', async () => {
        renderHookWithProps({ currentSessionId: null, streamingEnabled: false });

        await act(async () => {
            await resultRef.current!.handleSend('new draft prompt', false);
        });

        expect(handleNonStreamingResponse).toHaveBeenCalledTimes(1);
        expect(handleNonStreamingResponse.mock.calls[0][3]).toEqual({
            conversationId: null,
        });
    });

    it('treats pending draft mode as a new conversation even with a stale session id', async () => {
        setPendingDraftMode(true);
        renderHookWithProps({
            currentSessionId: 'session-1',
            routeConversationId: null,
            streamingEnabled: true,
        });

        await act(async () => {
            await resultRef.current!.handleSend('new draft prompt', true);
        });

        expect(handleStreamingResponse).toHaveBeenCalledTimes(1);
        expect(handleStreamingResponse.mock.calls[0][3]).toEqual({
            conversationId: null,
        });
    });

    it('keeps separate composer drafts per conversation', () => {
        const sessionProps = {
            currentSessionId: 'session-a' as string | null,
            routeConversationId: 'session-a' as string | null,
        };

        function Wrapper() {
            const result = useChatOperationsRefined({
                selectedModel: model,
                chat: baseChat,
                setChat,
                setChatForSession,
                streaming: false,
                setStreamingForSession,
                setLoadingForSession,
                setError,
                streamingEnabled: true,
                chatEndRef,
                refreshChatHistory: undefined,
                currentSessionId: sessionProps.currentSessionId,
                routeConversationId: sessionProps.routeConversationId,
                setCurrentSessionId,
                setChatHistory,
                updateSessionMessages,
                selectedPersonalityName: undefined,
                selectedPersonalityIconUrl: undefined,
                clearPendingOrphanReply,
                getChatForSession: (sessionKey) =>
                    sessionKey === sessionProps.currentSessionId ? baseChat : [],
            });
            resultRef.current = result;
            return null;
        }

        root = createRoot(container);
        act(() => {
            root.render(React.createElement(Wrapper));
        });

        act(() => {
            resultRef.current!.setInput('draft for a');
        });

        sessionProps.currentSessionId = 'session-b';
        sessionProps.routeConversationId = 'session-b';
        act(() => {
            root.render(React.createElement(Wrapper));
        });
        expect(resultRef.current!.input).toBe('');

        act(() => {
            resultRef.current!.setInput('draft for b');
        });

        sessionProps.currentSessionId = 'session-a';
        sessionProps.routeConversationId = 'session-a';
        act(() => {
            root.render(React.createElement(Wrapper));
        });
        expect(resultRef.current!.input).toBe('draft for a');
    });

    it('keeps orphan side-thread state when the send fails', async () => {
        handleStreamingResponse.mockRejectedValueOnce(new Error('boom'));
        renderHookWithProps({
            streamingEnabled: true,
            pendingOrphanReply: {
                conversationKind: 'orphan_question',
                parentConversationId: 'parent-conv-1',
                parentMessageId: 'parent-msg-1',
                anchor: {
                    surface: 'chat_transcript',
                    anchorZone: 'chat_area',
                    tapClientX: 0,
                    tapClientY: 0,
                    rowRelativeX: 0,
                    rowRelativeY: 0,
                },
            },
        });

        await act(async () => {
            await resultRef.current!.handleSend('follow-up', true);
        });

        expect(clearPendingOrphanReply).not.toHaveBeenCalled();
    });
});
