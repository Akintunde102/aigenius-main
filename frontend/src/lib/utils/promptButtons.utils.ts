/** Keep in sync with backend `prompt-buttons.utils.ts`. */

export const PROMPT_BUTTONS_FENCE_LANG = 'aigenius-prompt-buttons';

const PROMPT_BUTTONS_FENCE_PREFIX = '```' + PROMPT_BUTTONS_FENCE_LANG;
const PROMPT_BUTTONS_TAIL_RE = new RegExp(
    '^```' + PROMPT_BUTTONS_FENCE_LANG + '\\s*\\r?\\n([\\s\\S]*?)\\r?\\n```\\s*$',
    'i',
);

const MAX_PROMPT_BUTTONS = 4;
const MAX_PROMPT_BUTTON_LABEL_CHARS = 80;

function normalizePromptButtonLabels(raw: unknown): string[] {
    if (!Array.isArray(raw)) {
        return [];
    }
    const out: string[] = [];
    for (const item of raw) {
        if (typeof item !== 'string') continue;
        const label = item.trim().replace(/\s+/g, ' ');
        if (!label) continue;
        out.push(label.slice(0, MAX_PROMPT_BUTTON_LABEL_CHARS));
        if (out.length >= MAX_PROMPT_BUTTONS) break;
    }
    return out;
}

export function parseAndStripPromptButtons(text: string): {
    content: string;
    promptButtons: string[];
} {
    if (!text || !text.includes('```')) {
        return { content: text, promptButtons: [] };
    }

    const fenceStart = text.toLowerCase().lastIndexOf(PROMPT_BUTTONS_FENCE_PREFIX.toLowerCase());
    if (fenceStart < 0) {
        return { content: text, promptButtons: [] };
    }

    const tail = text.slice(fenceStart);
    const match = tail.match(PROMPT_BUTTONS_TAIL_RE);
    if (!match) {
        return { content: text, promptButtons: [] };
    }

    let promptButtons: string[] = [];
    const jsonBody = match[1]?.trim() ?? '';
    if (jsonBody) {
        try {
            promptButtons = normalizePromptButtonLabels(JSON.parse(jsonBody));
        } catch {
            return { content: text, promptButtons: [] };
        }
    }

    const content = text.slice(0, fenceStart).trimEnd();
    return { content, promptButtons };
}
