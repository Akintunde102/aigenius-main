import React from 'react';
import { act, render } from '@testing-library/react';
import { MessageHandlers } from '../MessageHandlers';
import { ChatMessage } from '@/app/components/model-interface/shared/types';
import copy from 'copy-to-clipboard';
import { scheduleNextTick } from '@/app/components/model-interface/ModelInterface.helpers';

// Mock dependencies
jest.mock('copy-to-clipboard', () => jest.fn());
jest.mock('@/app/components/model-interface/ModelInterface.helpers', () => ({
    scheduleNextTick: jest.fn((fn) => fn()),
}));

const mockChat: ChatMessage[] = [
    { id: '1', role: 'user', content: 'hello', timestamp: Date.now() },
    { id: '2', role: 'assistant', content: 'hi', timestamp: Date.now() },
];

describe('MessageHandlers', () => {
    const setChat = jest.fn();
    const handleSend = jest.fn();
    const updateSessionMessages = jest.fn();
    const persistSessionMessages = jest.fn();
    const setLoading = jest.fn();
    const handleStop = jest.fn();
    const chatEndRef = { current: null } as React.RefObject<HTMLDivElement>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const renderWithHandlers = (chat = mockChat, extra: Partial<React.ComponentProps<typeof MessageHandlers>> = {}) => {
        let capturedHandlers: any;
        const view = render(
            <MessageHandlers
                chat={chat}
                setChat={setChat}
                handleSend={handleSend}
                chatEndRef={chatEndRef}
                viewSessionId="session-1"
                updateSessionMessages={updateSessionMessages}
                persistSessionMessages={persistSessionMessages}
                setLoading={setLoading}
                handleStop={handleStop}
                {...extra}
            >
                {(handlers) => {
                    capturedHandlers = handlers;
                    return (
                        <div
                            data-testid="edit-state"
                            data-editing-idx={handlers.editingIdx ?? ''}
                            data-edit-text={handlers.editDraft?.text ?? ''}
                        />
                    );
                }}
            </MessageHandlers>
        );
        return { handlers: () => capturedHandlers, view };
    };

    it('provides all expected handlers to children', () => {
        const { handlers } = renderWithHandlers();
        const h = handlers();
        expect(h.handleDeleteMessage).toBeInstanceOf(Function);
        expect(h.handleDeleteMessageById).toBeInstanceOf(Function);
        expect(h.handleReplayMessage).toBeInstanceOf(Function);
        expect(h.handleCopyMessage).toBeInstanceOf(Function);
        expect(h.handleStartEditMessage).toBeInstanceOf(Function);
        expect(h.handleCommitEditMessage).toBeInstanceOf(Function);
    });

    it('handleDeleteMessage removes a message by index', () => {
        const { handlers } = renderWithHandlers();
        handlers().handleDeleteMessage(0);
        
        expect(setChat).toHaveBeenCalledWith([mockChat[1]]);
        expect(updateSessionMessages).toHaveBeenCalledWith('session-1', [mockChat[1]]);
        expect(persistSessionMessages).toHaveBeenCalledWith([mockChat[1]]);
    });

    it('handleDeleteMessageById removes a message by ID', () => {
        const { handlers } = renderWithHandlers();
        handlers().handleDeleteMessageById('1');
        
        expect(setChat).toHaveBeenCalledWith([mockChat[1]]);
        expect(updateSessionMessages).toHaveBeenCalledWith('session-1', [mockChat[1]]);
        expect(persistSessionMessages).toHaveBeenCalledWith([mockChat[1]]);
    });

    it('handleDeleteMessageById handles non-existent ID by trying timestamp fallback', () => {
        const chatWithTimestampId: ChatMessage[] = [
            { role: 'user', content: 'test', timestamp: 12345 } as any
        ];
        const { handlers } = renderWithHandlers(chatWithTimestampId);
        
        // Try to delete by "12345" which matches the timestamp
        handlers().handleDeleteMessageById('12345');
        
        expect(setChat).toHaveBeenCalledWith([]);
        expect(updateSessionMessages).toHaveBeenCalledWith('session-1', []);
        expect(persistSessionMessages).toHaveBeenCalledWith([]);
    });

    it('handleReplayMessage trims after the user message and resends without duplicating it', () => {
        const { handlers } = renderWithHandlers();
        const messageToReplay = mockChat[0];
        const expectedSnapshot = [mockChat[0]];

        handlers().handleReplayMessage(messageToReplay, 0);

        expect(handleStop).toHaveBeenCalled();
        expect(setLoading).toHaveBeenCalledWith(true);
        expect(setChat).toHaveBeenCalledWith(expectedSnapshot);
        expect(updateSessionMessages).toHaveBeenCalledWith('session-1', expectedSnapshot);

        expect(scheduleNextTick).toHaveBeenCalled();
        expect(handleSend).toHaveBeenCalledWith(
            undefined,
            undefined,
            messageToReplay,
            expectedSnapshot,
        );
    });

    it('handleReplayMessage strips all messages after a user message when replaying mid-thread', () => {
        const longerThread: ChatMessage[] = [
            { id: 'u0', role: 'user', content: 'first', timestamp: 1 },
            { id: 'a1', role: 'assistant', content: 'ans1', timestamp: 2 },
            { id: 'u2', role: 'user', content: 'second', timestamp: 3 },
            { id: 'a3', role: 'assistant', content: 'ans2', timestamp: 4 },
        ];
        const { handlers } = renderWithHandlers(longerThread);
        const messageToReplay = longerThread[2];
        const expectedSnapshot = longerThread.slice(0, 3);

        handlers().handleReplayMessage(messageToReplay, 2);

        expect(setChat).toHaveBeenCalledWith(expectedSnapshot);
        expect(updateSessionMessages).toHaveBeenCalledWith('session-1', expectedSnapshot);
        expect(handleSend).toHaveBeenCalledWith(
            undefined,
            undefined,
            messageToReplay,
            expectedSnapshot,
        );
    });

    it('handleReplayMessage ignores non-user messages', () => {
        const { handlers } = renderWithHandlers();
        handlers().handleReplayMessage(mockChat[1], 1);

        expect(setChat).not.toHaveBeenCalled();
        expect(handleSend).not.toHaveBeenCalled();
    });

    it('handleCopyMessage correctly calls the copy utility', () => {
        const { handlers } = renderWithHandlers();
        handlers().handleCopyMessage('text to copy');
        
        expect(copy).toHaveBeenCalledWith('text to copy');
    });

    it('handleStartEditMessage enters edit mode for user messages', () => {
        const { handlers, view } = renderWithHandlers();
        act(() => {
            handlers().handleStartEditMessage(mockChat[0], 0);
        });

        expect(view.getByTestId('edit-state')).toHaveAttribute('data-editing-idx', '0');
        expect(view.getByTestId('edit-state')).toHaveAttribute('data-edit-text', 'hello');
    });

    it('handleStartEditMessage is blocked while streaming', () => {
        const { handlers, view } = renderWithHandlers(mockChat, { streaming: true });
        act(() => {
            handlers().handleStartEditMessage(mockChat[0], 0);
        });

        expect(view.getByTestId('edit-state')).toHaveAttribute('data-editing-idx', '');
        expect(view.getByTestId('edit-state')).toHaveAttribute('data-edit-text', '');
    });

    it('handleCommitEditMessage truncates after the edited message and resends updated content', () => {
        const longerThread: ChatMessage[] = [
            { id: 'u0', role: 'user', content: 'first', timestamp: 1 },
            { id: 'a1', role: 'assistant', content: 'ans1', timestamp: 2 },
            { id: 'u2', role: 'user', content: 'second', timestamp: 3 },
            { id: 'a3', role: 'assistant', content: 'ans2', timestamp: 4 },
        ];
        const { handlers, view } = renderWithHandlers(longerThread);
        act(() => {
            handlers().handleStartEditMessage(longerThread[0], 0);
            handlers().handleUpdateEditDraft({ text: 'edited first', attachments: [] });
            handlers().handleCommitEditMessage(0);
        });

        const expectedMessage = expect.objectContaining({
            id: 'u0',
            content: 'edited first',
        });
        const expectedSnapshot = [expectedMessage];

        expect(setChat).toHaveBeenCalledWith(expectedSnapshot);
        expect(handleSend).toHaveBeenCalledWith(
            undefined,
            undefined,
            expectedMessage,
            expectedSnapshot,
        );
        expect(view.getByTestId('edit-state')).toHaveAttribute('data-editing-idx', '');
    });

    it('handleReplayMessage uses the in-progress edit draft when replaying the same message', () => {
        const { handlers } = renderWithHandlers();
        act(() => {
            handlers().handleStartEditMessage(mockChat[0], 0);
            handlers().handleUpdateEditDraft({ text: 'edited hello', attachments: [] });
            handlers().handleReplayMessage(mockChat[0], 0);
        });

        const expectedMessage = expect.objectContaining({
            id: '1',
            content: 'edited hello',
        });

        expect(handleSend).toHaveBeenCalledWith(
            undefined,
            undefined,
            expectedMessage,
            [expectedMessage],
        );
    });
});
