/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConversationTranscriptModal } from '../ConversationTranscriptModal';
import type { ChatSession } from '@/app/components/model-interface/shared/types';

import copy from 'copy-to-clipboard';

jest.mock('copy-to-clipboard', () => jest.fn(() => true));

jest.mock('@/lib/utils/conversationTranscriptExport', () => {
    const actual = jest.requireActual('@/lib/utils/conversationTranscriptExport');
    return {
        ...actual,
        resolveConversationTranscriptMessages: jest.fn(),
    };
});

import { resolveConversationTranscriptMessages } from '@/lib/utils/conversationTranscriptExport';

const mockedResolve = resolveConversationTranscriptMessages as jest.MockedFunction<
    typeof resolveConversationTranscriptMessages
>;

describe('ConversationTranscriptModal', () => {
    const session: ChatSession = {
        id: 's1',
        title: 'My chat',
        modelId: 'm1',
        messages: [{ role: 'user', content: 'Hello', timestamp: 1 }],
    };

    beforeEach(() => {
        mockedResolve.mockReset();
        const root = document.createElement('div');
        root.id = 'modal-root';
        document.body.appendChild(root);
    });

    afterEach(() => {
        document.getElementById('modal-root')?.remove();
    });

    it('loads and shows transcript preview with copy and download actions', async () => {
        mockedResolve.mockResolvedValue([
            { role: 'user', content: 'Hello', timestamp: 1 },
            { role: 'assistant', content: 'Hi', timestamp: 2 },
        ] as any);

        render(
            <ConversationTranscriptModal
                open
                session={session}
                title="My chat"
                onClose={jest.fn()}
            />,
        );

        await waitFor(() => {
            expect(screen.getByText(/User:/)).toBeInTheDocument();
            expect(screen.getByText(/Hello/)).toBeInTheDocument();
        });

        expect(screen.getByRole('button', { name: /Copy/i })).toBeEnabled();
        expect(screen.getByRole('button', { name: /Download/i })).toBeEnabled();
    });

    it('switches preview when format changes', async () => {
        mockedResolve.mockResolvedValue([
            { role: 'user', content: 'Hi', timestamp: 1 },
        ] as any);

        render(
            <ConversationTranscriptModal
                open
                session={session}
                title="My chat"
                onClose={jest.fn()}
            />,
        );

        await waitFor(() => {
            expect(screen.getByText(/Conversation: My chat/)).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText(/Format/i), { target: { value: 'md' } });

        await waitFor(() => {
            expect(screen.getByText(/# My chat/)).toBeInTheDocument();
        });
    });

    it('shows an error when transcript loading fails', async () => {
        mockedResolve.mockRejectedValue(new Error('Network down'));

        render(
            <ConversationTranscriptModal
                open
                session={session}
                title="My chat"
                onClose={jest.fn()}
            />,
        );

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Network down');
        });

        expect(screen.getByRole('button', { name: /Copy/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /Download/i })).toBeDisabled();
    });

    it('disables export when there is no exportable content', async () => {
        mockedResolve.mockResolvedValue([
            { role: 'system', content: 'hidden', timestamp: 1 },
        ] as any);

        render(
            <ConversationTranscriptModal
                open
                session={session}
                title="My chat"
                onClose={jest.fn()}
            />,
        );

        await waitFor(() => {
            expect(screen.getByText(/no exportable messages/i)).toBeInTheDocument();
        });

        expect(screen.getByRole('button', { name: /Copy/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /Download/i })).toBeDisabled();
    });

    it('calls onClose when Close is clicked', async () => {
        mockedResolve.mockResolvedValue([
            { role: 'user', content: 'Hi', timestamp: 1 },
        ] as any);
        const onClose = jest.fn();

        render(
            <ConversationTranscriptModal
                open
                session={session}
                title="My chat"
                onClose={onClose}
            />,
        );

        await waitFor(() => {
            expect(screen.getByText(/Hi/)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: /Close/i }));
        expect(onClose).toHaveBeenCalled();
    });

    it('copies preview text when Copy is clicked', async () => {
        mockedResolve.mockResolvedValue([
            { role: 'user', content: 'Copy me', timestamp: 1 },
        ] as any);
        const mockedCopy = copy as jest.MockedFunction<typeof copy>;

        render(
            <ConversationTranscriptModal
                open
                session={session}
                title="My chat"
                onClose={jest.fn()}
            />,
        );

        await waitFor(() => {
            expect(screen.getByText(/Copy me/)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: /^Copy$/i }));
        expect(mockedCopy).toHaveBeenCalledWith(expect.stringContaining('Copy me'));
    });

    it('does not reload transcript when parent passes a new session object with the same id', async () => {
        mockedResolve.mockResolvedValue([
            { role: 'user', content: 'Stable', timestamp: 1 },
        ] as any);

        const getCachedMessages = () => undefined;

        const { rerender } = render(
            <ConversationTranscriptModal
                open
                session={session}
                title="My chat"
                onClose={jest.fn()}
                resolveOptions={{ getCachedMessages }}
            />,
        );

        await waitFor(() => {
            expect(screen.getByText(/Stable/)).toBeInTheDocument();
        });

        expect(mockedResolve).toHaveBeenCalledTimes(1);

        rerender(
            <ConversationTranscriptModal
                open
                session={{
                    ...session,
                    title: 'Updated title only',
                }}
                title="My chat"
                onClose={jest.fn()}
                resolveOptions={{ getCachedMessages }}
            />,
        );

        await waitFor(() => {
            expect(screen.getByText(/Stable/)).toBeInTheDocument();
        });

        expect(mockedResolve).toHaveBeenCalledTimes(1);
    });

    it('renders JSON preview when JSON format is selected', async () => {
        mockedResolve.mockResolvedValue([
            { role: 'user', content: 'JSON line', timestamp: 1 },
        ] as any);

        render(
            <ConversationTranscriptModal
                open
                session={session}
                title="My chat"
                onClose={jest.fn()}
            />,
        );

        await waitFor(() => {
            expect(screen.getByText(/JSON line/)).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText(/Format/i), { target: { value: 'json' } });

        await waitFor(() => {
            expect(screen.getByText(/"role": "user"/)).toBeInTheDocument();
            expect(screen.getByText(/JSON line/)).toBeInTheDocument();
        });
    });

    it('retries loading transcript when Retry button is clicked after failure', async () => {
        mockedResolve.mockRejectedValueOnce(new Error('Connection error'));

        render(
            <ConversationTranscriptModal
                open
                session={session}
                title="My chat"
                onClose={jest.fn()}
            />,
        );

        await waitFor(() => {
            expect(screen.getByText(/Connection error/)).toBeInTheDocument();
        });

        const retryBtn = screen.getByRole('button', { name: /Retry/i });
        expect(retryBtn).toBeInTheDocument();

        mockedResolve.mockResolvedValueOnce([
            { role: 'user', content: 'Recovered', timestamp: 1 },
        ] as any);

        fireEvent.click(retryBtn);

        await waitFor(() => {
            expect(screen.getByText(/Recovered/)).toBeInTheDocument();
        });
    });

    it('does not restart loading when getCachedMessages reference changes while in flight or rendered', async () => {
        let resolveInFlight: ((val: any) => void) | null = null;
        mockedResolve.mockImplementation(
            () =>
                new Promise((res) => {
                    resolveInFlight = res;
                }),
        );

        const { rerender } = render(
            <ConversationTranscriptModal
                open
                session={session}
                title="My chat"
                onClose={jest.fn()}
                resolveOptions={{ getCachedMessages: () => undefined }}
            />,
        );

        expect(screen.getByText(/Loading transcript/i)).toBeInTheDocument();
        expect(mockedResolve).toHaveBeenCalledTimes(1);

        // Simulate streaming tokens in another session creating a new function reference
        rerender(
            <ConversationTranscriptModal
                open
                session={session}
                title="My chat"
                onClose={jest.fn()}
                resolveOptions={{ getCachedMessages: () => undefined }}
            />,
        );

        // It should NOT have called resolve a second time or aborted the in-flight one
        expect(mockedResolve).toHaveBeenCalledTimes(1);

        resolveInFlight!([{ role: 'user', content: 'Finished despite rerender', timestamp: 1 }]);

        await waitFor(() => {
            expect(screen.getByText(/Finished despite rerender/)).toBeInTheDocument();
        });
    });
});

