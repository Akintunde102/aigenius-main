'use client';

import React, { useState } from 'react';
import clsx from 'clsx';

import {
    buildYoutubeEmbedUrl,
    extractYoutubeVideoId,
    youtubePosterUrl,
} from '@/lib/utils/youtube-embed.utils';

export interface MarkdownYoutubeEmbedProps {
    watchUrl: string;
    title?: string;
    className?: string;
}

export function MarkdownYoutubeEmbed({ watchUrl, title, className }: MarkdownYoutubeEmbedProps) {
    const videoId = extractYoutubeVideoId(watchUrl);
    const [playing, setPlaying] = useState(false);
    const iframeTitle = title?.trim() || 'YouTube video';

    if (!videoId) {
        return (
            <a href={watchUrl} target="_blank" rel="noopener noreferrer" className={className}>
                {title || watchUrl}
            </a>
        );
    }

    if (!playing) {
        return (
            <button
                type="button"
                className={clsx('markdown-youtube-embed', className)}
                data-youtube-embed={videoId}
                aria-label={`Play ${iframeTitle}`}
                onClick={() => setPlaying(true)}
            >
                <img
                    className="markdown-youtube-embed__poster"
                    src={youtubePosterUrl(videoId)}
                    alt=""
                />
                <span className="markdown-youtube-embed__play" aria-hidden="true" />
            </button>
        );
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const embedSrc = buildYoutubeEmbedUrl(videoId, { autoplay: true, origin });

    return (
        <div
            className={clsx('markdown-youtube-embed', className)}
            data-youtube-embed={videoId}
        >
            <iframe
                src={embedSrc}
                title={iframeTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
            />
        </div>
    );
}
