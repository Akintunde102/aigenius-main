/**
 * Product feature gates — opt-in via `NEXT_PUBLIC_ENABLE_*=true`.
 * Unset or any other value means disabled (safe default for production).
 */
export const FEATURE_FLAGS = {
  /** Phone icon + conversational audio overlay. Mic dictation (STT) is always available. */
  AUDIO_CONVERSATION:
    process.env.NEXT_PUBLIC_ENABLE_AUDIO_CONVERSATION === "true",

  INTEGRATIONS: process.env.NEXT_PUBLIC_ENABLE_INTEGRATIONS === "true",

  WORKFLOWS: process.env.NEXT_PUBLIC_ENABLE_WORKFLOWS === "true",
} as const;
