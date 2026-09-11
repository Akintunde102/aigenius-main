export type ChatErrorKind =
    | 'send'
    | 'rate_limit'
    | 'network'
    | 'provider'
    | 'timeout'
    | 'conversation_missing'
    | 'conversation_load'
    | 'conversation'
    | 'wallet'
    | 'auth'
    | 'upload'
    | 'models'
    | 'setup'
    | 'cancelled'
    | 'generic';

export type ChatErrorRetryAction = 'resend' | 'reload-wallet' | 'retry-uploads' | 'none';

export type ChatErrorTone = 'danger' | 'warning' | 'muted';

export type ChatUiError = {
    kind: ChatErrorKind;
    title: string;
    message: string;
    retryAction: ChatErrorRetryAction;
    tone: ChatErrorTone;
};

export type SetChatUiError = (error: string | ChatUiError | null) => void;

export const RETRY_LABELS: Record<ChatErrorRetryAction, string | null> = {
    resend: 'Try again',
    'reload-wallet': 'Refresh balance',
    'retry-uploads': 'Retry upload',
    none: null,
};

function errorOf(
    kind: ChatErrorKind,
    title: string,
    message: string,
    retryAction: ChatErrorRetryAction,
    tone: ChatErrorTone = 'danger',
): ChatUiError {
    return { kind, title, message, retryAction, tone };
}

export const CHAT_UI_ERRORS = {
    cancelled: errorOf(
        'cancelled',
        'Request cancelled',
        'The request was stopped before it finished.',
        'none',
        'muted',
    ),
    walletLowBalance: errorOf(
        'wallet',
        'Not enough credits',
        'This response could not finish because your balance was too low. Add credits to continue.',
        'reload-wallet',
        'warning',
    ),
    walletInsufficient: errorOf(
        'wallet',
        'Not enough credits',
        'Insufficient funds for the selected model.',
        'reload-wallet',
        'warning',
    ),
    walletNotLoaded: errorOf(
        'wallet',
        'Could not load credits',
        'Your credit balance is not available yet. Refresh and try again.',
        'reload-wallet',
        'warning',
    ),
    sessionExpired: errorOf(
        'auth',
        'Session expired',
        'Your session has expired. Please sign in again.',
        'none',
    ),
    rateLimit: errorOf(
        'rate_limit',
        'The model is busy',
        'Too many requests right now. Wait a moment, then try again.',
        'resend',
    ),
    timeout: errorOf(
        'timeout',
        'That took too long',
        'The response did not finish in time. You can try sending again.',
        'resend',
    ),
    provider: errorOf(
        'provider',
        'The model did not respond',
        'The provider is having trouble. Try again, or pick a different model.',
        'resend',
    ),
    network: errorOf(
        'network',
        'Connection problem',
        'We could not reach the server. Check your connection and try again.',
        'resend',
    ),
    sendFailed: errorOf(
        'send',
        'Reply did not go through',
        'Something went wrong while generating a response. Please try again.',
        'resend',
    ),
    conversationMissing: errorOf(
        'conversation_missing',
        'Chat not found',
        'This conversation is not available. It may have been deleted, or you may not have access.',
        'none',
    ),
    conversationLoadFailed: errorOf(
        'conversation_load',
        'Could not open that chat',
        'Check your connection, then try opening it again from the sidebar.',
        'none',
    ),
    conversationRemoveFailed: errorOf(
        'conversation',
        'Could not delete chat',
        'That conversation could not be removed. Please try again.',
        'none',
    ),
    conversationStarFailed: errorOf(
        'conversation',
        'Could not update star',
        'The starred status could not be saved. Please try again.',
        'none',
    ),
    conversationPublishFailed: errorOf(
        'conversation',
        'Could not publish chat',
        'Publishing failed. Please try again.',
        'none',
    ),
    modelsLoadFailed: errorOf(
        'models',
        'Could not load models',
        'The model list could not be loaded. Refresh the page and try again.',
        'none',
    ),
    noProject: errorOf(
        'setup',
        'No project selected',
        'Create or select a project before sending a message.',
        'none',
        'warning',
    ),
    signInLoading: errorOf(
        'auth',
        'Still signing in',
        'Sign-in is still loading. Please try again in a moment.',
        'none',
        'warning',
    ),
} as const;

