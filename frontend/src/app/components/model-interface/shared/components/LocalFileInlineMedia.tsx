'use client';

import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

import { buildLocalFilePreviewPayload } from '@/lib/utils/local-file-link';
import { openFilePreview } from '@/app/components/modals/FilePreviewManager';
import { base64ToBlobUrl } from '@/lib/utils/base64-to-blob-url';
import { getAigeniusDesktopBridgeFromBrowsingContext, isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';

export interface LocalFileInlineMediaProps {
    path: string;
    kind: 'video' | 'audio';
    alt?: string;
    className?: string;
}

export function LocalFileInlineMedia({ path, kind, alt, className }: LocalFileInlineMediaProps) {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [mimeType, setMimeType] = useState<string | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const objectUrlRef = useRef<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);

            if (!path.trim()) {
                setError('Missing file path');
                setLoading(false);
                return;
            }

            if (!isAigeniusDesktopRuntime()) {
                setError('Local media renders in the desktop app only');
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
                    setError(res.error || 'Failed to load media');
                    setLoading(false);
                    return;
                }

                if (res.kind !== 'video' && res.kind !== 'audio') {
                    setError('File is not playable media');
                    setLoading(false);
                    return;
                }

                const url = base64ToBlobUrl(res.base64, res.mimeType);
                objectUrlRef.current = url;
                setMimeType(res.mimeType);
                setObjectUrl(url);
                setLoading(false);
            } catch (e) {
                if (cancelled) return;
                setError(e instanceof Error ? e.message : 'Failed to load media');
                setLoading(false);
            }
        };

        void load();

        return () => {
            cancelled = true;
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
        };
    }, [path]);

    const label = alt?.trim() || path.split(/[/\\]/).pop() || path;

    const openPreview = () => {
        openFilePreview(buildLocalFilePreviewPayload(path));
    };

    if (loading) {
        return (
            <span className={clsx('local-file-inline-media local-file-inline-media--loading', className)}>
                Loading {kind}…
            </span>
        );
    }

    if (error || !objectUrl) {
        return (
            <button
                type="button"
                onClick={openPreview}
                className={clsx('local-file-inline-media local-file-inline-media--error', className)}
                title={path}
            >
                {label} (click to preview)
            </button>
        );
    }

    if (kind === 'audio') {
        return (
            <audio
                className={clsx('markdown-media-embed markdown-media-embed--audio', className)}
                controls
                preload="metadata"
                src={objectUrl}
                title={label}
            />
        );
    }

    return (
        <div className={clsx('markdown-media-embed markdown-media-embed--video', className)}>
            <video controls playsInline preload="metadata" title={label} src={objectUrl}>
                {mimeType ? <source src={objectUrl} type={mimeType} /> : null}
            </video>
        </div>
    );
}
