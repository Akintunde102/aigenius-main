'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { getLocalMiniServerApiRootUrl } from '@/lib/api/resolve-gateway-api-root';
import { X, Play, Download, Copy, Check, Clock, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import copy from 'copy-to-clipboard';

export const VideoJobProgressModal: React.FC = () => {
    const [payload, setPayload] = useState<VideoTrackingModalPayload | null>(null);
    const [statusData, setStatusData] = useState<VideoJobStatusResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

            if (data.stage === 'ready' || data.stage === 'failed') {
                stopPolling();
            }
        } catch (err) {
            setLoading(false);
            const msg = err instanceof Error ? err.message : 'Unable to reach video server';
            setFetchError(msg);
        }
    }, [stopPolling]);

    useEffect(() => {
        const onOpen = (data: VideoTrackingModalPayload) => {
            stopPolling();
            setPayload(data);
            setStatusData(null);
            setLoading(true);
            setFetchError(null);
            setCopied(false);

            // Initial fetch
            void doPoll(data.identifier);

            // Start active interval polling every 3 seconds while modal is open
            pollIntervalRef.current = setInterval(() => {
                void doPoll(data.identifier);
            }, 3000);
        };

        const onClose = () => {
            stopPolling();
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

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && payload) {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [payload, handleClose]);

    if (!payload) {
        return null;
    }

    const percent = statusData?.progress_percent ?? (loading ? 5 : 10);
    const stage = statusData?.stage ?? 'queued';
    const isFailed = stage === 'failed';

    const rawUrl = statusData?.video_url || '';
    const videoUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
        ? rawUrl
        : rawUrl ? `${getLocalMiniServerApiRootUrl()}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}` : '';

    const isPlayable = Boolean(videoUrl && (stage === 'ready' || stage === 'finalizing'));

    const handleCopyUrl = () => {
        const urlToCopy = videoUrl || (statusData?.video_url ? `${getLocalMiniServerApiRootUrl()}${statusData.video_url}` : '');
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
            const root = getLocalMiniServerApiRootUrl();
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
            const root = getLocalMiniServerApiRootUrl();
            const downloadUrl = `${root}/gateway/v1/videos/jobs/${encodeURIComponent(payload.identifier)}/download`;
            window.open(downloadUrl, '_blank');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    handleClose();
                }
            }}
        >
            <div
                className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl transition-all"
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 px-6 py-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                            <Sparkles className="h-5 w-5 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                Video Generation Progress
                            </h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-sm">
                                {statusData?.model_name || payload.title || payload.identifier}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                        aria-label="Close dialog"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Error Notice if fetch failed */}
                    {fetchError && !statusData && (
                        <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3.5 text-xs text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium">Connecting to generation tracker...</p>
                                <p className="opacity-80 mt-0.5">{fetchError}</p>
                            </div>
                        </div>
                    )}

                    {/* Progress Bar & Percentage */}
                    {!isPlayable && !isFailed && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                                    </span>
                                    {statusData?.stage_label || 'Processing video render...'}
                                </span>
                                <span className="font-bold text-blue-600 dark:text-blue-400 font-mono text-base">
                                    {percent}%
                                </span>
                            </div>

                            <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 p-0.5">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700 ease-out shadow-sm"
                                    style={{ width: `${percent}%` }}
                                />
                            </div>

                            {/* Time estimates */}
                            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-3 border border-zinc-100 dark:border-zinc-800">
                                    <div className="text-zinc-400 dark:text-zinc-500 font-medium flex items-center gap-1.5 mb-1">
                                        <Clock className="h-3.5 w-3.5" />
                                        Time Elapsed
                                    </div>
                                    <div className="font-mono text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                        {statusData ? `${Math.floor(statusData.elapsed_seconds / 60)}m ${statusData.elapsed_seconds % 60}s` : '0m 00s'}
                                    </div>
                                </div>

                                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-3 border border-zinc-100 dark:border-zinc-800">
                                    <div className="text-zinc-400 dark:text-zinc-500 font-medium flex items-center gap-1.5 mb-1">
                                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500" />
                                        Estimated Left
                                    </div>
                                    <div className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
                                        {statusData?.remaining_label || 'Calculating...'}
                                    </div>
                                </div>
                            </div>

                            {/* Render Stages Timeline */}
                            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                                <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
                                    Render Pipeline
                                </p>
                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                    <div className={`p-2 rounded-lg border transition ${stage === 'queued' ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-300 font-semibold' : 'bg-zinc-50/50 border-zinc-100 dark:bg-zinc-800/30 dark:border-zinc-800/60 text-zinc-500'}`}>
                                        1. Queued
                                    </div>
                                    <div className={`p-2 rounded-lg border transition ${stage === 'rendering' ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-300 font-semibold' : 'bg-zinc-50/50 border-zinc-100 dark:bg-zinc-800/30 dark:border-zinc-800/60 text-zinc-500'}`}>
                                        2. Rendering
                                    </div>
                                    <div className={`p-2 rounded-lg border transition ${stage === 'finalizing' ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-300 font-semibold' : 'bg-zinc-50/50 border-zinc-100 dark:bg-zinc-800/30 dark:border-zinc-800/60 text-zinc-500'}`}>
                                        3. Finalizing
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Ready / Complete Video Player */}
                    {isPlayable && videoUrl && (
                        <div className="space-y-4 animate-in zoom-in-95 duration-300">
                            {stage === 'finalizing' && (
                                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-xs text-blue-700 dark:text-blue-300">
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0 text-blue-500" />
                                    <span>Saving video to your library... You can watch and download right now!</span>
                                </div>
                            )}

                            <div className="overflow-hidden rounded-xl bg-black border border-zinc-800 shadow-inner">
                                <video
                                    src={videoUrl}
                                    controls
                                    autoPlay
                                    loop
                                    playsInline
                                    className="max-h-[340px] w-full object-contain"
                                />
                            </div>

                            <div className="flex items-center justify-between gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCopyUrl}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                                >
                                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                    {copied ? 'Copied URL!' : 'Copy Link'}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleDownload}
                                    disabled={downloading}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold shadow-md transition"
                                >
                                    {downloading ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Download className="h-4 w-4" />
                                    )}
                                    {downloading ? 'Downloading...' : 'Download Video (MP4)'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Failed State */}
                    {isFailed && (
                        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 p-4 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 space-y-2">
                            <div className="flex items-center gap-2 font-semibold text-sm">
                                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                Generation Failed
                            </div>
                            <p className="text-xs opacity-90">
                                {statusData?.error_message || 'The upstream video engine was unable to render this clip.'}
                            </p>
                            <p className="text-[11px] opacity-75 pt-1">
                                Your wallet reservation has been automatically refunded.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="bg-zinc-50 dark:bg-zinc-800/40 px-6 py-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
                    <span>Job ID: {statusData?.job_id || payload.identifier}</span>
                    <span>You can close this window; the video will also be saved to your chat history.</span>
                </div>
            </div>
        </div>
    );
};
