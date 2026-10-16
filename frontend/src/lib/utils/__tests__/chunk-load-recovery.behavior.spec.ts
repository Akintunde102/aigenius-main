/**
 * @jest-environment jsdom
 */
import {
  isChunkLoadError,
  tryAutoReloadOnChunkLoadError,
  clearChunkReloadGuard,
} from "../chunk-load-recovery";
import * as navigateModule from "@/lib/utils/navigate";

jest.mock("@/lib/utils/navigate", () => ({
  reloadPage: jest.fn(),
  navigateTo: jest.fn(),
}));

describe("chunk-load-recovery", () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    (sessionStorage.getItem as jest.Mock).mockImplementation((k: string) => store[k] ?? null);
    (sessionStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
      store[k] = String(v);
    });
    (sessionStorage.removeItem as jest.Mock).mockImplementation((k: string) => {
      delete store[k];
    });
    (sessionStorage.clear as jest.Mock).mockImplementation(() => {
      store = {};
    });

    document.body.innerHTML = "";
    jest.clearAllMocks();
  });

  describe("isChunkLoadError", () => {
    it("returns true for ChunkLoadError by name", () => {
      const err = new Error("Loading chunk failed");
      err.name = "ChunkLoadError";
      expect(isChunkLoadError(err)).toBe(true);
    });

    it("returns true for errors containing 'Loading chunk ... failed'", () => {
      const err = new Error("Loading chunk 842 failed. (error: https://domain/chunk.js)");
      expect(isChunkLoadError(err)).toBe(true);
    });

    it("returns false for regular errors", () => {
      expect(isChunkLoadError(new Error("Network timeout"))).toBe(false);
      expect(isChunkLoadError(null)).toBe(false);
      expect(isChunkLoadError(undefined)).toBe(false);
      expect(isChunkLoadError("Some string error")).toBe(false);
    });
  });

  describe("tryAutoReloadOnChunkLoadError", () => {
    it("mounts a smooth updating overlay and triggers reload on first chunk failure", () => {
      const err = new Error("Loading chunk 123 failed");

      const reloaded = tryAutoReloadOnChunkLoadError(err);
      expect(reloaded).toBe(true);
      expect(navigateModule.reloadPage).toHaveBeenCalledTimes(1);

      const overlay = document.getElementById("aig-update-overlay");
      expect(overlay).not.toBeNull();
      expect(overlay?.textContent).toContain("Updating workspace…");
      expect(overlay?.textContent).toContain("Refreshing to the latest version.");
    });

    it("prevents continuous reload loops if already reloaded in session", () => {
      const err = new Error("Loading chunk 123 failed");

      // First failure triggers reload
      expect(tryAutoReloadOnChunkLoadError(err)).toBe(true);

      // Second failure within the same session stops and returns false to let ErrorBoundary catch it
      expect(tryAutoReloadOnChunkLoadError(err)).toBe(false);
      expect(navigateModule.reloadPage).toHaveBeenCalledTimes(1);
    });

    it("does not reload when user is explicitly offline", () => {
      const originalOnLine = navigator.onLine;
      try {
        Object.defineProperty(navigator, "onLine", {
          configurable: true,
          value: false,
        });

        const err = new Error("Loading chunk 123 failed");
        expect(tryAutoReloadOnChunkLoadError(err)).toBe(false);
        expect(navigateModule.reloadPage).not.toHaveBeenCalled();
      } finally {
        Object.defineProperty(navigator, "onLine", {
          configurable: true,
          value: originalOnLine,
        });
      }
    });

    it("clearChunkReloadGuard clears the session storage guard", () => {
      sessionStorage.setItem("aigenius.chunk-reload", "1");
      clearChunkReloadGuard();
      expect(sessionStorage.getItem("aigenius.chunk-reload")).toBeNull();
    });
  });
});
