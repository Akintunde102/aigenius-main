import type { ChatMessage, MessageEvent } from '@/app/components/model-interface/shared/types';
import type {
    ProcessedContent,
    ReasoningDetailChunk,
    StreamContentChunk,
} from '../hooks/chatOperations.types';
import {
    contentToMarkdownText,
    mergeContentBlocks,
    processStreamingContent,
    updateLastAssistantMessage,
} from '../hooks/contentProcessing.utils';
import { applyStreamingTurnUpdate } from './thinkingEvent.utils';

export type AssistantStreamAccumulator = {
    content: ProcessedContent;
    reasoning: string;
    reasoningDetails: ReasoningDetailChunk[];
    events: MessageEvent[];
};

export function createAssistantStreamAccumulator(): AssistantStreamAccumulator {
    return {
        content: '',
        reasoning: '',
        reasoningDetails: [],
        events: [],
    };
}

/**
 * Accumulates one SSE chunk the same way the main chat stream path does:
 * merge content outside React state, then snapshot onto the last assistant message.
 */
export function ingestAssistantStreamChunk(
    acc: AssistantStreamAccumulator,
    content: StreamContentChunk,
    reasoning?: string,
    reasoningDetails?: ReasoningDetailChunk[],
): AssistantStreamAccumulator {
    const processedContent = processStreamingContent(content);
    const nextContent = mergeContentBlocks(acc.content, processedContent);
    const eventText = contentToMarkdownText(processedContent);

    const nextEvents = applyStreamingTurnUpdate(acc.events, {
        textChunk: eventText || undefined,
        reasoning,
        reasoningDetails,
    });

    let nextReasoning = acc.reasoning;
    let nextReasoningDetails = acc.reasoningDetails;
    if (reasoning) {
        nextReasoning = `${acc.reasoning || ''}${reasoning}`;
    }
    if (reasoningDetails?.length) {
        const prevText = acc.reasoningDetails[0]?.text ?? '';
        const newText = reasoningDetails[0]?.text ?? '';
        nextReasoningDetails = [{ ...reasoningDetails[0], text: `${prevText}${newText}` }];
    }

    return {
        content: nextContent,
        reasoning: nextReasoning,
        reasoningDetails: nextReasoningDetails,
        events: nextEvents,
    };
}

export function applyAccumulatorToLastAssistant(
    messages: ChatMessage[],
    acc: AssistantStreamAccumulator,
): ChatMessage[] {
    const updated = updateLastAssistantMessage(messages, acc.content);
    const lastIdx = updated.length - 1;
    if (lastIdx < 0 || updated[lastIdx].role !== 'assistant') {
        return updated;
    }

    updated[lastIdx] = {
        ...updated[lastIdx],
        events: acc.events,
        reasoning: acc.reasoning || undefined,
        reasoning_details: acc.reasoningDetails.length ? acc.reasoningDetails : undefined,
    };
    return updated;
}
