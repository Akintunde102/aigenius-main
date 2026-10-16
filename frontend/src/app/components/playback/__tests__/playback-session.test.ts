import {
    claimPlaybackSrc,
    getPlaybackSession,
    isPlaybackSrcClaimed,
    notePlaybackDetached,
    notePlaybackStarted,
    resetPlaybackSessionForTests,
    stopPlayback,
    togglePlayback,
} from '../playback-session';

describe('playback session', () => {
    beforeEach(() => {
        resetPlaybackSessionForTests();
        URL.revokeObjectURL = jest.fn();
    });

    function media(title: string, src = 'https://cdn.example/a.mp3'): HTMLAudioElement {
        const el = document.createElement('audio');
        el.src = src;
        el.title = title;
        el.pause = jest.fn();
        el.play = jest.fn();
        return el;
    }

    it('tracks the media that just started and pauses the previous one', () => {
        const first = media('Poem');
        const second = media('Clip', 'https://cdn.example/b.mp4');
        second.dataset.playbackReturn = 'video:job-1';
        notePlaybackStarted(first);
        notePlaybackStarted(second);
        expect(first.pause).toHaveBeenCalled();
        expect(getPlaybackSession()?.title).toBe('Clip');
        expect(getPlaybackSession()?.returnTo).toBe('video:job-1');
        expect(getPlaybackSession()?.kind).toBe('audio');
    });

    it('pauses and stops the active item', () => {
        const el = media('Poem');
        Object.defineProperty(el, 'paused', { value: false, writable: true });
        notePlaybackStarted(el);
        togglePlayback();
        expect(el.pause).toHaveBeenCalled();
        expect(getPlaybackSession()?.paused).toBe(true);
        stopPlayback();
        expect(getPlaybackSession()).toBeNull();
    });

    it('keeps a blob url claimed after the source view closes', () => {
        const el = media('Poem', 'blob:speech-1');
        notePlaybackStarted(el);
        const handoff = notePlaybackDetached(el);
        expect(handoff?.src).toBe('blob:speech-1');
        expect(isPlaybackSrcClaimed('blob:speech-1')).toBe(true);
        expect(getPlaybackSession()?.adopted).toBe(true);
        claimPlaybackSrc('blob:speech-1');
        stopPlayback();
        expect(isPlaybackSrcClaimed('blob:speech-1')).toBe(false);
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:speech-1');
    });

    it('ignores the dock player itself', () => {
        const el = media('Dock');
        el.dataset.playbackDock = '1';
        notePlaybackStarted(el);
        expect(getPlaybackSession()).toBeNull();
    });
});
