import {
    claimPlaybackSrc,
    formatMediaTime,
    getPlaybackSession,
    isPlaybackSrcClaimed,
    notePlaybackDetached,
    notePlaybackStarted,
    resetPlaybackSessionForTests,
    seekPlayback,
    skipPlayback,
    stopPlayback,
    togglePlayback,
    updatePlaybackSession,
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

    it('keeps a blob url claimed after the source view closes and preserves playing state', () => {
        const el = media('Poem', 'blob:speech-1');
        Object.defineProperty(el, 'paused', { value: false, writable: true });
        notePlaybackStarted(el);
        // While playing, el unmounts and fires detached handoff
        const handoff = notePlaybackDetached(el);
        expect(handoff?.src).toBe('blob:speech-1');
        expect(handoff?.paused).toBe(false);
        expect(isPlaybackSrcClaimed('blob:speech-1')).toBe(true);
        expect(getPlaybackSession()?.adopted).toBe(true);
        expect(getPlaybackSession()?.paused).toBe(false);
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

    it('infers title from slug words when dataset title is generic Track Speech', () => {
        const el = media('🎧 Track Speech');
        el.dataset.playbackTitle = 'Track Speech';
        el.dataset.playbackReturn = 'speech:called-all-witnesses-prosecution_job-abc123';
        notePlaybackStarted(el);
        expect(getPlaybackSession()?.title).toBe('Called All Witnesses Prosecution');
    });

    it('updates playback session metadata and seeks', () => {
        const el = media('My Track');
        Object.defineProperty(el, 'duration', { value: 120, writable: true });
        notePlaybackStarted(el);
        updatePlaybackSession({
            title: 'Refined Track Title',
            subtitle: 'ElevenLabs · George',
            conversationId: 'conv-123',
        });
        expect(getPlaybackSession()?.title).toBe('Refined Track Title');
        expect(getPlaybackSession()?.subtitle).toBe('ElevenLabs · George');
        expect(getPlaybackSession()?.conversationId).toBe('conv-123');

        seekPlayback(45);
        expect(el.currentTime).toBe(45);
        expect(getPlaybackSession()?.currentTime).toBe(45);

        skipPlayback(10);
        expect(el.currentTime).toBe(55);
        expect(getPlaybackSession()?.currentTime).toBe(55);
    });

    it('formats media time correctly', () => {
        expect(formatMediaTime(0)).toBe('0:00');
        expect(formatMediaTime(9)).toBe('0:09');
        expect(formatMediaTime(65)).toBe('1:05');
        expect(formatMediaTime(125)).toBe('2:05');
        expect(formatMediaTime(-5)).toBe('0:00');
    });
});
