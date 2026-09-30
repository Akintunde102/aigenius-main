import { getVideoMimeType } from '@/app/lib/utils/get_file_type';

const VIDEO_FILE_EXTENSIONS = new Set([
    'mp4',
    'webm',
    'ogg',
    'ogv',
    'mov',
    'm4v',
    'mkv',
    'avi',
    'wmv',
    'flv',
    '3gp',
    'ts',
    'm3u8',
]);

const AUDIO_FILE_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'aac', 'flac', 'opus', 'oga']);

function pathExtensionFromUrl(url: string): string | null {
    try {
        const pathname = new URL(url.trim()).pathname;
        const base = pathname.split('/').pop() ?? '';
        const dot = base.lastIndexOf('.');
        if (dot <= 0 || dot === base.length - 1) {
            return null;
        }
        return base.slice(dot + 1).toLowerCase();
    } catch {
        const withoutQuery = url.split('?')[0]?.split('#')[0] ?? '';
        const base = withoutQuery.split('/').pop() ?? '';
        const dot = base.lastIndexOf('.');
        if (dot <= 0 || dot === base.length - 1) {
            return null;
        }
        return base.slice(dot + 1).toLowerCase();
    }
}

export function isEmbeddableVideoFileUrl(url: string): boolean {
    if (!url?.trim()) {
        return false;
    }
    const ext = pathExtensionFromUrl(url);
    return ext !== null && VIDEO_FILE_EXTENSIONS.has(ext);
}

export function isEmbeddableAudioFileUrl(url: string): boolean {
    if (!url?.trim()) {
        return false;
    }
    const ext = pathExtensionFromUrl(url);
    return ext !== null && AUDIO_FILE_EXTENSIONS.has(ext);
}

export function isEmbeddableMediaFileUrl(url: string): boolean {
    return isEmbeddableVideoFileUrl(url) || isEmbeddableAudioFileUrl(url);
}

function normalizeUrlForCompare(raw: string): string {
    try {
        const u = new URL(raw.trim());
        u.hash = '';
        return u.toString().replace(/\/$/, '');
    } catch {
        return raw.trim();
    }
}

const PREVIEW_LINK_LABEL_RE = /^(preview|watch(\s+video)?|video|play|▶|▶️)$/i;

/** Inline player for preview-style markdown links (same rules as YouTube embeds). */
export function shouldEmbedMediaMarkdownLink(href: string, linkText: string): boolean {
    if (!isEmbeddableMediaFileUrl(href)) {
        return false;
    }
    const text = linkText.trim();
    if (!text) {
        return true;
    }
    if (PREVIEW_LINK_LABEL_RE.test(text)) {
        return true;
    }
    return normalizeUrlForCompare(text) === normalizeUrlForCompare(href);
}

export function mimeTypeForMediaUrl(url: string): string | undefined {
    const ext = pathExtensionFromUrl(url);
    if (!ext) {
        return undefined;
    }
    if (AUDIO_FILE_EXTENSIONS.has(ext)) {
        if (ext === 'mp3') return 'audio/mpeg';
        if (ext === 'wav') return 'audio/wav';
        if (ext === 'm4a') return 'audio/mp4';
        if (ext === 'aac') return 'audio/aac';
        if (ext === 'flac') return 'audio/flac';
        if (ext === 'opus') return 'audio/opus';
        if (ext === 'oga' || ext === 'ogg') return 'audio/ogg';
    }
    if (VIDEO_FILE_EXTENSIONS.has(ext)) {
        return getVideoMimeType(ext);
    }
    return undefined;
}
