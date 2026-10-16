import { fetchSpeechAudioObjectUrl } from '../speech-job-status';

jest.mock('@/lib/api/auth-client', () => ({
    getValidAccessToken: () => 'access-token',
}));

jest.mock('@/lib/api/resolve-gateway-api-root', () => ({
    getLocalMiniServerApiRootUrl: () => 'http://localhost:28000',
    resolveGatewayApiBaseCandidates: jest.fn(async () => ['http://localhost:28000']),
}));

describe('fetchSpeechAudioObjectUrl', () => {
    const createObjectURL = jest.fn(() => 'blob:speech');

    beforeEach(() => {
        createObjectURL.mockClear();
        URL.createObjectURL = createObjectURL;
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            blob: async () => new Blob(['mp3'], { type: 'audio/mpeg' }),
        }) as unknown as typeof fetch;
    });

    it('omits the bearer token when loading a public CDN file', async () => {
        const url = await fetchSpeechAudioObjectUrl('https://res.cloudinary.com/demo/video/upload/speech.mp3');
        expect(url).toBe('blob:speech');
        const [, init] = (global.fetch as jest.Mock).mock.calls[0];
        expect(init.headers.Authorization).toBeUndefined();
        expect(init.headers.Accept).toBe('audio/mpeg');
    });

    it('sends the bearer token for a gateway stream path', async () => {
        await fetchSpeechAudioObjectUrl('http://localhost:28000/gateway/v1/speech/jobs/poem/stream');
        const [, init] = (global.fetch as jest.Mock).mock.calls[0];
        expect(init.headers.Authorization).toBe('Bearer access-token');
    });
});
