import React from 'react';
import { render, screen } from '@testing-library/react';
import { ImageAnnotatorLightbox } from '../ImageAnnotatorLightbox';

describe('ImageAnnotatorLightbox', () => {
    beforeAll(() => {
        // Create modal-root if not present
        if (!document.getElementById('modal-root')) {
            const modalRoot = document.createElement('div');
            modalRoot.setAttribute('id', 'modal-root');
            document.body.appendChild(modalRoot);
        }
    });

    it('renders toolbar buttons with high-contrast light and dark mode classes', () => {
        const onClose = jest.fn();

        render(
            <ImageAnnotatorLightbox
                attachment="https://example.com/test-image.jpg"
                onClose={onClose}
            />,
        );

        // Zoom out button
        const zoomOutBtn = screen.getByTitle('Zoom out (-)');
        expect(zoomOutBtn).toBeInTheDocument();
        expect(zoomOutBtn.className).toContain('text-zinc-700');
        expect(zoomOutBtn.className).toContain('dark:text-zinc-300');

        // Zoom percentage indicator
        const zoomPercentBtn = screen.getByTitle('Reset zoom to 100% (0)');
        expect(zoomPercentBtn).toBeInTheDocument();
        expect(zoomPercentBtn.className).toContain('text-zinc-700');
        expect(zoomPercentBtn.className).toContain('dark:text-zinc-300');

        // Draw toggle button
        const drawBtn = screen.getByTitle('Draw on image (D)');
        expect(drawBtn).toBeInTheDocument();
        expect(drawBtn.className).toContain('text-zinc-700');
        expect(drawBtn.className).toContain('dark:text-zinc-300');

        // Close button
        const closeBtn = screen.getByTitle('Close (Esc)');
        expect(closeBtn).toBeInTheDocument();
        expect(closeBtn.className).toContain('text-zinc-700');
        expect(closeBtn.className).toContain('hover:text-red-600');
    });

    it('renders floating header with adaptive light and dark background and border', () => {
        render(
            <ImageAnnotatorLightbox
                attachment="https://example.com/test-image.jpg"
                onClose={jest.fn()}
            />,
        );

        const header = screen.getByRole('dialog').querySelector('header');
        expect(header).toBeInTheDocument();
        expect(header?.className).toContain('bg-white/95');
        expect(header?.className).toContain('border-zinc-200/90');
        expect(header?.className).toContain('dark:bg-zinc-900/95');
        expect(header?.className).toContain('dark:border-zinc-700/60');
    });
});
