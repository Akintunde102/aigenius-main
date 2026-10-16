export type PlaybackKind = 'audio' | 'video';

export type PlaybackSource = HTMLMediaElement;

export type PlaybackSession = {
    title: string;
    kind: PlaybackKind;
    returnTo: string | null;
    src: string;
    paused: boolean;
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
    if (src.startsWith('blob:')) URL.revokeObjectURL(src);
}

function mediaSrc(media: PlaybackSource): string {
    return media.currentSrc || media.src || '';
}

function readTitle(media: PlaybackSource): string {
    const fromData = media.dataset.playbackTitle?.trim();
    if (fromData) return fromData;
    const fromTitle = media.title?.trim();
    if (fromTitle) return fromTitle;
    return media.tagName.toLowerCase() === 'video' ? 'Video' : 'Audio';
}

export function notePlaybackStarted(media: PlaybackSource): void {
    if (media.dataset.playbackDock === '1') return;
    const previous = session?.media;
    if (previous && previous !== media) previous.pause();
    session = {
        title: readTitle(media),
        kind: media.tagName.toLowerCase() === 'video' ? 'video' : 'audio',
        returnTo: media.dataset.playbackReturn?.trim() || null,
        src: mediaSrc(media),
        paused: false,
        media,
        adopted: false,
    };
    emit();
}

export function syncPlaybackTransport(): void {
    if (!session || !session.media) return;
    const media = session.media;
    session = { ...session, paused: media.paused || media.ended };
    if (media.ended) {
        session = null;
    }
    emit();
}

/** Source view closed. Keep the file URL so the dock can continue playback. */
export function notePlaybackDetached(media: PlaybackSource): { src: string; time: number; paused: boolean } | null {
    if (!session || session.media !== media) return null;
    const src = mediaSrc(media);
    const time = media.currentTime;
    const paused = media.paused || media.ended;
    if (src.startsWith('blob:')) claimPlaybackSrc(src);
    session = {
        ...session,
        src,
        paused,
        media: null,
        adopted: true,
    };
    emit();
    return { src, time, paused };
}

export function attachDockPlayback(media: PlaybackSource): void {
    if (!session) return;
    session = { ...session, media, paused: media.paused, src: mediaSrc(media) || session.src };
    emit();
}

export function togglePlayback(): void {
    const media = session?.media;
    if (!media) return;
    const shouldPlay = media.paused || media.ended;
    if (shouldPlay) void media.play();
    else media.pause();
    session = { ...session!, paused: !shouldPlay };
    emit();
}

export function stopPlayback(): void {
    const current = session;
    if (!current) return;
    current.media?.pause();
    if (current.media) current.media.currentTime = 0;
    if (current.adopted && current.src) releaseClaimedPlaybackSrc(current.src);
    session = null;
    emit();
}

export function resetPlaybackSessionForTests(): void {
    session = null;
    claimedBlobUrls.clear();
    listeners.clear();
}
