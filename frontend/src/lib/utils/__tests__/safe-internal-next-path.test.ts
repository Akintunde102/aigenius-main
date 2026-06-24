import { readSafeInternalNextPath } from "../safe-internal-next-path";

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
