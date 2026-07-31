import type { ChatMessage, ChatSession } from '@/app/components/model-interface/shared/types';
import { textPartToPlainString } from '@/lib/utils/messageTextUtils';

export type TranscriptFormat = 'txt' | 'md' | 'json';

export interface TranscriptMessage {
    role: 'user' | 'assistant';
    content: string;
}

const MIME_TYPES: Record<TranscriptFormat, string> = {
    txt: 'text/plain;charset=utf-8',
    md: 'text/markdown;charset=utf-8',
    json: 'application/json;charset=utf-8',
};

function sanitizeFilenameSegment(value: string): string {
    const cleaned = value
        .trim()
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
    return cleaned.slice(0, 60) || 'untitled-chat';
}

function formatExportDate(date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function buildConversationTranscriptFilename(
    title: string,
    format: TranscriptFormat,
    sessionId?: string,
    exportedAt = new Date(),
): string {
    const normalizedTitle = title.trim();
    const isGenericTitle = !normalizedTitle || /^untitled(\s+chat)?$/i.test(normalizedTitle);
    const shortId = sessionId?.trim().slice(0, 8);

    const baseName = isGenericTitle
        ? shortId
            ? `chat-${shortId}`
            : 'untitled-chat'
        : sanitizeFilenameSegment(normalizedTitle);

    return `${baseName}-${formatExportDate(exportedAt)}.${format}`;
}

function getAttachmentLines(block: Record<string, unknown>): string[] {
    const type = typeof block.type === 'string' ? block.type : '';
    const lines: string[] = [];

    if (type === 'image_url' || block.image_url) {
        const imageUrl = block.image_url;
        const url =
            typeof imageUrl === 'string'
                ? imageUrl
                : imageUrl && typeof imageUrl === 'object' && typeof (imageUrl as { url?: string }).url === 'string'
                  ? (imageUrl as { url: string }).url
                  : typeof block.url === 'string'
                    ? block.url
                    : '';
        if (url) lines.push(`[Image: ${url}]`);
    }

    if (type === 'file_url' || block.file_url) {
        const fileUrl = block.file_url;
        const url =
            fileUrl && typeof fileUrl === 'object' && typeof (fileUrl as { url?: string }).url === 'string'
                ? (fileUrl as { url: string }).url
                : '';
        const name =
            fileUrl && typeof fileUrl === 'object' && typeof (fileUrl as { name?: string }).name === 'string'
                ? (fileUrl as { name: string }).name.trim()
                : '';
        if (url) {
            lines.push(name ? `[File: ${name}] ${url}` : `[File: ${url}]`);
        }
    }

    if (type === 'input_audio' || block.input_audio) {
        const audio = block.input_audio;
        const format =
            audio && typeof audio === 'object' && typeof (audio as { format?: string }).format === 'string'
                ? (audio as { format: string }).format
                : 'audio';
        lines.push(`[Audio attachment: ${format}]`);
    }

    return lines;
}

function extractTextFromContent(content: ChatMessage['content']): string {
    if (typeof content === 'string') {
        return content.trim();
    }

    if (!Array.isArray(content)) {
        return textPartToPlainString(content).trim();
    }

    const parts: string[] = [];
    for (const block of content) {
        if (!block || typeof block !== 'object') continue;
        const record = block as Record<string, unknown>;
        const type = typeof record.type === 'string' ? record.type : '';

        if (type === 'text' || record.text != null) {
            const text = textPartToPlainString(record.text ?? record).trim();
            if (text) parts.push(text);
            continue;
        }

        parts.push(...getAttachmentLines(record));
    }

    return parts.join('\n').trim();
}

function extractTextFromAssistantMessage(message: ChatMessage): string {
    if (Array.isArray(message.events) && message.events.length > 0) {
        const textParts = message.events
            .filter((event) => event.type === 'text')
            .map((event) => textPartToPlainString(event.content).trim())
            .filter(Boolean);
        if (textParts.length > 0) {
            return textParts.join('\n\n').trim();
        }
    }

    return extractTextFromContent(message.content);
}

export function extractTranscriptMessage(message: ChatMessage): TranscriptMessage | null {
    if (message.role !== 'user' && message.role !== 'assistant') {
        return null;
    }

    const content =
        message.role === 'assistant'
            ? extractTextFromAssistantMessage(message)
            : extractTextFromContent(message.content);

    if (!content) {
        return null;
    }

    return { role: message.role, content };
}

export function buildConversationTranscriptMessages(messages: ChatMessage[]): TranscriptMessage[] {
    return messages
        .map((message) => extractTranscriptMessage(message))
        .filter((message): message is TranscriptMessage => message != null);
}

function roleLabel(role: TranscriptMessage['role']): string {
    return role === 'user' ? 'User' : 'Assistant';
}

export function formatTranscriptAsText(
    title: string,
    messages: TranscriptMessage[],
    exportedAt = new Date(),
): string {
    const header = [
        `Conversation: ${title.trim() || 'Untitled Chat'}`,
        `Exported: ${exportedAt.toISOString()}`,
        '',
    ];

    const body = messages.flatMap((message, index) => {
        const block = [`${roleLabel(message.role)}:`, message.content];
        if (index < messages.length - 1) {
            block.push('');
        }
        return block;
    });

    return [...header, ...body].join('\n').trimEnd();
}

export function formatTranscriptAsMarkdown(
    title: string,
    messages: TranscriptMessage[],
    exportedAt = new Date(),
): string {
    const header = [
        `# ${title.trim() || 'Untitled Chat'}`,
        '',
        `_Exported: ${exportedAt.toISOString()}_`,
        '',
    ];

    const body = messages.flatMap((message) => [`## ${roleLabel(message.role)}`, '', message.content, '']);

    return [...header, ...body].join('\n').trimEnd();
}

export function formatTranscriptAsJson(
    title: string,
    messages: TranscriptMessage[],
    exportedAt = new Date(),
): string {
    return JSON.stringify(
        {
            title: title.trim() || 'Untitled Chat',
            exportedAt: exportedAt.toISOString(),
            messages,
        },
        null,
        2,
    );
}

export function buildConversationTranscriptContent(
    title: string,
    messages: ChatMessage[],
    format: TranscriptFormat,
    exportedAt = new Date(),
): string {
    const transcriptMessages = buildConversationTranscriptMessages(messages);

    switch (format) {
        case 'md':
            return formatTranscriptAsMarkdown(title, transcriptMessages, exportedAt);
        case 'json':
            return formatTranscriptAsJson(title, transcriptMessages, exportedAt);
        default:
            return formatTranscriptAsText(title, transcriptMessages, exportedAt);
    }
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

export function downloadConversationTranscript(
    session: ChatSession,
    title: string,
    format: TranscriptFormat,
    exportedAt = new Date(),
): void {
    const content = buildConversationTranscriptContent(title, session.messages ?? [], format, exportedAt);
    const filename = buildConversationTranscriptFilename(title, format, session.id, exportedAt);
    downloadTextFile(filename, content, MIME_TYPES[format]);
}
