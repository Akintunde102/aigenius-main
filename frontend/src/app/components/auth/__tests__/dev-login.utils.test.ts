import { resolveDevLoginEmail } from "../dev-login.utils";

describe("resolveDevLoginEmail", () => {
  it("uses the prompted email when one is provided", () => {
    expect(resolveDevLoginEmail("dev@example.com", "app.aigenius.ai")).toBe(
      "dev@example.com",
    );
  });

  it("falls back to the default email on localhost when prompt is empty", () => {
    expect(resolveDevLoginEmail(null, "localhost")).toBe("test@example.com");
    expect(resolveDevLoginEmail("", "127.0.0.1")).toBe("test@example.com");
  });

  it("does not fall back when prompt is cancelled off localhost", () => {
    expect(resolveDevLoginEmail(null, "app.aigenius.ai")).toBeNull();
    expect(resolveDevLoginEmail("", "example.com")).toBeNull();
  });
});
