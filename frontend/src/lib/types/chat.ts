/**
 * Comprehensive type definitions for chat functionality
 * 
 * This file consolidates all chat-related types with proper documentation
 * and strict typing for better development experience and runtime safety.
 */

/**
 * Token usage information from AI model responses
 */
export interface UsageInfo {
    /** Number of tokens in the prompt */
    prompt_tokens: number;
    /** Number of tokens in the completion */
    completion_tokens: number;
    /** Total tokens used (prompt + completion) */
    total_tokens: number;
    /** USD charged for tool invocations in this completion (aggregated). */
    tool_cost_usd?: number;
}

/**
 * Detailed cost calculation breakdown
 */
export interface CostCalculation {
    /** Token usage information */
    usage: UsageInfo;
    /** Total cost in USD */
    cost: number;
    /** Breakdown of cost components */
    costBreakdown: {
        /** Cost for prompt tokens */
        promptCost: number;
        /** Cost for completion tokens */
        completionCost: number;
    };
    /** Model pricing information */
    modelPricing: Record<string, string>;
}

/**
 * Content block for multi-modal messages
 */
export interface MessageContentBlock {
    /** Type of content (text, image_url, etc.) */
    type: string;
    /** Text content (for text blocks) */
    text?: string;
    /** Image URL (for image blocks) */
    image_url?: {
        url: string;
        /** Image detail level (low, high, auto) */
        detail?: 'low' | 'high' | 'auto';
    };
}

/**
 * Model information
 */
export interface Model {
    /** Unique model identifier */
    id: string;
    /** Display name of the model */
    name: string;
    /** Model description */
    description?: string;
    /** Pricing information */
    pricing?: {
        /** Price per 1K prompt tokens */
        prompt?: string;
        /** Price per 1K completion tokens */
        completion?: string;
        /** Additional pricing tiers */
        [key: string]: string | undefined;
    };
    /** Supported modalities (text, image, etc.) */
    modalities?: string[];
    /** Maximum context length */
    context_length?: number;
    /** Whether the model supports streaming */
    streaming?: boolean;
}


/**
 * Options for chat operations
 */
export interface ChatOperationOptions {
    /** Whether to force the operation even if conditions aren't met */
    force?: boolean;
    /** Whether to skip automatic title generation */
    skipTitleGeneration?: boolean;
    /** Custom title to use */
    customTitle?: string;
    /** Whether to save immediately without debouncing */
    immediate?: boolean;
}

/**
 * Result of a chat operation
 */
export interface ChatOperationResult<T = any> {
    /** Whether the operation was successful */
    success: boolean;
    /** Result data if successful */
    data?: T;
    /** Error message if failed */
    error?: string;
    /** Additional metadata */
    metadata?: Record<string, any>;
}

