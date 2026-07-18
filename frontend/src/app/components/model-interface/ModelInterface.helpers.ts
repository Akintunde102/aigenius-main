import type { ChatMessage, ChatSession, Model } from './shared/types';

export const ATTACHMENT_INDEX_SYSTEM_MESSAGE_ID = 'sys_attachment_index';

export type AttachmentIndexItem = {
    name: string;
    url: string;
    isImage: boolean;
    mimeType?: string;
    uploadedAt: number;
};

export type UploadedFileEntry = {
    file?: File;
    fileUrl: string;
    isImage: boolean;
    displayName: string;
    mimeType?: string;
    source: 'local' | 'library';
    libraryFileId?: string;
};

export function getUploadedFileDisplayName(entry: UploadedFileEntry): string {
    return entry.displayName || entry.file?.name || 'attachment';
}

export type PublishableSession = ChatSession & {
    id: string;
};

export type ModelPickResolver = (model: Model | null) => void;

export function formatAttachmentIndexSystemMessage(
    items: AttachmentIndexItem[],
    assistantImageUrls: string[] = [],
): string {
    const lines: string[] = [];

    if (items.length > 0) {
        lines.push('User-uploaded attachment links (most recent last):');
        lines.push(...items.map((it) => `- [${it.isImage ? 'image' : 'file'}] ${it.name}: ${it.url}`));
    }

    if (assistantImageUrls.length > 0) {
        if (lines.length > 0) {
            lines.push('');
        }
        lines.push('Assistant-generated image links (most recent last):');
        lines.push(...assistantImageUrls.map((url) => `- [image] ${url}`));
    }

    return lines.join('\n');
}

export function getAssistantImageUrlsFromChat(chat: ChatMessage[]): string[] {
    const urls: string[] = [];
    const seen = new Set<string>();

    for (const msg of chat) {
        if (msg.role !== 'assistant' || !Array.isArray(msg.content)) {
            continue;
        }

        for (const block of msg.content) {
            if (block.type !== 'image_url' || !block.image_url?.url) {
                continue;
            }

            const url = block.image_url.url;
            if (!seen.has(url)) {
                seen.add(url);
                urls.push(url);
            }
        }
    }

    return urls;
}

export function createSystemChatMessage(args: {
    content: string;
    model?: Pick<Model, 'id' | 'name'> | null;
    sessionId?: string | null;
    personaName?: string;
    personaIconUrl?: string;
}): ChatMessage {
    const { content, model, sessionId, personaName, personaIconUrl } = args;
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    return {
        id: messageId,
        messageId,
        role: 'system',
        content,
        timestamp: Date.now(),
        modelId: model?.id,
        modelName: model?.name ?? model?.id,
        sessionId: sessionId || undefined,
        personaName,
        personaIconUrl,
    };
}

export function scheduleNextTick(fn: () => void) {
    if (typeof queueMicrotask === 'function') {
        queueMicrotask(fn);
        return;
    }

    setTimeout(fn, 0);
}
