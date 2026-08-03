import {
    isSuccessfulServerResponseBody,
    normalizeServerResponseBody,
} from '@/servercall/response-body';

describe('normalizeServerResponseBody', () => {
    it('unwraps single-key { data } envelopes', () => {
        expect(normalizeServerResponseBody({ data: [{ id: 'gpt-4' }] })).toEqual([{ id: 'gpt-4' }]);
    });

    it('parses JSON strings', () => {
        expect(normalizeServerResponseBody('{"config":{"wallet":3000}}')).toEqual({
            config: { wallet: 3000 },
        });
    });

    it('does not unwrap multi-key objects', () => {
        const resources = {
            savedChats: [],
            chatHistory: [{ id: '1', messages: [] }],
        };
        expect(normalizeServerResponseBody(resources)).toBe(resources);
    });

    it('does not unwrap user objects that happen to include a data field alongside other keys', () => {
        const user = { id: 'u1', email: 'a@b.com', data: { legacy: true } };
        expect(normalizeServerResponseBody(user)).toBe(user);
    });
});

describe('isSuccessfulServerResponseBody', () => {
    it('treats empty arrays as success', () => {
        expect(isSuccessfulServerResponseBody([])).toBe(true);
    });

    it('rejects empty strings', () => {
        expect(isSuccessfulServerResponseBody('')).toBe(false);
    });

    it('rejects HTML error bodies', () => {
        expect(isSuccessfulServerResponseBody('<!DOCTYPE html><html></html>')).toBe(false);
    });

    it('accepts parsed user payloads', () => {
        expect(isSuccessfulServerResponseBody({ config: { wallet: 3000 } })).toBe(true);
    });
});
