import { getValidAccessToken } from '@/lib/api/auth-client';
import {
    getLocalMiniServerApiRootUrl,
    resolveGatewayApiBaseCandidates,
} from '@/lib/api/resolve-gateway-api-root';

export interface SpeechJobStatusResponse {
    success: boolean;
    job_id: string;
    title?: string | null;
    voice?: string | null;
    conversation_id?: string | null;
    model_name: string;
    stage: 'queued' | 'rendering' | 'finalizing' | 'ready' | 'failed';
    stage_label: string;
    progress_percent: number;
    remaining_label: string;
    audio_url: string | null;
    error_message: string | null;
}

function speechAuthHeaders(accept: string): Record<string, string> {
    const token = getValidAccessToken();
    const headers: Record<string, string> = { Accept: accept };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
}

/** Public CDN audio must be fetched without our bearer token. Gateway paths need it. */
async function speechAudioHeaders(url: string): Promise<Record<string, string>> {
    const root = getLocalMiniServerApiRootUrl();
    let isGateway = url.startsWith('/') || (root.length > 0 && url.startsWith(root));
    if (!isGateway) {
        try {
            const bases = await resolveGatewayApiBaseCandidates();
            isGateway = bases.some((b) => b && url.startsWith(b));
        } catch {
            /* ignore candidate resolution error */
        }
    }
    return isGateway ? speechAuthHeaders('audio/mpeg') : { Accept: 'audio/mpeg' };
}

export async function resolveGatewaySpeechAudioUrl(audioUrl: string): Promise<string> {
    if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
        return audioUrl;
    }
    try {
        const bases = await resolveGatewayApiBaseCandidates();
        const root = bases[0] || getLocalMiniServerApiRootUrl();
        return `${root.replace(/\/+$/, '')}/${audioUrl.replace(/^\/+/, '')}`;
    } catch {
        const root = getLocalMiniServerApiRootUrl();
        return `${root.replace(/\/+$/, '')}/${audioUrl.replace(/^\/+/, '')}`;
    }
}

export async function fetchSpeechJobStatus(identifier: string): Promise<SpeechJobStatusResponse> {
    const bases = await resolveGatewayApiBaseCandidates();
    const roots = bases.length > 0 ? bases : [getLocalMiniServerApiRootUrl()].filter(Boolean);
    if (roots.length === 0) {
        throw new Error('Failed to fetch');
    }

    const path = `/gateway/v1/speech/jobs/${encodeURIComponent(identifier)}/status`;
    const headers = speechAuthHeaders('application/json');
    let lastError: unknown;

    for (const root of roots) {
        try {
            const res = await fetch(`${root}${path}`, { headers });
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                lastError = new Error(`Speech status failed: ${res.status} ${text}`.trim());
                continue;
            }
            return (await res.json()) as SpeechJobStatusResponse;
        } catch (err) {
            lastError = err;
        }
    }

    if (lastError instanceof Error) throw lastError;
    throw new Error('Failed to fetch speech job status');
}

/** Gateway stream URLs require the bearer token; `<audio src>` cannot send it. */
export async function fetchSpeechAudioObjectUrl(streamUrl: string): Promise<string> {
    const headers = await speechAudioHeaders(streamUrl);
    const res = await fetch(streamUrl, { headers });
    if (!res.ok) throw new Error(`Speech audio failed (${res.status})`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
}
