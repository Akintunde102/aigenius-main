import {
  MAIN_SHELL_CHROME_BG,
  MAIN_SHELL_DARWIN_TITLEBAR_RIGHT_INSET_PX,
  MAIN_SHELL_OVERLAY_HEIGHT_PX,
  MAIN_SHELL_WIN_LINUX_WCO_RIGHT_INSET_PX,
  mainShellBrowserWindowOptions,
  mainShellRendererChrome,
} from './shell-chrome';

describe('mainShellBrowserWindowOptions', () => {
  const platform = process.platform;

  afterAll(() => {
    Object.defineProperty(process, 'platform', { value: platform });
  });

  it('uses hiddenInset on darwin', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    const o = mainShellBrowserWindowOptions();
    expect(o.titleBarStyle).toBe('hiddenInset');
    expect(o.backgroundColor).toBe(MAIN_SHELL_CHROME_BG);
    expect(o.trafficLightPosition).toEqual({ x: 14, y: 11 });
    expect(o.frame).toBeUndefined();
  });

  it('uses frameless overlay on linux', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    const o = mainShellBrowserWindowOptions();
    expect(o.frame).toBe(false);
    expect(o.titleBarStyle).toBe('hidden');
    const overlay = o.titleBarOverlay;
    expect(overlay && typeof overlay === 'object').toBe(true);
    if (overlay && typeof overlay === 'object') {
      expect(overlay.height).toBe(MAIN_SHELL_OVERLAY_HEIGHT_PX);
      expect(overlay.color).toBe(MAIN_SHELL_CHROME_BG);
    }
  });
});

describe('mainShellRendererChrome', () => {
  it('matches overlay height on non-darwin', () => {
    const c = mainShellRendererChrome('linux');
    expect(c.titleBarTopPx).toBe(MAIN_SHELL_OVERLAY_HEIGHT_PX);
    expect(c.contentLeftPx).toBe(0);
    expect(c.titleBarRightInsetPx).toBe(MAIN_SHELL_WIN_LINUX_WCO_RIGHT_INSET_PX);
  });

  it('uses mac top inset on darwin', () => {
    const c = mainShellRendererChrome('darwin');
    expect(c.titleBarTopPx).toBeGreaterThan(0);
    expect(c.contentLeftPx).toBe(0);
    expect(c.titleBarRightInsetPx).toBe(MAIN_SHELL_DARWIN_TITLEBAR_RIGHT_INSET_PX);
  });
});
