import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { PlaybackDock } from '../PlaybackDock';
import { resetPlaybackSessionForTests } from '../playback-session';
import { speechTrackingEmitter } from '@/app/components/modals/SpeechTrackingManager';

describe('PlaybackDock', () => {
    beforeEach(() => {
        resetPlaybackSessionForTests();
        URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
        resetPlaybackSessionForTests();
    });

    it('shows pause, stop, and back controls when audio starts', async () => {
        render(<PlaybackDock />);
        const audio = document.createElement('audio');
        audio.title = 'A Quiet Morning';
        audio.dataset.playbackReturn = 'speech:quiet-morning_job-1';
        audio.pause = jest.fn();
        document.body.appendChild(audio);

        act(() => {
            audio.dispatchEvent(new Event('play', { bubbles: true }));
        });

        expect(screen.getByRole('region', { name: 'Now playing' })).toBeInTheDocument();
        expect(screen.getByText('A Quiet Morning')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Back to this item' })).toBeInTheDocument();
        await act(async () => {
            audio.remove();
            await Promise.resolve();
        });
    });

    it('reopens the speech view from the back control after the player is gone', async () => {
        const opened: string[] = [];
        const onOpen = (payload: { identifier: string }) => opened.push(payload.identifier);
        speechTrackingEmitter.on('open', onOpen);
        render(<PlaybackDock />);
        const audio = document.createElement('audio');
        audio.title = 'A Quiet Morning';
        audio.dataset.playbackReturn = 'speech:quiet-morning_job-1';
        audio.pause = jest.fn();
        document.body.appendChild(audio);
        act(() => {
            audio.dispatchEvent(new Event('play', { bubbles: true }));
        });
        await act(async () => {
            audio.remove();
            await Promise.resolve();
        });
        act(() => {
            screen.getByRole('button', { name: 'Back to this item' }).click();
        });
        expect(opened).toContain('quiet-morning_job-1');
        speechTrackingEmitter.off('open', onOpen);
    });
});
