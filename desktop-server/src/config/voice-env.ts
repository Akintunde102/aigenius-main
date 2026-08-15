/** Default Pocket-TTS preset when the client omits `voice` (see ARCHITECTURE_VOICE.md). */
export const defaultTtsVoice = (process.env.AIGENIUS_TTS_VOICE || 'alba').trim() || 'alba';

/**
 * Local speech-to-text (Whisper / faster-whisper). Set `AIGENIUS_ENABLE_STT=0` to skip model
 * warm-up and reject STT routes (saves RAM). Re-enable with `AIGENIUS_ENABLE_STT=1`.
 */
export function isSttEnabled(): boolean {
  return process.env.AIGENIUS_ENABLE_STT !== '0';
}
