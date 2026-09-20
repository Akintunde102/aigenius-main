import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FilePreviewModal } from '../FilePreviewModal';
import { filePreviewEmitter } from '../FilePreviewManager';

// Mock Lucide icons — proxy covers explorer/header icons without listing each one
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
        jest.clearAllMocks();
        Element.prototype.scrollIntoView = jest.fn();
        global.URL.createObjectURL = jest.fn(() => 'blob:mock-preview');
        global.URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
        // Restore bridge
        (window as any).aigeniusDesktop = originalDesktopBridge;
        act(() => {
            filePreviewEmitter.emit('close');
        });
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

        await act(async () => {
            filePreviewEmitter.emit('open', {
                type: 'image',
                name: 'test.png',
                url: 'local-file:///test.png',
                localPath: '/test.png'
            });
        });

        // Initially shows loading spinner or nothing because url is empty during fetch
        expect(screen.getAllByText('test.png').length).toBeGreaterThan(0);

        // Wait for the bridge to resolve
        await waitFor(() => {
            const img = screen.getByAltText('test.png');
            expect(img).toHaveAttribute('src', 'blob:mock-preview');
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

        await act(async () => {
            filePreviewEmitter.emit('open', {
                type: 'folder',
                name: 'my-folder',
                url: 'local-file:///folder',
                localPath: '/folder'
            });
        });

        expect(screen.getAllByText('my-folder').length).toBeGreaterThan(0);

        // Wait for folder contents to render
        await waitFor(() => {
            expect(screen.getByText('file1.js')).toBeTruthy();
            expect(screen.getByText('subfolder')).toBeTruthy();
        });

        expect(mockRunLocalDesktopTool).toHaveBeenCalledWith({
            tool: 'local_list_directory',
            arguments: { path: '/folder', limit: 100 }
        });
        expect(mockRunLocalDesktopTool).toHaveBeenCalledWith({
            tool: 'local_list_directory',
            arguments: { path: '/folder', limit: 300 }
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

        await act(async () => {
            filePreviewEmitter.emit('open', {
                type: 'folder',
                name: 'empty-folder',
                url: 'local-file:///empty',
                localPath: '/empty'
            });
        });

        await waitFor(() => {
            expect(screen.getByText('Directory View')).toBeTruthy();
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
        await act(async () => {
            filePreviewEmitter.emit('open', {
                type: 'folder',
                name: 'code-folder',
                url: 'local-file:///folder',
                localPath: '/folder'
            });
        });

        await waitFor(() => {
            expect(screen.getByText('index.ts')).toBeTruthy();
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

        await act(async () => {
            filePreviewEmitter.emit('open', {
                type: 'folder',
                name: 'img-folder',
                url: 'local-file:///folder',
                localPath: '/folder'
            });
        });

        await waitFor(() => {
            expect(screen.getByText('pic.png')).toBeTruthy();
        });

        fireEvent.click(screen.getByText('pic.png'));

        await waitFor(() => {
            const img = screen.getByAltText('pic.png');
            expect(img).toHaveAttribute('src', 'blob:mock-preview');
        });
    });

    it('opens empty code file without getting stuck in loading state', async () => {
        const mockRunLocalDesktopTool = jest.fn().mockResolvedValue({
            ok: true,
            rawData: { path: '/workspace/note.md', content: '' }
        });

        (window as any).aigeniusDesktop = {
            runLocalDesktopTool: mockRunLocalDesktopTool
        };

        render(<FilePreviewModal />);

        await act(async () => {
            filePreviewEmitter.emit('open', {
                type: 'code',
                name: 'note.md',
                url: 'local-file:///workspace/note.md',
                localPath: '/workspace/note.md',
                textContent: '// Loading code...'
            });
        });

        await waitFor(() => {
            const editor = screen.getByTestId('monaco-editor');
            expect(editor).toBeInTheDocument();
            expect(editor).toHaveTextContent('');
        });

        expect(screen.queryByText('// Loading code...')).not.toBeInTheDocument();
        expect(mockRunLocalDesktopTool).toHaveBeenCalledWith({
            tool: 'local_read_file',
            arguments: { path: '/workspace/note.md' },
        });
        const readFileCalls = mockRunLocalDesktopTool.mock.calls.filter(
            (call: any[]) => call[0]?.tool === 'local_read_file',
        );
        expect(readFileCalls).toHaveLength(1);
    });
});
