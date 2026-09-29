/**
 * @jest-environment jsdom
 */
import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

import { LocalFileInlineImage } from '../LocalFileInlineImage';
import { clearLocalFileImageCacheForTests } from '../local-file-inline-image-cache';

jest.mock('@/lib/utils/desktop-runtime', () => ({
    isAigeniusDesktopRuntime: jest.fn(() => true),
    getAigeniusDesktopBridgeFromBrowsingContext: jest.fn(),
}));

jest.mock('@/app/components/modals/FilePreviewManager', () => ({
    openFilePreview: jest.fn(),
}));

import {
    getAigeniusDesktopBridgeFromBrowsingContext,
    isAigeniusDesktopRuntime,
} from '@/lib/utils/desktop-runtime';

const mockIsDesktop = isAigeniusDesktopRuntime as jest.MockedFunction<typeof isAigeniusDesktopRuntime>;
const mockGetBridge = getAigeniusDesktopBridgeFromBrowsingContext as jest.MockedFunction<
    typeof getAigeniusDesktopBridgeFromBrowsingContext
>;

describe('LocalFileInlineImage', () => {
    beforeEach(() => {
        global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
        global.URL.revokeObjectURL = jest.fn();
        mockIsDesktop.mockReturnValue(true);
        mockGetBridge.mockReturnValue({
            readLocalFilePreview: jest.fn().mockResolvedValue({
                ok: true,
                kind: 'image',
                mimeType: 'image/png',
                base64: 'ZmFrZS1wbmc=',
            }),
        } as never);
    });

    afterEach(() => {
        cleanup();
        clearLocalFileImageCacheForTests();
        jest.clearAllMocks();
    });

    it('shows loading state then renders the image', async () => {
        render(<LocalFileInlineImage path="C:\\Users\\me\\shot.png" alt="shot" />);
        expect(screen.getByText('Loading image…')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByRole('img', { name: 'shot' })).toBeInTheDocument();
        });
    });

    it('shows a fallback when not in the desktop app', async () => {
        mockIsDesktop.mockReturnValue(false);
        render(<LocalFileInlineImage path="/tmp/a.png" alt="a" />);

        await waitFor(() => {
            expect(screen.getByText('a (click to preview)')).toBeInTheDocument();
        });
    });

    it('shows a fallback when preview fails', async () => {
        mockGetBridge.mockReturnValue({
            readLocalFilePreview: jest.fn().mockResolvedValue({ ok: false, error: 'not_found' }),
        } as never);

        render(<LocalFileInlineImage path="/tmp/missing.png" alt="missing" />);

        await waitFor(() => {
            expect(screen.getByText('missing (click to preview)')).toBeInTheDocument();
        });
    });

    it('re-reads disk when the same path returns new image bytes', async () => {
        const readLocalFilePreview = jest
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                kind: 'image',
                mimeType: 'image/png',
                base64: 'ZmFrZS1wbmc=',
            })
            .mockResolvedValueOnce({
                ok: true,
                kind: 'image',
                mimeType: 'image/png',
                base64: 'bmV3LXNob3Q=',
            });

        mockGetBridge.mockReturnValue({ readLocalFilePreview } as never);

        const { unmount } = render(<LocalFileInlineImage path="/tmp/shot.png" alt="shot" />);
        await waitFor(() => {
            expect(screen.getByRole('img', { name: 'shot' })).toBeInTheDocument();
        });
        expect(readLocalFilePreview).toHaveBeenCalledTimes(1);

        unmount();
        render(<LocalFileInlineImage path="/tmp/shot.png" alt="shot" />);
        await waitFor(() => {
            expect(readLocalFilePreview).toHaveBeenCalledTimes(2);
        });
    });
});
