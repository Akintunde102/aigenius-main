import {
    getCenteredModalLayout,
    getCenteredModalPosition,
    getDefaultPanelSize,
    readTitlebarOffset,
} from '../panel-layout.utils';

describe('panel-layout.utils', () => {
    beforeEach(() => {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
        document.documentElement.style.removeProperty('--aigenius-desktop-titlebar-top');
    });

    it('centers modal panel in the viewport below the desktop titlebar', () => {
        document.documentElement.style.setProperty('--aigenius-desktop-titlebar-top', '40px');

        const { size, position } = getCenteredModalLayout();

        expect(size.width).toBeGreaterThan(0);
        expect(size.height).toBeGreaterThan(0);
        expect(position.x).toBe(Math.round((1280 - size.width) / 2));
        expect(position.y).toBe(Math.round(40 + (760 - size.height) / 2));
    });

    it('uses balanced default modal dimensions', () => {
        const size = getDefaultPanelSize('modal');

        expect(size.width).toBe(Math.min(1232, Math.max(720, Math.round(1280 * 0.85))));
        expect(size.height).toBe(Math.min(752, Math.max(520, Math.round(800 * 0.82))));
    });

    it('reads titlebar offset from CSS variable', () => {
        document.documentElement.style.setProperty('--aigenius-desktop-titlebar-top', '32px');
        expect(readTitlebarOffset()).toBe(32);
    });

    it('keeps centered position within viewport bounds', () => {
        const size = { width: 900, height: 600 };
        const position = getCenteredModalPosition(size);

        expect(position.x).toBeGreaterThanOrEqual(0);
        expect(position.y).toBeGreaterThanOrEqual(0);
        expect(position.x + size.width).toBeLessThanOrEqual(1280);
        expect(position.y + size.height).toBeLessThanOrEqual(800);
    });
});
