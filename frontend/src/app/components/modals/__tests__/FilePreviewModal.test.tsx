import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FilePreviewModal } from '../FilePreviewModal';
import { filePreviewEmitter } from '../FilePreviewManager';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
    X: () => <div data-testid="icon-x" />,
    FolderOpen: () => <div data-testid="icon-folder-open" />,
    Download: () => <div data-testid="icon-download" />,
    FileIcon: () => <div data-testid="icon-file-icon" />,
    Folder: () => <div data-testid="icon-folder" />,
    ChevronRight: () => <div data-testid="icon-chevron-right" />,
    File: () => <div data-testid="icon-file" />,
    PanelLeft: () => <div data-testid="icon-panel-left" />,
    ExternalLink: () => <div data-testid="icon-external-link" />,
    Save: () => <div data-testid="icon-save" />,
    Eye: () => <div data-testid="icon-eye" />,
    Code2: () => <div data-testid="icon-code2" />,
}));

// Mock Monaco Editor
jest.mock('@monaco-editor/react', () => {
    return {
        __esModule: true,
        default: ({ value }: any) => <div data-testid="monaco-editor">{value}</div>,
        loader: { config: jest.fn(), init: jest.fn().mockResolvedValue({ editor: { defineTheme: jest.fn() } }) }
    };
});

jest.mock('@/lib/providers/ThemeProvider', () => ({
    useTheme: () => ({ resolvedTheme: 'dark', theme: 'dark', setTheme: jest.fn() }),
}));

describe('FilePreviewModal', () => {
    const originalDesktopBridge = (window as any).aigeniusDesktop;

    beforeEach(() => {
        // Clear all mock implementations
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Restore bridge
        (window as any).aigeniusDesktop = originalDesktopBridge;
        // Close modal
        filePreviewEmitter.emit('close');
    });

    it('renders nothing when there is no payload', () => {
        const { container } = render(<FilePreviewModal />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders image preview and fetches local file data via bridge', async () => {
        const mockReadLocalFilePreview = jest.fn().mockResolvedValue({
            ok: true,
            kind: 'image',
            mimeType: 'image/png',
            base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
        });

        (window as any).aigeniusDesktop = {
            readLocalFilePreview: mockReadLocalFilePreview
        };

        render(<FilePreviewModal />);

        filePreviewEmitter.emit('open', {
            type: 'image',
            name: 'test.png',
            url: 'local-file:///test.png',
            localPath: '/test.png'
        });

        // Initially shows loading spinner or nothing because url is empty during fetch
        expect(screen.getByText('test.png')).toBeInDocument();

        // Wait for the bridge to resolve
        await waitFor(() => {
            const img = screen.getByAltText('test.png');
            expect(img).toHaveAttribute('src', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
        });

        expect(mockReadLocalFilePreview).toHaveBeenCalledWith('/test.png');
    });

    it('renders folder preview and fetches directory contents', async () => {
        const mockRunLocalDesktopTool = jest.fn().mockResolvedValue({
            ok: true,
            result: JSON.stringify({
                items: [
                    { path: '/folder/file1.js', name: 'file1.js', isDir: false, size: 1024 },
                    { path: '/folder/subfolder', name: 'subfolder', isDir: true }
                ]
            })
        });

        (window as any).aigeniusDesktop = {
            runLocalDesktopTool: mockRunLocalDesktopTool
        };

        render(<FilePreviewModal />);

        filePreviewEmitter.emit('open', {
            type: 'folder',
            name: 'my-folder',
            url: 'local-file:///folder',
            localPath: '/folder'
        });

        expect(screen.getByText('my-folder')).toBeInDocument();

        // Wait for folder contents to render
        await waitFor(() => {
            expect(screen.getByText('file1.js')).toBeInDocument();
            expect(screen.getByText('subfolder')).toBeInDocument();
            expect(screen.getByText('1.0 KB')).toBeInDocument();
        });

        expect(mockRunLocalDesktopTool).toHaveBeenCalledWith({
            tool: 'local_list_directory',
            arguments: { path: '/folder', limit: 50 }
        });
    });

    it('renders empty folder state correctly', async () => {
        const mockRunLocalDesktopTool = jest.fn().mockResolvedValue({
            ok: true,
            result: JSON.stringify({ items: [] })
        });

        (window as any).aigeniusDesktop = {
            runLocalDesktopTool: mockRunLocalDesktopTool
        };

        render(<FilePreviewModal />);

        filePreviewEmitter.emit('open', {
            type: 'folder',
            name: 'empty-folder',
            url: 'local-file:///empty',
            localPath: '/empty'
        });

        await waitFor(() => {
            expect(screen.getByText('This folder is empty')).toBeInDocument();
        });
    });

    it('handles code file click within folder preview', async () => {
        const mockRunLocalDesktopTool = jest.fn((args: any) => {
            if (args.tool === 'local_list_directory') {
                return Promise.resolve({
                    ok: true,
                    result: JSON.stringify({
                        items: [
                            { path: '/folder/index.ts', name: 'index.ts', isDir: false }
                        ]
                    })
                });
            } else {
                return Promise.resolve({
                    ok: true,
                    result: JSON.stringify({ content: 'console.log("hello");' })
                });
            }
        });

        (window as any).aigeniusDesktop = {
            runLocalDesktopTool: mockRunLocalDesktopTool
        };

        render(<FilePreviewModal />);

        // 1. Open folder
        filePreviewEmitter.emit('open', {
            type: 'folder',
            name: 'code-folder',
            url: 'local-file:///folder',
            localPath: '/folder'
        });

        await waitFor(() => {
            expect(screen.getByText('index.ts')).toBeInDocument();
        });

        // 2. Click on the file
        fireEvent.click(screen.getByText('index.ts'));

        // 3. Verify editor renders content
        await waitFor(() => {
            expect(screen.getByTestId('monaco-editor')).toHaveTextContent('console.log("hello");');
        });
    });

    it('handles image file click within folder preview', async () => {
        const mockRunLocalDesktopTool = jest.fn().mockResolvedValue({ // List directory
            ok: true,
            result: JSON.stringify({
                items: [
                    { path: '/folder/pic.png', name: 'pic.png', isDir: false }
                ]
            })
        });

        const mockReadLocalFilePreview = jest.fn().mockResolvedValue({
            ok: true,
            kind: 'image',
            mimeType: 'image/png',
            base64: 'base64data'
        });

        (window as any).aigeniusDesktop = {
            runLocalDesktopTool: mockRunLocalDesktopTool,
            readLocalFilePreview: mockReadLocalFilePreview
        };

        render(<FilePreviewModal />);

        filePreviewEmitter.emit('open', {
            type: 'folder',
            name: 'img-folder',
            url: 'local-file:///folder',
            localPath: '/folder'
        });

        await waitFor(() => {
            expect(screen.getByText('pic.png')).toBeInDocument();
        });

        // Click image file
        console.log("DOM output:", screen.debug(undefined, 30000));
        fireEvent.click(screen.getByText('pic.png'));

        await waitFor(() => {
            const img = screen.getByAltText('pic.png');
            expect(img).toHaveAttribute('src', 'data:image/png;base64,base64data');
        });
    });
});
