export interface Model {
    id: string;
    name: string;
    subtitle?: string;
    description: string;
    context_length: number;
    architecture?: {
        modality?: string;
        input_modalities?: string[];
        output_modalities?: string[]
    };
    created?: number;
    pricing?: Record<string, string>;
    averageUserSpendPerRequest?: {
        promptCost: number;
        completionCost: number;
        expectedImageCost: number;
        totalAverageCost: number;
    };
    featured?: boolean;
    /** When true, listed under "Main models" in the All Models tab. */
    main?: boolean;
    [key: string]: any;
}

export interface UsageInfo {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    /** USD charged for tool invocations in this completion (aggregated). */
    tool_cost_usd?: number;
}

export interface CostCalculation {
    usage: UsageInfo;
    cost: number;
    costBreakdown: {
        promptCost: number;
        completionCost: number;
    };
    modelPricing: Record<string, string>;
}

export interface ToolExecution {
    tool: string;
    arguments: Record<string, unknown>;
    result: string;
    timestamp: number;
}

/** Per-tool billing line from the gateway (USD + ₦). */
export interface ToolUsageCharge {
    tool: string;
    display_name: string;
    cost_usd: number;
    cost_naira: number;
}

/** Live tool execution state streamed to the UI (loader + log lines) */
export interface StreamingToolState {
    tool: string;
    displayName: string;
    logs: Array<{ tag: string; message: string }>;
    loading: boolean;
    success?: boolean;
    /** Present once the tool finishes (event-based path mirrors this into `ToolEvent`). */
    result?: string;
    /** From tool_stream_event start — used for live status hints (e.g. recipient email) */
    arguments?: Record<string, unknown>;
}

/** A text segment within an ordered assistant message event list */
export interface TextEvent {
    type: 'text';
    content: string;
    /** Legacy / persistence hint; display order follows `ChatMessage.events` array index. */
    order?: number;
    requestId?: string;
    messageId?: string;
}

/** A tool call (and its result) within an ordered assistant message event list */
export interface ToolEvent {
    type: 'tool';
    tool: string;
    displayName: string;
    arguments: Record<string, unknown>;
    logs: Array<{ tag: string; message: string }>;
    loading: boolean;
    success?: boolean;
    result?: string;
    timestamp: number;
    /** Legacy / persistence hint; display order follows `ChatMessage.events` array index. */
    order?: number;
    requestId?: string;
    messageId?: string;
}

/**
 * Ordered sequence of content events produced by a single assistant turn.
 * When present on a ChatMessage, this is the source of truth for rendering
 * and replaces the parallel streaming_tools / tool_executions fields.
 */
export type MessageEvent = TextEvent | ToolEvent;

export interface ChatMessage {
    id?: string;
    messageId?: string;
    requestId?: string;
    role: "user" | "assistant" | "system";
    content: string | Array<{
        type: string;
        text?: string;
        image_url?: { url: string };
        imageText?: string; // Optional text associated with images
        input_audio?: { data: string; format: string };
    }>;
    /**
     * When set on a user message with string `content`, the model request uses this text
     * instead of `content`. The UI should keep showing `content` only.
     */
    apiContent?: string;
    timestamp: number;
    modelId?: string;
    sessionId?: string;
    modelName?: string;
    usage?: UsageInfo;
    /**
     * Final USD cost for this turn when the backend computed it.
     * **Edge case:** `0` is a valid value (e.g. negligible rounding). Use `cost === undefined` to mean “not yet known / not provided”, not `!cost` (which treats `0` as missing).
     */
    cost?: number;
    // Persona metadata for assistant messages
    personaName?: string;
    personaIconUrl?: string;
    // Tool execution tracking
    tool_executions?: ToolExecution[];
    /** Billed tool invocations for this turn (from backend). */
    tool_usage_charges?: ToolUsageCharge[];
    /** Active tool streamings (name, logs, loader) during stream; multiple tools in call order */
    streaming_tools?: StreamingToolState[];
    /**
     * Ordered event log for the full assistant turn (text segments + tool calls/results).
     * **Display order is the array order** (first element first). When present, the renderer
     * uses this instead of streaming_tools / tool_executions. Absent on legacy messages.
     */
    events?: MessageEvent[];
    // Model thinking/reasoning (e.g., from Gemini 2.5 Pro)
    reasoning?: string;
    reasoning_details?: Array<{
        index?: number;
        type?: string;
        text?: string;
        format?: string;
    }>;
}

