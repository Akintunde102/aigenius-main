import {
  buildDesktopGoogleOAuthUrl,
  clearDesktopHandoff,
  readStoredDesktopCallback,
  readStoredDesktopPkceChallenge,
  resolveDesktopGoogleOAuthUrl,
  storeDesktopHandoff,
} from "../desktop-google-auth-url";

describe("desktop-google-auth-url", () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    Object.defineProperty(window, "sessionStorage", {
      value: {
        getItem: (key: string) => storage[key] ?? null,
        setItem: (key: string, value: string) => {
          storage[key] = value;
        },
        removeItem: (key: string) => {
          delete storage[key];
        },
        clear: () => {
          storage = {};
        },
      },
      writable: true,
    });
  });

  it("stores and reads desktop handoff with pkce challenge", () => {
    storeDesktopHandoff("http://127.0.0.1:49907/", "challenge-abc");

    expect(readStoredDesktopCallback()).toBe("http://127.0.0.1:49907/");
    expect(readStoredDesktopPkceChallenge()).toBe("challenge-abc");
  });

  it("clears desktop handoff state", () => {
    storeDesktopHandoff("http://127.0.0.1:49907/", "challenge-abc");
    clearDesktopHandoff();

    expect(readStoredDesktopCallback()).toBeNull();
    expect(readStoredDesktopPkceChallenge()).toBeNull();
  });

  it("includes pkce_challenge in the desktop Google OAuth URL", () => {
    const url = buildDesktopGoogleOAuthUrl(
      "http://localhost:28000",
      "http://127.0.0.1:49907/",
      "challenge-abc",
    );

    expect(url).toContain("callback_client=desktop");
    expect(url).toContain("pkce_challenge=challenge-abc");
  });

  it("reads stored pkce challenge when building the redirect URL", () => {
    storeDesktopHandoff("http://127.0.0.1:49907/", "stored-challenge");

    const url = resolveDesktopGoogleOAuthUrl(
      "http://127.0.0.1:49907/",
      "http://localhost:28000",
    );

    expect(url).toContain("pkce_challenge=stored-challenge");
  });
});