const STREAMING_GENERIC = 'An error occurred while processing your request.';

export function isChatUiError(value: unknown): value is ChatUiError {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value as Partial<ChatUiError>;
    return typeof candidate.kind === 'string'
        && typeof candidate.title === 'string'
        && typeof candidate.message === 'string'
        && typeof candidate.retryAction === 'string';
}

export function chatUiErrorMessage(error: string | ChatUiError | null | undefined): string {
    if (!error) {
        return '';
    }
    return typeof error === 'string' ? error : error.message;
}

export function retryLabelFor(error: ChatUiError | null | undefined): string | null {
    if (!error) {
        return null;
    }
    return RETRY_LABELS[error.retryAction];
}

export function extractErrorText(error: unknown): string {
    if (typeof error === 'string') {
        return error;
    }
    if (error instanceof Error && error.message) {
        return error.message;
    }
    if (error && typeof error === 'object') {
        const message = (error as { message?: unknown }).message;
        if (typeof message === 'string') {
            return message;
        }
    }
    return '';
}

export function extractHttpStatus(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') {
        return undefined;
    }
    const candidate = error as {
        statusCode?: unknown;
        status?: unknown;
        response?: { status?: unknown };
    };
    if (typeof candidate.statusCode === 'number') {
        return candidate.statusCode;
    }
    if (typeof candidate.status === 'number') {
        return candidate.status;
    }
    if (typeof candidate.response?.status === 'number') {
        return candidate.response.status;
    }
    return undefined;
}

export function isNetworkFailure(error: unknown): boolean {
    const text = extractErrorText(error);
    return /failed to fetch|network error|load failed|econnreset|etimedout|econnrefused|enotfound|timeout|aborted by the client/i.test(text);
}

export function isMissingConversationError(error: unknown): boolean {
    if (extractHttpStatus(error) === 404) {
        return true;
    }
    const text = extractErrorText(error);
    return /conversation not found/i.test(text)
        || /not found or access denied/i.test(text);
}

function walletCreditsNeeded(message: string): ChatUiError | null {
    const match = message.match(/^You need at least \d+ credits/i);
    if (!match) {
        return null;
    }
    return errorOf('wallet', 'Not enough credits', message, 'none', 'warning');
}

function uploadFailed(message: string): ChatUiError | null {
    if (!/^Upload failed:/i.test(message.trim())) {
        return null;
    }
    return errorOf(
        'upload',
        'Upload failed',
        message,
        'retry-uploads',
    );
}

