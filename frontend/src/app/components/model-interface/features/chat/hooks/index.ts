// Chat operation hooks and utilities
export { useChatOperationsRefined } from './useChatOperationsRefined';
export { useStreamingResponse } from './useStreamingResponse';
export { useNonStreamingResponse } from './useNonStreamingResponse';
export { useWalletManagement } from './useWalletManagement';
export { useChatData } from './useChatData';
export { useChatHistory } from './useChatHistory';
export { useChatState } from './useChatState';
export { useSessionSwitcher } from './useSessionSwitcher';
export { useConversationEvents } from './useConversationEvents';

// Utilities
export * from './chatOperations.types';
export * from './chatOperations.constants';
export { createChatMessage, updateLastAssistantMessage, updateLastMessageWithMetrics } from './contentProcessing.utils';
export { optimizeMessagesForAPI } from './messageOptimization.utils';
export {
    handleSendError,
    validateWalletBalance,
    validateProject,
    logMetrics,
    normalizeWalletForGating,
} from './errorHandling.utils';
