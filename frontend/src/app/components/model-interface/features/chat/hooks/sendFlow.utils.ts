import { ChatMessage, Model } from '@/app/components/model-interface/shared/types';
import { computeModelRequiredBalance } from '../../models/utils/modelWalletAffordance.utils';
import { createChatMessage } from './contentProcessing.utils';
import { augmentUserTextForWorkflowPlanConfirmation } from './workflow-plan-confirmation.utils';

export function resolveInputToSend(content: string | undefined, input: string): string {
    return content || input;
}

export function computeRequiredBalance(selectedModel: Model | null): number {
    return computeModelRequiredBalance(selectedModel);
}

export function buildUserMessageState(args: {
    preCreatedMessage?: ChatMessage;
    inputToSend: string;
    selectedModel: Model;
    currentSessionId: string | null;
    chat: ChatMessage[];
}): { userMsg: ChatMessage; updatedChat: ChatMessage[] } {
    const { preCreatedMessage, inputToSend, selectedModel, currentSessionId, chat } = args;

    if (preCreatedMessage) {
        return {
            userMsg: preCreatedMessage,
            updatedChat: [...chat.filter((m) => m.id !== preCreatedMessage.id), preCreatedMessage],
        };
    }

    const displayText = inputToSend;
    const contentForApi = augmentUserTextForWorkflowPlanConfirmation(chat, inputToSend);

    const userMsg: ChatMessage = {
        ...createChatMessage(
            'user',
            displayText,
            selectedModel.id,
            selectedModel.name || selectedModel.id,
            currentSessionId,
        ),
        ...(contentForApi !== displayText ? { apiContent: contentForApi } : {}),
    };

    return {
        userMsg,
        updatedChat: [...chat, userMsg],
    };
}

export function orderMessagesForApi(chat: ChatMessage[]): ChatMessage[] {
    return [
        ...chat.filter((m) => m.role === 'system'),
        ...chat.filter((m) => m.role !== 'system'),
    ];
}