/** Maps a previously stored banner string to a structured error. */
export function chatUiErrorFromMessage(message: string): ChatUiError {
    const trimmed = message.trim();
    if (!trimmed) {
        return CHAT_UI_ERRORS.sendFailed;
    }

    const walletNeeded = walletCreditsNeeded(trimmed);
    if (walletNeeded) {
        return walletNeeded;
    }

    const upload = uploadFailed(trimmed);
    if (upload) {
        return upload;
    }

    switch (trimmed) {
        case CHAT_UI_ERRORS.cancelled.message:
        case 'Request was cancelled.':
            return CHAT_UI_ERRORS.cancelled;
        case CHAT_UI_ERRORS.walletLowBalance.message:
        case 'Your request could not finish — your balance was too low for this response. Add credits to continue.':
        case 'Insufficient funds in wallet. Please top up to continue using models.':
        case 'Insufficient funds for the selected model.':
            return CHAT_UI_ERRORS.walletLowBalance;
        case CHAT_UI_ERRORS.walletNotLoaded.message:
        case 'Failed to load wallet balance':
        case 'Wallet balance not loaded. Please refresh and try again.':
            return CHAT_UI_ERRORS.walletNotLoaded;
        case CHAT_UI_ERRORS.sessionExpired.message:
        case 'Your session has expired. Please sign in again.':
            return CHAT_UI_ERRORS.sessionExpired;
        case CHAT_UI_ERRORS.conversationMissing.message:
        case 'Conversation not found.':
            return CHAT_UI_ERRORS.conversationMissing;
        case CHAT_UI_ERRORS.conversationLoadFailed.message:
            return CHAT_UI_ERRORS.conversationLoadFailed;
        case CHAT_UI_ERRORS.conversationRemoveFailed.message:
        case 'Failed to remove conversation':
            return CHAT_UI_ERRORS.conversationRemoveFailed;
        case CHAT_UI_ERRORS.conversationStarFailed.message:
        case 'Failed to update starred status':
            return CHAT_UI_ERRORS.conversationStarFailed;
        case CHAT_UI_ERRORS.conversationPublishFailed.message:
        case 'Failed to publish conversation. Please try again.':
            return CHAT_UI_ERRORS.conversationPublishFailed;
        case CHAT_UI_ERRORS.modelsLoadFailed.message:
        case 'Failed to load models. Please try again later.':
            return CHAT_UI_ERRORS.modelsLoadFailed;
        case CHAT_UI_ERRORS.noProject.message:
        case 'No project found. Please create or select a project.':
            return CHAT_UI_ERRORS.noProject;
        case CHAT_UI_ERRORS.signInLoading.message:
        case 'Sign-in is still loading. Please try again.':
            return CHAT_UI_ERRORS.signInLoading;
        case 'No model selected':
            return errorOf('setup', 'No model selected', 'Choose a model before sending a message.', 'none', 'warning');
        case 'Message content cannot be empty':
            return errorOf('setup', 'Message is empty', 'Type a message before sending.', 'none', 'warning');
        case 'Failed to add desktop screenshot to chat.':
            return errorOf('upload', 'Screenshot failed', 'The desktop screenshot could not be added to chat.', 'none');
        case 'Model selection failed. Please try again.':
            return errorOf('models', 'Model selection failed', 'That model could not be selected. Please try again.', 'none');
        case 'None of the selected files can be attached to chat.':
            return errorOf('upload', 'Files not attached', 'None of the selected files can be attached to chat.', 'none');
        case STREAMING_GENERIC:
        case CHAT_UI_ERRORS.sendFailed.message:
        case 'Something went wrong. Please try again.':
            return CHAT_UI_ERRORS.sendFailed;
        default:
            return errorOf('generic', 'Something went wrong', trimmed, 'none');
    }
}

export function normalizeChatUiError(
    input: string | ChatUiError | null | undefined,
): ChatUiError | null {
    if (input == null || input === '') {
        return null;
    }
    if (isChatUiError(input)) {
        return input;
    }
    return chatUiErrorFromMessage(input);
}

const NETWORK_STATUS = new Set([0, 408]);
const PROVIDER_STATUS = new Set([502, 503, 504]);

/** Maps a thrown send/stream failure to a safe structured error (never raw provider text). */
export function chatUiErrorFromUnknown(error: unknown): ChatUiError {
    const text = extractErrorText(error);
    const status = extractHttpStatus(error);

    if (text === 'Request aborted' || (error as { name?: string })?.name === 'AbortError') {
        return CHAT_UI_ERRORS.cancelled;
    }

    if (status === 429 || /(?:^|\b)(429|rate limit)/i.test(text)) {
        return CHAT_UI_ERRORS.rateLimit;
    }

    if (status === 408 || /timed? ?out/i.test(text)) {
        return CHAT_UI_ERRORS.timeout;
    }

    if (status != null && PROVIDER_STATUS.has(status)) {
        return CHAT_UI_ERRORS.provider;
    }

    if (status === 401) {
        return CHAT_UI_ERRORS.sessionExpired;
    }

    if (isNetworkFailure(error) || (status != null && NETWORK_STATUS.has(status))) {
        return CHAT_UI_ERRORS.network;
    }

    if (text === STREAMING_GENERIC) {
        return CHAT_UI_ERRORS.provider;
    }

    if (status != null && status >= 500) {
        return CHAT_UI_ERRORS.sendFailed;
    }

    return CHAT_UI_ERRORS.sendFailed;
}
