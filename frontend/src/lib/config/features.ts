function isDevBuild(): boolean {
  return process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
}

/**
 * Product feature gates — opt-in via `NEXT_PUBLIC_ENABLE_*=true` in production.
 * In local dev/test, workflows default on unless explicitly set to `false`.
 */
export const FEATURE_FLAGS = {
  /** Phone icon + conversational audio overlay. */
  AUDIO_CONVERSATION:
    process.env.NEXT_PUBLIC_ENABLE_AUDIO_CONVERSATION === "true",

  /**
   * Mic icon + local Whisper dictation in the composer.
   * Off by default — local STT is heavy and unreliable on many machines.
   * Set NEXT_PUBLIC_ENABLE_VOICE_DICTATION=true to show.
   */
  VOICE_DICTATION:
    process.env.NEXT_PUBLIC_ENABLE_VOICE_DICTATION === "true",

  /**
   * Gmail/LinkedIn connect UI, OAuth callbacks, and workflow integration pickers.
   * Off by default — set NEXT_PUBLIC_ENABLE_INTEGRATIONS=true to show.
   * Backend must also set ENABLE_INTEGRATIONS=true for API routes and chat tools.
   */
  INTEGRATIONS: false,

  WORKFLOWS: false,
} as const;
