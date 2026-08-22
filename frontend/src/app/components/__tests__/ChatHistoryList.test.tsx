import React from 'react';
import { render, fireEvent } from '@testing-library/react';

jest.mock('@/app/components/model-interface/features/chat/components', () => ({
    ChatLoadingIndicator: () => null,
}));

// Mock the child component to simplify testing the list logic
jest.mock('@/app/components/ChatHistoryListItem', () => ({
    __esModule: true,
    default: ({ onSelect, session }: { onSelect: (s: any) => void; session: any }) => (
        <button type="button" onClick={() => onSelect(session)}>
            {session.title}
        </button>
    ),
}));

import ChatHistoryList from '../ChatHistoryList';

describe('ChatHistoryList', () => {
    it('calls handleSessionSwitch synchronously and defers model restoration in transition', async () => {
        const models = [{ id: 'model-1', name: 'Model 1', description: '', context_length: 0 }];
        const session = {
            id: 'session-local-1',
            title: 'Local Session',
            modelId: 'model-1',
            messages: [{ role: 'user' as const, content: 'hi', timestamp: 1 }],
        };
        const onSessionSelect = jest.fn();
        const setSelectedModel = jest.fn();
        const handleSessionSwitch = jest.fn();
        const callOrder: string[] = [];

        handleSessionSwitch.mockImplementation(() => {
            callOrder.push('switch');
        });
        setSelectedModel.mockImplementation(() => {
            callOrder.push('model');
        });

        const startTransitionSpy = jest
            .spyOn(React, 'startTransition')
            .mockImplementation((cb) => {
                callOrder.push('transition');
                cb();
            });

        const { findByRole } = render(
            <ChatHistoryList
                chatHistory={[session]}
                currentSessionId="session-local-1"
                models={models}
                isMobile={false}
                removeChatHistorySession={jest.fn().mockResolvedValue(true)}
                setChatHistory={jest.fn()}
                getChatHistory={jest.fn().mockResolvedValue([])}
                setSelectedModel={setSelectedModel}
                onStarToggle={jest.fn().mockResolvedValue(undefined)}
                handleSessionSwitch={handleSessionSwitch}
                onSessionSelect={onSessionSelect}
            />,
        );

        fireEvent.click(await findByRole('button', { name: 'Local Session' }));

        expect(handleSessionSwitch).toHaveBeenCalledWith(session);
        expect(callOrder[0]).toBe('switch');
        expect(callOrder[1]).toBe('transition');
        expect(callOrder[2]).toBe('model');
        expect(setSelectedModel).toHaveBeenCalledWith(models[0]);
        expect(onSessionSelect).toHaveBeenCalled();

        startTransitionSpy.mockRestore();
    });

    const baseProject = {
        id: 'proj-a',
        userId: 'user-1',
        name: 'Project A',
        rootPath: '/tmp/a',
        rules: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
    };

    it('collapses project sections by default and shows chat count', async () => {
        const { findByText, queryByRole } = render(
            <ChatHistoryList
                chatHistory={[
                    {
                        id: 'chat-1',
                        title: 'Hidden Chat',
                        modelId: 'session-model',
                        codeProjectId: 'proj-a',
                        messages: [{ role: 'user', content: 'hi', timestamp: 1 }],
                    },
                ]}
                currentSessionId={null}
                models={[]}
                isMobile={false}
                removeChatHistorySession={jest.fn().mockResolvedValue(true)}
                setChatHistory={jest.fn()}
                getChatHistory={jest.fn().mockResolvedValue([])}
                setSelectedModel={jest.fn()}
                onStarToggle={jest.fn().mockResolvedValue(undefined)}
                codeProjects={[baseProject]}
            />,
        );

        expect(await findByText('1 chat')).toBeTruthy();
        expect(queryByRole('button', { name: 'Hidden Chat' })).toBeNull();
    });

    it('expands the active project with open more when conversations exceed the limit', async () => {
        const makeChat = (id: string, ts: number) => ({
            id,
            title: `Chat ${id}`,
            modelId: 'session-model',
            codeProjectId: 'proj-a',
            messages: [{ role: 'user' as const, content: 'hi', timestamp: ts }],
        });

        const { findByRole, findByText, queryByRole } = render(
            <ChatHistoryList
                chatHistory={[
                    makeChat('chat-6', 6),
                    makeChat('chat-5', 5),
                    makeChat('chat-4', 4),
                    makeChat('chat-3', 3),
                    makeChat('chat-2', 2),
                    makeChat('chat-1', 1),
                ]}
                currentSessionId="chat-6"
                models={[]}
                isMobile={false}
                removeChatHistorySession={jest.fn().mockResolvedValue(true)}
                setChatHistory={jest.fn()}
                getChatHistory={jest.fn().mockResolvedValue([])}
                setSelectedModel={jest.fn()}
                onStarToggle={jest.fn().mockResolvedValue(undefined)}
                handleSessionSwitch={jest.fn()}
                isSessionActive={(id) => id === 'chat-6'}
                codeProjects={[baseProject]}
                activeProjectId="proj-a"
            />,
        );

        expect(await findByRole('button', { name: 'Chat chat-6' })).toBeTruthy();
        expect(await findByText('Open more (1)')).toBeTruthy();
        expect(queryByRole('button', { name: 'Chat chat-1' })).toBeNull();
    });

    it('shows open more when the General section is expanded with many chats', async () => {
        const makeChat = (id: string, ts: number) => ({
            id,
            title: `Chat ${id}`,
            modelId: 'session-model',
            messages: [{ role: 'user' as const, content: 'hi', timestamp: ts }],
        });

        const { findByRole, findByText, queryByRole } = render(
            <ChatHistoryList
                chatHistory={[
                    makeChat('chat-6', 6),
                    makeChat('chat-5', 5),
                    makeChat('chat-4', 4),
                    makeChat('chat-3', 3),
                    makeChat('chat-2', 2),
                    makeChat('chat-1', 1),
                ]}
                currentSessionId={null}
                models={[]}
                isMobile={false}
                removeChatHistorySession={jest.fn().mockResolvedValue(true)}
                setChatHistory={jest.fn()}
                getChatHistory={jest.fn().mockResolvedValue([])}
                setSelectedModel={jest.fn()}
                onStarToggle={jest.fn().mockResolvedValue(undefined)}
                codeProjects={[baseProject]}
                onSelectProject={jest.fn()}
            />,
        );

        expect(queryByRole('button', { name: 'Chat chat-6' })).toBeNull();

        fireEvent.click(await findByRole('button', { name: 'General' }));

        expect(await findByRole('button', { name: 'Chat chat-6' })).toBeTruthy();
        expect(await findByText('Open more (1)')).toBeTruthy();
        expect(queryByRole('button', { name: 'Chat chat-1' })).toBeNull();
    });

    it('shows open more when a collapsed project section is expanded manually', async () => {
        const makeChat = (id: string, ts: number) => ({
            id,
            title: `Chat ${id}`,
            modelId: 'session-model',
            codeProjectId: 'proj-a',
            messages: [{ role: 'user' as const, content: 'hi', timestamp: ts }],
        });

        const { findByRole, findByText, queryByRole } = render(
            <ChatHistoryList
                chatHistory={[
                    makeChat('chat-6', 6),
                    makeChat('chat-5', 5),
                    makeChat('chat-4', 4),
                    makeChat('chat-3', 3),
                    makeChat('chat-2', 2),
                    makeChat('chat-1', 1),
                ]}
                currentSessionId={null}
                models={[]}
                isMobile={false}
                removeChatHistorySession={jest.fn().mockResolvedValue(true)}
                setChatHistory={jest.fn()}
                getChatHistory={jest.fn().mockResolvedValue([])}
                setSelectedModel={jest.fn()}
                onStarToggle={jest.fn().mockResolvedValue(undefined)}
                codeProjects={[baseProject]}
                onSelectProject={jest.fn()}
            />,
        );

        expect(queryByRole('button', { name: 'Chat chat-6' })).toBeNull();

        fireEvent.click(await findByRole('button', { name: 'Project A' }));

        expect(await findByRole('button', { name: 'Chat chat-6' })).toBeTruthy();
        expect(await findByText('Open more (1)')).toBeTruthy();
        expect(queryByRole('button', { name: 'Chat chat-1' })).toBeNull();
    });

    it('expands the General section when it contains the active conversation', async () => {
        const { findByRole, queryByRole } = render(
            <ChatHistoryList
                chatHistory={[
                    {
                        id: 'general-active',
                        title: 'Active General Chat',
                        modelId: 'session-model',
                        messages: [{ role: 'user', content: 'hi', timestamp: 1 }],
                    },
                ]}
                currentSessionId="general-active"
                models={[]}
                isMobile={false}
                removeChatHistorySession={jest.fn().mockResolvedValue(true)}
                setChatHistory={jest.fn()}
                getChatHistory={jest.fn().mockResolvedValue([])}
                setSelectedModel={jest.fn()}
                onStarToggle={jest.fn().mockResolvedValue(undefined)}
                codeProjects={[baseProject]}
            />,
        );

        expect(await findByRole('button', { name: 'Active General Chat' })).toBeTruthy();
    });

    it('keeps the active conversation visible when it is beyond the preview limit', async () => {
        const makeChat = (id: string, ts: number) => ({
            id,
            title: `Chat ${id}`,
            modelId: 'session-model',
            messages: [{ role: 'user' as const, content: 'hi', timestamp: ts }],
        });

        const { findByRole, findByText, queryByRole } = render(
            <ChatHistoryList
                chatHistory={[
                    makeChat('chat-6', 6),
                    makeChat('chat-5', 5),
                    makeChat('chat-4', 4),
                    makeChat('chat-3', 3),
                    makeChat('chat-2', 2),
                    makeChat('chat-hidden-active', 1),
                ]}
                currentSessionId="chat-hidden-active"
                models={[]}
                isMobile={false}
                removeChatHistorySession={jest.fn().mockResolvedValue(true)}
                setChatHistory={jest.fn()}
                getChatHistory={jest.fn().mockResolvedValue([])}
                setSelectedModel={jest.fn()}
                onStarToggle={jest.fn().mockResolvedValue(undefined)}
                codeProjects={[baseProject]}
            />,
        );

        fireEvent.click(await findByRole('button', { name: 'General' }));

        expect(await findByRole('button', { name: 'Chat chat-hidden-active' })).toBeTruthy();
    });

    it('expands a collapsed project section on single click', async () => {
        const { findByRole, queryByRole } = render(
            <ChatHistoryList
                chatHistory={[
                    {
                        id: 'chat-1',
                        title: 'Hidden Chat',
                        modelId: 'session-model',
                        codeProjectId: 'proj-a',
                        messages: [{ role: 'user', content: 'hi', timestamp: 1 }],
                    },
                ]}
                currentSessionId={null}
                models={[]}
                isMobile={false}
                removeChatHistorySession={jest.fn().mockResolvedValue(true)}
                setChatHistory={jest.fn()}
                getChatHistory={jest.fn().mockResolvedValue([])}
                setSelectedModel={jest.fn()}
                onStarToggle={jest.fn().mockResolvedValue(undefined)}
                codeProjects={[baseProject]}
                onSelectProject={jest.fn()}
            />,
        );

        expect(queryByRole('button', { name: 'Hidden Chat' })).toBeNull();

        fireEvent.click(await findByRole('button', { name: 'Project A' }));

        expect(await findByRole('button', { name: 'Hidden Chat' })).toBeTruthy();
    });
});
