import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { PlaybackDock } from '../PlaybackDock';
import { resetPlaybackSessionForTests } from '../playback-session';
import { speechTrackingEmitter } from '@/app/components/modals/SpeechTrackingManager';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: jest.fn(),
    }),
}));

describe('PlaybackDock', () => {
    beforeEach(() => {
        resetPlaybackSessionForTests();
        mockPush.mockClear();
        URL.revokeObjectURL = jest.fn();
        window.HTMLMediaElement.prototype.play = jest.fn().mockImplementation(() => Promise.resolve());
        window.HTMLMediaElement.prototype.pause = jest.fn();
    });

    afterEach(() => {
        resetPlaybackSessionForTests();
        jest.restoreAllMocks();
    });

    it('shows pause, stop, scrubber and back controls when audio starts', async () => {
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
        expect(screen.getByRole('button', { name: 'Rewind 5 seconds' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Forward 5 seconds' })).toBeInTheDocument();
        expect(screen.getByLabelText('Playback progress')).toBeInTheDocument();
        expect(screen.getByText('Playing')).toBeInTheDocument();

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

    it('navigates back to the conversation when conversationId is present on media', async () => {
        render(<PlaybackDock />);
        const audio = document.createElement('audio');
        audio.title = 'Court Hearing Audio';
        audio.dataset.playbackReturn = 'speech:court-hearing_job-999';
        audio.dataset.playbackConversation = 'conv-456-def';
        audio.pause = jest.fn();
        document.body.appendChild(audio);

        act(() => {
            audio.dispatchEvent(new Event('play', { bubbles: true }));
        });

        act(() => {
            screen.getByRole('button', { name: 'Back to this item' }).click();
        });

        expect(mockPush).toHaveBeenCalledWith('/chat/conv-456-def');
        await act(async () => {
            audio.remove();
            await Promise.resolve();
        });
    });

    it('defaults to bottom-left position and renders drag handle', async () => {
        sessionStorage.clear();
        render(<PlaybackDock />);
        const audio = document.createElement('audio');
        audio.title = 'Draggable Media';
        audio.pause = jest.fn();
        document.body.appendChild(audio);

        act(() => {
            audio.dispatchEvent(new Event('play', { bubbles: true }));
        });

        const dock = screen.getByRole('region', { name: 'Now playing' });
        expect(dock).toBeInTheDocument();
        expect(dock.style.left).toBe('16px');
        expect(dock.style.bottom).toBe('16px');
        expect(screen.getByLabelText('Drag player')).toBeInTheDocument();
        expect(screen.getByTitle('Drag to move anywhere')).toBeInTheDocument();

        await act(async () => {
            audio.remove();
            await Promise.resolve();
        });
    });

    it('restores position from sessionStorage when available', async () => {
        (sessionStorage.getItem as jest.Mock).mockReturnValueOnce(JSON.stringify({ x: 120, y: 340 }));
        render(<PlaybackDock />);
        const audio = document.createElement('audio');
        audio.title = 'Restored Media';
        audio.pause = jest.fn();
        document.body.appendChild(audio);

        act(() => {
            audio.dispatchEvent(new Event('play', { bubbles: true }));
        });

        const dock = screen.getByRole('region', { name: 'Now playing' });
        expect(dock).toBeInTheDocument();
        expect(dock.style.left).toBe('120px');
        expect(dock.style.top).toBe('340px');

        await act(async () => {
            audio.remove();
            await Promise.resolve();
        });
    });
});


