import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VideoJobProgressModal } from '../VideoJobProgressModal';
import { videoTrackingEmitter } from '../VideoTrackingManager';
import { fetchVideoJobStatus } from '@/lib/calls/video-job-status';

jest.mock('copy-to-clipboard', () => jest.fn());
jest.mock('@/lib/calls/video-job-status', () => ({
    fetchVideoJobStatus: jest.fn(),
}));

jest.mock('lucide-react', () => {
    const React = require('react');
    return new Proxy(
        {},
        {
            get: (_target, prop) => {
                const name = String(prop);
                const MockIcon = () => <div data-testid={`icon-${name}`} />;
                MockIcon.displayName = name;
                return MockIcon;
            },
        },
    );
});

describe('VideoJobProgressModal', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.URL.createObjectURL = jest.fn(() => 'blob:mock-video');
        global.URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
        act(() => {
            videoTrackingEmitter.emit('close');
        });
    });

    it('renders nothing when closed', () => {
        const { container } = render(<VideoJobProgressModal />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders video player and download button when video is playable even during finalizing', async () => {
        (fetchVideoJobStatus as jest.Mock).mockResolvedValue({
            success: true,
            job_id: 'gen-vid-test-1',
            identifier: 'gen-vid-test-1',
            model_id: 'google/veo-3.1',
            model_name: 'Google: Veo 3.1',
            status: 'processing_delivery',
            stage: 'finalizing',
            stage_label: 'Uploading to your library...',
            progress_percent: 96,
            elapsed_seconds: 40,
            remaining_seconds: 4,
            remaining_label: '~4s remaining',
            estimated_total_seconds: 120,
            video_url: '/gateway/v1/videos/jobs/gen-vid-test-1/stream',
            error_message: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });

        render(<VideoJobProgressModal />);

        act(() => {
            videoTrackingEmitter.emit('open', {
                identifier: 'gen-vid-test-1',
                title: 'Test Veo Video',
            });
        });

        await waitFor(() => {
            expect(screen.getByText('Video Generation Progress')).toBeInTheDocument();
            expect(screen.getByText(/Saving video to your library/i)).toBeInTheDocument();
            expect(screen.getByText('Download Video (MP4)')).toBeInTheDocument();
        });
    });

    it('triggers download when download button is clicked', async () => {
        (fetchVideoJobStatus as jest.Mock).mockResolvedValue({
            success: true,
            job_id: 'gen-vid-test-2',
            identifier: 'gen-vid-test-2',
            model_id: 'google/veo-3.1',
            model_name: 'Google: Veo 3.1',
            status: 'delivered',
            stage: 'ready',
            stage_label: 'Video ready!',
            progress_percent: 100,
            elapsed_seconds: 60,
            remaining_seconds: 0,
            remaining_label: 'Ready to play',
            estimated_total_seconds: 120,
            video_url: 'https://res.cloudinary.com/demo/video/upload/v1234/sample.mp4',
            error_message: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });

        const mockBlob = new Blob(['video-bytes'], { type: 'video/mp4' });
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            blob: jest.fn().mockResolvedValue(mockBlob),
        });

        render(<VideoJobProgressModal />);

        act(() => {
            videoTrackingEmitter.emit('open', {
                identifier: 'gen-vid-test-2',
                title: 'Test Veo Video',
            });
        });

        await waitFor(() => {
            expect(screen.getByText('Download Video (MP4)')).toBeInTheDocument();
        });

        const downloadBtn = screen.getByText('Download Video (MP4)');
        fireEvent.click(downloadBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalled();
            expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
        });
    });
});
