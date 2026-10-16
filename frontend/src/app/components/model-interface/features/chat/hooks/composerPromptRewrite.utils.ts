import type { OpenRouterMessage } from '@/nobox-client/functions/access-model';
import type { ChatMessage } from '@/app/components/model-interface/shared/types';
import { optimizeMessagesForAPI } from './messageOptimization.utils';
import { orderMessagesForApi } from './sendFlow.utils';
import { contentToDisplayText, processBackendContent } from './contentProcessing.utils';

export const COMPOSER_PROMPT_REWRITE_SYSTEM = `[composer_prompt_rewrite]
You improve the user's next chat message for the conversation above.
- Preserve intent, facts, names, and constraints from the draft.
- Match the tone and language of the conversation when obvious.
- Make the draft clearer and more complete; do not invent new goals.
- Output only the rewritten message text: no quotes, labels, markdown fences, or preamble.`;

export function buildComposerPromptRewriteUserContent(draft: string): string {
    return (
        'Rewrite the draft below into the best version of the user\'s next message for this chat.\n\n' +
        `<draft>\n${draft}\n</draft>`
    );
}

export function buildComposerPromptRewriteMessages(
    chat: ChatMessage[],
    draft: string,
): OpenRouterMessage[] {
    const ordered = orderMessagesForApi(chat);
    const { messages: packed } = optimizeMessagesForAPI(ordered);
    return [
        ...packed,
        { role: 'system', content: COMPOSER_PROMPT_REWRITE_SYSTEM },
        { role: 'user', content: buildComposerPromptRewriteUserContent(draft) },
    ];
}

/** Strip common model wrappers so the composer gets plain text. */
export function normalizeRewrittenComposerText(raw: string): string {
    let text = raw.trim();
    if (!text) {
        return '';
    }
    const fence = /^```(?:\w+)?\s*([\s\S]*?)```\s*$/;
    const fenced = text.match(fence);
    if (fenced?.[1]) {
        text = fenced[1].trim();
    }
    if (
        (text.startsWith('"') && text.endsWith('"'))
        || (text.startsWith("'") && text.endsWith("'"))
    ) {
        text = text.slice(1, -1).trim();
    }
    return text;
}

export function rewrittenTextFromModelContent(content: unknown): string {
    const processed = processBackendContent(content);
    const display = contentToDisplayText(processed);
    return normalizeRewrittenComposerText(display);
}
