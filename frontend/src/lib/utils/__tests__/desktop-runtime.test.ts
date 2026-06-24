import {
  getRunnableLocalDesktopBridge,
  hasRunnableLocalDesktopToolBridge,
  isLikelyElectronRenderer,
  resetDesktopRunnableBridgeCacheForTests,
  resolveDesktopChatRequestContext,
  waitForAigeniusDesktopBridge,
  waitForLocalDesktopToolBridge,
} from "../desktop-runtime";

const noopRunLocal = async (): Promise<{ ok: true; result: string }> =>
  Promise.resolve({ ok: true, result: "{}" });

type WindowWithDesktop = Window & {
  aigeniusDesktop?: {
    isDesktop: boolean;
    runLocalDesktopTool?: typeof noopRunLocal;
  };
};

describe("desktop-runtime", () => {
  afterEach(() => {
    resetDesktopRunnableBridgeCacheForTests();
    delete (window as WindowWithDesktop).aigeniusDesktop;
    document.documentElement.removeAttribute("data-aigenius-desktop-shell");
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe("isLikelyElectronRenderer", () => {
    it("detects Electron token in user agent", () => {
      jest.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Electron/28.2.0",
      );
      expect(isLikelyElectronRenderer()).toBe(true);
    });

    it("is false for typical Chrome UA", () => {
      jest.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      );
      expect(isLikelyElectronRenderer()).toBe(false);
    });
  });

  describe("resolveDesktopChatRequestContext", () => {
    it("returns false when only desktop HTML flag is set (browser has no preload)", async () => {
      document.documentElement.setAttribute("data-aigenius-desktop-shell", "1");
      jest.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      );
      await expect(resolveDesktopChatRequestContext(100)).resolves.toBe(false);
    });

    it("returns true in Electron when runnable local-tool bridge is present", async () => {
      jest.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Electron/33.0.0",
      );
      (window as WindowWithDesktop).aigeniusDesktop = {
        isDesktop: true,
        runLocalDesktopTool: noopRunLocal,
      };
      await expect(resolveDesktopChatRequestContext(100)).resolves.toBe(true);
    });

    it("waits in Electron until runLocalDesktopTool attaches", async () => {
      jest.useFakeTimers();
      jest.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Electron/33.0.0",
      );
      const p = resolveDesktopChatRequestContext(500);
      jest.advanceTimersByTime(25);
      (window as WindowWithDesktop).aigeniusDesktop = {
        isDesktop: true,
        runLocalDesktopTool: noopRunLocal,
      };
      jest.advanceTimersByTime(25);
      await expect(p).resolves.toBe(true);
    });

    it("polls when desktop HTML build is set even if UA hides Electron (stripped UA)", async () => {
      jest.useFakeTimers();
      document.documentElement.setAttribute("data-aigenius-desktop-shell", "1");
      jest.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      );
      const p = resolveDesktopChatRequestContext(500);
      jest.advanceTimersByTime(25);
      (window as WindowWithDesktop).aigeniusDesktop = {
        isDesktop: true,
        runLocalDesktopTool: noopRunLocal,
      };
      jest.advanceTimersByTime(25);
      await expect(p).resolves.toBe(true);
    });
  });

  describe("waitForLocalDesktopToolBridge", () => {
    it("resolves true after runLocalDesktopTool appears", async () => {
      jest.useFakeTimers();
      const p = waitForLocalDesktopToolBridge(500);
      jest.advanceTimersByTime(25);
      (window as WindowWithDesktop).aigeniusDesktop = {
        isDesktop: true,
        runLocalDesktopTool: noopRunLocal,
      };
      jest.advanceTimersByTime(25);
      await expect(p).resolves.toBe(true);
    });
  });

  describe("hasRunnableLocalDesktopToolBridge caching", () => {
    it("reuses cached bridge after window.aigeniusDesktop is removed until reset", () => {
      (window as WindowWithDesktop).aigeniusDesktop = {
        isDesktop: true,
        runLocalDesktopTool: noopRunLocal,
      };
      expect(getRunnableLocalDesktopBridge()).toBeDefined();
      delete (window as WindowWithDesktop).aigeniusDesktop;
      expect(hasRunnableLocalDesktopToolBridge()).toBe(true);
      resetDesktopRunnableBridgeCacheForTests();
      expect(hasRunnableLocalDesktopToolBridge()).toBe(false);
    });
  });

  describe("waitForAigeniusDesktopBridge", () => {
    it("resolves true when aigeniusDesktop is already present", async () => {
      (window as WindowWithDesktop).aigeniusDesktop = { isDesktop: true };
      await expect(waitForAigeniusDesktopBridge(500)).resolves.toBe(true);
    });

    it("resolves true after preload attaches", async () => {
      jest.useFakeTimers();
      const p = waitForAigeniusDesktopBridge(500);
      jest.advanceTimersByTime(25);
      (window as WindowWithDesktop).aigeniusDesktop = { isDesktop: true };
      jest.advanceTimersByTime(25);
      await expect(p).resolves.toBe(true);
    });
  });
});
