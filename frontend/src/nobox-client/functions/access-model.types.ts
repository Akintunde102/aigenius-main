import type { Config } from '../types';

export type AigeniusDesktopBridge = {
  isDesktop?: boolean;
  getChatRuntimeContext?: () => Promise<{
    desktopHost: { platform: string; arch: string; release: string; userHomeDir: string };
    retrievalMemoryCatalog: {
      generatedAtIso: string;
      entries: Array<{ slug: string; name: string; description: string; tags: string[] }>;
    };
    localToolCapabilities?: {
      reportedAtIso: string;
      policy: string;
      grep: {
        engine: 'bundled-ripgrep' | 'system-ripgrep' | 'builtin';
        bundledRipgrep: boolean;
        systemRipgrep: boolean;
        builtinFallback: boolean;
        recommended: 'bundled-ripgrep' | 'system-ripgrep' | 'builtin';
      };
      goToDefinition: {
        engine: 'tsmorph';
        languageServerOptional: boolean;
        recommended: 'tsmorph';
      };
      git: {
        available: boolean;
        engine: 'system-git' | 'unavailable';
        recommended: 'system-git' | null;
      };
    };
  }>;
  pickProjectDirectory?: () => Promise<{ path: string } | null>;
  setCodeProjectIndex?: (payload: { projectId: string; rootPath: string } | null) => Promise<{ ok: boolean }>;
  runLocalDesktopTool?: (
    payload: {
      tool: string;
      arguments: Record<string, unknown>;
    },
    options?: {
      onShellStreamChunk?: (chunk: { stream: 'stdout' | 'stderr'; text: string }) => void;
    },
  ) => Promise<{ ok: true; result: string; rawData?: any } | { ok: false; error: string }>;
};


export type OpenRouterContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'input_audio'; input_audio: { data: string; format: string } };

/** Per-tool billed amounts from the gateway (USD + ₦). */
export interface ToolUsageCharge {
  tool: string;
  display_name: string;
  cost_usd: number;
  cost_naira: number;
}

/**
 * A message in the conversation with the AI model.
 * Contains the role (user/assistant/system) and the content being communicated.
 */
export interface OpenRouterMessage {
  /** The role of the message sender */
  role: 'user' | 'assistant' | 'system';
  /** The content of the message - can be plain text or structured content blocks */
  content: string | OpenRouterContentBlock[];
  /** Optional stable message id preserved across persistence/rehydration */
  messageId?: string;
  /** Optional timestamp preserved across persistence/rehydration */
  timestamp?: number;
  /** Optional model metadata preserved across persistence/rehydration */
  modelId?: string;
  modelName?: string;
  /** Optional usage/cost metadata for already-completed assistant turns */
  usage?: UsageInfo;
  cost?: number;
  tool_usage_charges?: ToolUsageCharge[];
}

/**
 * Token usage statistics for an AI model interaction.
 * Tracks the number of tokens used in prompts and completions.
 */
export interface UsageInfo {
  /** Number of tokens used in the input prompt */
  prompt_tokens: number;
  /** Number of tokens used in the model's response */
  completion_tokens: number;
  /** Total number of tokens used (prompt + completion) */
  total_tokens: number;
  /** USD charged for tool invocations in this completion (aggregated). */
  tool_cost_usd?: number;
  session_prompt_tokens?: number;
  session_completion_tokens?: number;
  session_total_tokens?: number;
  model_rounds?: number;
}

/**
 * Cost calculation information for an AI model interaction.
 * Includes usage statistics and detailed cost breakdown.
 */
export interface CostCalculation {
  /** Token usage statistics */
  usage: UsageInfo;
  /** Total cost of the interaction */
  cost: number;
  /** Breakdown of costs by prompt and completion */
  costBreakdown: {
    promptCost: number;
    completionCost: number;
  };
  /** Pricing information for different models */
  modelPricing: Record<string, string>;
}

/**
 * Configuration options for AI model requests.
 */
export type Options = {
  /** The name/ID of the AI model to use */
  model: string;
};

/**
 * The body of an AI model request containing the conversation messages.
 */
export type Body = {
  /** Array of messages in the conversation */
  messages: OpenRouterMessage[];
  /** Optional conversation/session id when continuing an existing chat */
  conversationId?: string;
  conversationKind?: 'default' | 'orphan_question';
  parentConversationId?: string;
  parentMessageId?: string;
  anchor?: {
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
  };
  /** Stable id assigned client-side before the request (persisted with the assistant turn). */
  assistantMessageId?: string;
  assistantTimestamp?: number;
};

