import { shouldHideEmptyAssistantMessage } from '../assistantMessageVisibility.utils';
import type { ChatMessage, MessageEvent } from '@/app/components/model-interface/shared/types';

describe('shouldHideEmptyAssistantMessage', () => {
    const baseAssistant: ChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
    };

    it('hides empty assistant messages with no events', () => {
        expect(
            shouldHideEmptyAssistantMessage(baseAssistant, {
                streaming: false,
                displayEvents: [],
            }),
        ).toBe(true);
    });

    it('keeps streaming assistant placeholders visible', () => {
        expect(
            shouldHideEmptyAssistantMessage(baseAssistant, {
                streaming: true,
                displayEvents: [],
            }),
        ).toBe(false);
    });

    it('keeps assistant messages with thinking events', () => {
        const events = [{ type: 'thinking', content: 'hmm' }] as MessageEvent[];
        expect(
            shouldHideEmptyAssistantMessage(baseAssistant, {
                streaming: false,
                displayEvents: events,
            }),
        ).toBe(false);
    });
});
