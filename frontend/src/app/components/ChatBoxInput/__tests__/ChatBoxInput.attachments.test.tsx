import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatBoxInput from '../ChatBoxInput';
import type { UploadedFileInfo, Model } from '../types';

jest.mock('@/lib/providers/LanguageProvider', () => ({
    useLanguage: () => ({
        t: (_key: string, fallback: string) => fallback,
    }),
}));

jest.mock('@/app/components/model-interface/features/message-types/components/ImagePreviewLightbox', () => ({
    ImagePreviewLightbox: ({ imageUrl, onClose }: { imageUrl: any; onClose: () => void }) => (
        <div data-testid="mock-image-lightbox">
            <span>Lightbox for: {typeof imageUrl === 'string' ? imageUrl : imageUrl?.fileName}</span>
            <button onClick={onClose} data-testid="close-lightbox">Close</button>
        </div>
    ),
}));

const mockModel: Model = {
    id: 'test-model',
    name: 'Test Model',
    description: 'Test Model Description',
    context_length: 4096,
};

describe('ChatBoxInput attachments viewing', () => {
    const uploadedImages: UploadedFileInfo[] = [
        {
            fileUrl: 'https://example.com/test-photo.jpg',
            isImage: true,
            displayName: 'test-photo.jpg',
        },
    ];

    it('renders image attachment with green checkmark badge and opens preview lightbox on click', () => {
        render(
            <ChatBoxInput
                onSendMessage={jest.fn()}
                models={[mockModel]}
                selectedModel={mockModel}
                onModelChange={jest.fn()}
                uploadedFiles={uploadedImages}
            />
        );

        // Attachment card is present with accessible button
        const openBtn = screen.getByRole('button', { name: 'Open image test-photo.jpg' });
        expect(openBtn).toBeInTheDocument();

        // Lightbox is initially not open
        expect(screen.queryByTestId('mock-image-lightbox')).not.toBeInTheDocument();

        // Clicking the attachment card opens the image preview lightbox
        fireEvent.click(openBtn);

        expect(screen.getByTestId('mock-image-lightbox')).toBeInTheDocument();
        expect(screen.getByText('Lightbox for: test-photo.jpg')).toBeInTheDocument();

        // Closing the lightbox dismisses it
        fireEvent.click(screen.getByTestId('close-lightbox'));
        expect(screen.queryByTestId('mock-image-lightbox')).not.toBeInTheDocument();
    });

    it('delegates to onImagePreview prop when provided by parent', () => {
        const onImagePreview = jest.fn();

        render(
            <ChatBoxInput
                onSendMessage={jest.fn()}
                models={[mockModel]}
                selectedModel={mockModel}
                onModelChange={jest.fn()}
                uploadedFiles={uploadedImages}
                onImagePreview={onImagePreview}
            />
        );

        const openBtn = screen.getByRole('button', { name: 'Open image test-photo.jpg' });
        fireEvent.click(openBtn);

        expect(onImagePreview).toHaveBeenCalledWith(
            expect.objectContaining({
                fileUrl: 'https://example.com/test-photo.jpg',
                fileName: 'test-photo.jpg',
                kind: 'image',
            })
        );
        // Internal lightbox is not rendered when delegated
        expect(screen.queryByTestId('mock-image-lightbox')).not.toBeInTheDocument();
    });

    it('calls onRemoveUploadedFile when remove button is clicked without opening lightbox', () => {
        const onRemoveUploadedFile = jest.fn();

        render(
            <ChatBoxInput
                onSendMessage={jest.fn()}
                models={[mockModel]}
                selectedModel={mockModel}
                onModelChange={jest.fn()}
                uploadedFiles={uploadedImages}
                onRemoveUploadedFile={onRemoveUploadedFile}
            />
        );

        const removeBtn = screen.getByRole('button', { name: 'Remove attachment' });
        fireEvent.click(removeBtn);

        expect(onRemoveUploadedFile).toHaveBeenCalledWith(0);
        expect(screen.queryByTestId('mock-image-lightbox')).not.toBeInTheDocument();
    });
});
