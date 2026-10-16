import {
    isMediaFullscreenActive,
    requestMediaFullscreen,
    toggleMediaFullscreen,
} from '../media-fullscreen';

describe('media-fullscreen', () => {
    it('requestMediaFullscreen calls requestFullscreen on the container', async () => {
        const container = document.createElement('div');
        container.requestFullscreen = jest.fn().mockResolvedValue(undefined);
        const video = document.createElement('video');

        await requestMediaFullscreen(container, video);

        expect(container.requestFullscreen).toHaveBeenCalled();
    });

    it('toggleMediaFullscreen exits when already active', async () => {
        Object.defineProperty(document, 'fullscreenElement', {
            configurable: true,
            value: document.createElement('div'),
        });
        document.exitFullscreen = jest.fn().mockResolvedValue(undefined);

        await toggleMediaFullscreen(null, null);

        expect(document.exitFullscreen).toHaveBeenCalled();
        Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
    });

    it('isMediaFullscreenActive reflects document.fullscreenElement', () => {
        Object.defineProperty(document, 'fullscreenElement', {
            configurable: true,
            value: null,
        });
        expect(isMediaFullscreenActive()).toBe(false);
    });
});
