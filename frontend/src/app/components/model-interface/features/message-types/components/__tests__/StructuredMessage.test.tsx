import React from 'react';
import { render, screen } from '@testing-library/react';
import { StructuredMessage } from '../ImageMessage';

jest.mock('@/app/components/model-interface/shared/components', () => ({
    MarkdownRenderer: ({ content }: { content: string }) => <span>{content}</span>,
}));

jest.mock('../MessageAttachmentCard', () => ({
    MessageAttachmentCard: () => <div data-testid="attachment-card" />,
}));

describe('StructuredMessage', () => {
    const baseProps = {
        content: [
            { type: 'image_url', image_url: { url: 'https://example.com/a.png' } },
            { type: 'text', text: 'Edit this photo' },
        ],
        onImagePreview: jest.fn(),
        imagePreview: null,
        setImagePreview: jest.fn(),
    };

    it('does not show the stream cursor on user messages while streaming', () => {
        const { container } = render(
            <StructuredMessage {...baseProps} streaming role="user" />,
        );
        expect(container.textContent).not.toContain('▊');
    });

    it('shows the stream cursor on assistant text while streaming', () => {
        render(
            <StructuredMessage
                {...baseProps}
                content={[{ type: 'text', text: 'Hello' }]}
                streaming
                role="assistant"
            />,
        );
        expect(screen.getByText('▊')).toBeInTheDocument();
    });
});
