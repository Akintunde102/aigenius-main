import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageAttachmentCard } from '../MessageAttachmentCard';

describe('MessageAttachmentCard', () => {
    it('renders image attachment card and triggers onPreview when clicked', () => {
        const onPreview = jest.fn();
        const onRemove = jest.fn();

        render(
            <MessageAttachmentCard
                kind="image"
                fileName="portrait.png"
                fileUrl="https://example.com/portrait.png"
                onPreview={onPreview}
                onRemove={onRemove}
                badge={<span data-testid="test-badge">✓</span>}
            />
        );

        expect(screen.getByRole('button', { name: 'Open image portrait.png' })).toBeInTheDocument();
        expect(screen.getByTestId('test-badge')).toBeInTheDocument();

        // Click image card
        fireEvent.click(screen.getByRole('button', { name: 'Open image portrait.png' }));
        expect(onPreview).toHaveBeenCalledWith({
            fileUrl: 'https://example.com/portrait.png',
            fileName: 'portrait.png',
            kind: 'image',
        });

        // Click remove button - should trigger onRemove and NOT onPreview again
        onPreview.mockClear();
        const removeBtn = screen.getByRole('button', { name: 'Remove attachment' });
        fireEvent.click(removeBtn);
        expect(onRemove).toHaveBeenCalledTimes(1);
        expect(onPreview).not.toHaveBeenCalled();
    });

    it('renders non-image attachment card with badge and keyboard activation', () => {
        const onPreview = jest.fn();

        render(
            <MessageAttachmentCard
                kind="file"
                fileName="data.json"
                fileUrl="https://example.com/data.json"
                onPreview={onPreview}
                badge={<span data-testid="doc-badge">✓</span>}
            />
        );

        expect(screen.getByText('data.json')).toBeInTheDocument();
        expect(screen.getByTestId('doc-badge')).toBeInTheDocument();

        // Non-image card role="button"
        const cardBtn = screen.getByRole('button');
        fireEvent.keyDown(cardBtn, { key: 'Enter' });
        expect(onPreview).toHaveBeenCalledWith({
            fileUrl: 'https://example.com/data.json',
            fileName: 'data.json',
            kind: 'file',
        });
    });
});
