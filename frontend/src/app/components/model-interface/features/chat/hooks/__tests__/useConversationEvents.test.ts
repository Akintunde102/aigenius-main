/**
 * Tests for conversation events SSE subscription (runConversationEventsSubscription).
 * Uses the exported runner so we can test without @testing-library/react.
 */
import { runConversationEventsSubscription } from '../useConversationEvents';
import { addOrMergeSessionToLocalHistory } from '@/lib/utils/modelChatConversationUtils';

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

jest.mock('@/lib/utils/modelChatConversationUtils', () => ({
    addOrMergeSessionToLocalHistory: jest.fn().mockResolvedValue(undefined),
    upsertChatHistorySession: jest.fn((prev: any[], session: any) => [session, ...prev.filter((s: any) => s.id !== session.id)]),
}));
jest.mock('@/lib/utils/messageContentUtils', () => ({
    normalizeSessionMessages: (x: any) => x,
}));

describe('runConversationEventsSubscription (conversation events SSE)', () => {
    const url = 'https://api.test/gateway/*/model-chats/conversation-events';
    const getToken = () => 'jwt';

    beforeEach(() => {
        mockFetch.mockReset();
        jest.clearAllMocks();
    });

    it('does not call fetch when getToken returns undefined', async () => {
        const ctrl = new AbortController();
        await runConversationEventsSubscription(url, () => undefined, { current: jest.fn() }, ctrl.signal);
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('calls fetch with correct URL and Authorization when token is provided', async () => {
        mockFetch.mockResolvedValue({ ok: false });

        await runConversationEventsSubscription(url, getToken, { current: jest.fn() }, new AbortController().signal);

        const [, options] = mockFetch.mock.calls[0];
        const headers = options.headers as Headers;
        expect(mockFetch).toHaveBeenCalledWith(
            url,
            expect.objectContaining({
                method: 'GET',
                credentials: 'include',
            })
        );
        expect(headers.get('Authorization')).toBe('Bearer jwt');
        expect(headers.get('X-Requested-With')).toBe('XMLHttpRequest');
    });

    it('uses the current user token for each new subscription', async () => {
        mockFetch.mockResolvedValue({ ok: false });

        await runConversationEventsSubscription(url, () => 'jwt-user-a', { current: jest.fn() }, new AbortController().signal);
        await runConversationEventsSubscription(url, () => 'jwt-user-b', { current: jest.fn() }, new AbortController().signal);

        const firstHeaders = mockFetch.mock.calls[0][1].headers as Headers;
        const secondHeaders = mockFetch.mock.calls[1][1].headers as Headers;
        expect(firstHeaders.get('Authorization')).toBe('Bearer jwt-user-a');
        expect(secondHeaders.get('Authorization')).toBe('Bearer jwt-user-b');
    });

    it('parses SSE event and calls addOrMergeSessionToLocalHistory and setChatHistory when stream sends conversation_created', async () => {
        const setChatHistory = jest.fn();
        const sseChunk = 'event: conversation_created\ndata: {"conversationId":"c-1","title":"My Chat","messages":[],"modelId":"m1"}\n\n';

        const body = {
            getReader: () => ({
                read: jest
                    .fn()
                    .mockResolvedValueOnce({ done: false, value: Buffer.from(sseChunk, 'utf8') })
                    .mockResolvedValueOnce({ done: true, value: undefined }),
            }),
        };

        mockFetch.mockResolvedValue({ ok: true, body } as unknown as Response);

        await runConversationEventsSubscription(url, getToken, { current: setChatHistory }, new AbortController().signal);

        expect(addOrMergeSessionToLocalHistory).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'c-1',
                session: expect.objectContaining({ title: 'My Chat', modelId: 'm1' }),
            }),
            'My Chat'
        );
        expect(setChatHistory).toHaveBeenCalled();
        const updater = setChatHistory.mock.calls[0][0];
        expect(typeof updater).toBe('function');
        const next = updater([]);
        expect(next).toHaveLength(1);
        expect(next[0].id).toBe('c-1');
        expect(next[0].title).toBe('My Chat');
    });

    it('handles conversation_updated event and upserts by id', async () => {
        const setChatHistory = jest.fn();
        const sseChunk = 'event: conversation_updated\ndata: {"conversationId":"c-2","title":"Updated"}\n\n';

        const body = {
            getReader: () => ({
                read: jest
                    .fn()
                    .mockResolvedValueOnce({ done: false, value: Buffer.from(sseChunk, 'utf8') })
                    .mockResolvedValueOnce({ done: true, value: undefined }),
            }),
        };

        mockFetch.mockResolvedValue({ ok: true, body } as unknown as Response);

        await runConversationEventsSubscription(url, getToken, { current: setChatHistory }, new AbortController().signal);

        expect(setChatHistory).toHaveBeenCalled();
        const updater = setChatHistory.mock.calls[0][0];
        const prev = [{ id: 'other', title: 'Other' }];
        const next = updater(prev);
        expect(next).toHaveLength(2);
        expect(next[0].id).toBe('c-2');
        expect(next[0].title).toBe('Updated');
        expect(next[1].id).toBe('other');
    });

    it('ignores malformed data line (invalid JSON) without throwing', async () => {
        const setChatHistory = jest.fn();
        const sseChunk = 'event: conversation_created\ndata: not-valid-json\n\n';

        const body = {
            getReader: () => ({
                read: jest
                    .fn()
                    .mockResolvedValueOnce({ done: false, value: Buffer.from(sseChunk, 'utf8') })
                    .mockResolvedValueOnce({ done: true, value: undefined }),
            }),
        };

        mockFetch.mockResolvedValue({ ok: true, body } as unknown as Response);

        await runConversationEventsSubscription(url, getToken, { current: setChatHistory }, new AbortController().signal);

        expect(addOrMergeSessionToLocalHistory).not.toHaveBeenCalled();
        expect(setChatHistory).not.toHaveBeenCalled();
    });

    it('handles chunked SSE data when data line is split across reads', async () => {
        const setChatHistory = jest.fn();
        const body = {
            getReader: () => ({
                read: jest
                    .fn()
                    .mockResolvedValueOnce({ done: false, value: Buffer.from('event: conversation_created\ndata: ', 'utf8') })
                    .mockResolvedValueOnce({ done: false, value: Buffer.from('{"conversationId":"c-chunked","title":"Chunked Chat"}\n\n', 'utf8') })
                    .mockResolvedValueOnce({ done: true, value: undefined }),
            }),
        };

        mockFetch.mockResolvedValue({ ok: true, body } as unknown as Response);

        await runConversationEventsSubscription(url, getToken, { current: setChatHistory }, new AbortController().signal);

        expect(setChatHistory).toHaveBeenCalled();
        const updater = setChatHistory.mock.calls[0][0];
        const next = updater([]);
        expect(next).toHaveLength(1);
        expect(next[0].id).toBe('c-chunked');
        expect(next[0].title).toBe('Chunked Chat');
    });

    it('ignores unknown event types (only conversation_created/updated trigger update)', async () => {
        const setChatHistory = jest.fn();
        const sseChunk = 'event: ping\ndata: {"id":"x"}\n\n';

        const body = {
            getReader: () => ({
                read: jest
                    .fn()
                    .mockResolvedValueOnce({ done: false, value: Buffer.from(sseChunk, 'utf8') })
                    .mockResolvedValueOnce({ done: true, value: undefined }),
            }),
        };

        mockFetch.mockResolvedValue({ ok: true, body } as unknown as Response);

        await runConversationEventsSubscription(url, getToken, { current: setChatHistory }, new AbortController().signal);

        expect(setChatHistory).not.toHaveBeenCalled();
    });

    it('does not call setChatHistory when ref.current is undefined (e.g. unmounted)', async () => {
        const ref = { current: undefined as any };
        const sseChunk = 'event: conversation_created\ndata: {"conversationId":"c-1","title":"T"}\n\n';

        const body = {
            getReader: () => ({
                read: jest
                    .fn()
                    .mockResolvedValueOnce({ done: false, value: Buffer.from(sseChunk, 'utf8') })
                    .mockResolvedValueOnce({ done: true, value: undefined }),
            }),
        };

        mockFetch.mockResolvedValue({ ok: true, body } as unknown as Response);

        await runConversationEventsSubscription(url, getToken, ref, new AbortController().signal);

        expect(addOrMergeSessionToLocalHistory).toHaveBeenCalled();
        expect(ref.current).toBeUndefined();
    });

    it('does not process when response is not ok', async () => {
        mockFetch.mockResolvedValue({ ok: false });

        await runConversationEventsSubscription(url, getToken, { current: jest.fn() }, new AbortController().signal);

        expect(addOrMergeSessionToLocalHistory).not.toHaveBeenCalled();
    });

    it('does not process when response body is missing', async () => {
        mockFetch.mockResolvedValue({ ok: true, body: undefined });

        await runConversationEventsSubscription(url, getToken, { current: jest.fn() }, new AbortController().signal);

        expect(addOrMergeSessionToLocalHistory).not.toHaveBeenCalled();
    });
});
