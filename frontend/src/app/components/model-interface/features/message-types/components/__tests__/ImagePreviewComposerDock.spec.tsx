import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImagePreviewComposerDock } from '../ImagePreviewComposerDock';

describe('ImagePreviewComposerDock', () => {
    it('keeps composer hidden until the user expands the dock', () => {
        render(
            <ImagePreviewComposerDock expandLabel="Message">
                <textarea aria-label="composer" />
            </ImagePreviewComposerDock>,
        );

        expect(screen.queryByLabelText('composer')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /message/i }));

        expect(screen.getByLabelText('composer')).toBeInTheDocument();
    });

    it('collapses the composer when hide is clicked', () => {
        render(
            <ImagePreviewComposerDock expandLabel="Message" collapseLabel="Hide message box">
                <textarea aria-label="composer" />
            </ImagePreviewComposerDock>,
        );

        fireEvent.click(screen.getByRole('button', { name: /message/i }));
        fireEvent.click(screen.getByRole('button', { name: /hide message box/i }));

        expect(screen.queryByLabelText('composer')).not.toBeInTheDocument();
    });
});
