'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Maximize2, Minimize2 } from 'lucide-react';

import {
    isEmbeddableAudioFileUrl,
    mimeTypeForMediaUrl,
} from '@/lib/utils/markdown-media-embed.utils';
import { isMediaFullscreenActive, toggleMediaFullscreen } from '@/lib/utils/media-fullscreen';

import './markdown-renderer.scss';

export interface MarkdownVideoPlayerProps {
    src: string;
    title?: string;
    className?: string;
    /** `speech:<id>` or `video:<id>` so the now-playing bar can reopen this view. */
    playbackReturn?: string;
}

export function MarkdownVideoPlayer({ src, title, className, playbackReturn }: MarkdownVideoPlayerProps) {
    const label = title?.trim() || 'Video';
    const mimeType = mimeTypeForMediaUrl(src);
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [fsActive, setFsActive] = useState(false);

    const syncFullscreenState = useCallback(() => {
        setFsActive(isMediaFullscreenActive());
    }, []);

    useEffect(() => {
        document.addEventListener('fullscreenchange', syncFullscreenState);
        document.addEventListener('webkitfullscreenchange', syncFullscreenState);
        return () => {
            document.removeEventListener('fullscreenchange', syncFullscreenState);
            document.removeEventListener('webkitfullscreenchange', syncFullscreenState);
        };
    }, [syncFullscreenState]);

    const handleToggleFullscreen = useCallback(() => {
        void toggleMediaFullscreen(containerRef.current, videoRef.current);
    }, []);

    if (isEmbeddableAudioFileUrl(src)) {
        return (
            <audio
                className={clsx('markdown-media-embed markdown-media-embed--audio', className)}
                controls
                preload="metadata"
                src={src}
                title={label}
                data-playback-title={label}
                data-playback-return={playbackReturn}
            >
                <track kind="captions" />
            </audio>
        );
    }

    return (
        <div
            ref={containerRef}
            className={clsx('markdown-media-embed markdown-media-embed--video', className)}
        >
            <video
                ref={videoRef}
                controls
                playsInline
                preload="metadata"
                title={label}
                src={src}
                className="markdown-media-embed__video"
                data-playback-title={label}
                data-playback-return={playbackReturn}
                onDoubleClick={handleToggleFullscreen}
            >
                {mimeType ? <source src={src} type={mimeType} /> : null}
            </video>
            <button
                type="button"
                className="markdown-media-embed__fullscreen"
                onClick={handleToggleFullscreen}
                aria-label={fsActive ? 'Exit fullscreen' : 'Enter fullscreen'}
                title={fsActive ? 'Exit fullscreen' : 'Fullscreen'}
            >
                {fsActive ? <Minimize2 className="h-4 w-4" aria-hidden /> : <Maximize2 className="h-4 w-4" aria-hidden />}
            </button>
        </div>
    );
}
