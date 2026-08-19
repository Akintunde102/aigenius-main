import { readSafeInternalNextPath, normalizeChatConversationOpenPath } from "../safe-internal-next-path";

describe("readSafeInternalNextPath", () => {
  it("returns / for missing or unsafe next values", () => {
    expect(readSafeInternalNextPath("")).toBe("/");
    expect(readSafeInternalNextPath("?next=")).toBe("/");
    expect(readSafeInternalNextPath("?next=https://evil.com")).toBe("/");
    expect(readSafeInternalNextPath("?next=//evil.com")).toBe("/");
    expect(readSafeInternalNextPath("?next=/ok\\no")).toBe("/");
    expect(readSafeInternalNextPath("?next=/path%0awith")).toBe("/");
  });

  it("returns internal paths", () => {
    expect(readSafeInternalNextPath("?next=/chat")).toBe("/chat");
    expect(readSafeInternalNextPath("?next=/chat/abc&foo=1")).toBe("/chat/abc");
  });
});

describe("normalizeChatConversationOpenPath", () => {
  const origin = "http://localhost:23001";

  it("returns safe /chat/{id} paths", () => {
    expect(normalizeChatConversationOpenPath("/chat/abc-123", origin)).toBe("/chat/abc-123");
    expect(
      normalizeChatConversationOpenPath("http://localhost:23001/chat/abc-123", origin),
    ).toBe("/chat/abc-123");
  });

  it("rejects draft, new, and unsafe paths", () => {
    expect(normalizeChatConversationOpenPath("/chat/__draft__", origin)).toBeNull();
    expect(normalizeChatConversationOpenPath("/chat/new", origin)).toBeNull();
    expect(normalizeChatConversationOpenPath("//evil.com/chat/x", origin)).toBeNull();
    expect(normalizeChatConversationOpenPath("https://evil.com/chat/x", origin)).toBeNull();
    expect(normalizeChatConversationOpenPath("/workflows/1", origin)).toBeNull();
  });
});
