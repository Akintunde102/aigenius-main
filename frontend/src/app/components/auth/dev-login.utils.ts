const LOCAL_DEV_LOGIN_EMAIL = "test@example.com";

export function resolveDevLoginEmail(
  promptedEmail: string | null | undefined,
  hostname: string,
): string | null {
  if (promptedEmail) {
    return promptedEmail;
  }
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return LOCAL_DEV_LOGIN_EMAIL;
  }
  return null;
}
