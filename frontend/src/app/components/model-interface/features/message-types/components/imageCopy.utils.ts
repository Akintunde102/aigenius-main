'use client';

import copy from 'copy-to-clipboard';

export interface CopyImageTargetOptions {
    image?: HTMLImageElement | null;
    canvas?: HTMLCanvasElement | null;
    fileUrl?: string | null;
    fileName?: string | null;
    localPath?: string | null;
}

/**
 * Converts a data: URL to a binary Blob without text serialization.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
    const parts = dataUrl.split(',');
    const match = parts[0]?.match(/:(.*?);/);
    const mime = match ? match[1] : 'image/png';
    const binary = atob(parts[1] || '');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
}

/**
 * Ensures an image blob is encoded as 'image/png', required by the standard ClipboardItem API.
 */
export async function convertBlobToPng(blob: Blob): Promise<Blob> {
    if (blob.type === 'image/png') return blob;
    if (typeof window === 'undefined') return blob;

    if (typeof createImageBitmap === 'function') {
        try {
            const bitmap = await createImageBitmap(blob);
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(bitmap, 0, 0);
                const png = await new Promise<Blob | null>((resolve) => {
                    canvas.toBlob((b) => resolve(b), 'image/png');
                });
                if (png) return png;
            }
        } catch {
            // fall through to image element fallback
        }
    }

    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.onload = () => {
            URL.revokeObjectURL(url);
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    canvas.toBlob((png) => resolve(png || blob), 'image/png');
                    return;
                }
            } catch {
                // fall through
            }
            resolve(blob);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(blob);
        };
        img.src = url;
    });
}

/**
 * Copies an image to the system clipboard as a binary image file / bitmap.
 *
 * Guaranteed: NEVER falls back to writing base64 strings (data:image/...) to clipboard.
 */
export async function copyImageToClipboard(
    options: CopyImageTargetOptions,
): Promise<boolean> {
    try {
        const { image, canvas, fileUrl, localPath } = options;

        // 1. Check desktop bridge first if available
        const bridge = typeof window !== 'undefined'
            ? (window as {
                aigeniusDesktop?: {
                    copyImageToClipboard?: (payload: { dataUrl?: string; filePath?: string }) => Promise<{ ok: boolean; error?: string }>;
                    copyFileToClipboard?: (filePath: string) => Promise<{ ok: boolean; error?: string }>;
                };
            }).aigeniusDesktop
            : undefined;

        // If localPath is provided and desktop bridge exists, try desktop native copy
        if (bridge?.copyImageToClipboard && localPath) {
            try {
                const res = await bridge.copyImageToClipboard({ filePath: localPath });
                if (res?.ok) return true;
            } catch {
                // fall through
            }
        }

        // 2. Prepare canvas composition if image is available
        let outCanvas: HTMLCanvasElement | null = null;
        let compositedDataUrl: string | null = null;
        let compositedBlob: Blob | null = null;

        if (image) {
            try {
                const w = image.naturalWidth || canvas?.width || image.clientWidth;
                const h = image.naturalHeight || canvas?.height || image.clientHeight;
                if (w > 0 && h > 0) {
                    outCanvas = document.createElement('canvas');
                    outCanvas.width = w;
                    outCanvas.height = h;
                    const ctx = outCanvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(image, 0, 0, w, h);
                        if (canvas && canvas.width > 0 && canvas.height > 0) {
                            ctx.drawImage(canvas, 0, 0, w, h);
                        }

                        try {
                            compositedDataUrl = outCanvas.toDataURL('image/png');
                        } catch {
                            // Canvas may be tainted by CORS
                            compositedDataUrl = null;
                        }

                        try {
                            compositedBlob = await new Promise<Blob | null>((resolve) => {
                                outCanvas!.toBlob((b) => resolve(b), 'image/png');
                            });
                        } catch {
                            compositedBlob = null;
                        }
                    }
                }
            } catch {
                // fall through
            }
        }

        // If in desktop and we have a dataUrl from the canvas or source
        if (bridge?.copyImageToClipboard) {
            const targetDataUrl = compositedDataUrl || (fileUrl?.startsWith('data:') ? fileUrl : null);
            if (targetDataUrl) {
                try {
                    const res = await bridge.copyImageToClipboard({
                        dataUrl: targetDataUrl,
                        filePath: localPath || undefined,
                    });
                    if (res?.ok) return true;
                } catch {
                    // fall through to web clipboard
                }
            }
        }

        // 3. Web Clipboard API: navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        let blobToWrite: Blob | null = compositedBlob;

        // If no composited blob yet, check dataUrl or fetch
        if (!blobToWrite && fileUrl) {
            if (fileUrl.startsWith('data:')) {
                try {
                    const rawBlob = dataUrlToBlob(fileUrl);
                    blobToWrite = await convertBlobToPng(rawBlob);
                } catch {
                    // ignore
                }
            } else if (fileUrl.startsWith('blob:')) {
                try {
                    const res = await fetch(fileUrl);
                    if (res.ok) {
                        const rawBlob = await res.blob();
                        blobToWrite = await convertBlobToPng(rawBlob);
                    }
                } catch {
                    // ignore
                }
            } else if (/^https?:\/\//i.test(fileUrl)) {
                try {
                    const res = await fetch(fileUrl, { mode: 'cors' });
                    if (res.ok) {
                        const rawBlob = await res.blob();
                        blobToWrite = await convertBlobToPng(rawBlob);
                    }
                } catch {
                    // ignore
                }
            }
        }

        if (blobToWrite && typeof navigator !== 'undefined' && navigator.clipboard?.write) {
            try {
                const finalPngBlob = blobToWrite.type === 'image/png'
                    ? blobToWrite
                    : await convertBlobToPng(blobToWrite);

                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': finalPngBlob }),
                ]);
                return true;
            } catch {
                // failed to write binary blob to clipboard
            }
        }

        // NOTE: Never copy base64 text into the clipboard!
        return false;
    } catch {
        return false;
    }
}

/**
 * Resolves a URL to an absolute URL if relative, preserving existing protocol schemes.
 */
export function resolveAbsoluteUrl(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
        return trimmed;
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
        try {
            return new URL(trimmed, window.location.origin).href;
        } catch {
            return trimmed;
        }
    }
    return trimmed;
}

/**
 * Copies text (such as an image link or URL) to the system clipboard across both
 * desktop Electron (which denies navigator.clipboard.writeText by default) and modern web browsers.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
    const trimmed = text.trim();
    if (!trimmed) return false;

    // 1. Desktop bridge IPC (electron main clipboard.writeText)
    const bridge = typeof window !== 'undefined'
        ? (window as {
            aigeniusDesktop?: {
                copyTextToClipboard?: (t: string) => Promise<{ ok: boolean; error?: string }>;
            };
        }).aigeniusDesktop
        : undefined;

    if (bridge?.copyTextToClipboard) {
        try {
            const res = await bridge.copyTextToClipboard(trimmed);
            if (res?.ok) return true;
        } catch {
            // fall through
        }
    }

    // 2. copy-to-clipboard (uses document.execCommand('copy'), supported in Electron renderer and browsers)
    try {
        if (copy(trimmed)) {
            return true;
        }
    } catch {
        // fall through
    }

    // 3. Web Clipboard API (navigator.clipboard.writeText)
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(trimmed);
            return true;
        } catch {
            // fall through
        }
    }

    // 4. Fallback offscreen textarea execCommand
    try {
        if (typeof document !== 'undefined') {
            const textarea = document.createElement('textarea');
            textarea.value = trimmed;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            if (success) return true;
        }
    } catch {
        // ignore
    }

    return false;
}

