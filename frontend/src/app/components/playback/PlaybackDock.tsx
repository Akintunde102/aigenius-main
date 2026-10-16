'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, Square, Undo2 } from 'lucide-react';
import { RenderErrorBoundary } from '@/app/components/RenderErrorBoundary';
import { openSpeechTrackingModal } from '@/app/components/modals/SpeechTrackingManager';
import { openVideoTrackingModal } from '@/app/components/modals/VideoTrackingManager';
import {
    attachDockPlayback,
    getPlaybackSession,
    notePlaybackDetached,
    notePlaybackStarted,
    stopPlayback,
    subscribePlayback,
    syncPlaybackTransport,
    togglePlayback,
    type PlaybackSession,
    type PlaybackSource,
} from './playback-session';

function asPlaybackSource(node: EventTarget | null): HTMLMediaElement | null {
    if (!(node instanceof HTMLMediaElement)) return null;
    return node;
}

function returnToSource(session: PlaybackSession): void {
    const live = session.media;
    if (live && live.isConnected && live.dataset.playbackDock !== '1' && !session.adopted) {
        live.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    const key = session.returnTo || '';
    if (key.startsWith('speech:')) {
        openSpeechTrackingModal({ identifier: key.slice('speech:'.length), title: session.title });
        return;
    }
    if (key.startsWith('video:')) {
        openVideoTrackingModal({ identifier: key.slice('video:'.length), title: session.title });
    }
}

export const PlaybackDock: React.FC = () => {
    const [session, setSession] = useState<PlaybackSession | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const activeRef = useRef<PlaybackSource | null>(null);

    useEffect(() => subscribePlayback(() => setSession(getPlaybackSession())), []);

    useEffect(() => {
        activeRef.current = session?.media ?? null;
    }, [session]);

    useEffect(() => {
        const onPlay = (event: Event) => {
            const media = asPlaybackSource(event.target);
            if (!media || media.dataset.playbackDock === '1') return;
            notePlaybackStarted(media);
        };
        const onTransport = (event: Event) => {
            const media = asPlaybackSource(event.target);
            if (!media || media !== activeRef.current) return;
            syncPlaybackTransport();
        };
        document.addEventListener('play', onPlay, true);
        document.addEventListener('pause', onTransport, true);
        document.addEventListener('ended', onTransport, true);
        return () => {
            document.removeEventListener('play', onPlay, true);
            document.removeEventListener('pause', onTransport, true);
            document.removeEventListener('ended', onTransport, true);
        };
    }, []);

    useEffect(() => {
        const observer = new MutationObserver(() => {
            const media = activeRef.current;
            if (!media || media.isConnected || media.dataset.playbackDock === '1') return;
            const handoff = notePlaybackDetached(media);
            if (!handoff) return;
            const dock = media.tagName.toLowerCase() === 'video' ? videoRef.current : audioRef.current;
            if (!dock) return;
            dock.src = handoff.src;
            dock.currentTime = handoff.time;
            attachDockPlayback(dock);
            if (!handoff.paused) void dock.play().catch(() => undefined);
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, []);

    if (!session) return null;

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
            <RenderErrorBoundary logLabel="[playback-dock]">
                <div
                    className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-2xl border px-3 py-2 shadow-lg"
                    style={{
                        background: 'var(--modal-bg)',
                        borderColor: 'var(--modal-border)',
                        color: 'var(--modal-fg)',
                    }}
                    role="region"
                    aria-label="Now playing"
                >
                    <audio ref={audioRef} data-playback-dock="1" preload="auto" className="hidden" />
                    <video ref={videoRef} data-playback-dock="1" preload="auto" className="hidden" playsInline />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{session.title}</p>
                        <p className="text-xs" style={{ color: 'var(--modal-muted-fg)' }}>
                            {session.paused ? 'Paused' : 'Playing'}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="app-modal-btn-secondary px-2 py-1 text-xs"
                        onClick={() => togglePlayback()}
                        aria-label={session.paused ? 'Resume' : 'Pause'}
                    >
                        {session.paused ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
                    </button>
                    <button
                        type="button"
                        className="app-modal-btn-secondary px-2 py-1 text-xs"
                        onClick={() => stopPlayback()}
                        aria-label="Stop"
                    >
                        <Square className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                        type="button"
                        className="app-modal-btn-secondary px-2 py-1 text-xs"
                        onClick={() => returnToSource(session)}
                        aria-label="Back to this item"
                    >
                        <Undo2 className="h-4 w-4" aria-hidden />
                    </button>
                </div>
            </RenderErrorBoundary>
        </div>
    );
};
