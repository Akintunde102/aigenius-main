/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('lucide-react', () => {
    return new Proxy({}, { get: () => () => null });
});

jest.mock('next/dynamic', () => () => () => null);

import { DefaultToolStreamingCard } from '../DefaultToolStreamingCard';

const streamingTool = {
    tool: 'subagent',
    displayName: 'Subagent',
    logs: [] as { tag: string; message: string }[],
    loading: false,
    success: true as boolean | undefined,
    arguments: { goal: 'Compare databases' },
};

describe('DefaultToolStreamingCard subagent', () => {
    it('links to the new conversation when the tool succeeds', () => {
        render(
            <DefaultToolStreamingCard
                streaming_tool={streamingTool}
                result={JSON.stringify({
                    success: true,
                    conversation_id: 'child-9',
                    result: 'PostgreSQL is the better fit.',
                })}
            />,
        );

        const link = screen.getByRole('link', { name: /Open subagent conversation/i });
        expect(link).toHaveAttribute('href', '/chat/child-9');
        expect(screen.getByText('PostgreSQL is the better fit.')).toBeInTheDocument();
    });

    it('hides the conversation link when the tool failed', () => {
        render(
            <DefaultToolStreamingCard
                streaming_tool={{ ...streamingTool, success: false }}
                result={JSON.stringify({
                    success: false,
                    conversation_id: 'child-9',
                    error: 'Could not create the subagent conversation.',
                })}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /Subagent/i }));
        expect(screen.queryByRole('link', { name: /Open subagent conversation/i })).not.toBeInTheDocument();
    });

    it('does not show a subagent link for a different tool', () => {
        render(
            <DefaultToolStreamingCard
                streaming_tool={{ ...streamingTool, tool: 'web_fetch', displayName: 'Fetch web page' }}
                result={JSON.stringify({ conversation_id: 'child-9', result: 'page' })}
            />,
        );

        expect(screen.queryByRole('link', { name: /Open subagent conversation/i })).not.toBeInTheDocument();
    });
});
