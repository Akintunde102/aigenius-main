import { getValidAccessToken } from '@/lib/api/auth-client';
import {
    getLocalMiniServerApiRootUrl,
    resolveGatewayApiBaseCandidates,
} from '@/lib/api/resolve-gateway-api-root';

export interface VideoJobStatusResponse {
    success: boolean;
    job_id: string;
    identifier: string;
    model_id: string;
    model_name: string;
    status: 'pending_delivery' | 'processing_delivery' | 'delivered' | 'failed';
    stage: 'queued' | 'rendering' | 'finalizing' | 'ready' | 'failed';
    stage_label: string;
    progress_percent: number;
    elapsed_seconds: number;
    remaining_seconds: number;
    remaining_label: string;
    estimated_total_seconds: number;
    video_url: string | null;
    error_message: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Fetches the live progress percentage, stage, and video URL for a video generation job.
 */
function videoJobStatusHeaders(): Record<string, string> {
    const token = getValidAccessToken();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return headers;
}

export async function fetchVideoJobStatus(identifier: string): Promise<VideoJobStatusResponse> {
    const bases = await resolveGatewayApiBaseCandidates();
    const roots = bases.length > 0 ? bases : [getLocalMiniServerApiRootUrl()].filter(Boolean);
    if (roots.length === 0) {
        throw new Error('Failed to fetch');
    }

    const path = `/gateway/v1/videos/jobs/${encodeURIComponent(identifier)}/status`;
    const headers = videoJobStatusHeaders();
    let lastError: unknown;

    for (const root of roots) {
        try {
            const res = await fetch(`${root}${path}`, { headers });
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                lastError = new Error(`Failed to fetch video job status: ${res.status} ${text}`.trim());
                continue;
            }
            return (await res.json()) as VideoJobStatusResponse;
        } catch (err) {
            lastError = err;
        }
    }

    if (lastError instanceof Error) {
        throw lastError;
    }
    throw new Error('Failed to fetch');
}
