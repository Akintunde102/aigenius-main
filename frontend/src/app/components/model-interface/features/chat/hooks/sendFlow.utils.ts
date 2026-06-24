import { ChatMessage, Model } from '@/app/components/model-interface/shared/types';
import { getModelAverageRequestPrice, USD_TO_NGN } from '@/app/components/model-interface/shared/utils';
import { CHAT_CONFIG } from './chatOperations.constants';
import { createChatMessage } from './contentProcessing.utils';
import { augmentUserTextForWorkflowPlanConfirmation } from './workflow-plan-confirmation.utils';

export function resolveInputToSend(content: string | undefined, input: string): string {
    return content || input;
}

export function computeRequiredBalance(selectedModel: Model | null): number {
    if (!selectedModel) {
        return CHAT_CONFIG.MIN_WALLET_BALANCE;
    }

    const averageCostUSD = getModelAverageRequestPrice(selectedModel);
    const averageCostCredits = averageCostUSD * USD_TO_NGN;

    return Math.max(
        CHAT_CONFIG.MIN_WALLET_BALANCE,
        averageCostCredits > 0 ? averageCostCredits * CHAT_CONFIG.MODEL_BALANCE_FACTOR : 0,
    );
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
