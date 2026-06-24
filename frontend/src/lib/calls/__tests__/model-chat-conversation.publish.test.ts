import { publishConversation } from '../model-chat-conversation';

const serverCall = jest.fn();

jest.mock('@/servercall/init', () => ({
    serverCall: (...args: any[]) => serverCall(...args),
}));

jest.mock('@/servercall/store', () => ({
    serverCalls: {
        postGatewayModelChatsPublishConversation: {
            name: 'postGatewayModelChatsPublishConversation',
        },
    },
}));

describe('publishConversation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        serverCall.mockResolvedValue({ dataReturned: 'pub-123' });
    });

    it('sends the current session snapshot so publish can persist the latest frontend-visible conversation', async () => {
        const session = {
            id: 'conv-1',
            title: 'Greeting and Assistance',
            modelId: 'gpt-4',
            messages: [
                { role: 'user' as const, content: 'Hello', timestamp: 1 },
                { role: 'assistant' as const, content: 'Hi there', timestamp: 2 },
            ],
            starred: false,
        };

        const result = await publishConversation('conv-1', 'Greeting and Assistance', 'desc', session);

        expect(serverCall).toHaveBeenCalledWith(
            expect.objectContaining({
                serverCallProps: expect.objectContaining({
                    call: expect.objectContaining({ name: 'postGatewayModelChatsPublishConversation' }),
                    data: {
                        conversationId: 'conv-1',
                        title: 'Greeting and Assistance',
                        description: 'desc',
                        session,
                    },
                }),
                authorized: true,
            }),
        );
        expect(result).toBe('pub-123');
    });
});
