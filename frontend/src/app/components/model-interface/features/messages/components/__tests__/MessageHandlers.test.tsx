import React from 'react';
import { render } from '@testing-library/react';
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
    const chatEndRef = { current: null } as React.RefObject<HTMLDivElement>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const renderWithHandlers = (chat = mockChat) => {
        let capturedHandlers: any;
        render(
            <MessageHandlers
                chat={chat}
                setChat={setChat}
                handleSend={handleSend}
                chatEndRef={chatEndRef}
            >
                {(handlers) => {
                    capturedHandlers = handlers;
                    return <div data-testid="children" />;
                }}
            </MessageHandlers>
        );
        return capturedHandlers;
    };

    it('provides all expected handlers to children', () => {
        const handlers = renderWithHandlers();
        expect(handlers.handleDeleteMessage).toBeInstanceOf(Function);
        expect(handlers.handleDeleteMessageById).toBeInstanceOf(Function);
        expect(handlers.handleReplayMessage).toBeInstanceOf(Function);
        expect(handlers.handleCopyMessage).toBeInstanceOf(Function);
    });

    it('handleDeleteMessage removes a message by index', () => {
        const handlers = renderWithHandlers();
        handlers.handleDeleteMessage(0);
        
        expect(setChat).toHaveBeenCalled();
        const updateFn = setChat.mock.calls[0][0];
        const result = updateFn(mockChat);
        
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('2');
    });

    it('handleDeleteMessageById removes a message by ID', () => {
        const handlers = renderWithHandlers();
        handlers.handleDeleteMessageById('1');
        
        expect(setChat).toHaveBeenCalled();
        const updateFn = setChat.mock.calls[0][0];
        const result = updateFn(mockChat);
        
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('2');
    });

    it('handleDeleteMessageById handles non-existent ID by trying timestamp fallback', () => {
        const chatWithTimestampId: ChatMessage[] = [
            { role: 'user', content: 'test', timestamp: 12345 } as any
        ];
        const handlers = renderWithHandlers(chatWithTimestampId);
        
        // Try to delete by "12345" which matches the timestamp
        handlers.handleDeleteMessageById('12345');
        
        expect(setChat).toHaveBeenCalled();
        const updateFn = setChat.mock.calls[0][0];
        const result = updateFn(chatWithTimestampId);
        
        expect(result).toHaveLength(0);
    });

    it('handleReplayMessage trims after the user message and resends without duplicating it', () => {
        const handlers = renderWithHandlers();
        const messageToReplay = mockChat[0];
        const expectedSnapshot = [mockChat[0]];

        handlers.handleReplayMessage(messageToReplay, 0);

        expect(setChat).toHaveBeenCalledWith(expectedSnapshot);

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
        const handlers = renderWithHandlers(longerThread);
        const messageToReplay = longerThread[2];
        const expectedSnapshot = longerThread.slice(0, 3);

        handlers.handleReplayMessage(messageToReplay, 2);

        expect(setChat).toHaveBeenCalledWith(expectedSnapshot);
        expect(handleSend).toHaveBeenCalledWith(
            undefined,
            undefined,
            messageToReplay,
            expectedSnapshot,
        );
    });

    it('handleCopyMessage correctly calls the copy utility', () => {
        const handlers = renderWithHandlers();
        handlers.handleCopyMessage('text to copy');
        
        expect(copy).toHaveBeenCalledWith('text to copy');
    });
});
