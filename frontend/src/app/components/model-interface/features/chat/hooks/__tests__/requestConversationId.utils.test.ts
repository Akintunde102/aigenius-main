import { resolveRequestConversationId } from '../requestConversationId.utils';

describe('resolveRequestConversationId', () => {
    it('preserves explicit null for new draft sends', () => {
        expect(resolveRequestConversationId({ conversationId: null }, 'previous-session')).toBeNull();
    });

    it('uses an explicit conversation id when provided', () => {
        expect(resolveRequestConversationId({ conversationId: 'target-session' }, 'previous-session')).toBe('target-session');
    });

    it('falls back to the current session only when no override is present', () => {
        expect(resolveRequestConversationId(undefined, 'current-session')).toBe('current-session');
    });
});
