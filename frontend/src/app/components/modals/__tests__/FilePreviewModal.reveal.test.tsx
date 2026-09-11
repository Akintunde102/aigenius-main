import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FilePreviewModal } from '../FilePreviewModal';
import { filePreviewEmitter } from '../FilePreviewManager';

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

jest.mock('@monaco-editor/react', () => {
    return {
        __esModule: true,
        default: ({ value }: { value?: string }) => <div data-testid="monaco-editor">{value}</div>,
        loader: { config: jest.fn(), init: jest.fn().mockResolvedValue({ editor: { defineTheme: jest.fn() } }) },
    };
});

jest.mock('@/lib/providers/ThemeProvider', () => ({
    useTheme: () => ({ resolvedTheme: 'dark', theme: 'dark', setTheme: jest.fn() }),
}));

jest.mock('copy-to-clipboard', () => jest.fn(() => true));

describe('FilePreviewModal reveal in folder', () => {
    const originalDesktopBridge = (window as { aigeniusDesktop?: unknown }).aigeniusDesktop;

    beforeEach(() => {
        jest.clearAllMocks();
        Element.prototype.scrollIntoView = jest.fn();
    });

    afterEach(() => {
        (window as { aigeniusDesktop?: unknown }).aigeniusDesktop = originalDesktopBridge;
        act(() => {
            filePreviewEmitter.emit('close');
        });
    });

    it('reveals the open file in the OS file manager from the header', async () => {
        const mockRevealFileInFolder = jest.fn().mockResolvedValue({ ok: true });
        const mockRunLocalDesktopTool = jest.fn().mockResolvedValue({
            ok: true,
            result: JSON.stringify({ items: [] }),
        });

        (window as { aigeniusDesktop?: unknown }).aigeniusDesktop = {
            revealFileInFolder: mockRevealFileInFolder,
            runLocalDesktopTool: mockRunLocalDesktopTool,
        };

        render(<FilePreviewModal />);

        await act(async () => {
            filePreviewEmitter.emit('open', {
                type: 'code',
                name: 'resume.md',
                url: 'local-file:///resume.md',
                localPath: 'C:\\Users\\me\\resume.md',
                textContent: '# Resume',
            });
        });

        fireEvent.click(screen.getAllByRole('button', { name: /reveal in file explorer|finder|file manager/i })[0]);

        await waitFor(() => {
            expect(mockRevealFileInFolder).toHaveBeenCalledWith('C:\\Users\\me\\resume.md');
        });
        expect(mockRunLocalDesktopTool).not.toHaveBeenCalledWith(
            expect.objectContaining({ tool: 'local_open_in_os' }),
        );
    });

    it('copies the open file or folder from the header', async () => {
        const mockCopyFileToClipboard = jest.fn().mockResolvedValue({ ok: true });
        const mockRunLocalDesktopTool = jest.fn().mockResolvedValue({
            ok: true,
            result: JSON.stringify({ items: [] }),
        });

        (window as { aigeniusDesktop?: unknown }).aigeniusDesktop = {
            copyFileToClipboard: mockCopyFileToClipboard,
            runLocalDesktopTool: mockRunLocalDesktopTool,
        };

        render(<FilePreviewModal />);

        await act(async () => {
            filePreviewEmitter.emit('open', {
                type: 'code',
                name: 'resume.md',
                url: 'local-file:///resume.md',
                localPath: 'C:\\Users\\me\\resume.md',
                textContent: '# Resume',
            });
        });

        fireEvent.click(screen.getAllByRole('button', { name: /^copy$/i })[0]);

        await waitFor(() => {
            expect(mockCopyFileToClipboard).toHaveBeenCalledWith('C:\\Users\\me\\resume.md');
        });
    });

    it('opens the parent folder with the default app when reveal IPC is missing', async () => {
        const mockRunLocalDesktopTool = jest.fn().mockResolvedValue({
            ok: true,
            result: JSON.stringify({ items: [] }),
        });

        (window as { aigeniusDesktop?: unknown }).aigeniusDesktop = {
            runLocalDesktopTool: mockRunLocalDesktopTool,
        };

        render(<FilePreviewModal />);

        await act(async () => {
            filePreviewEmitter.emit('open', {
                type: 'code',
                name: 'resume.md',
                url: 'local-file:///resume.md',
                localPath: 'C:\\Users\\me\\resume.md',
                textContent: '# Resume',
            });
        });

        fireEvent.click(screen.getAllByRole('button', { name: /reveal in file explorer|finder|file manager/i })[0]);

        await waitFor(() => {
            expect(mockRunLocalDesktopTool).toHaveBeenCalledWith({
                tool: 'local_open_in_os',
                arguments: { path: 'C:\\Users\\me' },
            });
        });
    });
});
