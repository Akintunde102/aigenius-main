import type { ChatMessage, Model } from '@/app/components/model-interface/shared/types';
import { buildUserMessageState } from '../sendFlow.utils';
import { optimizeMessagesForAPI } from '../messageOptimization.utils';

const mockModel: Model = {
    id: 'm1',
    name: 'Test Model',
    description: '',
    context_length: 8192,
};

describe('buildUserMessageState', () => {
    it('keeps user-visible content and puts workflow hint in apiContent only', () => {
        const chat: ChatMessage[] = [
            {
                role: 'assistant',
                content: 'Plan.',
                timestamp: 1,
                tool_executions: [
                    {
                        tool: 'workflow_agent',
                        arguments: {},
                        result: JSON.stringify({
                            success: true,
                            plan_draft_id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
                        }),
                        timestamp: 2,
                    },
                ],
            },
        ];

        const { userMsg } = buildUserMessageState({
            inputToSend: 'DO it',
            selectedModel: mockModel,
            currentSessionId: null,
            chat,
        });

        expect(userMsg.content).toBe('DO it');
        expect(userMsg.apiContent).toBeDefined();
        expect(userMsg.apiContent).toContain('Workflow plan confirmation');
        expect(userMsg.apiContent).toContain('aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee');

        const { messages } = optimizeMessagesForAPI([...chat, userMsg]);
        const lastUser = [...messages].reverse().find((m) => m.role === 'user');
        expect(lastUser?.content).toBe(userMsg.apiContent);
    });

    it('does not set apiContent when there is no workflow augmentation', () => {
        const chat: ChatMessage[] = [];
        const { userMsg } = buildUserMessageState({
            inputToSend: 'Hello world',
            selectedModel: mockModel,
            currentSessionId: null,
            chat,
        });
        expect(userMsg.content).toBe('Hello world');
        expect(userMsg.apiContent).toBeUndefined();
    });
});