export interface OrphanReplyAnchor {
    surface: 'chat_transcript';
    anchorZone: 'chat_area';
    tapClientX: number;
    tapClientY: number;
    rowRelativeX: number;
    rowRelativeY: number;
    viewportWidth?: number;
    viewportHeight?: number;
    anchorText?: string;
    anchorPrefix?: string;
    anchorSuffix?: string;
    anchorTextOffset?: number;
    parentMessageTimestamp?: number;
    messageExcerpt?: string;
    createdFromRole?: 'user' | 'assistant' | 'system';
}

export interface OrphanReplyTrigger {
    message: ChatMessage;
    anchor: OrphanReplyAnchor;
}

export interface OrphanReplyRequest {
    conversationKind: 'orphan_question';
    parentConversationId: string;
    parentMessageId: string;
    anchor: OrphanReplyAnchor;
}

export interface PendingOrphanReply extends OrphanReplyRequest {
    parentConversationTitle?: string;
}

export interface StickyThreadMarker {
    markerId: string;
    parentConversationId: string;
    parentMessageId: string;
    conversationId?: string;
    draft: boolean;
    createdAt: number;
    updatedAt: number;
    anchor: OrphanReplyAnchor;
    modelId?: string;
    title?: string;
}

export interface ChatSession {
    id?: string;
    codeProjectId?: string | null;
    starred?: boolean;
    isPublished?: boolean;
    publishedAt?: string;
    publishedTitle?: string;
    publishedDescription?: string;
    personalityId?: string;
    systemPrompt?: string;
    conversationKind?: 'default' | 'orphan_question';
    parentConversationId?: string | null;
    parentMessageId?: string | null;
    title: string;
    modelId: string;
    messages: ChatMessage[];
    metadata?: {
        totalCost?: number;
        totalTokens?: number;
        lastAccessed?: string | Date;
        orphanAnchor?: OrphanReplyAnchor;
    };
}

export interface ModelPricing {
    prompt?: string;
    completion?: string;
}

export type RedditToggleProps = {
    checked: boolean;
    onChange: (checked: boolean) => void;
    labelOn?: string;
    labelOff?: string;
    className?: string;
};

export interface ModelInterfaceState {
    models: Model[];
    search: string;
    selectedModel: Model | null;
    input: string;
    chat: ChatMessage[];
    loading: boolean;
    error: string;
    streaming: boolean;
    imagePreview: string | null;
    uploading: boolean;
    uploadProgress: number | null;
    dragActive: boolean;
    showCosts: boolean;
    totalSpent: number;
    modelDetailSearch: string;
    showModelDetails: boolean;
    showNaira: boolean;
    showSaved: boolean;
    savedChats: ChatMessage[];
    savedFullChats: ChatSession[];
    showSavedType: 'messages' | 'sessions' | 'history';
    modelsLoading: boolean;
    showTyping: boolean;
    chatHistory: ChatSession[];
    pinnedChats: ChatSession[];
    orderByCost: 'none' | 'asc' | 'desc';
    showModelDetailsModal: boolean;
    selectedModelForDetails: Model | null;
    showModelSelectionModal: boolean;
    allModalities: string[];
    selectedModalities: string[];
    allOutputModalities: string[];
    selectedOutputModalities: string[];
    showWebSearch: boolean;
    historySearch: string;
    showScrollToBottom: boolean;
    pendingDeleteIdx: number | null;
    deletingIdx: number | null;
    pinnedModelIds: string[];
    assistantResponse: string;
    usageInfo: any;
    costInfo: any;
}

/**
 * Chat history update event
 */
export interface ChatHistoryUpdateEvent {
    /** Type of update */
    type: 'add' | 'update' | 'remove' | 'star' | 'unstar';
    /** Session that was updated */
    session?: ChatSession;
    /** Session ID for remove operations */
    sessionId?: string;
    /** Timestamp of the update */
    timestamp: number;
}

/**
 * Chat state for the entire application
 */
export interface ChatState {
    /** Current active chat messages */
    currentChat: ChatMessage[];
    /** ID of the current session */
    currentSessionId: string | null;
    /** All chat history sessions */
    chatHistory: ChatSession[];
    /** Saved individual messages */
    savedMessages: ChatMessage[];
    /** Pinned chat sessions */
    pinnedSessions: ChatSession[];
    /** Currently selected model */
    selectedModel: Model | null;
    /** Whether a response is currently being generated */
    isGenerating: boolean;
    /** Whether the response is being streamed */
    isStreaming: boolean;
    /** Current error message, if any */
    error: string | null;
}

/**
 * Configuration for chat history management
 */
export interface ChatHistoryConfig {
    /** Project identifier */
    project: string;
    /** Auto-save delay in milliseconds */
    autoSaveDelay?: number;
    /** Maximum number of sessions to keep in history */
    maxHistorySize?: number;
    /** Whether to enable automatic title generation */
    enableAutoTitles?: boolean;
}
