import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpeechJobProgressModal } from '../SpeechJobProgressModal';
import { speechTrackingEmitter } from '../SpeechTrackingManager';
import { fetchSpeechAudioObjectUrl, fetchSpeechJobStatus } from '@/lib/calls/speech-job-status';

jest.mock('@/lib/calls/speech-job-status', () => ({
    fetchSpeechJobStatus: jest.fn(),
    fetchSpeechAudioObjectUrl: jest.fn(),
    resolveGatewaySpeechAudioUrl: jest.fn(async (url: string) => url),
}));

describe('SpeechJobProgressModal', () => {
    beforeEach(() => {
        URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
        act(() => {
            speechTrackingEmitter.emit('close');
        });
    });

    it('stays closed until a tracking link opens it', () => {
        const { container } = render(<SpeechJobProgressModal />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows a failed speech job without blanking the dialog', async () => {
        (fetchSpeechJobStatus as jest.Mock).mockResolvedValue({
            stage: 'failed',
            stage_label: 'Speech failed',
            progress_percent: 0,
            remaining_label: 'Failed',
            audio_url: null,
            error_message: 'upstream rejected the text',
        });
        render(<SpeechJobProgressModal />);
        act(() => {
            speechTrackingEmitter.emit('open', { identifier: 'hello_job-abc', title: 'Hello' });
        });
        expect(await screen.findByRole('alert')).toHaveTextContent('upstream rejected the text');
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('plays a Cloudinary file through a blob url so media policy allows it', async () => {
        const cdn = 'https://res.cloudinary.com/demo/video/upload/speech.mp3';
        (fetchSpeechJobStatus as jest.Mock).mockResolvedValue({
            stage: 'ready',
            stage_label: 'Speech ready',
            progress_percent: 100,
            remaining_label: 'Ready to play',
            audio_url: cdn,
            error_message: null,
        });
        (fetchSpeechAudioObjectUrl as jest.Mock).mockResolvedValue('blob:speech-ready');

        render(<SpeechJobProgressModal />);
        act(() => {
            speechTrackingEmitter.emit('open', { identifier: 'poem_job-1', title: 'listen here' });
        });

        await waitFor(() => {
            expect(document.querySelector('audio')?.getAttribute('src')).toBe('blob:speech-ready');
        });
        expect(fetchSpeechAudioObjectUrl).toHaveBeenCalledWith(cdn);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
});
