import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImagePreviewContextMenu } from '../ImagePreviewContextMenu';

describe('ImagePreviewContextMenu', () => {
    it('renders menu items and handles copy click', () => {
        const onCopy = jest.fn();
        const onClose = jest.fn();
        const onCopyLink = jest.fn();
        const onDownload = jest.fn();

        render(
            <ImagePreviewContextMenu
                x={100}
                y={150}
                onClose={onClose}
                onCopy={onCopy}
                onCopyLink={onCopyLink}
                onDownload={onDownload}
            />,
        );

        expect(screen.getByTestId('image-preview-context-menu')).toBeInTheDocument();
        expect(screen.getByText('Copy image')).toBeInTheDocument();
        expect(screen.getByText('Copy image link')).toBeInTheDocument();
        expect(screen.getByText('Download')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('context-menu-copy-image'));
        expect(onCopy).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByTestId('context-menu-copy-link'));
        expect(onCopyLink).toHaveBeenCalledTimes(1);
    });

    it('shows copied feedback when copied prop is true', () => {
        render(
            <ImagePreviewContextMenu
                x={100}
                y={150}
                onClose={jest.fn()}
                onCopy={jest.fn()}
                copied={true}
            />,
        );

        expect(screen.getByText('Copied image!')).toBeInTheDocument();
    });

    it('shows copied feedback when linkCopied prop is true', () => {
        render(
            <ImagePreviewContextMenu
                x={100}
                y={150}
                onClose={jest.fn()}
                onCopy={jest.fn()}
                onCopyLink={jest.fn()}
                linkCopied={true}
            />,
        );

        expect(screen.getByText('Copied link!')).toBeInTheDocument();
    });

    it('closes when Escape key is pressed', () => {
        const onClose = jest.fn();
        render(
            <ImagePreviewContextMenu
                x={100}
                y={150}
                onClose={onClose}
                onCopy={jest.fn()}
            />,
        );

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('renders save to uploads when onSaveToUploads is provided and handles click', () => {
        const onSaveToUploads = jest.fn();
        render(
            <ImagePreviewContextMenu
                x={100}
                y={150}
                onClose={jest.fn()}
                onCopy={jest.fn()}
                onSaveToUploads={onSaveToUploads}
            />,
        );

        expect(screen.getByText('Save to uploads')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('context-menu-save-upload'));
        expect(onSaveToUploads).toHaveBeenCalledTimes(1);
    });

    it('shows saving and saved states for save to uploads', () => {
        const { rerender } = render(
            <ImagePreviewContextMenu
                x={100}
                y={150}
                onClose={jest.fn()}
                onCopy={jest.fn()}
                onSaveToUploads={jest.fn()}
                isSavingUpload={true}
            />,
        );

        expect(screen.getByText('Saving to uploads...')).toBeInTheDocument();

        rerender(
            <ImagePreviewContextMenu
                x={100}
                y={150}
                onClose={jest.fn()}
                onCopy={jest.fn()}
                onSaveToUploads={jest.fn()}
                savedToUpload={true}
            />,
        );

        expect(screen.getByText('Saved to uploads!')).toBeInTheDocument();
    });
});
