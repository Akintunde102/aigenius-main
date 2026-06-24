// Main export point for Model Interface feature
export { default as ModelInterface } from './ModelInterface';

// Re-export commonly used types (avoid wildcard to prevent conflicts)
export type {
    Model,
    ChatMessage,
    ChatSession,
    UsageInfo,
    CostCalculation,
    RedditToggleProps,
    ModelInterfaceState,
    ToolExecution,
    StreamingToolState
} from './shared/types';

// Re-export core features (selective exports to avoid conflicts)
export { useModelInterface } from './core';

// Re-export commonly used components
export { ChatArea, ChatContainer } from './features/chat';
export { ChatMessage as ChatMessageComponent } from './features/messages';
export { ModelSelectionModal } from './features/models';
