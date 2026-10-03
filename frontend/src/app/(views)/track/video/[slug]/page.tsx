'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    fetchVideoJobStatus,
    type VideoJobStatusResponse,
} from '@/lib/calls/video-job-status';
import {
    Sparkles,
    Clock,
    RefreshCw,
    Download,
    Copy,
    Check,
    AlertCircle,
    ArrowLeft,
} from 'lucide-react';
import copy from 'copy-to-clipboard';
import Link from 'next/link';

export default function VideoTrackPage() {
    const params = useParams();
    const router = useRouter();
    const slug = (Array.isArray(params?.slug) ? params.slug[0] : params?.slug) || '';

    const [statusData, setStatusData] = useState<VideoJobStatusResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPolling = useCallback(() => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    }, []);

    const doPoll = useCallback(async () => {
        if (!slug) return;
        try {
            const data = await fetchVideoJobStatus(slug);
            setStatusData(data);
            setLoading(false);
            setFetchError(null);

            if (data.stage === 'ready' || data.stage === 'failed') {
                stopPolling();
            }
        } catch (err) {
            setLoading(false);
            const msg = err instanceof Error ? err.message : 'Unable to connect to video server';
            setFetchError(msg);
        }
    }, [slug, stopPolling]);

    useEffect(() => {
        if (!slug) return;

        void doPoll();
        pollIntervalRef.current = setInterval(() => {
            void doPoll();
        }, 3000);

        return () => {
            stopPolling();
        };
    }, [slug, doPoll, stopPolling]);

    const percent = statusData?.progress_percent ?? (loading ? 5 : 10);
    const stage = statusData?.stage ?? 'queued';
    const isReady = stage === 'ready' && !!statusData?.video_url;
    const isFailed = stage === 'failed';

    const handleCopyUrl = () => {
        if (statusData?.video_url) {
            copy(statusData.video_url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-center items-center p-4 sm:p-6">
            <div className="w-full max-w-xl">
                {/* Back to chat header */}
                <div className="mb-4">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to Chat
                    </Link>
                </div>

                <div className="overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl transition-all">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-sm">
                                <Sparkles className="h-5 w-5 animate-pulse" />
                            </div>
                            <div>
                                <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                    Video Generation Tracker
                                </h1>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-sm">
                                    {statusData?.model_name || slug}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
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
                        {!isReady && !isFailed && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                                        <span className="relative flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                                        </span>
                                        {statusData?.stage_label || 'Rendering video frames...'}
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

                                {/* Metrics */}
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

                                {/* Timeline */}
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

                        {/* Ready video player */}
                        {isReady && statusData.video_url && (
                            <div className="space-y-4 animate-in zoom-in-95 duration-300">
                                <div className="overflow-hidden rounded-xl bg-black border border-zinc-800 shadow-inner">
                                    <video
                                        src={statusData.video_url}
                                        controls
                                        autoPlay
                                        loop
                                        playsInline
                                        className="max-h-[380px] w-full object-contain"
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

                                    <a
                                        href={statusData.video_url}
                                        download="generated-video.mp4"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition"
                                    >
                                        <Download className="h-4 w-4" />
                                        Download Video (MP4)
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Failed state */}
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

                    {/* Footer */}
                    <div className="bg-zinc-50 dark:bg-zinc-800/40 px-6 py-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
                        <span>Job ID: {statusData?.job_id || slug}</span>
                        <span>Auto-updates live</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
