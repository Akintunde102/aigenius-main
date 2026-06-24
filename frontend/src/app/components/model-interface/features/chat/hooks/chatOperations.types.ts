import { ChatMessage, Model, ChatSession, OrphanReplyRequest, ToolUsageCharge, UsageInfo } from '@/app/components/model-interface/shared/types';
import { OpenRouterMessage } from '@/nobox-client/functions/access-model';

export type ChatUpdater = ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[]);
export type SetChatForSession = (sessionId: string, updater: ChatUpdater) => void;
export type SetBooleanForSession = (sessionId: string, value: boolean) => void;

// Content block types for structured content
export interface ContentBlock {
    type: string;
    text?: string;
    image_url?: { url: string };
    imageText?: string;
    input_audio?: { data: string; format: string };
}

// Processed content type that can be string or structured array
export type ProcessedContent = string | ContentBlock[];

// Message optimization result
export interface MessageOptimizationResult {
    messages: OpenRouterMessage[];
    message: string | null;
}

// Stream result from API calls
export interface StreamResult {
    usage?: UsageInfo;
    cost?: number;
    wallet?: number;
    conversationId?: string;
    tool_usage_charges?: ToolUsageCharge[];
}

// Props for the main chat operations hook
export interface UseChatOperationsRefinedProps {
    selectedModel: Model | null;
    chat: ChatMessage[];
    setChat: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    setChatForSession: SetChatForSession;
    streaming: boolean;
    setStreamingForSession: SetBooleanForSession;
    setLoadingForSession: SetBooleanForSession;
    setError: React.Dispatch<React.SetStateAction<string>>;
    streamingEnabled: boolean;
    chatEndRef: React.RefObject<HTMLDivElement>;
    refreshChatHistory?: () => Promise<void>;
    currentSessionId?: string | null;
    routeConversationId?: string | null;
    setCurrentSessionId?: (id: string | null) => void;
    setChatHistory?: React.Dispatch<React.SetStateAction<ChatSession[]>>;
    updateSessionMessages?: (sessionId: string, messages: ChatMessage[], sessionData?: Partial<ChatSession>) => void;
    selectedPersonalityName?: string;
    selectedPersonalityIconUrl?: string;
    pendingOrphanReply?: OrphanReplyRequest | null;
    clearPendingOrphanReply?: () => void;
    /** When the API returns insufficient-funds, open credits modal / sync balance. */
    onInsufficientFunds?: () => void;
}

// Return type for the main hook
export interface UseChatOperationsReturn {
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    wallet: number | null;
    setWallet: React.Dispatch<React.SetStateAction<number | null>>;
    assistantResponse: string;
    optimizationMessage: string;
    handleSend: (
        content?: string,
        enableStreaming?: boolean,
        preCreatedMessage?: ChatMessage,
        chatSnapshot?: ChatMessage[],
    ) => Promise<void>;
    handleStop: () => void;
    refreshWalletBalance: () => Promise<number | null>;
}

// Props for streaming response handler
export interface UseStreamingResponseProps {
    selectedModel: Model;
    setChatForSession: SetChatForSession;
    setStreamingForSession: SetBooleanForSession;
    setLoadingForSession: SetBooleanForSession;
    setAssistantResponse: React.Dispatch<React.SetStateAction<string>>;
    currentSessionId?: string | null;
    activeViewSessionId?: string | null;
    updateSessionMessages?: (sessionId: string, messages: ChatMessage[], sessionData?: Partial<ChatSession>) => void;
    handleStreamResult: (result: StreamResult, streamingSessionId: string | null) => void;
    handleSendError: (error: unknown) => void;
    selectedPersonalityName?: string;
    selectedPersonalityIconUrl?: string;
}

export interface ChatCompletionRequestOverrides {
    conversationId?: string | null;
    orphanReply?: OrphanReplyRequest | null;
    assistantMessageId?: string;
    assistantTimestamp?: number;
}

// Props for non-streaming response handler
export interface UseNonStreamingResponseProps {
    selectedModel: Model;
    setChatForSession: SetChatForSession;
    currentSessionId?: string | null;
    activeViewSessionId?: string | null;
    updateSessionMessages?: (sessionId: string, messages: ChatMessage[], sessionData?: Partial<ChatSession>) => void;
    setCurrentSessionId?: (id: string | null) => void;
    /** Called when a brand-new (draft) chat receives its first real conversation ID.
     *  The caller is responsible for migrating chatMap and updating currentSessionId. */
    onDraftCompleted?: (realId: string, assistantMsg: ChatMessage) => void;
    setWallet: React.Dispatch<React.SetStateAction<number | null>>;
    wallet: number | null;
    logMetrics: (usage?: UsageInfo, cost?: number) => void;
    selectedPersonalityName?: string;
    selectedPersonalityIconUrl?: string;
}

// Props for wallet management hook
export interface UseWalletManagementProps {
    setError: React.Dispatch<React.SetStateAction<string>>;
    setWallet: React.Dispatch<React.SetStateAction<number | null>>;
    /** When true, do not subscribe to document visibility (avoids duplicate refetches if the hook is mounted twice). */
    skipVisibilityRefetch?: boolean;
}
