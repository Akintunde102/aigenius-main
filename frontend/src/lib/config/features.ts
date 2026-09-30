/**
 * Product feature gates — opt-in via `NEXT_PUBLIC_ENABLE_*=true`.
 */
export const FEATURE_FLAGS = {
  /**
   * Phone icon + conversational audio overlay.
   * Hidden until NEXT_PUBLIC_ENABLE_AUDIO_CONVERSATION=true.
   */
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
