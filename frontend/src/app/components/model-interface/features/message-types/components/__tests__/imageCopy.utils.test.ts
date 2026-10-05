import {
    copyImageToClipboard,
    copyTextToClipboard,
    resolveAbsoluteUrl,
    dataUrlToBlob,
    convertBlobToPng,
} from '../imageCopy.utils';

describe('imageCopy.utils', () => {
    const originalClipboard = navigator.clipboard;
    const originalDesktop = (window as any).aigeniusDesktop;

    afterEach(() => {
        Object.defineProperty(navigator, 'clipboard', {
            value: originalClipboard,
            configurable: true,
            writable: true,
        });
        (window as any).aigeniusDesktop = originalDesktop;
        jest.restoreAllMocks();
    });

    describe('dataUrlToBlob', () => {
        it('converts a base64 png data URL to a binary Blob', () => {
            // 1x1 transparent png
            const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
            const blob = dataUrlToBlob(dataUrl);
            expect(blob).toBeInstanceOf(Blob);
            expect(blob.type).toBe('image/png');
            expect(blob.size).toBeGreaterThan(0);
        });

        it('converts a jpeg data URL to a binary Blob with jpeg mime type', () => {
            const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
            const blob = dataUrlToBlob(dataUrl);
            expect(blob.type).toBe('image/jpeg');
        });
    });

    describe('convertBlobToPng', () => {
        it('returns the same blob if already image/png', async () => {
            const blob = new Blob(['sample'], { type: 'image/png' });
            const result = await convertBlobToPng(blob);
            expect(result).toBe(blob);
        });
    });

    describe('copyImageToClipboard', () => {
        it('delegates to desktop bridge copyImageToClipboard when available for localPath', async () => {
            const mockDesktopCopy = jest.fn().mockResolvedValue({ ok: true });
            (window as any).aigeniusDesktop = {
                copyImageToClipboard: mockDesktopCopy,
            };

            const result = await copyImageToClipboard({
                localPath: 'C:\\Users\\test\\photo.png',
            });

            expect(result).toBe(true);
            expect(mockDesktopCopy).toHaveBeenCalledWith({
                filePath: 'C:\\Users\\test\\photo.png',
            });
        });

        it('delegates to desktop bridge copyImageToClipboard with dataUrl when available', async () => {
            const mockDesktopCopy = jest.fn().mockResolvedValue({ ok: true });
            (window as any).aigeniusDesktop = {
                copyImageToClipboard: mockDesktopCopy,
            };

            const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
            const result = await copyImageToClipboard({
                fileUrl: dataUrl,
            });

            expect(result).toBe(true);
            expect(mockDesktopCopy).toHaveBeenCalledWith({
                dataUrl,
                filePath: undefined,
            });
        });

        it('writes binary image to navigator.clipboard using ClipboardItem in the browser', async () => {
            delete (window as any).aigeniusDesktop;

            const writeMock = jest.fn().mockResolvedValue(undefined);
            Object.defineProperty(navigator, 'clipboard', {
                value: { write: writeMock },
                configurable: true,
                writable: true,
            });

            // Mock ClipboardItem constructor in Node/Jest environment
            (global as any).ClipboardItem = jest.fn().mockImplementation((items) => items);

            const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
            const result = await copyImageToClipboard({
                fileUrl: dataUrl,
            });

            expect(result).toBe(true);
            expect(writeMock).toHaveBeenCalled();
            expect((global as any).ClipboardItem).toHaveBeenCalledWith(
                expect.objectContaining({
                    'image/png': expect.any(Blob),
                }),
            );
        });

        it('never falls back to copying raw base64 string when clipboard write fails', async () => {
            delete (window as any).aigeniusDesktop;

            const writeMock = jest.fn().mockRejectedValue(new Error('Permission denied'));
            Object.defineProperty(navigator, 'clipboard', {
                value: { write: writeMock },
                configurable: true,
                writable: true,
            });

            (global as any).ClipboardItem = jest.fn().mockImplementation((items) => items);

            const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
            const result = await copyImageToClipboard({
                fileUrl: dataUrl,
            });

            // Must fail cleanly rather than dumping base64 text into clipboard
            expect(result).toBe(false);
        });
    });

    describe('resolveAbsoluteUrl', () => {
        it('returns original URL if already absolute http/https', () => {
            expect(resolveAbsoluteUrl('https://example.com/test.png')).toBe('https://example.com/test.png');
            expect(resolveAbsoluteUrl('http://localhost:3000/photo.jpg')).toBe('http://localhost:3000/photo.jpg');
        });

        it('returns original URL if data or blob URL', () => {
            expect(resolveAbsoluteUrl('data:image/png;base64,123')).toBe('data:image/png;base64,123');
            expect(resolveAbsoluteUrl('blob:http://localhost/abc')).toBe('blob:http://localhost/abc');
        });

        it('resolves relative path using window.location.origin', () => {
            const resolved = resolveAbsoluteUrl('/uploads/image.png');
            expect(resolved).toContain('/uploads/image.png');
            expect(resolved.startsWith('http')).toBe(true);
        });
    });

    describe('copyTextToClipboard', () => {
        it('uses desktop bridge copyTextToClipboard when running in Electron desktop', async () => {
            const mockDesktopCopyText = jest.fn().mockResolvedValue({ ok: true });
            (window as any).aigeniusDesktop = {
                copyTextToClipboard: mockDesktopCopyText,
            };

            const result = await copyTextToClipboard('https://example.com/image.png');
            expect(result).toBe(true);
            expect(mockDesktopCopyText).toHaveBeenCalledWith('https://example.com/image.png');
        });

        it('falls back to navigator.clipboard.writeText when copy-to-clipboard returns false', async () => {
            delete (window as any).aigeniusDesktop;

            const writeTextMock = jest.fn().mockResolvedValue(undefined);
            Object.defineProperty(navigator, 'clipboard', {
                value: { writeText: writeTextMock },
                configurable: true,
                writable: true,
            });

            const result = await copyTextToClipboard('https://example.com/photo.png');
            expect(result).toBe(true);
            expect(writeTextMock).toHaveBeenCalledWith('https://example.com/photo.png');
        });
    });
});
