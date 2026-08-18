import type { ChatMessage } from '@/app/components/model-interface/shared/types';
import {
    buildEditedUserMessage,
    isEditDraftSubmittable,
    parseMessageForEdit,
} from './messageEdit.utils';

describe('messageEdit.utils', () => {
    it('parseMessageForEdit extracts plain string content', () => {
        const message: ChatMessage = {
            role: 'user',
            content: 'hello world',
            timestamp: 1,
        };

        expect(parseMessageForEdit(message)).toEqual({
            text: 'hello world',
            attachments: [],
        });
    });

    it('parseMessageForEdit extracts text and attachments from structured content', () => {
        const message: ChatMessage = {
            role: 'user',
            content: [
                { type: 'text', text: 'see this' },
                { type: 'image_url', image_url: { url: 'https://example.com/a.png' } },
                { type: 'file_url', file_url: { url: 'https://example.com/b.pdf', name: 'b.pdf' } },
            ],
            timestamp: 1,
        };

        expect(parseMessageForEdit(message)).toEqual({
            text: 'see this',
            attachments: [
                { fileUrl: 'https://example.com/a.png', isImage: true, displayName: 'image' },
                { fileUrl: 'https://example.com/b.pdf', isImage: false, displayName: 'b.pdf' },
            ],
        });
    });

    it('buildEditedUserMessage keeps string content when there are no attachments', () => {
        const original: ChatMessage = {
            id: 'u1',
            role: 'user',
            content: 'old',
            timestamp: 10,
            apiContent: 'hidden',
        };

        const updated = buildEditedUserMessage(original, {
            text: '  new text  ',
            attachments: [],
        });

        expect(updated.content).toBe('new text');
        expect(updated.apiContent).toBeUndefined();
        expect(updated.id).toBe('u1');
    });

    it('buildEditedUserMessage builds structured content when attachments exist', () => {
        const original: ChatMessage = {
            id: 'u1',
            role: 'user',
            content: 'old',
            timestamp: 10,
        };

        const updated = buildEditedUserMessage(original, {
            text: 'caption',
            attachments: [
                { fileUrl: 'https://example.com/a.png', isImage: true, displayName: 'a.png' },
            ],
        });

        expect(updated.content).toEqual([
            { type: 'text', text: 'caption' },
            { type: 'image_url', image_url: { url: 'https://example.com/a.png' } },
        ]);
    });

    it('isEditDraftSubmittable requires text or attachments', () => {
        expect(isEditDraftSubmittable({ text: '', attachments: [] })).toBe(false);
        expect(isEditDraftSubmittable({ text: 'hi', attachments: [] })).toBe(true);
        expect(isEditDraftSubmittable({
            text: '',
            attachments: [{ fileUrl: 'x', isImage: true, displayName: 'x' }],
        })).toBe(true);
    });
});