/**
 * Arguments required for accessing an AI model.
 */
export type AccessModelArgs<T> = {
  /** The request body containing messages */
  body: Body;
  /** Model configuration options */
  options: Options;
  /** API configuration including endpoint and authentication */
  config: Config;
};

/**
 * Response from a synchronous AI model request.
 */
export type AccessModelResponse<T> = {
  /** The generated content/response from the model */
  content: string;
  /** Token usage statistics */
  usage?: UsageInfo;
  /** Cost of the model interaction */
  cost?: number;
  /** Conversation id when backend created/updated a session (from X-Conversation-Id) */
  conversationId?: string;
  /** Authentication token used */
  token?: string;
  /** User data (generic type for flexibility) */
  user?: T;
  /** Tool executions that happened during the request (non-streaming path only) */
  tool_executions?: Array<{
    tool: string;
    arguments: Record<string, unknown>;
    result: string;
    timestamp: number;
  }>;
  tool_usage_charges?: ToolUsageCharge[];
};

/**
 * Accesses an AI model synchronously via the gateway API.
 *
 * This function makes a single request to the AI model and returns the complete response.
 * Use this for non-streaming interactions where you need the full response at once.
 *
 * @template T - The type of user data to include in the response
 * @param args - Configuration and request parameters
 * @param args.body - The messages and content to send to the model
 * @param args.options - Model configuration options (model name, etc.)
 * @param args.config - API configuration including endpoint and token
 * @returns Promise resolving to the model response or null if an error occurs
 * @throws Error when API request fails or authentication is invalid
 *
 * @example
 * ```typescript
 * const response = await _accessModel({
 *   body: { messages: [{ role: 'user', content: 'Hello!' }] },
 *   options: { model: 'gpt-3.5-turbo' },
 *   config: { endpoint: 'https://api.example.com', token: '...' }
 * });
 * ```
 */

export interface StreamingResult {
  /** Token usage statistics for the entire streaming session */
  usage?: UsageInfo;
  /** Total cost of the streaming interaction */
  cost?: number;
  /** Remaining wallet balance after the interaction */
  wallet?: number;
  /** Conversation id when backend created or updated a session (from X-Conversation-Id) */
  conversationId?: string;
  /** Per-tool billed rows when tools incurred charges */
  tool_usage_charges?: ToolUsageCharge[];
}

/** Tool stream event sent during tool execution for live UI updates */
export type ToolStreamEvent =
  | { type: 'start'; tool: string; displayName: string; arguments?: Record<string, unknown> }
  | { type: 'log'; tag: string; message: string; data?: Record<string, unknown> }
  | {
    type: 'client_delegate';
    delegate_id: string;
    tool: string;
    displayName: string;
    arguments?: Record<string, unknown>;
    tool_call_id: string;
  }
  | {
    type: 'approval_request';
    delegate_id: string;
    tool: string;
    displayName: string;
    arguments?: Record<string, unknown>;
  }
  | { type: 'end'; tool: string; success: boolean; result?: string; invokeCode?: string };

/**
 * Accesses an AI model with streaming responses via the gateway API.
 *
 * This function establishes a streaming connection to the AI model and provides
 * real-time updates as the model generates content. Content can include both
 * text and images in structured format.
 *
 * @template T - The type of user data (not used in streaming responses)
 * @param args - Configuration and request parameters
 * @param args.body - The messages and content to send to the model
 * @param args.options - Model configuration options (model name, etc.)
 * @param args.config - API configuration including endpoint and token
 * @param args.onData - Callback function called with each chunk of content as it's received
 * @param args.onComplete - Optional callback called when streaming completes with final metadata
 * @param args.signal - Optional AbortSignal to cancel the streaming request
 * @returns Promise resolving to streaming metadata (usage, cost, wallet) when complete
 * @throws Error when API request fails, authentication is invalid, or streaming is aborted
 *
 * @example
 * ```typescript
 * const result = await accessModelStream({
 *   body: { messages: [{ role: 'user', content: 'Tell me a story' }] },
 *   options: { model: 'gpt-4' },
 *   config: { endpoint: 'https://api.example.com', token: '...' },
 *   onData: (content) => {
 *     if (typeof content === 'string') {
 *       console.log('Text:', content);
 *     } else {
 *       console.log('Structured content:', content);
 *     }
 *   },
 *   onComplete: (result) => {
 *     console.log('Usage:', result.usage);
 *     console.log('Cost:', result.cost);
 *   }
 * });
 * ```
 */
