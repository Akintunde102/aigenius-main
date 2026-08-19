import {
    clearSessionQueue,
    createQueuedComposerMessage,
    migrateMessageSendQueueMap,
    removeQueuedMessageById,
    shiftQueuedMessage,
    unshiftQueuedMessage,
} from '../messageSendQueue.utils';
import { DRAFT_SESSION_KEY } from '../chatOperations.constants';

describe('messageSendQueue.utils', () => {
    const model = {
        id: 'model-1',
        name: 'Test Model',
        description: 'test',
        context_length: 100000,
    };

    it('creates a queued composer message with trimmed text', () => {
        const message = createQueuedComposerMessage({
            text: '  hello queue  ',
            model,
        });

        expect(message.text).toBe('hello queue');
        expect(message.modelId).toBe('model-1');
        expect(message.modelName).toBe('Test Model');
    });

    it('migrates draft queue to a real session without overwriting existing queue', () => {
        const map = {
            [DRAFT_SESSION_KEY]: [
                createQueuedComposerMessage({ text: 'draft queued', model }),
            ],
            'conv-real': [],
        };

        expect(migrateMessageSendQueueMap(map, 'conv-real')).toEqual({
            [DRAFT_SESSION_KEY]: [],
            'conv-real': map[DRAFT_SESSION_KEY],
        });
    });

    it('does not migrate when the destination queue already has items', () => {
        const map = {
            [DRAFT_SESSION_KEY]: [
                createQueuedComposerMessage({ text: 'draft queued', model }),
            ],
            'conv-real': [
                createQueuedComposerMessage({ text: 'existing', model }),
            ],
        };

        expect(migrateMessageSendQueueMap(map, 'conv-real')).toBe(map);
    });

    it('shifts and restores queued messages in order', () => {
        const first = createQueuedComposerMessage({ text: 'first', model });
        const second = createQueuedComposerMessage({ text: 'second', model });
        const map = {
            session: [first, second],
        };

        const shifted = shiftQueuedMessage(map, 'session');
        expect(shifted.message).toEqual(first);
        expect(shifted.map.session).toEqual([second]);

        const restored = unshiftQueuedMessage(shifted.map, 'session', first);
        expect(restored.session).toEqual([first, second]);
    });

    it('removes a queued message by id', () => {
        const first = createQueuedComposerMessage({ text: 'first', model });
        const second = createQueuedComposerMessage({ text: 'second', model });
        const map = { session: [first, second] };

        const next = removeQueuedMessageById(map, 'session', first.id);
        expect(next.session).toEqual([second]);
    });

    it('clears a session queue', () => {
        const map = {
            session: [createQueuedComposerMessage({ text: 'first', model })],
        };

        expect(clearSessionQueue(map, 'session')).toEqual({ session: [] });
    });
});
