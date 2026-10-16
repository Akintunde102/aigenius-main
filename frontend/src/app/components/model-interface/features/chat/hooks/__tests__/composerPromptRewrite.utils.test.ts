import {
    buildComposerPromptRewriteMessages,
    buildComposerPromptRewriteUserContent,
    normalizeRewrittenComposerText,
} from '../composerPromptRewrite.utils';
import type { ChatMessage } from '@/app/components/model-interface/shared/types';

describe('composerPromptRewrite.utils', () => {
    it('appends rewrite system and user turns after packed history', () => {
        const chat: ChatMessage[] = [
            { role: 'user', content: 'Hi', timestamp: 1 },
            { role: 'assistant', content: 'Hello', timestamp: 2 },
        ];
        const messages = buildComposerPromptRewriteMessages(chat, 'make pic of cat');
        expect(messages.length).toBeGreaterThan(2);
        const system = messages[messages.length - 2];
        const user = messages[messages.length - 1];
        expect(system.role).toBe('system');
        expect(String(system.content)).toContain('[composer_prompt_rewrite]');
        expect(user.role).toBe('user');
        expect(user.content).toBe(buildComposerPromptRewriteUserContent('make pic of cat'));
    });

    it('normalizeRewrittenComposerText strips fences and quotes', () => {
        expect(normalizeRewrittenComposerText('```\nHello world\n```')).toBe('Hello world');
        expect(normalizeRewrittenComposerText('"Hello"')).toBe('Hello');
    });
});
