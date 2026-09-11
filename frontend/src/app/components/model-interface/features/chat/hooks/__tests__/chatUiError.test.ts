import {
    CHAT_UI_ERRORS,
    chatUiErrorFromMessage,
    chatUiErrorFromUnknown,
    isMissingConversationError,
    isNetworkFailure,
    normalizeChatUiError,
    retryLabelFor,
} from '../chatUiError';
import { GatewayFetchError } from '@/nobox-client/functions/access-model';

describe('chatUiErrorFromUnknown', () => {
    it('maps 429 gateway errors to a retryable busy-model message', () => {
        const error = chatUiErrorFromUnknown(new GatewayFetchError('Request failed', 429));
        expect(error).toEqual(CHAT_UI_ERRORS.rateLimit);
        expect(error.retryAction).toBe('resend');
    });

    it('maps provider outages without showing raw server text', () => {
        const error = chatUiErrorFromUnknown(
            new GatewayFetchError('Internal validation failed: bad tool schema', 503),
        );
        expect(error).toEqual(CHAT_UI_ERRORS.provider);
        expect(error.message).not.toMatch(/tool schema/i);
    });

    it('maps fetch failures to a connection problem', () => {
        expect(chatUiErrorFromUnknown(new Error('Failed to fetch'))).toEqual(CHAT_UI_ERRORS.network);
        expect(isNetworkFailure(new Error('Network Error'))).toBe(true);
    });

    it('maps 408 to a timeout message', () => {
        expect(chatUiErrorFromUnknown(new GatewayFetchError('Request failed', 408))).toEqual(
            CHAT_UI_ERRORS.timeout,
        );
    });
});

describe('conversation load classification', () => {
    it('treats 404 and not-found copy as a missing conversation', () => {
        expect(isMissingConversationError(new GatewayFetchError('Conversation not found', 404))).toBe(true);
        expect(isMissingConversationError(new Error('Conversation not found or access denied'))).toBe(true);
        expect(isMissingConversationError(new Error('Failed to fetch'))).toBe(false);
    });
});

describe('chatUiErrorFromMessage', () => {
    it('does not treat conversation failures as resendable send errors', () => {
        expect(chatUiErrorFromMessage('Conversation not found.')).toEqual(
            CHAT_UI_ERRORS.conversationMissing,
        );
        expect(chatUiErrorFromMessage('Failed to remove conversation').retryAction).toBe('none');
        expect(chatUiErrorFromMessage('Failed to update starred status').kind).toBe('conversation');
    });

    it('maps upload failures to a retry-uploads action', () => {
        const error = chatUiErrorFromMessage('Upload failed: notes.pdf');
        expect(error.kind).toBe('upload');
        expect(error.retryAction).toBe('retry-uploads');
        expect(retryLabelFor(error)).toBe('Retry upload');
    });
});

describe('normalizeChatUiError', () => {
    it('clears empty strings and keeps structured errors', () => {
        expect(normalizeChatUiError('')).toBeNull();
        expect(normalizeChatUiError(null)).toBeNull();
        expect(normalizeChatUiError(CHAT_UI_ERRORS.network)).toEqual(CHAT_UI_ERRORS.network);
    });
});
