function isDevBuild(): boolean {
  return process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
}

/**
 * Product feature gates — opt-in via `NEXT_PUBLIC_ENABLE_*=true` in production.
 * In local dev/test, workflows default on unless explicitly set to `false`.
 */
export const FEATURE_FLAGS = {
  /** Phone icon + conversational audio overlay. Mic dictation (STT) is always available. */
  AUDIO_CONVERSATION:
    process.env.NEXT_PUBLIC_ENABLE_AUDIO_CONVERSATION === "true",

  INTEGRATIONS: process.env.NEXT_PUBLIC_ENABLE_INTEGRATIONS === "true",

  WORKFLOWS:
    process.env.NEXT_PUBLIC_ENABLE_WORKFLOWS === "true" ||
    (isDevBuild() && process.env.NEXT_PUBLIC_ENABLE_WORKFLOWS !== "false"),
} as const;
