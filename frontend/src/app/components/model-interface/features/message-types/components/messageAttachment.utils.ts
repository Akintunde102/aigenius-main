import { parseFileMessageFromString } from '@/lib/utils/messageContentUtils';
import { textPartToPlainString } from '@/lib/utils/messageTextUtils';

export type AttachmentKind = 'image' | 'file' | 'audio';

export type MessageAttachment = {
    kind: AttachmentKind;
    fileName: string;
    fileUrl: string;
};

export type StructuredContentBlock = {
    type: string;
    text?: string;
    image_url?: { url: string };
    file_url?: { url: string; name?: string };
    input_audio?: { data: string; format?: string };
};

export type StructuredMessageSegment =
    | { type: 'text'; text: string; key: string }
    | { type: 'attachments'; items: MessageAttachment[]; key: string };

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|svg)$/i;
const DOCUMENT_EXT = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|md|rtf|zip|json|xml)$/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac|webm|mp4)$/i;
const URL_ONLY = /^https?:\/\/\S+$/;

export function fileExtensionLabel(fileName: string): string {
    const parts = fileName.split('.');
    if (parts.length < 2) {
        return 'FILE';
    }
    return parts.pop()!.toUpperCase().slice(0, 8);
}

export function isImageFileName(fileName: string): boolean {
    return IMAGE_EXT.test(fileName);
}

export function isAudioFileName(fileName: string): boolean {
    return AUDIO_EXT.test(fileName);
}

export function fileNameFromUrl(url: string): string {
    const lastSegment = url.split('/').pop()?.split('?')[0] ?? '';
    if (!lastSegment) return 'File';
    try {
        return decodeURIComponent(lastSegment);
    } catch {
        return lastSegment;
    }
}

export function isDocumentUrl(url: string): boolean {
    const path = url.split('?')[0].toLowerCase();
    if (DOCUMENT_EXT.test(path)) return true;
    if (path.includes('/raw/upload/') && !AUDIO_EXT.test(path)) return true;
    return false;
}

export function isAudioUrl(url: string): boolean {
    const path = url.split('?')[0].toLowerCase();
    if (AUDIO_EXT.test(path)) return true;
    return url.startsWith('data:audio/');
}

export function resolveAttachmentKind(fileName: string, fileUrl: string): AttachmentKind {
    if (isAudioFileName(fileName) || isAudioUrl(fileUrl)) {
        return 'audio';
    }
    if (isImageFileName(fileName) && !isDocumentUrl(fileUrl)) {
        return 'image';
    }
    if (isDocumentUrl(fileUrl)) {
        return 'file';
    }
    return isImageFileName(fileName) ? 'image' : 'file';
}

function mergeAttachmentKind(current: AttachmentKind, incoming: AttachmentKind): AttachmentKind {
    if (current === 'audio' || incoming === 'audio') return 'audio';
    if (current === 'file' || incoming === 'file') return 'file';
    return 'image';
}

function isRedundantFileLabel(text: string, attachments: MessageAttachment[]): boolean {
    const trimmed = text.trim();
    if (!trimmed || attachments.length === 0) return false;

    const label = trimmed.replace(/:$/, '').replace(/^\*\*|\*\*$/g, '').trim();
    if (!label) return false;

    return attachments.some(
        (item) =>
            item.fileName === label
            || item.fileUrl === trimmed
            || (URL_ONLY.test(trimmed) && item.fileUrl === trimmed),
    );
}

function preferAttachmentFileName(current: string, incoming: string, fileUrl: string): string {
    const slug = fileNameFromUrl(fileUrl);
    const candidates = [current, incoming].filter(
        (name) => name && name !== 'File' && name !== 'Image',
    );
    const human = candidates.find((name) => name !== slug);
    return human ?? candidates[0] ?? current;
}

