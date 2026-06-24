import { isIntegrationCallbackOriginTrusted } from '../oauth-callback-origin';

describe('isIntegrationCallbackOriginTrusted', () => {
    it('allows exact origin match', () => {
        expect(
            isIntegrationCallbackOriginTrusted('http://localhost:3001', 'http://localhost:3001'),
        ).toBe(true);
    });

    it('allows localhost vs 127.0.0.1 with same port', () => {
        expect(
            isIntegrationCallbackOriginTrusted('http://localhost:3001', 'http://127.0.0.1:3001'),
        ).toBe(true);
        expect(
            isIntegrationCallbackOriginTrusted('http://127.0.0.1:3001', 'http://localhost:3001'),
        ).toBe(true);
    });

    it('rejects different ports', () => {
        expect(
            isIntegrationCallbackOriginTrusted('http://localhost:3000', 'http://localhost:3001'),
        ).toBe(false);
    });

    it('rejects unrelated hosts', () => {
        expect(
            isIntegrationCallbackOriginTrusted('https://evil.example', 'http://localhost:3001'),
        ).toBe(false);
    });
});
