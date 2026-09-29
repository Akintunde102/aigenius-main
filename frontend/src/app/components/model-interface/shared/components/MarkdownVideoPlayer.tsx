'use client';

import React from 'react';
import clsx from 'clsx';

import {
    isEmbeddableAudioFileUrl,
    mimeTypeForMediaUrl,
} from '@/lib/utils/markdown-media-embed.utils';

export interface MarkdownVideoPlayerProps {
    src: string;
    title?: string;
    className?: string;
}

export function MarkdownVideoPlayer({ src, title, className }: MarkdownVideoPlayerProps) {
    const label = title?.trim() || 'Video';
    const mimeType = mimeTypeForMediaUrl(src);

    if (isEmbeddableAudioFileUrl(src)) {
        return (
            <audio
                className={clsx('markdown-media-embed markdown-media-embed--audio', className)}
                controls
                preload="metadata"
                src={src}
                title={label}
            >
                <track kind="captions" />
            </audio>
        );
    }

    return (
        <div className={clsx('markdown-media-embed markdown-media-embed--video', className)}>
            <video controls playsInline preload="metadata" title={label} src={src}>
                {mimeType ? <source src={src} type={mimeType} /> : null}
            </video>
        </div>
    );
}
