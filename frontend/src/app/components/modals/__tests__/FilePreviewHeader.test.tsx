import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FilePreviewHeader } from '../FilePreviewHeader';

jest.mock('lucide-react', () => {
    const React = require('react');
    return new Proxy(
        {},
        {
            get: (_target, prop) => {
                const name = String(prop);
                const MockIcon = () => <div data-testid={`icon-${name}`} />;
                MockIcon.displayName = name;
                return MockIcon;
            },
        },
    );
});

const baseProps = {
    showSidebar: false,
    onToggleSidebar: jest.fn(),
    fileName: 'resume.md',
    filePath: 'C:\\Users\\me\\resume.md',
    isDirty: false,
    isMarkdown: true,
    isCode: true,
    showMarkdownPreview: false,
    onToggleMarkdownPreview: jest.fn(),
    onSave: jest.fn(),
    isSaving: false,
    canSave: false,
    onOpenInOS: jest.fn(),
    onRevealInFolder: jest.fn(),
    onCopy: jest.fn().mockResolvedValue(true),
    onClose: jest.fn(),
};

describe('FilePreviewHeader', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('reveals the file in the OS file manager from the toolbar', () => {
        render(<FilePreviewHeader {...baseProps} />);

        fireEvent.click(screen.getByRole('button', { name: /reveal in file explorer|finder|file manager/i }));

        expect(baseProps.onRevealInFolder).toHaveBeenCalledTimes(1);
    });

    it('disables reveal when there is no local path', () => {
        render(<FilePreviewHeader {...baseProps} filePath={undefined} />);

        expect(
            screen.getByRole('button', { name: /reveal in file explorer|finder|file manager/i }),
        ).toBeDisabled();
    });

    it('copies the current file or folder from the toolbar', async () => {
        render(<FilePreviewHeader {...baseProps} />);

        fireEvent.click(screen.getByRole('button', { name: /^copy$/i }));

        expect(baseProps.onCopy).toHaveBeenCalledTimes(1);
    });

    it('disables copy when there is no local path', () => {
        render(<FilePreviewHeader {...baseProps} filePath={undefined} />);

        expect(screen.getByRole('button', { name: /^copy$/i })).toBeDisabled();
    });
});
