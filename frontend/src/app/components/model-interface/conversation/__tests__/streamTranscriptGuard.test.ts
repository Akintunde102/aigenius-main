import { shouldApplyStreamToOpenTranscript } from "../streamTranscriptGuard";

describe("shouldApplyStreamToOpenTranscript (I4)", () => {
  it("treats undefined same as null for both ids", () => {
    expect(shouldApplyStreamToOpenTranscript(undefined, undefined)).toBe(true);
    expect(shouldApplyStreamToOpenTranscript(null, null)).toBe(true);
  });

  it("allows draft stream (both null) while viewing draft", () => {
    expect(shouldApplyStreamToOpenTranscript(null, null)).toBe(true);
  });

  it("blocks when user switched to another session", () => {
    expect(shouldApplyStreamToOpenTranscript("a", "b")).toBe(false);
  });

  it("allows when ids match", () => {
    expect(shouldApplyStreamToOpenTranscript("x", "x")).toBe(true);
  });

  it("blocks background stream when view is draft", () => {
    expect(shouldApplyStreamToOpenTranscript("x", null)).toBe(false);
  });
});
