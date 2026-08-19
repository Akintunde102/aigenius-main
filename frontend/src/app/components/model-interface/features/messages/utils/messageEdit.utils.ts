import type { ChatMessage } from '@/app/components/model-interface/shared/types';
import { textPartToPlainString } from '@/lib/utils/messageTextUtils';

export type EditAttachment = {
    fileUrl: string;
    isImage: boolean;
    displayName: string;
    mimeType?: string;
};

export type MessageEditDraft = {
    text: string;
    attachments: EditAttachment[];
};

export function parseMessageForEdit(message: ChatMessage): MessageEditDraft {
    if (typeof message.content === 'string') {
        return { text: message.content, attachments: [] };
    }

    if (!Array.isArray(message.content)) {
        return { text: '', attachments: [] };
    }

    const textParts: string[] = [];
    const attachments: EditAttachment[] = [];

    for (const block of message.content) {
        if (!block || typeof block !== 'object') continue;

        if (block.type === 'text' && block.text != null) {
            const plain = textPartToPlainString(block.text);
            if (plain) textParts.push(plain);
            continue;
        }

        if (block.type === 'image_url' && block.image_url?.url) {
            attachments.push({
                fileUrl: block.image_url.url,
                isImage: true,
                displayName: 'image',
            });
            continue;
        }

        if (block.type === 'file_url' && block.file_url?.url) {
            attachments.push({
                fileUrl: block.file_url.url,
                isImage: false,
                displayName: block.file_url.name || 'file',
            });
        }
    }

    return {
        text: textParts.join('\n'),
        attachments,
    };
}

export function buildEditedUserMessage(
    original: ChatMessage,
    draft: MessageEditDraft,
): ChatMessage {
    const trimmedText = draft.text.trim();
    const hasAttachments = draft.attachments.length > 0;

    let content: ChatMessage['content'];
    if (!hasAttachments) {
        content = trimmedText;
    } else {
        const parts: NonNullable<Extract<ChatMessage['content'], unknown[]>> = [];
        if (trimmedText) {
            parts.push({ type: 'text', text: trimmedText });
        }
        for (const attachment of draft.attachments) {
            if (attachment.isImage) {
                parts.push({
                    type: 'image_url',
                    image_url: { url: attachment.fileUrl },
                });
            } else {
                parts.push({
                    type: 'file_url',
                    file_url: {
                        url: attachment.fileUrl,
                        name: attachment.displayName,
                    },
                });
            }
        }
        content = parts;
    }

    return {
        ...original,
        content,
        apiContent: undefined,
        timestamp: Date.now(),
    };
}

export function isEditDraftSubmittable(draft: MessageEditDraft): boolean {
    return draft.text.trim().length > 0 || draft.attachments.length > 0;
}
