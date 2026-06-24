import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import ChatHistoryList from '@/app/components/ChatHistoryList';

// Mock the child component to simplify testing the list logic
jest.mock('@/app/components/ChatHistoryListItem', () => ({
    __esModule: true,
    default: ({ onSelect, session }: { onSelect: (s: any) => void; session: any }) => (
        <button type="button" onClick={() => onSelect(session)}>
            {session.title}
        </button>
    ),
}));

describe('ChatHistoryList', () => {
    it('calls handleSessionSwitch synchronously and defers model restoration in transition', async () => {
        const startTransitionSpy = jest.spyOn(React, 'startTransition');
        const setSelectedModel = jest.fn();
        const handleSessionSwitch = jest.fn(); // Now sync
        const onSessionSelect = jest.fn();
        
        const models = [
            { id: 'session-model', name: 'Session Model', description: 'test', context_length: 1 },
        ];

        const { findByRole } = render(
            <ChatHistoryList
                chatHistory={[
                    {
                        id: 'history-1',
                        title: 'Saved Session',
                        modelId: 'session-model',
                        messages: [],
                    },
                ]}
                currentSessionId={null}
                models={models}
                isMobile={false}
                removeChatHistorySession={jest.fn().mockResolvedValue(true)}
                removeChatHistorySessionById={jest.fn().mockResolvedValue(true)}
                setChatHistory={jest.fn()}
                getChatHistory={jest.fn().mockResolvedValue([])}
                setSelectedModel={setSelectedModel}
                onStarToggle={jest.fn().mockResolvedValue(undefined)}
                handleSessionSwitch={handleSessionSwitch}
                onSessionSelect={onSessionSelect}
            />
        );

        const callOrder: string[] = [];
        handleSessionSwitch.mockImplementation(() => callOrder.push('switch'));
        startTransitionSpy.mockImplementation((cb) => {
            callOrder.push('transition');
            cb();
        });
        setSelectedModel.mockImplementation(() => callOrder.push('model'));

        fireEvent.click(await findByRole('button', { name: 'Saved Session' }));

        // 1. Verify Absolute Instant switch
        expect(handleSessionSwitch).toHaveBeenCalled();
        expect(callOrder[0]).toBe('switch');
        
        // 2. Verify model restoration is deferred in transition
        expect(callOrder[1]).toBe('transition');
        expect(callOrder[2]).toBe('model');
        expect(setSelectedModel).toHaveBeenCalledWith(models[0]);
        expect(onSessionSelect).toHaveBeenCalled();
        
        startTransitionSpy.mockRestore();
    });
});
