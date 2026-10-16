'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    GripVertical,
    Headphones,
    MessageSquare,
    Pause,
    Play,
    RotateCcw,
    RotateCw,
    Square,
    Video,
} from 'lucide-react';
import { RenderErrorBoundary } from '@/app/components/RenderErrorBoundary';
import { openSpeechTrackingModal } from '@/app/components/modals/SpeechTrackingManager';
import { openVideoTrackingModal } from '@/app/components/modals/VideoTrackingManager';
import {
    attachDockPlayback,
    formatMediaTime,
    getPlaybackSession,
    notePlaybackDetached,
    notePlaybackStarted,
    seekPlayback,
    skipPlayback,
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

function returnToSource(session: PlaybackSession, router?: { push: (url: string) => void }): void {
    if (session.conversationId && typeof window !== 'undefined') {
        const targetPath = `/chat/${session.conversationId}`;
        if (window.location.pathname !== targetPath && router?.push) {
            router.push(targetPath);
            return;
        }
    }

    const live = session.media;
    if (live && live.isConnected && live.dataset.playbackDock !== '1' && !session.adopted) {
        if (typeof live.scrollIntoView === 'function') {
            live.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }

    const key = session.returnTo || '';
    if (key.startsWith('speech:')) {
        openSpeechTrackingModal({
            identifier: key.slice('speech:'.length),
            title: session.title,
            conversationId: session.conversationId || undefined,
        });
        return;
    }
    if (key.startsWith('video:')) {
        openVideoTrackingModal({
            identifier: key.slice('video:'.length),
            title: session.title,
            conversationId: session.conversationId || undefined,
        });
    }
}

export const PlaybackDock: React.FC = () => {
    const router = useRouter();
    const [session, setSession] = useState<PlaybackSession | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
        if (typeof window === 'undefined') return null;
        try {
            const saved = sessionStorage.getItem('playback_dock_pos');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
                    return parsed;
                }
            }
        } catch {
            /* ignore */
        }
        return null;
    });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

    const dockRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const activeRef = useRef<PlaybackSource | null>(null);

    useEffect(() => subscribePlayback(() => {
        const s = getPlaybackSession();
        setSession(s);
        if (s) {
            if (s.currentTime > 0) setCurrentTime(s.currentTime);
            if (s.duration > 0) setDuration(s.duration);
        }
    }), []);

    useEffect(() => {
        activeRef.current = session?.media ?? null;
    }, [session]);

    // Listen to time updates from active media element
    useEffect(() => {
        const media = session?.media;
        if (!media) return;

        const syncTimes = () => {
            if (Number.isFinite(media.currentTime)) {
                setCurrentTime(media.currentTime);
            }
            if (Number.isFinite(media.duration) && media.duration > 0) {
                setDuration(media.duration);
            }
        };

        media.addEventListener('timeupdate', syncTimes);
        media.addEventListener('loadedmetadata', syncTimes);
        media.addEventListener('durationchange', syncTimes);
        media.addEventListener('progress', syncTimes);
        syncTimes();

        return () => {
            media.removeEventListener('timeupdate', syncTimes);
            media.removeEventListener('loadedmetadata', syncTimes);
            media.removeEventListener('durationchange', syncTimes);
            media.removeEventListener('progress', syncTimes);
        };
    }, [session?.media]);

    useEffect(() => {
        const onPlay = (event: Event) => {
            const media = asPlaybackSource(event.target);
            if (!media || media.dataset.playbackDock === '1') return;
            notePlaybackStarted(media);
        };
        const onTransport = (event: Event) => {
            const media = asPlaybackSource(event.target);
            if (!media || media !== activeRef.current) return;
            // When an element is disconnected from the DOM, browser fires pause.
            // Ignore this event so detached handoff does not think the user paused!
            if (event.type === 'pause' && !media.isConnected) return;
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
            if (!handoff.paused) {
                try {
                    const p = dock.play();
                    if (p && typeof p.catch === 'function') {
                        void p.catch(() => undefined);
                    }
                } catch {
                    /* ignore synchronous play errors in tests */
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, []);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, input, a')) return;

        const dock = dockRef.current;
        if (!dock) return;

        const rect = dock.getBoundingClientRect();
        dragStartRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialX: rect.left,
            initialY: rect.top,
        };
        setIsDragging(true);
        if (typeof dock.setPointerCapture === 'function') {
            try {
                dock.setPointerCapture(e.pointerId);
            } catch {
                /* ignore */
            }
        }
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!dragStartRef.current || !dockRef.current) return;
        const { startX, startY, initialX, initialY } = dragStartRef.current;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        const dockRect = dockRef.current.getBoundingClientRect();
        const width = dockRect.width;
        const height = dockRect.height;

        const minX = 8;
        const maxX = Math.max(minX, window.innerWidth - width - 8);
        const minY = 8;
        const maxY = Math.max(minY, window.innerHeight - height - 8);

        const nextX = Math.min(maxX, Math.max(minX, initialX + deltaX));
        const nextY = Math.min(maxY, Math.max(minY, initialY + deltaY));

        const nextPos = { x: Math.round(nextX), y: Math.round(nextY) };
        setPosition(nextPos);
        try {
            sessionStorage.setItem('playback_dock_pos', JSON.stringify(nextPos));
        } catch {
            /* ignore */
        }
    }, []);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (!dragStartRef.current) return;
        dragStartRef.current = null;
        setIsDragging(false);
        if (typeof dockRef.current?.releasePointerCapture === 'function') {
            try {
                if (dockRef.current.hasPointerCapture(e.pointerId)) {
                    dockRef.current.releasePointerCapture(e.pointerId);
                }
            } catch {
                /* ignore */
            }
        }
    }, []);

    if (!session) return null;

    const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
    const isVideo = session.kind === 'video';

    return (
        <RenderErrorBoundary logLabel="[playback-dock]">
            <div
                ref={dockRef}
                className={`pointer-events-auto fixed z-[60] flex flex-col gap-2 rounded-2xl border px-3.5 py-2.5 shadow-2xl backdrop-blur-md transition-shadow duration-150 select-none ${
                    isDragging ? 'cursor-grabbing shadow-[0_25px_35px_rgba(0,0,0,0.35)] ring-2 ring-[var(--chat-accent)] scale-[1.01]' : ''
                } w-[calc(100vw-32px)] sm:w-[440px] max-w-[480px]`}
                style={{
                    background: 'color-mix(in srgb, var(--modal-bg) 94%, transparent)',
                    borderColor: isDragging ? 'var(--chat-accent)' : 'var(--modal-border)',
                    color: 'var(--modal-fg)',
                    left: position ? `${position.x}px` : '16px',
                    top: position ? `${position.y}px` : undefined,
                    bottom: position ? undefined : '16px',
                    touchAction: 'none',
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                role="region"
                aria-label="Now playing"
            >
                <audio ref={audioRef} data-playback-dock="1" preload="auto" className="hidden" />
                <video ref={videoRef} data-playback-dock="1" preload="auto" className="hidden" playsInline />

                {/* Top Row: Drag Handle, Icon, Title, Status & Controls */}
                <div className="flex items-center gap-2.5">
                    {/* Drag Grip Handle */}
                    <div
                        className="flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-grab active:cursor-grabbing -ml-1 pr-0.5"
                        title="Drag to move anywhere"
                        aria-label="Drag player"
                    >
                        <GripVertical className="h-4 w-4" aria-hidden="true" />
                    </div>

                    {/* Media Icon & Equalizer Visualizer */}
                    <div
                        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
                        style={{
                            background: 'var(--surface-muted)',
                            borderColor: 'var(--modal-border)',
                            color: 'var(--chat-accent)',
                        }}
                        title={isVideo ? 'Video playback' : 'Audio playback'}
                    >
                        {!session.paused ? (
                            <div className="flex items-end gap-0.5 h-3.5 w-3.5 justify-center" aria-hidden="true">
                                <span
                                    className="w-0.5 rounded-full animate-pulse"
                                    style={{ height: '70%', background: 'var(--chat-accent)' }}
                                />
                                <span
                                    className="w-0.5 rounded-full animate-pulse"
                                    style={{ height: '100%', background: 'var(--chat-accent)', animationDelay: '150ms' }}
                                />
                                <span
                                    className="w-0.5 rounded-full animate-pulse"
                                    style={{ height: '50%', background: 'var(--chat-accent)', animationDelay: '300ms' }}
                                />
                            </div>
                        ) : isVideo ? (
                            <Video className="h-4 w-4" aria-hidden="true" />
                        ) : (
                            <Headphones className="h-4 w-4" aria-hidden="true" />
                        )}
                    </div>

                    {/* Title and Meta Info */}
                    <div className="min-w-0 flex-1">
                        <button
                            type="button"
                            onClick={() => returnToSource(session, router)}
                            className="truncate text-left text-xs sm:text-sm font-semibold hover:underline block max-w-full"
                            title={`Return to source: ${session.title}`}
                        >
                            {session.title}
                        </button>
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--modal-muted-fg)' }}>
                            <span className="inline-flex items-center gap-1 font-medium text-[11px]">
                                <span
                                    className={`h-1.5 w-1.5 rounded-full ${session.paused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}
                                />
                                <span style={{ color: session.paused ? '#d97706' : '#10b981' }}>
                                    {session.paused ? 'Paused' : 'Playing'}
                                </span>
                            </span>
                            {session.subtitle ? (
                                <>
                                    <span>•</span>
                                    <span className="truncate max-w-[120px] text-[11px]">{session.subtitle}</span>
                                </>
                            ) : null}
                            {session.conversationId ? (
                                <>
                                    <span>•</span>
                                    <span
                                        className="text-[10px] px-1 py-0.2 rounded font-mono font-medium"
                                        style={{ background: 'var(--surface-muted)' }}
                                    >
                                        Convo
                                    </span>
                                </>
                            ) : null}
                        </div>
                    </div>

                    {/* Transport Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            type="button"
                            className="app-modal-btn-secondary !p-1 text-xs rounded-lg"
                            onClick={() => skipPlayback(-5)}
                            aria-label="Rewind 5 seconds"
                            title="Rewind 5s"
                        >
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>

                        <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm transition hover:opacity-90 active:scale-95"
                            style={{ background: 'var(--chat-accent)' }}
                            onClick={() => togglePlayback()}
                            aria-label={session.paused ? 'Resume' : 'Pause'}
                            title={session.paused ? 'Play' : 'Pause'}
                        >
                            {session.paused ? (
                                <Play className="h-3.5 w-3.5 fill-current ml-0.5" aria-hidden="true" />
                            ) : (
                                <Pause className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                            )}
                        </button>

                        <button
                            type="button"
                            className="app-modal-btn-secondary !p-1 text-xs rounded-lg"
                            onClick={() => skipPlayback(5)}
                            aria-label="Forward 5 seconds"
                            title="Forward 5s"
                        >
                            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>

                        <button
                            type="button"
                            className="app-modal-btn-secondary !p-1 text-xs rounded-lg"
                            onClick={() => returnToSource(session, router)}
                            aria-label="Back to this item"
                            title="Back to conversation"
                        >
                            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>

                        <button
                            type="button"
                            className="app-modal-btn-secondary !p-1 text-xs rounded-lg"
                            onClick={() => stopPlayback()}
                            aria-label="Stop"
                            title="Stop and dismiss"
                        >
                            <Square className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {/* Scrubber / Progress Bar Row */}
                <div className="flex items-center gap-2 pt-0.5">
                    <span className="font-mono text-[11px] tabular-nums shrink-0" style={{ color: 'var(--modal-muted-fg)' }}>
                        {formatMediaTime(currentTime)}
                    </span>

                    <div className="relative flex-1 flex items-center h-4 group cursor-pointer">
                        <input
                            type="range"
                            min={0}
                            max={duration > 0 ? duration : 100}
                            step={0.1}
                            value={duration > 0 ? currentTime : 0}
                            disabled={duration <= 0}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setCurrentTime(val);
                                seekPlayback(val);
                            }}
                            className="w-full h-1.5 rounded-full cursor-pointer appearance-none bg-transparent transition-all focus:outline-none"
                            style={{
                                accentColor: 'var(--chat-accent)',
                                background: `linear-gradient(to right, var(--chat-accent) ${progressPercent}%, var(--surface-muted) ${progressPercent}%)`,
                            }}
                            aria-label="Playback progress"
                        />
                    </div>

                    <span className="font-mono text-[11px] tabular-nums shrink-0" style={{ color: 'var(--modal-muted-fg)' }}>
                        {duration > 0 ? formatMediaTime(duration) : '--:--'}
                    </span>
                </div>
            </div>
        </RenderErrorBoundary>
    );
};
