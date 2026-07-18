/**
 * Coerce streaming/API text shapes (plain string, { type, text }, nested parts, or arrays of tokens)
 * to a single string safe for message display and DOM text nodes.
 *
 * Some providers send token arrays or nested content parts; passing those objects as React children
 * triggers "Objects are not valid as a React child (found: object with keys {text, type})".
 */
export function textPartToPlainString(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value == null) return '';
    if (Array.isArray(value)) {
        return value.map((item) => textPartToPlainString(item)).join('');
    }
    if (typeof value === 'object') {
        const o = value as Record<string, unknown>;
        if ('text' in o) {
            return textPartToPlainString(o.text);
        }
        if (typeof o.content === 'string') {
            return o.content;
        }
    }
    return '';
}

/**
 * Derive a sidebar-safe chat title from message content (plain string or structured blocks).
 * Avoids passing content arrays/objects into React text nodes when the first message has attachments.
 */
export function deriveChatSessionTitle(content: unknown, fallback = 'New chat'): string {
    const plain = textPartToPlainString(content).trim();
    if (plain) {
        return plain.length > 80 ? `${plain.slice(0, 77)}…` : plain;
    }

    if (Array.isArray(content)) {
        const hasAttachment = content.some((block) => {
            if (!block || typeof block !== 'object') return false;
            const type = (block as { type?: string }).type;
            return type === 'image_url' || type === 'file_url' || type === 'input_audio';
        });
        if (hasAttachment) {
            const fileBlock = content.find(
                (block) => block && typeof block === 'object' && (block as { type?: string }).type === 'file_url',
            ) as { file_url?: { name?: string } } | undefined;
            const fileName = fileBlock?.file_url?.name?.trim();
            if (fileName) {
                return fileName.length > 80 ? `${fileName.slice(0, 77)}…` : fileName;
            }
            return 'Attachment';
        }
    }

    return fallback;
}

/**
 * Coerce values that may be plain strings, OpenAI-style `{ type, text }` parts, or arbitrary JSON
 * to a string safe for React text nodes (tool logs, parsed API results, etc.).
 */
export function valueToDisplayString(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    const fromParts = textPartToPlainString(value);
    if (fromParts !== '') return fromParts;
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch {
            return '[Unserializable]';
        }
    }
    return String(value);
}
