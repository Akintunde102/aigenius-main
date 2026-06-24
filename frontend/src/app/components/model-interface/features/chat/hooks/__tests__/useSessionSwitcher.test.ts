/**
 * Tests for useSessionSwitcher: verifies instant key-based switching.
 */
import React from 'react';
import { act } from '@testing-library/react';
import { createRoot, Root } from 'react-dom/client';
import { useSessionSwitcher } from '../useSessionSwitcher';
import { ChatMessage } from '@/app/components/model-interface/shared/types';

jest.mock('@/lib/utils/messageContentUtils', () => ({
    normalizeSessionMessages: jest.fn((session: any) => session),
}));

jest.mock('@/lib/calls/model-chat-conversation', () => ({
    getConversationById: jest.fn().mockResolvedValue(null),
}));

const defaultOptions = {
    currentSessionId: null as string | null,
    chatMap: {} as Record<string, ChatMessage[]>,
    setChatForSession: jest.fn(),
};

describe('useSessionSwitcher', () => {
    let container: HTMLDivElement;
    let root: Root;
    let resultRef: { current: ReturnType<typeof useSessionSwitcher> | null };

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        resultRef = { current: null };
        jest.clearAllMocks();
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    function renderWithHook(opts = defaultOptions) {
        function Wrapper() {
            const result = useSessionSwitcher(opts);
            resultRef.current = result;
            return null;
        }
        root = createRoot(container);
        act(() => {
            root.render(React.createElement(Wrapper));
        });
    }

    it('createAndSwitchToNewSession clears the draft slot and sets currentSessionId to null', () => {
        const setChatForSession = jest.fn();
        renderWithHook({ ...defaultOptions, setChatForSession });
        const setCurrentSessionId = jest.fn();

        act(() => {
            resultRef.current!.createAndSwitchToNewSession(setCurrentSessionId);
        });

        expect(setCurrentSessionId).toHaveBeenCalledWith(null);
        expect(setChatForSession).toHaveBeenCalledWith('__draft__', []);
    });

    it('switchToSession immediately sets currentSessionId (synchronous key change)', () => {
        const setChatForSession = jest.fn();
        renderWithHook({ ...defaultOptions, setChatForSession });
        const setCurrentSessionId = jest.fn();

        const session = {
            id: 'test-id',
            title: 'Test',
            messages: [{ role: 'user' as const, content: 'Hi', timestamp: 1 }],
            modelId: 'gpt-4',
        };

        act(() => {
            resultRef.current!.switchToSession(session, setCurrentSessionId);
        });

        // Key change is synchronous and immediate
        expect(setCurrentSessionId).toHaveBeenCalledWith(session.id);
    });

    it('switchToSession populates chatMap slot from session data when map is empty', () => {
        const setChatForSession = jest.fn();
        // chatMap has no entry for this session
        renderWithHook({ ...defaultOptions, setChatForSession, chatMap: {} });
        const setCurrentSessionId = jest.fn();

        const session = {
            id: 'test-id',
            title: 'Test',
            messages: [{ role: 'user' as const, content: 'Hi', timestamp: 1 }],
            modelId: 'gpt-4',
        };

        act(() => {
            resultRef.current!.switchToSession(session, setCurrentSessionId);
        });

        expect(setChatForSession).toHaveBeenCalledWith(session.id, expect.any(Array));
    });

    it('switchToSession skips map population when slot is already present', () => {
        const setChatForSession = jest.fn();
        const existingMessages = [{ role: 'user' as const, content: 'existing', timestamp: 1 }];
        renderWithHook({
            ...defaultOptions,
            setChatForSession,
            chatMap: { 'test-id': existingMessages },
        });
        const setCurrentSessionId = jest.fn();

        const session = {
            id: 'test-id',
            title: 'Test',
            messages: [{ role: 'user' as const, content: 'new', timestamp: 2 }],
            modelId: 'gpt-4',
        };

        act(() => {
            resultRef.current!.switchToSession(session, setCurrentSessionId);
        });

        // setChatForSession should NOT be called for the cold-path fill since slot exists
        expect(setChatForSession).not.toHaveBeenCalled();
    });

    it('isSessionActive correctly matches session IDs', () => {
        const currentSessionId = 'active-123';
        function WrapperWithId() {
            const result = useSessionSwitcher({ ...defaultOptions, currentSessionId });
            resultRef.current = result;
            return null;
        }
        root = createRoot(container);
        act(() => {
            root.render(React.createElement(WrapperWithId));
        });

        expect(resultRef.current!.isSessionActive('active-123')).toBe(true);
        expect(resultRef.current!.isSessionActive('inactive-456')).toBe(false);
    });
});
