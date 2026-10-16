'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { RenderErrorBoundary } from '@/app/components/RenderErrorBoundary';
import {
    videoTrackingEmitter,
    VideoTrackingModalPayload,
    closeVideoTrackingModal,
} from './VideoTrackingManager';
import {
    fetchVideoJobStatus,
    type VideoJobStatusResponse,
} from '@/lib/calls/video-job-status';
import { getValidAccessToken } from '@/lib/api/auth-client';
import {
    getLocalMiniServerApiRootUrl,
    resolveGatewayApiRootUrl,
} from '@/lib/api/resolve-gateway-api-root';
import { Download, Copy, Check, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import copy from 'copy-to-clipboard';
import { useLanguage } from '@/lib/providers/LanguageProvider';
import { MarkdownVideoPlayer } from '@/app/components/model-interface/shared/components/MarkdownVideoPlayer';
import {
    AppModal,
    AppModalHeader,
    AppModalBody,
    AppModalFooter,
} from './AppModal';

export const VideoJobProgressModal: React.FC = () => {
    const { t } = useLanguage();
    const [payload, setPayload] = useState<VideoTrackingModalPayload | null>(null);
    const [statusData, setStatusData] = useState<VideoJobStatusResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [apiRoot, setApiRoot] = useState(() => getLocalMiniServerApiRootUrl());
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const identifierRef = useRef<string | null>(null);

    const stopPolling = useCallback(() => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    }, []);

    const handleClose = useCallback(() => {
        stopPolling();
        setPayload(null);
        setStatusData(null);
        setFetchError(null);
        closeVideoTrackingModal();
    }, [stopPolling]);

    const doPoll = useCallback(async (identifier: string) => {
        try {
            const data = await fetchVideoJobStatus(identifier);
            setStatusData(data);
            setLoading(false);
            setFetchError(null);

            const terminal =
                data.stage === 'ready'
                || (data.stage === 'failed' && !data.video_url);
            if (terminal) {
                stopPolling();
            }
        } catch (err) {
            setLoading(false);
            const msg = err instanceof Error ? err.message : 'Unable to reach video server';
            setFetchError(msg);
        }
    }, [stopPolling]);

    useEffect(() => {
        void resolveGatewayApiRootUrl().then((root) => {
            if (root) setApiRoot(root);
        });
    }, []);

    useEffect(() => {
        if (!payload) return;
        const onOnline = () => {
            if (identifierRef.current) {
                void doPoll(identifierRef.current);
            }
        };
        window.addEventListener('online', onOnline);
        return () => window.removeEventListener('online', onOnline);
    }, [payload, doPoll]);

    useEffect(() => {
        const onOpen = (data: VideoTrackingModalPayload) => {
            stopPolling();
            identifierRef.current = data.identifier;
            setPayload(data);
            setStatusData(null);
            setLoading(true);
            setFetchError(null);
            setCopied(false);
            void resolveGatewayApiRootUrl().then((root) => {
                if (root) setApiRoot(root);
            });

            // Initial fetch
            void doPoll(data.identifier);

            // Start active interval polling every 3 seconds while modal is open
            pollIntervalRef.current = setInterval(() => {
                void doPoll(data.identifier);
            }, 3000);
        };

        const onClose = () => {
            stopPolling();
            identifierRef.current = null;
            setPayload(null);
            setStatusData(null);
        };

        videoTrackingEmitter.on('open', onOpen);
        videoTrackingEmitter.on('close', onClose);

        return () => {
            stopPolling();
            videoTrackingEmitter.off('open', onOpen);
            videoTrackingEmitter.off('close', onClose);
        };
    }, [doPoll, stopPolling]);

    if (!payload) {
        return null;
    }

    const percent = statusData?.progress_percent ?? (loading ? 5 : 10);
    const stage = statusData?.stage ?? 'queued';
    const isFailed = stage === 'failed';

    const gatewayRoot = apiRoot || getLocalMiniServerApiRootUrl();
    const rawUrl = statusData?.video_url || '';
    const videoUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
        ? rawUrl
        : rawUrl ? `${gatewayRoot}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}` : '';

    const isPlayable = Boolean(
        videoUrl && (stage === 'ready' || stage === 'finalizing' || (stage === 'failed' && rawUrl)),
    );

    const handleCopyUrl = () => {
        const urlToCopy = videoUrl || (statusData?.video_url ? `${gatewayRoot}${statusData.video_url}` : '');
        if (urlToCopy) {
            copy(urlToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownload = async () => {
        if (!payload?.identifier) return;
        setDownloading(true);
        try {
            const root = gatewayRoot || getLocalMiniServerApiRootUrl();
            const downloadUrl = `${root}/gateway/v1/videos/jobs/${encodeURIComponent(payload.identifier)}/download`;
            const token = getValidAccessToken();
            const headers: Record<string, string> = {};
            if (token) headers.Authorization = `Bearer ${token}`;

            const res = await fetch(downloadUrl, { headers });
            if (!res.ok) {
                if (videoUrl) {
                    const fallbackRes = await fetch(videoUrl);
                    if (fallbackRes.ok) {
                        const blob = await fallbackRes.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = blobUrl;
                        a.download = `generated-video-${payload.identifier.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 24)}.mp4`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(blobUrl);
                        return;
                    }
                }
                throw new Error(`Download failed with status ${res.status}`);
            }

            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `generated-video-${payload.identifier.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 24)}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch {
            const root = gatewayRoot || getLocalMiniServerApiRootUrl();
            const downloadUrl = `${root}/gateway/v1/videos/jobs/${encodeURIComponent(payload.identifier)}/download`;
            window.open(downloadUrl, '_blank');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <RenderErrorBoundary logLabel="[video-tracking-modal]">
            <AppModal
                open={Boolean(payload)}
                onClose={handleClose}
                size="lg"
                ariaLabelledBy="video-progress-title"
                className="z-50"
            >
                <AppModalHeader
                    titleId="video-progress-title"
                    title={t('videoJob.title', 'Video Generation Progress')}
                    subtitle={statusData?.model_name || payload.title || payload.identifier}
                    onClose={handleClose}
                />

                <AppModalBody className="space-y-3.5 !py-3">
                    {/* Error Notice if fetch failed */}
                    {fetchError && (
                        <div
                            className="flex items-start gap-2.5 rounded-lg border p-3 text-xs"
                            style={{
                                background: 'color-mix(in srgb, #f59e0b 8%, var(--modal-bg))',
                                borderColor: 'color-mix(in srgb, #f59e0b 25%, var(--modal-border))',
                                color: '#d97706',
                            }}
                        >
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold">
                                    {statusData
                                        ? 'Connection interrupted — still retrying…'
                                        : t('videoJob.connectingTracker', 'Connecting to generation tracker...')}
                                </p>
                                <p className="opacity-80 mt-0.5">{fetchError}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => payload && void doPoll(payload.identifier)}
                                className="app-modal-btn-secondary !px-2.5 !py-1 !text-[11px]"
                            >
                                Retry now
                            </button>
                        </div>
                    )}

                    {/* Progress Bar & Percentage */}
                    {!isPlayable && !isFailed && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs font-medium">
                                <span className="flex items-center gap-2" style={{ color: 'var(--modal-fg)' }}>
                                    <span className="relative flex h-2 w-2">
                                        <span
                                            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                                            style={{ background: 'var(--chat-accent)' }}
                                        />
                                        <span
                                            className="relative inline-flex rounded-full h-2 w-2"
                                            style={{ background: 'var(--chat-accent)' }}
                                        />
                                    </span>
                                    {statusData?.stage_label || 'Processing video render...'}
                                </span>
                                <span className="font-mono text-sm font-bold" style={{ color: 'var(--chat-accent)' }}>
                                    {percent}%
                                </span>
                            </div>

                            <div
                                className="h-2 w-full overflow-hidden rounded-full"
                                style={{ background: 'var(--surface-muted)' }}
                            >
                                <div
                                    className="h-full rounded-full transition-all duration-700 ease-out"
                                    style={{ width: `${percent}%`, background: 'var(--chat-accent)' }}
                                />
                            </div>

                            {/* Time estimates */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div
                                    className="rounded-lg border p-2.5"
                                    style={{ background: 'var(--surface-muted)', borderColor: 'var(--modal-border)' }}
                                >
                                    <div
                                        className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1"
                                        style={{ color: 'var(--modal-muted-fg)' }}
                                    >
                                        <Clock className="h-3 w-3" />
                                        Time Elapsed
                                    </div>
                                    <div className="font-mono text-xs font-semibold" style={{ color: 'var(--modal-fg)' }}>
                                        {statusData ? `${Math.floor(statusData.elapsed_seconds / 60)}m ${statusData.elapsed_seconds % 60}s` : '0m 00s'}
                                    </div>
                                </div>

                                <div
                                    className="rounded-lg border p-2.5"
                                    style={{ background: 'var(--surface-muted)', borderColor: 'var(--modal-border)' }}
                                >
                                    <div
                                        className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1"
                                        style={{ color: 'var(--modal-muted-fg)' }}
                                    >
                                        <RefreshCw className="h-3 w-3 animate-spin" style={{ color: 'var(--chat-accent)' }} />
                                        Estimated Left
                                    </div>
                                    <div className="font-mono text-xs font-semibold" style={{ color: 'var(--chat-accent)' }}>
                                        {statusData?.remaining_label || 'Calculating...'}
                                    </div>
                                </div>
                            </div>

                            {/* Render Stages Timeline */}
                            <div className="pt-2 border-t" style={{ borderColor: 'var(--modal-border)' }}>
                                <p className="app-modal-field-label !mb-2">
                                    Render Pipeline
                                </p>
                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                    <div
                                        className="rounded-lg border p-2 text-[11px] font-medium transition-colors"
                                        style={{
                                            background: stage === 'queued'
                                                ? 'color-mix(in srgb, var(--chat-accent) 10%, var(--surface-muted))'
                                                : 'var(--surface-muted)',
                                            borderColor: stage === 'queued'
                                                ? 'var(--chat-accent)'
                                                : 'var(--modal-border)',
                                            color: stage === 'queued'
                                                ? 'var(--chat-accent)'
                                                : 'var(--modal-muted-fg)',
                                        }}
                                    >
                                        1. Queued
                                    </div>
                                    <div
                                        className="rounded-lg border p-2 text-[11px] font-medium transition-colors"
                                        style={{
                                            background: stage === 'rendering'
                                                ? 'color-mix(in srgb, var(--chat-accent) 10%, var(--surface-muted))'
                                                : 'var(--surface-muted)',
                                            borderColor: stage === 'rendering'
                                                ? 'var(--chat-accent)'
                                                : 'var(--modal-border)',
                                            color: stage === 'rendering'
                                                ? 'var(--chat-accent)'
                                                : 'var(--modal-muted-fg)',
                                        }}
                                    >
                                        2. Rendering
                                    </div>
                                    <div
                                        className="rounded-lg border p-2 text-[11px] font-medium transition-colors"
                                        style={{
                                            background: stage === 'finalizing'
                                                ? 'color-mix(in srgb, var(--chat-accent) 10%, var(--surface-muted))'
                                                : 'var(--surface-muted)',
                                            borderColor: stage === 'finalizing'
                                                ? 'var(--chat-accent)'
                                                : 'var(--modal-border)',
                                            color: stage === 'finalizing'
                                                ? 'var(--chat-accent)'
                                                : 'var(--modal-muted-fg)',
                                        }}
                                    >
                                        3. Finalizing
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Ready / Complete Video Player */}
                    {isPlayable && videoUrl && (
                        <div className="space-y-3">
                            {stage === 'finalizing' && (
                                <div
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs"
                                    style={{
                                        background: 'color-mix(in srgb, var(--chat-accent) 10%, var(--surface-muted))',
                                        borderColor: 'color-mix(in srgb, var(--chat-accent) 30%, var(--modal-border))',
                                        color: 'var(--chat-accent)',
                                    }}
                                >
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
                                    <span>{t('videoJob.savingToLibrary', 'Saving video to your library... You can watch and download right now!')}</span>
                                </div>
                            )}

                            <MarkdownVideoPlayer
                                src={videoUrl}
                                title={payload.title || 'Generated video'}
                                playbackReturn={`video:${payload.identifier}`}
                                className="!max-w-none w-full max-h-[320px] !aspect-auto min-h-[180px] rounded-lg shadow-inner"
                            />

                            <div className="flex items-center justify-between gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={handleCopyUrl}
                                    className="app-modal-btn-secondary !text-xs !py-1.5"
                                >
                                    {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                                    {copied ? 'Copied URL!' : 'Copy Link'}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleDownload}
                                    disabled={downloading}
                                    className="app-modal-btn-primary !text-xs !py-1.5"
                                >
                                    {downloading ? (
                                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Download className="h-3.5 w-3.5" />
                                    )}
                                    {downloading ? 'Downloading...' : 'Download Video (MP4)'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Failed State */}
                    {isFailed && !isPlayable && (
                        <div
                            className="rounded-lg border p-3.5 space-y-1.5 text-xs"
                            style={{
                                background: 'color-mix(in srgb, #ef4444 8%, var(--modal-bg))',
                                borderColor: 'color-mix(in srgb, #ef4444 25%, var(--modal-border))',
                                color: '#ef4444',
                            }}
                        >
                            <div className="flex items-center gap-1.5 font-semibold text-sm">
                                <AlertCircle className="h-4 w-4" />
                                Generation Failed
                            </div>
                            <p className="opacity-90">
                                {statusData?.error_message || 'The upstream video engine was unable to render this clip.'}
                            </p>
                            <p className="opacity-75 text-[11px] pt-0.5">
                                Your wallet reservation has been automatically refunded.
                            </p>
                        </div>
                    )}
                </AppModalBody>

                <AppModalFooter className="text-[11px] justify-between !py-2.5">
                    <span style={{ color: 'var(--modal-muted-fg)' }}>
                        Job ID: <code className="font-mono text-[10px]">{statusData?.job_id || payload.identifier}</code>
                    </span>
                    <span style={{ color: 'var(--modal-muted-fg)' }}>
                        {t('videoJob.canCloseWindow', 'You can close this window; video will be saved to chat.')}
                    </span>
                </AppModalFooter>
            </AppModal>
        </RenderErrorBoundary>
    );
};
