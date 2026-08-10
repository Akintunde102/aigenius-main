'use client';

import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

import { buildLocalFilePreviewPayload } from '@/lib/utils/local-file-link';
import { openFilePreview } from '@/app/components/modals/FilePreviewManager';
import { getAigeniusDesktopBridgeFromBrowsingContext, isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';
import {
    getCachedLocalFileImageUrl,
    releaseCachedLocalFileImageUrl,
    retainCachedLocalFileImageUrl,
} from './local-file-inline-image-cache';

function base64ToObjectUrl(base64: string, mimeType: string): string {
    const byteCharacters = atob(base64);
    const byteArrays: Uint8Array[] = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        byteArrays.push(new Uint8Array(byteNumbers));
    }
    const blob = new Blob(byteArrays, { type: mimeType });
    return URL.createObjectURL(blob);
}

export interface LocalFileInlineImageProps {
    path: string;
    alt?: string;
    className?: string;
}

export function LocalFileInlineImage({ path, alt, className }: LocalFileInlineImageProps) {
    const cachedOnMount = getCachedLocalFileImageUrl(path);
    const [objectUrl, setObjectUrl] = useState<string | null>(cachedOnMount);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(!cachedOnMount);
    const retainedRef = useRef(false);

    useEffect(() => {
        let cancelled = false;

        const retain = (url: string) => {
            if (!retainedRef.current) {
                retainCachedLocalFileImageUrl(path, url);
                retainedRef.current = true;
            }
        };

        const load = async () => {
            const cached = getCachedLocalFileImageUrl(path);
            if (cached) {
                retain(cached);
                setObjectUrl(cached);
                setError(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            setObjectUrl(null);

            if (!path.trim()) {
                setError('Missing file path');
                setLoading(false);
                return;
            }

            if (!isAigeniusDesktopRuntime()) {
                setError('Local images render in the desktop app only');
                setLoading(false);
                return;
            }

            const bridge = getAigeniusDesktopBridgeFromBrowsingContext();
            const reader = bridge?.readLocalFilePreview;
            if (!reader) {
                setError('Desktop preview bridge unavailable');
                setLoading(false);
                return;
            }

            try {
                const res = await reader(path);
                if (cancelled) return;

                if (!res.ok) {
                    setError(res.error || 'Failed to load image');
                    setLoading(false);
                    return;
                }

                if (res.kind !== 'image') {
                    setError('File is not an image');
                    setLoading(false);
                    return;
                }

                const url = base64ToObjectUrl(res.base64, res.mimeType);
                retain(url);
                setObjectUrl(url);
                setLoading(false);
            } catch (e) {
                if (cancelled) return;
                setError(e instanceof Error ? e.message : 'Failed to load image');
                setLoading(false);
            }
        };

        void load();

        return () => {
            cancelled = true;
            if (retainedRef.current) {
                releaseCachedLocalFileImageUrl(path);
                retainedRef.current = false;
            }
        };
    }, [path]);

    const label = alt?.trim() || path.split(/[/\\]/).pop() || path;

    const openPreview = () => {
        openFilePreview(buildLocalFilePreviewPayload(path));
    };

    if (loading) {
        return (
            <span
                className={clsx('local-file-inline-image local-file-inline-image--loading', className)}
                aria-label={`Loading ${label}`}
            >
                Loading image…
            </span>
        );
    }

    if (error || !objectUrl) {
        return (
            <button
                type="button"
                onClick={openPreview}
                className={clsx('local-file-inline-image local-file-inline-image--error', className)}
                title={path}
            >
                {label} (click to preview)
            </button>
        );
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element -- blob URLs from the desktop bridge are not compatible with next/image.
        <img
            src={objectUrl}
            alt={label}
            className={clsx('local-file-inline-image', className)}
            onClick={openPreview}
            title={`Open preview: ${path}`}
        />
    );
}
