/**
 * @jest-environment jsdom
 */

import {
  DESKTOP_SHELL_ENTRY_QUERY_PARAM,
  getDesktopShellEntryRuntimeResolveOptions,
} from "./desktop-runtime";

describe("getDesktopShellEntryRuntimeResolveOptions", () => {
  const originalUa = navigator.userAgent;

  afterEach(() => {
    document.documentElement.removeAttribute("data-aigenius-desktop-shell");
    Object.defineProperty(navigator, "userAgent", {
      value: originalUa,
      configurable: true,
    });
    window.history.replaceState({}, "", "/");
  });

  it("uses a short poll for a normal browser on /desktop-login", () => {
    window.history.replaceState({}, "", "/desktop-login");
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      configurable: true,
    });
    expect(getDesktopShellEntryRuntimeResolveOptions().maxAttempts).toBe(24);
  });

  it("uses an extended poll when the Electron entry query param is present", () => {
    window.history.replaceState(
      {},
      "",
      `/desktop-login?${DESKTOP_SHELL_ENTRY_QUERY_PARAM}=1`,
    );
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      configurable: true,
    });
    expect(getDesktopShellEntryRuntimeResolveOptions().maxAttempts).toBe(400);
  });

  it("uses an extended poll when the HTML shell flag is set", () => {
    window.history.replaceState({}, "", "/desktop-login");
    document.documentElement.setAttribute("data-aigenius-desktop-shell", "1");
    expect(getDesktopShellEntryRuntimeResolveOptions().maxAttempts).toBe(400);
  });

  it("uses an extended poll when the UA looks like Electron", () => {
    window.history.replaceState({}, "", "/desktop-login");
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Electron/28.0.0 Chrome/120.0.0.0",
      configurable: true,
    });
    expect(getDesktopShellEntryRuntimeResolveOptions().maxAttempts).toBe(400);
  });
});
