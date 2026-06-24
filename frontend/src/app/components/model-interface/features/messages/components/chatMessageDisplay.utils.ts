import type { MessageEvent, TextEvent, ToolEvent } from '@/app/components/model-interface/shared/types';
import { textPartToPlainString } from '@/lib/utils/messageTextUtils';

export type ChatMessageDisplayBlock =
    | { type: 'text'; content: string; endsWithLastTextEvent: boolean }
    | { type: 'tool'; event: ToolEvent };

function countFencedCodeBlocks(content: string): number {
    const matches = content.match(/(^|\n)```[^\n]*/g);
    return matches?.length ?? 0;
}

function stabilizeStreamingMarkdown(content: string): string {
    if (!content.trim()) {
        return content;
    }

    // Streaming often pauses mid-fence. Closing a dangling fenced block keeps
    // markdown layout readable without mutating completed messages.
    if (countFencedCodeBlocks(content) % 2 === 1) {
        return `${content}\n\`\`\``;
    }

    return content;
}

export function getLastTextEventIndex(events: MessageEvent[]): number {
    let idx = -1;
    events.forEach((e, i) => {
        if (e.type === 'text') {
            idx = i;
        }
    });
    return idx;
}

export function buildChatMessageDisplayBlocks(
    events: MessageEvent[],
    options: { streaming: boolean },
): ChatMessageDisplayBlock[] {
    if (events.length === 0) {
        return [];
    }

    const blocks: ChatMessageDisplayBlock[] = [];
    const lastTextEventIndex = getLastTextEventIndex(events);
    let textBuffer = '';
    let lastBufferedTextEventIndex = -1;

    const flushTextBuffer = () => {
        const rawContent = textBuffer;
        textBuffer = '';

        if (!rawContent.trim()) {
            lastBufferedTextEventIndex = -1;
            return;
        }

        const endsWithLastTextEvent = lastBufferedTextEventIndex === lastTextEventIndex;
        blocks.push({
            type: 'text',
            content:
                options.streaming && endsWithLastTextEvent
                    ? stabilizeStreamingMarkdown(rawContent)
                    : rawContent,
            endsWithLastTextEvent,
        });
        lastBufferedTextEventIndex = -1;
    };

    events.forEach((evt, index) => {
        if (evt.type === 'text') {
            textBuffer += textPartToPlainString((evt as TextEvent).content as unknown);
            lastBufferedTextEventIndex = index;
            return;
        }

        flushTextBuffer();
        blocks.push({ type: 'tool', event: evt as ToolEvent });
    });

    flushTextBuffer();
    return blocks;
}
