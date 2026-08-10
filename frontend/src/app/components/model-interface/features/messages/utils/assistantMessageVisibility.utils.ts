import type { ChatMessage, MessageEvent } from '@/app/components/model-interface/shared/types';

/** True when an assistant bubble has no visible body and should not be mounted. */
export function shouldHideEmptyAssistantMessage(
    msg: ChatMessage,
    options: { streaming: boolean; displayEvents: MessageEvent[] },
): boolean {
    if (msg.role !== 'assistant') {
        return false;
    }

    const hasTextContent =
        typeof msg.content === 'string' && msg.content.trim() !== '';

    if (hasTextContent) {
        return false;
    }

    if (options.streaming) {
        return false;
    }

    if (options.displayEvents.some((event) => event.type === 'thinking')) {
        return false;
    }

    if (msg.reasoning) {
        return false;
    }

    if (msg.reasoning_details?.length) {
        return false;
    }

    if (msg.tool_executions?.length) {
        return false;
    }

    if (msg.streaming_tools?.length) {
        return false;
    }

    if (msg.events?.length) {
        return false;
    }

    return true;
}
