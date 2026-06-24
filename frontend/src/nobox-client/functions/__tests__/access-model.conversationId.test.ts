/**
 * Tests for conversationId in chat completions request and response.
 */
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

jest.mock('@/lib/utils/store', () => ({
    storage: () => ({
        getString: () => 'test-jwt-token',
    }),
}));
jest.mock('@/lib/constants', () => ({
    storageConstants: { NOBOX_TOKEN: 'nobox_token' },
}));

const mockConfig = {
    endpoint: 'https://api.test',
    project: 'test-project',
    token: 'test-token',
    autoCreate: true,
    mutate: true,
};

describe('conversationId in access-model', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    describe('_accessModel (non-streaming)', () => {
        it('includes conversationId in request body when provided', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                headers: new Headers(),
                json: async () => ({ choices: [{ message: { content: 'Hi' } }] }),
            } as unknown as Response);

            const { _accessModel } = await import('../access-model');
            await _accessModel({
                body: { messages: [{ role: 'user', content: 'Hello' }], conversationId: 'conv-456' },
                options: { model: 'gpt-4' },
                config: mockConfig as any,
            });

            expect(mockFetch).toHaveBeenCalled();
            const callBody = mockFetch.mock.calls[0][1]?.body as string;
            const parsed = JSON.parse(callBody);
            expect(parsed.conversationId).toBe('conv-456');
        });

        it('omits conversationId from request when not provided', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                headers: new Headers(),
                json: async () => ({ choices: [{ message: { content: 'Hi' } }] }),
            } as unknown as Response);

            const { _accessModel } = await import('../access-model');
            await _accessModel({
                body: { messages: [{ role: 'user', content: 'Hello' }] },
                options: { model: 'gpt-4' },
                config: mockConfig as any,
            });

            const callBody = mockFetch.mock.calls[0][1]?.body as string;
            const parsed = JSON.parse(callBody);
            expect(parsed).not.toHaveProperty('conversationId');
        });

        it('omits conversationId when body.conversationId is null (new chat scenario)', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                headers: new Headers(),
                json: async () => ({ choices: [{ message: { content: 'Hi' } }] }),
            } as unknown as Response);

            const { _accessModel } = await import('../access-model');
            await _accessModel({
                body: { messages: [{ role: 'user', content: 'Hello' }], conversationId: null as any },
                options: { model: 'gpt-4' },
                config: mockConfig as any,
            });

            const callBody = mockFetch.mock.calls[0][1]?.body as string;
            const parsed = JSON.parse(callBody);
            expect(parsed).not.toHaveProperty('conversationId');
        });

        it('includes valid UUID in request when continuing existing chat', async () => {
            const uuid = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
            mockFetch.mockResolvedValue({
                ok: true,
                headers: new Headers({ 'X-Conversation-Id': uuid }),
                json: async () => ({ choices: [{ message: { content: 'Hi' } }] }),
            } as unknown as Response);

            const { _accessModel } = await import('../access-model');
            await _accessModel({
                body: { messages: [{ role: 'user', content: 'Hello' }], conversationId: uuid },
                options: { model: 'gpt-4' },
                config: mockConfig as any,
            });

            const callBody = mockFetch.mock.calls[0][1]?.body as string;
            const parsed = JSON.parse(callBody);
            expect(parsed.conversationId).toBe(uuid);
        });

        it('returns conversationId from X-Conversation-Id response header', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                headers: new Headers({ 'X-Conversation-Id': 'new-conv-789' }),
                json: async () => ({ choices: [{ message: { content: 'Hi' } }] }),
            } as unknown as Response);

            const { _accessModel } = await import('../access-model');
            const result = await _accessModel({
                body: { messages: [{ role: 'user', content: 'Hello' }] },
                options: { model: 'gpt-4' },
                config: mockConfig as any,
            });

            expect(result).not.toBeNull();
            expect((result as any)?.conversationId).toBe('new-conv-789');
        });

        it('includes orphan side-thread metadata in non-streaming request bodies', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                headers: new Headers(),
                json: async () => ({ choices: [{ message: { content: 'Hi' } }] }),
            } as unknown as Response);

            const { _accessModel } = await import('../access-model');
            await _accessModel({
                body: {
                    messages: [{ role: 'user', content: 'Hello', messageId: 'msg-user-1' }],
                    conversationKind: 'orphan_question',
                    parentConversationId: 'conv-parent-1',
                    parentMessageId: 'msg-parent-1',
                    anchor: {
                        surface: 'chat_transcript',
                        anchorZone: 'chat_area',
                        tapClientX: 0,
                        tapClientY: 0,
                        rowRelativeX: 0,
                        rowRelativeY: 0,
                        parentMessageTimestamp: 123,
                        messageExcerpt: 'Anchor excerpt',
                        createdFromRole: 'assistant',
                    },
                },
                options: { model: 'gpt-4' },
                config: mockConfig as any,
            });

            const parsed = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
            expect(parsed.messages[0].messageId).toBe('msg-user-1');
            expect(parsed.conversationKind).toBe('orphan_question');
            expect(parsed.parentConversationId).toBe('conv-parent-1');
            expect(parsed.parentMessageId).toBe('msg-parent-1');
            expect(parsed.anchor).toEqual(expect.objectContaining({
                parentMessageTimestamp: 123,
                messageExcerpt: 'Anchor excerpt',
            }));
        });
    });

    describe('accessModelStream (streaming)', () => {
        it('includes conversationId in request body when provided', async () => {
            const body = {
                getReader: () => ({
                    read: jest
                        .fn()
                        .mockResolvedValueOnce({ done: false, value: Buffer.from('data: {"choices":[{"delta":{"content":"Hi"}}]}\n', 'utf8') })
                        .mockResolvedValueOnce({ done: false, value: Buffer.from('data: [DONE]\n', 'utf8') })
                        .mockResolvedValueOnce({ done: true, value: undefined }),
                    releaseLock: jest.fn(),
                }),
            };
            mockFetch.mockResolvedValue({
                ok: true,
                headers: new Headers({ 'X-Conversation-Id': 'stream-conv-1' }),
                body,
            } as unknown as Response);

            const { accessModelStream } = await import('../access-model');
            await accessModelStream({
                body: { messages: [{ role: 'user', content: 'Hi' }], conversationId: 'stream-conv-1' },
                options: { model: 'gpt-4' },
                config: mockConfig as any,
                onData: jest.fn(),
            });

            expect(mockFetch).toHaveBeenCalled();
            const callBody = mockFetch.mock.calls[0][1]?.body as string;
            const parsed = JSON.parse(callBody);
            expect(parsed.conversationId).toBe('stream-conv-1');
        });

        it('returns conversationId from X-Conversation-Id in streaming result', async () => {
            const body = {
                getReader: () => ({
                    read: jest
                        .fn()
                        .mockResolvedValueOnce({ done: false, value: Buffer.from('data: [DONE]\n', 'utf8') })
                        .mockResolvedValueOnce({ done: true, value: undefined }),
                    releaseLock: jest.fn(),
                }),
            };
            mockFetch.mockResolvedValue({
                ok: true,
                headers: new Headers({ 'X-Conversation-Id': 'stream-conv-999' }),
                body,
            } as unknown as Response);

            const { accessModelStream } = await import('../access-model');
            const result = await accessModelStream({
                body: { messages: [{ role: 'user', content: 'Hello' }] },
                options: { model: 'gpt-4' },
                config: mockConfig as any,
                onData: jest.fn(),
            });

            expect(result.conversationId).toBe('stream-conv-999');
        });

        it('includes orphan side-thread metadata in streaming request bodies', async () => {
            const body = {
                getReader: () => ({
                    read: jest
                        .fn()
                        .mockResolvedValueOnce({ done: false, value: Buffer.from('data: [DONE]\n', 'utf8') })
                        .mockResolvedValueOnce({ done: true, value: undefined }),
                    releaseLock: jest.fn(),
                }),
            };
            mockFetch.mockResolvedValue({
                ok: true,
                headers: new Headers({ 'X-Conversation-Id': 'stream-conv-orphan-1' }),
                body,
            } as unknown as Response);

            const { accessModelStream } = await import('../access-model');
            await accessModelStream({
                body: {
                    messages: [{ role: 'user', content: 'Hello', messageId: 'msg-user-stream-1' }],
                    conversationKind: 'orphan_question',
                    parentConversationId: 'conv-parent-stream-1',
                    parentMessageId: 'msg-parent-stream-1',
                    anchor: {
                        surface: 'chat_transcript',
                        anchorZone: 'chat_area',
                        tapClientX: 0,
                        tapClientY: 0,
                        rowRelativeX: 0,
                        rowRelativeY: 0,
                        messageExcerpt: 'Stream anchor',
                    },
                },
                options: { model: 'gpt-4' },
                config: mockConfig as any,
                onData: jest.fn(),
            });

            const parsed = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
            expect(parsed.messages[0].messageId).toBe('msg-user-stream-1');
            expect(parsed.conversationKind).toBe('orphan_question');
            expect(parsed.parentConversationId).toBe('conv-parent-stream-1');
            expect(parsed.parentMessageId).toBe('msg-parent-stream-1');
            expect(parsed.anchor).toEqual(expect.objectContaining({
                messageExcerpt: 'Stream anchor',
            }));
        });

        it('omits conversationId when X-Conversation-Id header is absent', async () => {
            const body = {
                getReader: () => ({
                    read: jest
                        .fn()
                        .mockResolvedValueOnce({ done: false, value: Buffer.from('data: [DONE]\n', 'utf8') })
                        .mockResolvedValueOnce({ done: true, value: undefined }),
                    releaseLock: jest.fn(),
                }),
            };
            mockFetch.mockResolvedValue({
                ok: true,
                headers: new Headers(),
                body,
            } as unknown as Response);

            const { accessModelStream } = await import('../access-model');
            const result = await accessModelStream({
                body: { messages: [{ role: 'user', content: 'Hello' }] },
                options: { model: 'gpt-4' },
                config: mockConfig as any,
                onData: jest.fn(),
            });

            expect(result.conversationId).toBeUndefined();
        });

        it('forwards tool stream events and final usage metadata', async () => {
            const onData = jest.fn();
            const onToolStreamEvent = jest.fn();
            const body = {
                getReader: () => ({
                    read: jest
                        .fn()
                        .mockResolvedValueOnce({
                            done: false,
                            value: Buffer.from(
                                'data: {"choices":[{"delta":{"content":"Working"}}]}\n',
                                'utf8',
                            ),
                        })
                        .mockResolvedValueOnce({
                            done: false,
                            value: Buffer.from(
                                'data: {"choices":[{"delta":{"tool_stream_event":{"type":"start","tool":"gmail_send","displayName":"Send Email"}}}]}\n',
                                'utf8',
                            ),
                        })
                        .mockResolvedValueOnce({
                            done: false,
                            value: Buffer.from(
                                'data: {"choices":[{"delta":{"tool_stream_event":{"type":"log","tool":"gmail_send","tag":"args","message":"Preparing payload"}}}]}\n',
                                'utf8',
                            ),
                        })
                        .mockResolvedValueOnce({
                            done: false,
                            value: Buffer.from(
                                'data: {"usage":{"prompt_tokens":7,"completion_tokens":9,"total_tokens":16},"cost":0.00021,"wallet":999}\n',
                                'utf8',
                            ),
                        })
                        .mockResolvedValueOnce({ done: false, value: Buffer.from('data: [DONE]\n', 'utf8') })
                        .mockResolvedValueOnce({ done: true, value: undefined }),
                    releaseLock: jest.fn(),
                }),
            };

            mockFetch.mockResolvedValue({
                ok: true,
                headers: new Headers({ 'X-Conversation-Id': 'stream-conv-tool-1' }),
                body,
            } as unknown as Response);

            const { accessModelStream } = await import('../access-model');
            const result = await accessModelStream({
                body: { messages: [{ role: 'user', content: 'Hello' }] },
                options: { model: 'gpt-4' },
                config: mockConfig as any,
                onData,
                onToolStreamEvent,
            });

            expect(onData).toHaveBeenCalledWith('Working', undefined, undefined);
            expect(onToolStreamEvent).toHaveBeenNthCalledWith(1, {
                type: 'start',
                tool: 'gmail_send',
                displayName: 'Send Email',
            });
            expect(onToolStreamEvent).toHaveBeenNthCalledWith(2, {
                type: 'log',
                tool: 'gmail_send',
                tag: 'args',
                message: 'Preparing payload',
            });
            expect(result.usage).toEqual({ prompt_tokens: 7, completion_tokens: 9, total_tokens: 16 });
            expect(result.cost).toBe(0.00021);
            expect(result.wallet).toBe(999);
        });

        it('preserves newline-only streaming chunks for live markdown formatting', async () => {
            const onData = jest.fn();
            const body = {
                getReader: () => ({
                    read: jest
                        .fn()
                        .mockResolvedValueOnce({
                            done: false,
                            value: Buffer.from(
                                'data: {"choices":[{"delta":{"content":"## Heading"}}]}\n',
                                'utf8',
                            ),
                        })
                        .mockResolvedValueOnce({
                            done: false,
                            value: Buffer.from(
                                'data: {"choices":[{"delta":{"content":"\\n\\n"}}]}\n',
                                'utf8',
                            ),
                        })
                        .mockResolvedValueOnce({
                            done: false,
                            value: Buffer.from(
                                'data: {"choices":[{"delta":{"content":"Paragraph"}}]}\n',
                                'utf8',
                            ),
                        })
                        .mockResolvedValueOnce({ done: false, value: Buffer.from('data: [DONE]\n', 'utf8') })
                        .mockResolvedValueOnce({ done: true, value: undefined }),
                    releaseLock: jest.fn(),
                }),
            };

            mockFetch.mockResolvedValue({
                ok: true,
                headers: new Headers({ 'X-Conversation-Id': 'stream-conv-md-1' }),
                body,
            } as unknown as Response);

            const { accessModelStream } = await import('../access-model');
            await accessModelStream({
                body: { messages: [{ role: 'user', content: 'Teach markdown' }] },
                options: { model: 'gpt-4' },
                config: mockConfig as any,
                onData,
            });

            expect(onData).toHaveBeenNthCalledWith(1, '## Heading', undefined, undefined);
            expect(onData).toHaveBeenNthCalledWith(2, '\n\n', undefined, undefined);
            expect(onData).toHaveBeenNthCalledWith(3, 'Paragraph', undefined, undefined);
        });
    });
});
