/**
 * Normalize message content so structured content (text + image_url, etc.)
 * is preserved after reload from backend/storage. Use at API response layer
 * and when displaying messages.
 */

type MessageWithContentAndCost = {
    content?: unknown;
    cost?: unknown;
    modelId?: string;
};

type SessionWithMessages = {
    modelId?: string;
    metadata?: {
        totalCost?: number;
        totalTokens?: number;
        lastAccessed?: string | Date;
    };
    messages?: MessageWithContentAndCost[];
};

function getImageUrlFromBlock(block: Record<string, unknown>): string | null {
    // image_url may be string or { url: string } or nested
    const img = block.image_url;
    if (typeof img === 'string') return img;
    if (img && typeof img === 'object') {
        const o = img as Record<string, unknown>;
        if (typeof o.url === 'string') return o.url;
        if (o.data && typeof (o.data as Record<string, unknown>)?.url === 'string') {
            return (o.data as { url: string }).url;
        }
    }
    // some APIs use top-level url for image blocks
    if (block.type === 'image_url' && typeof block.url === 'string') return block.url;
    return null;
}

function normalizeContentBlock(block: unknown): unknown {
    if (!block || typeof block !== 'object') return block;
    const b = block as Record<string, unknown>;
    const url = getImageUrlFromBlock(b);
    if (url != null) {
        return { ...b, type: 'image_url', image_url: { url: String(url) } };
    }
    return block;
}

/** Normalize a single message's content for display/persistence. */
export function normalizeMessageContent(content: unknown): unknown {
    if (content == null) return content;
    if (Array.isArray(content)) {
        return content.map(normalizeContentBlock);
    }
    if (typeof content === 'object' && content !== null) {
        const c = content as Record<string, unknown>;
        if (c.type || c.image_url) {
            return [normalizeContentBlock(content)];
        }
    }
    if (typeof content === 'string') {
        const trimmed = content.trim();
        if (!trimmed) return content;
        let parsed: unknown;
        try {
            parsed = JSON.parse(trimmed);
        } catch {
            return content;
        }
        // Handle double-stringified (e.g. backend stored stringified JSON)
        if (typeof parsed === 'string') {
            const inner = normalizeMessageContent(parsed);
            return inner !== parsed ? inner : content;
        }
        if (Array.isArray(parsed)) {
            return parsed.map(normalizeContentBlock);
        }
        if (parsed && typeof parsed === 'object' && (parsed as Record<string, unknown>).type) {
            return [normalizeContentBlock(parsed)];
        }
        if (parsed && typeof parsed === 'object' && (parsed as Record<string, unknown>).image_url) {
            return [normalizeContentBlock(parsed)];
        }
    }
    return content;
}

/**
 * Normalize cost for display: backend may store cost as number or as { cost: number }.
 * Frontend components expect msg.cost as a number.
 */
function normalizeMessageCost<T extends { cost?: unknown }>(msg: T): T {
    const c = msg.cost;
    if (c === undefined || c === null) return msg;
    if (typeof c === 'number') return msg;
    if (typeof c === 'object' && c !== null && 'cost' in (c as object)) {
        return { ...msg, cost: (c as { cost: number }).cost } as T;
    }
    return msg;
}

function normalizeMessageModel<T extends { modelId?: string }>(msg: T, fallbackModelId?: string): T {
    if (msg.modelId || !fallbackModelId) return msg;
    return { ...msg, modelId: fallbackModelId } as T;
}

function normalizeMessageId<T extends { id?: string; messageId?: string; timestamp?: number; role?: string }>(
    msg: T,
    index: number,
): T {
    if (msg.messageId) return msg;
    if (msg.id) {
        return { ...msg, messageId: msg.id } as T;
    }

    const fallbackId = `legacy_${msg.role ?? 'message'}_${msg.timestamp ?? 0}_${index}`;
    return { ...msg, id: fallbackId, messageId: fallbackId } as T;
}

