'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RenderErrorBoundary } from '@/app/components/RenderErrorBoundary';
import {
    fetchSpeechAudioObjectUrl,
    fetchSpeechJobStatus,
    resolveGatewaySpeechAudioUrl,
    type SpeechJobStatusResponse,
} from '@/lib/calls/speech-job-status';
import {
    closeSpeechTrackingModal,
    speechTrackingEmitter,
    type SpeechTrackingModalPayload,
} from './SpeechTrackingManager';
import { isPlaybackSrcClaimed } from '@/app/components/playback/playback-session';
import { AppModal, AppModalHeader, AppModalBody } from './AppModal';
import { AlertCircle } from 'lucide-react';

export const SpeechJobProgressModal: React.FC = () => {
    const [payload, setPayload] = useState<SpeechTrackingModalPayload | null>(null);
    const [statusData, setStatusData] = useState<SpeechJobStatusResponse | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

    const stop = useCallback(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
    }, []);

    const poll = useCallback(async (identifier: string) => {
        try {
            const data = await fetchSpeechJobStatus(identifier);
            setStatusData(data);
            setFetchError(null);
            if (data.stage === 'ready' || data.stage === 'failed') stop();
        } catch (err) {
            setFetchError(err instanceof Error ? err.message : 'Unable to reach the speech service');
        }
    }, [stop]);

    useEffect(() => {
        const onOpen = (data: SpeechTrackingModalPayload) => {
            stop();
            setPayload(data);
            setStatusData(null);
            setFetchError(null);
            void poll(data.identifier);
            pollRef.current = setInterval(() => void poll(data.identifier), 2000);
        };
        const onClose = () => {
            stop();
            setPayload(null);
        };
        speechTrackingEmitter.on('open', onOpen);
        speechTrackingEmitter.on('close', onClose);
        return () => {
            stop();
            speechTrackingEmitter.off('open', onOpen);
            speechTrackingEmitter.off('close', onClose);
        };
    }, [poll, stop]);

    const stage = statusData?.stage ?? 'queued';
    const rawAudio = statusData?.audio_url || '';

    useEffect(() => {
        if (!rawAudio || (stage !== 'ready' && stage !== 'finalizing')) {
            setPlaybackUrl(null);
            return;
        }
        let objectUrl: string | undefined;
        let cancelled = false;
        void resolveGatewaySpeechAudioUrl(rawAudio)
            .then((absolute) => fetchSpeechAudioObjectUrl(absolute))
            .then((url) => {
                if (cancelled) {
                    URL.revokeObjectURL(url);
                    return;
                }
                objectUrl = url;
                setPlaybackUrl(url);
            })
            .catch((err) => {
                if (!cancelled) {
                    setPlaybackUrl(null);
                    setFetchError(err instanceof Error ? err.message : 'Unable to load this audio');
                }
            });
        return () => {
            cancelled = true;
            if (objectUrl && !isPlaybackSrcClaimed(objectUrl)) URL.revokeObjectURL(objectUrl);
        };
    }, [rawAudio, stage]);

    if (!payload) return null;

    const handleClose = () => {
        stop();
        closeSpeechTrackingModal();
    };

    return (
        <RenderErrorBoundary logLabel="[speech-progress]">
            <AppModal
                open={Boolean(payload)}
                onClose={handleClose}
                size="sm"
                ariaLabelledBy="speech-progress-title"
                className="z-50"
            >
                <AppModalHeader
                    titleId="speech-progress-title"
                    title={payload.title || 'Speech generation'}
                    subtitle={
                        statusData?.stage_label
                            ? `${statusData.stage_label}${statusData.remaining_label ? ` · ${statusData.remaining_label}` : ''}`
                            : 'Synthesizing voice audio…'
                    }
                    onClose={handleClose}
                />
                <AppModalBody className="space-y-3 !py-3">
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-medium">
                            <span style={{ color: 'var(--modal-muted-fg)' }}>
                                {statusData?.stage_label || 'Starting'}
                            </span>
                            <span className="font-mono text-xs font-semibold" style={{ color: 'var(--chat-accent)' }}>
                                {statusData?.progress_percent ?? 8}%
                            </span>
                        </div>
                        <div
                            className="h-2 w-full overflow-hidden rounded-full"
                            style={{ background: 'var(--surface-muted)' }}
                        >
                            <div
                                className="h-full rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${statusData?.progress_percent ?? 8}%`, background: 'var(--chat-accent)' }}
                            />
                        </div>
                    </div>

                    {fetchError ? (
                        <div
                            role="alert"
                            className="flex items-start gap-2 rounded-lg border p-2.5 text-xs"
                            style={{
                                background: 'color-mix(in srgb, #f59e0b 8%, var(--modal-bg))',
                                borderColor: 'color-mix(in srgb, #f59e0b 25%, var(--modal-border))',
                                color: '#d97706',
                            }}
                        >
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>{fetchError}</span>
                        </div>
                    ) : null}

                    {stage === 'failed' ? (
                        <div
                            role="alert"
                            className="flex items-start gap-2 rounded-lg border p-2.5 text-xs"
                            style={{
                                background: 'color-mix(in srgb, #ef4444 8%, var(--modal-bg))',
                                borderColor: 'color-mix(in srgb, #ef4444 25%, var(--modal-border))',
                                color: '#ef4444',
                            }}
                        >
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>{statusData?.error_message || 'Speech failed'}</span>
                        </div>
                    ) : null}

                    {playbackUrl && (stage === 'ready' || stage === 'finalizing') ? (
                        <div className="pt-1">
                            <audio
                                className="w-full h-9 rounded-lg"
                                controls
                                preload="metadata"
                                src={playbackUrl}
                                title={payload.title || 'Speech'}
                                data-playback-title={payload.title || 'Speech'}
                                data-playback-return={`speech:${payload.identifier}`}
                            >
                                <track kind="captions" />
                            </audio>
                        </div>
                    ) : null}
                </AppModalBody>
            </AppModal>
        </RenderErrorBoundary>
    );
};
