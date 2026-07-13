import { ChatCompletionRequestOverrides } from './chatOperations.types';
import { isPendingDraftMode } from '@/app/components/model-interface/conversation/conversationViewSession';

export function resolveRequestConversationId(
    requestOverrides: ChatCompletionRequestOverrides | undefined,
    currentSessionId: string | null | undefined,
): string | null {
    if (isPendingDraftMode()) {
        return null;
    }

    if (requestOverrides && Object.prototype.hasOwnProperty.call(requestOverrides, 'conversationId')) {
        return requestOverrides.conversationId ?? null;
    }

    return currentSessionId ?? null;
}
