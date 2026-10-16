export type PlaybackKind = 'audio' | 'video';

export type PlaybackSource = HTMLMediaElement;

export type PlaybackSession = {
    title: string;
    subtitle?: string | null;
    kind: PlaybackKind;
    returnTo: string | null;
    conversationId: string | null;
    src: string;
    paused: boolean;
    currentTime: number;
    duration: number;
    /** Live page element, or the dock element after the source view closes. */
    media: PlaybackSource | null;
    adopted: boolean;
};

const claimedBlobUrls = new Set<string>();
const listeners = new Set<() => void>();

let session: PlaybackSession | null = null;

function emit(): void {
    listeners.forEach((listener) => listener());
}

export function subscribePlayback(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getPlaybackSession(): PlaybackSession | null {
    return session;
}

export function isPlaybackSrcClaimed(src: string): boolean {
    return claimedBlobUrls.has(src);
}

export function claimPlaybackSrc(src: string): void {
    if (src.startsWith('blob:')) claimedBlobUrls.add(src);
}

export function releaseClaimedPlaybackSrc(src: string): void {
    if (!claimedBlobUrls.delete(src)) return;
    if (src.startsWith('blob:') && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(src);
    }
}

function mediaSrc(media: PlaybackSource): string {
    return media.currentSrc || media.src || '';
}

function cleanTitleCandidate(candidate?: string | null): string | null {
    if (!candidate) return null;
    const clean = candidate.replace(/^[🎧🎬▶️\s]+|[🎧🎬▶️\s]+$/g, '').trim();
    if (!clean || /^(track\s+(speech|video|audio)|preview|watch|play)$/i.test(clean)) {
        return null;
    }
    return clean;
}

function readTitle(media: PlaybackSource): string {
    const fromData = cleanTitleCandidate(media.dataset.playbackTitle);
    if (fromData) return fromData;
    const fromTitle = cleanTitleCandidate(media.title);
    if (fromTitle) return fromTitle;
    const returnTo = media.dataset.playbackReturn?.trim();
    if (returnTo && returnTo.includes('_job-')) {
        const raw = returnTo.split('_job-')[0].replace(/^(speech|video):/, '');
        const words = raw.split(/[-_]/).filter(Boolean);
        if (words.length > 0 && !['speech', 'video', 'audio', 'track'].includes(words[0].toLowerCase())) {
            return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
    }
    return media.tagName.toLowerCase() === 'video' ? 'Video' : 'Audio';
}

function readSubtitle(media: PlaybackSource): string | null {
    return media.dataset.playbackSubtitle?.trim() || null;
}

function readConversation(media: PlaybackSource): string | null {
    return media.dataset.playbackConversation?.trim() || null;
}

export function notePlaybackStarted(media: PlaybackSource): void {
    if (media.dataset.playbackDock === '1') return;
    const previous = session?.media;
    if (previous && previous !== media) previous.pause();

    const src = mediaSrc(media);
    if (src.startsWith('blob:')) {
        claimPlaybackSrc(src);
    }

    session = {
        title: readTitle(media),
        subtitle: readSubtitle(media),
        conversationId: readConversation(media),
        kind: media.tagName.toLowerCase() === 'video' ? 'video' : 'audio',
        returnTo: media.dataset.playbackReturn?.trim() || null,
        src,
        paused: false,
        currentTime: Number.isFinite(media.currentTime) ? media.currentTime : 0,
        duration: Number.isFinite(media.duration) ? media.duration : 0,
        media,
        adopted: false,
    };
    emit();
}

export function updatePlaybackSession(updates: Partial<PlaybackSession>): void {
    if (!session) return;
    session = { ...session, ...updates };
    emit();
}

export function syncPlaybackTransport(): void {
    if (!session || !session.media) return;
    const media = session.media;
    const currentTime = Number.isFinite(media.currentTime) ? media.currentTime : session.currentTime;
    const duration = Number.isFinite(media.duration) ? media.duration : session.duration;
    session = {
        ...session,
        paused: media.paused || media.ended,
        currentTime,
        duration,
    };
    if (media.ended) {
        session = null;
    }
    emit();
}

/** Source view closed. Keep the file URL so the dock can continue playback. */
export function notePlaybackDetached(media: PlaybackSource): { src: string; time: number; paused: boolean } | null {
    if (!session || session.media !== media) return null;
    const src = mediaSrc(media);
    const time = Number.isFinite(media.currentTime) ? media.currentTime : (session.currentTime || 0);
    // When an element is disconnected from the DOM, the browser automatically fires pause.
    // If the session was playing before detachment (session.paused === false), the user's intent was
    // to continue listening, so handoff must NOT be paused unless media genuinely ended.
    const paused = media.ended ? true : session.paused;
    if (src.startsWith('blob:')) claimPlaybackSrc(src);
    session = {
        ...session,
        src,
        paused,
        currentTime: time,
        media: null,
        adopted: true,
    };
    emit();
    return { src, time, paused };
}

export function attachDockPlayback(media: PlaybackSource): void {
    if (!session) return;
    session = {
        ...session,
        media,
        paused: media.paused,
        src: mediaSrc(media) || session.src,
        currentTime: Number.isFinite(media.currentTime) ? media.currentTime : session.currentTime,
        duration: Number.isFinite(media.duration) ? media.duration : session.duration,
    };
    emit();
}

export function togglePlayback(): void {
    const media = session?.media;
    if (!media) return;
    const shouldPlay = media.paused || media.ended;
    if (shouldPlay) void media.play().catch(() => undefined);
    else media.pause();
    session = { ...session!, paused: !shouldPlay };
    emit();
}

export function seekPlayback(seconds: number): void {
    const media = session?.media;
    if (!media) return;
    const dur = Number.isFinite(media.duration) ? media.duration : (session?.duration || 0);
    const clamped = Math.max(0, dur > 0 ? Math.min(seconds, dur) : seconds);
    try {
        media.currentTime = clamped;
    } catch {
        /* ignore seek error before loaded */
    }
    session = { ...session!, currentTime: clamped };
    emit();
}

export function skipPlayback(deltaSeconds: number): void {
    const current = session?.currentTime || 0;
    seekPlayback(current + deltaSeconds);
}

export function stopPlayback(): void {
    const current = session;
    if (!current) return;
    current.media?.pause();
    if (current.media) current.media.currentTime = 0;
    if (current.src) releaseClaimedPlaybackSrc(current.src);
    session = null;
    emit();
}

export function formatMediaTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const totalSecs = Math.floor(seconds);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function resetPlaybackSessionForTests(): void {
    session = null;
    claimedBlobUrls.clear();
    listeners.clear();
}
