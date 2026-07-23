import type {
    ChatMessage,
    MessageEvent,
    ThinkingEvent,
} from '@/app/components/model-interface/shared/types';
import { textPartToPlainString } from '@/lib/utils/messageTextUtils';

export function extractReasoningChunk(
    reasoning?: string,
    reasoningDetails?: Array<{ text?: string }>,
): string {
    if (reasoning) {
        return reasoning;
    }
    const text = reasoningDetails?.[0]?.text;
    return typeof text === 'string' ? text : '';
}

export function finalizeOpenThinkingEvent(events: MessageEvent[]): void {
    const last = events[events.length - 1];
    if (last?.type === 'thinking' && last.loading) {
        last.loading = false;
    }
}

export function finalizeAllThinkingEvents(events: MessageEvent[]): void {
    for (const evt of events) {
        if (evt.type === 'thinking' && evt.loading) {
            evt.loading = false;
        }
    }
}

export function appendThinkingChunk(events: MessageEvent[], chunk: string): void {
    if (!chunk) {
        return;
    }

    const last = events[events.length - 1];
    if (last?.type === 'thinking' && last.loading) {
        last.content += chunk;
        return;
    }

    events.push({
        type: 'thinking',
        content: chunk,
        loading: true,
        timestamp: Date.now(),
    } satisfies ThinkingEvent);
}

/** Prepend a completed thinking block when legacy `reasoning` fields exist but events do not. */
export function enrichEventsWithLegacyThinking(
    events: MessageEvent[],
    msg: Pick<ChatMessage, 'reasoning' | 'reasoning_details' | 'timestamp'>,
): MessageEvent[] {
    if (events.some((e) => e.type === 'thinking')) {
        return events;
    }

    const legacyText =
        textPartToPlainString(msg.reasoning)
        || textPartToPlainString(msg.reasoning_details?.[0]?.text)
        || '';

    if (!legacyText.trim()) {
        return events;
    }

    return [
        {
            type: 'thinking',
            content: legacyText,
            loading: false,
            timestamp: msg.timestamp ?? Date.now(),
        } satisfies ThinkingEvent,
        ...events,
    ];
}

export function applyStreamingTurnUpdate(
    events: MessageEvent[],
    params: {
        textChunk?: string;
        reasoning?: string;
        reasoningDetails?: Array<{ text?: string }>;
    },
): MessageEvent[] {
    const next = [...events];
    const reasoningChunk = extractReasoningChunk(params.reasoning, params.reasoningDetails);
    if (reasoningChunk) {
        appendThinkingChunk(next, reasoningChunk);
    }

    const textChunk = params.textChunk;
    if (textChunk) {
        finalizeOpenThinkingEvent(next);
        const last = next[next.length - 1];
        if (last?.type === 'text') {
            last.content += textChunk;
        } else {
            next.push({ type: 'text', content: textChunk });
        }
    }

    return next;
}
