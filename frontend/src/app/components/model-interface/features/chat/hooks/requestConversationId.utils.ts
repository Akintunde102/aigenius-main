import { ChatCompletionRequestOverrides } from './chatOperations.types';

export function resolveRequestConversationId(
    requestOverrides: ChatCompletionRequestOverrides | undefined,
    currentSessionId: string | null | undefined,
): string | null {
    if (requestOverrides && Object.prototype.hasOwnProperty.call(requestOverrides, 'conversationId')) {
        return requestOverrides.conversationId ?? null;
    }

    return currentSessionId ?? null;
}
