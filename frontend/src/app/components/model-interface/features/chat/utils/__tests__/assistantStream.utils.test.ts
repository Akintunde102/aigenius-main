import { CONTENT_TYPES } from '../../hooks/chatOperations.constants';
import { createChatMessage } from '../../hooks/contentProcessing.utils';
import {
    applyAccumulatorToLastAssistant,
    createAssistantStreamAccumulator,
    ingestAssistantStreamChunk,
} from '../assistantStream.utils';

describe('ingestAssistantStreamChunk', () => {
    it('concatenates string deltas once instead of replaying previous text', () => {
        let acc = createAssistantStreamAccumulator();
        acc = ingestAssistantStreamChunk(acc, 'Hormuz is ');
        acc = ingestAssistantStreamChunk(acc, 'bigger in oil volume.');

        expect(acc.content).toBe('Hormuz is bigger in oil volume.');
        expect(acc.events).toEqual([
            { type: 'text', content: 'Hormuz is bigger in oil volume.' },
        ]);
    });

    it('keeps generated image blocks and turns them into markdown for the event transcript', () => {
        let acc = createAssistantStreamAccumulator();
        acc = ingestAssistantStreamChunk(acc, 'See this:\n');
        acc = ingestAssistantStreamChunk(acc, [
            { type: CONTENT_TYPES.IMAGE_URL, image_url: { url: 'https://img.test/strait.png' } },
        ]);

        expect(acc.content).toEqual([
            { type: CONTENT_TYPES.TEXT, text: 'See this:\n' },
            { type: CONTENT_TYPES.IMAGE_URL, image_url: { url: 'https://img.test/strait.png' } },
        ]);
        expect(acc.events).toEqual([
            { type: 'text', content: 'See this:\n\n![image](https://img.test/strait.png)\n' },
        ]);
    });

    it('does not duplicate when the same snapshot is applied twice (strict-mode updater)', () => {
        let acc = createAssistantStreamAccumulator();
        acc = ingestAssistantStreamChunk(acc, 'Hello');

        const messages = [
            createChatMessage('user', 'q', 'm', 'Model'),
            createChatMessage('assistant', '', 'm', 'Model'),
        ];

        const first = applyAccumulatorToLastAssistant(messages, acc);
        const second = applyAccumulatorToLastAssistant(first, acc);

        expect(second[1].content).toBe('Hello');
        expect(second[1].events).toEqual([{ type: 'text', content: 'Hello' }]);
    });
});