/** Normalize all messages in a list so content and cost/usage are in the correct shape after load. */
export function normalizeChatMessages<T extends { content?: unknown; cost?: unknown; modelId?: string; id?: string; messageId?: string; timestamp?: number; role?: string }>(
    messages: T[],
    fallbackModelId?: string
): T[] {
    if (!Array.isArray(messages)) return messages;
    return messages.map((msg, index) => {
        const withIdentity = normalizeMessageId(msg, index);
        const withContent = { ...withIdentity, content: normalizeMessageContent(withIdentity.content) };
        const withCost = normalizeMessageCost(withContent) as T;
        return normalizeMessageModel(withCost, fallbackModelId);
    });
}

/** Normalize a session's messages in place (mutates and returns session). */
export function normalizeSessionMessages<T extends SessionWithMessages>(
    session: T
): T {
    if (!session?.messages) return session;
    return {
        ...session,
        messages: normalizeChatMessages(session.messages, session.modelId),
    };
}

export function getSavedMessageCost(message: { cost?: unknown }): number | null {
    if (typeof message.cost === 'number') {
        return message.cost;
    }
    if (message.cost && typeof message.cost === 'object' && 'cost' in (message.cost as object)) {
        const nestedCost = (message.cost as { cost?: unknown }).cost;
        return typeof nestedCost === 'number' ? nestedCost : null;
    }
    return null;
}

export function getSessionStoredTotalCost(session: SessionWithMessages): number | null {
    return typeof session.metadata?.totalCost === 'number' ? session.metadata.totalCost : null;
}

/** Result of parsing a file message from a string (for previews). */
export interface ParseFileMessageResult {
    isFileMsg: boolean;
    fileUrl: string;
    fileName: string;
}

/**
 * Parse a string that may represent a file message (e.g. "fileName: https://..." or HTML link)
 * for preview purposes. Used by useMessageContent and display logic.
 */
export function parseFileMessageFromString(raw: string): ParseFileMessageResult {
    const result: ParseFileMessageResult = { isFileMsg: false, fileUrl: '', fileName: '' };
    const normalized = raw.trim();

    if (normalized.startsWith('<a href=')) {
        const match = normalized.match(/href='([^']+)'[^>]*>([^<]+)<\/a>/);
        if (match) {
            result.isFileMsg = true;
            result.fileUrl = match[1];
            result.fileName = match[2];
        }
        return result;
    }

    const looksLikeFileName = (fileName: string) => /\.[A-Za-z0-9]{1,10}$/.test(fileName);

    const assignParsedFile = (fileNameRaw: string, fileUrl: string): boolean => {
        const fileName = fileNameRaw.trim().replace(/:$/, '').replace(/^\*\*|\*\*$/g, '');
        if (!looksLikeFileName(fileName)) return false;
        result.isFileMsg = true;
        result.fileName = fileName;
        result.fileUrl = fileUrl.trim();
        return true;
    };

    // Single-line: "<fileName>: <url>" (optionally markdown-bold).
    if (!normalized.includes('\n')) {
        const plainMatch = normalized.match(/^(.+?):\s*(https?:\/\/\S+)$/);
        const boldMatch = normalized.match(/^\*\*(.+?)\*\*\s*(https?:\/\/\S+)$/);
        const fileNameRaw = plainMatch?.[1] ?? boldMatch?.[1];
        const fileUrl = plainMatch?.[2] ?? boldMatch?.[2];
        if (fileNameRaw && fileUrl) {
            assignParsedFile(fileNameRaw, fileUrl);
        }
        return result;
    }

    // Multiline file reference: "Resume.pdf:\nhttps://..." (common after API persistence).
    const multilineMatch = normalized.match(/^(.+?\.\w{1,10}):?\s*\n\s*(https?:\/\/\S+)\s*$/);
    if (multilineMatch) {
        assignParsedFile(multilineMatch[1], multilineMatch[2]);
        return result;
    }

    // Generic multiline markdown summaries must not be treated as file messages.
    return result;
}