/** Merge split blocks like `Resume.pdf:` + `https://...` into one text block. */
export function preprocessStructuredBlocks(
    content: StructuredContentBlock[],
): StructuredContentBlock[] {
    const merged: StructuredContentBlock[] = [];

    for (let index = 0; index < content.length; index += 1) {
        const block = content[index];
        if (block.type !== 'text' || !block.text) {
            merged.push(block);
            continue;
        }

        const plain = textPartToPlainString(block.text).trim();
        const next = content[index + 1];
        const nextPlain =
            next?.type === 'text' && next.text
                ? textPartToPlainString(next.text).trim()
                : '';

        const filenameLabel = plain.match(/^(.+?\.\w{1,10}):?$/);
        if (filenameLabel && nextPlain && URL_ONLY.test(nextPlain)) {
            merged.push({
                type: 'text',
                text: `${filenameLabel[1]}: ${nextPlain}`,
            });
            index += 1;
            continue;
        }

        merged.push(block);
    }

    return merged;
}

function attachmentFromInputAudio(block: StructuredContentBlock): MessageAttachment | null {
    if (block.type !== 'input_audio' || !block.input_audio?.data) {
        return null;
    }

    const format = block.input_audio.format || 'wav';
    const data = block.input_audio.data;
    const fileUrl = data.startsWith('http') || data.startsWith('data:')
        ? data
        : `data:audio/${format};base64,${data}`;

    return {
        kind: 'audio',
        fileName: `audio.${format}`,
        fileUrl,
    };
}

export function attachmentFromContentBlock(
    block: StructuredContentBlock,
): MessageAttachment | null {
    const audioAttachment = attachmentFromInputAudio(block);
    if (audioAttachment) {
        return audioAttachment;
    }

    if (block.type === 'image_url' && block.image_url?.url) {
        const url = block.image_url.url;
        const fromUrl = fileNameFromUrl(url);
        const fileName = isImageFileName(fromUrl) ? fromUrl : fromUrl;
        return {
            kind: resolveAttachmentKind(fileName, url),
            fileName: isDocumentUrl(url) || isAudioUrl(url)
                ? fileName
                : (isImageFileName(fileName) ? fileName : 'Image'),
            fileUrl: url,
        };
    }

    if (block.type === 'file_url' && block.file_url?.url) {
        const fileUrl = block.file_url.url;
        const fileName = block.file_url.name?.trim() || fileNameFromUrl(fileUrl);
        return {
            kind: resolveAttachmentKind(fileName, fileUrl),
            fileName,
            fileUrl,
        };
    }

    if (block.type === 'text' && block.text) {
        const plain = textPartToPlainString(block.text);
        const parsed = parseFileMessageFromString(plain);
        if (parsed.isFileMsg) {
            return {
                kind: resolveAttachmentKind(parsed.fileName, parsed.fileUrl),
                fileName: parsed.fileName,
                fileUrl: parsed.fileUrl,
            };
        }
    }

    return null;
}

export function segmentStructuredContent(
    content: StructuredContentBlock[],
): StructuredMessageSegment[] {
    const segments: StructuredMessageSegment[] = [];
    let attachmentBuffer: MessageAttachment[] = [];

    const pushAttachment = (attachment: MessageAttachment) => {
        const existingIndex = attachmentBuffer.findIndex(
            (item) => item.fileUrl === attachment.fileUrl,
        );
        if (existingIndex === -1) {
            attachmentBuffer.push(attachment);
            return;
        }

        const existing = attachmentBuffer[existingIndex];
        attachmentBuffer[existingIndex] = {
            ...existing,
            kind: mergeAttachmentKind(existing.kind, attachment.kind),
            fileName: preferAttachmentFileName(
                existing.fileName,
                attachment.fileName,
                attachment.fileUrl,
            ),
        };
    };

    const flushAttachments = () => {
        if (attachmentBuffer.length === 0) {
            return;
        }
        segments.push({
            type: 'attachments',
            items: attachmentBuffer,
            key: `attachments-${segments.length}`,
        });
        attachmentBuffer = [];
    };

    preprocessStructuredBlocks(content).forEach((block, index) => {
        const attachment = attachmentFromContentBlock(block);
        if (attachment) {
            pushAttachment(attachment);
            return;
        }

        if (block.type === 'text') {
            const plain = textPartToPlainString(block.text);
            if (!plain.trim()) {
                return;
            }
            if (isRedundantFileLabel(plain, attachmentBuffer)) {
                return;
            }
            flushAttachments();
            segments.push({ type: 'text', text: plain, key: `text-${index}` });
        }
    });

    flushAttachments();
    return segments;
}
