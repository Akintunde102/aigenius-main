/** Key used in chatMap for a new/unsaved draft conversation. */
export const DRAFT_SESSION_KEY = '__draft__';

// Configuration constants for chat operations
export const CHAT_CONFIG = {
    // Message optimization limits
    MAX_TOTAL_SIZE: 200000000, // ~20MB limit (safe buffer below 100MB backend limit)
    MAX_IMAGE_SIZE: 50000000, // ~5MB per image (handles ultra-high-res images)
    KEEP_RECENT_MESSAGES: 20, // Keep excellent context (was 5)

    // Wallet limits
    MIN_WALLET_BALANCE: 5, // Minimum balance required in credits to chat
    MODEL_BALANCE_FACTOR: 2, // Users must have at least 2× the model's average cost

    // Timeouts
    OPTIMIZATION_MESSAGE_TIMEOUT: 5000, // 5 seconds for optimization message display

    // Scroll behavior
    SCROLL_DELAY: 100, // Delay before scrolling to chat end

    // Project configuration
    DEFAULT_PROJECT: "projectt",
} as const;

// Error messages
export const ERROR_MESSAGES = {
    NO_PROJECT: "Create or select a project before sending a message.",
    INSUFFICIENT_FUNDS: "Insufficient funds for the selected model.",
    INSUFFICIENT_WALLET_FUNDS: "Insufficient funds in wallet. Please top up to continue using models.",
    /** Shown when the server stopped the request because the wallet could not cover fees. */
    REQUEST_ABORTED_LOW_BALANCE:
        "This response could not finish because your balance was too low. Add credits to continue.",
    REQUEST_CANCELLED: "The request was stopped before it finished.",
    /** Shown when the session is missing or expired — user should sign in again. */
    SESSION_EXPIRED: "Your session has expired. Please sign in again.",
    /** Generic fallback for unexpected chat/API failures — never show raw provider text. */
    GENERIC_CHAT_ERROR: "Something went wrong while generating a response. Please try again.",
    MODEL_RESPONSE_FAILED: "Something went wrong while generating a response. Please try again.",
    TOOL_EXECUTION_FAILED: "This tool could not complete. Please try again.",
    CONVERSATION_NOT_FOUND:
        "This conversation is not available. It may have been deleted, or you may not have access.",
    CONVERSATION_LOAD_FAILED:
        "Check your connection, then try opening it again from the sidebar.",
    CONVERSATION_REMOVE_FAILED: "That conversation could not be removed. Please try again.",
    CONVERSATION_STAR_FAILED: "The starred status could not be saved. Please try again.",
    CONVERSATION_PUBLISH_FAILED: "Publishing failed. Please try again.",
} as const;

// Content processing constants
export const CONTENT_TYPES = {
    TEXT: 'text',
    IMAGE_URL: 'image_url',
    IMAGE_PLACEHOLDER: '[Image]',
    CONTENT_REMOVED: '[Content removed due to size]',
    MESSAGE_TRUNCATED: (size: number) => `[Message truncated due to size: ${size} chars]`,
    CONTENT_TRUNCATED: '[Content truncated due to size]',
} as const;
