import {
  readSafeInternalNextPath,
  resolveAuthenticatedDesktopShellRedirect,
} from "./safe-internal-next-path";

describe("readSafeInternalNextPath", () => {
  it("defaults to / when next is missing", () => {
    expect(readSafeInternalNextPath("")).toBe("/");
    expect(readSafeInternalNextPath("?foo=1")).toBe("/");
  });

  it("returns safe internal paths", () => {
    expect(readSafeInternalNextPath("?next=/chat/abc")).toBe("/chat/abc");
  });
});

describe("resolveAuthenticatedDesktopShellRedirect", () => {
  it("sends user home when next points at the current shell page", () => {
    expect(
      resolveAuthenticatedDesktopShellRedirect(
        "/desktop-welcome",
        "?next=/desktop-welcome",
      ),
    ).toBe("/");
  });

  it("sends user home when next is another auth shell", () => {
    expect(
      resolveAuthenticatedDesktopShellRedirect(
        "/desktop-login",
        "?next=/desktop-welcome",
      ),
    ).toBe("/");
    expect(
      resolveAuthenticatedDesktopShellRedirect(
        "/desktop-welcome",
        "?next=/desktop-login",
      ),
    ).toBe("/");
  });

  it("preserves non-shell destinations", () => {
    expect(
      resolveAuthenticatedDesktopShellRedirect(
        "/desktop-login",
        "?next=/config",
      ),
    ).toBe("/config");
  });
});
