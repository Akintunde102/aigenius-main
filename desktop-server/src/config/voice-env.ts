/** Default Pocket-TTS preset when the client omits `voice` (see ARCHITECTURE_VOICE.md). */
export const defaultTtsVoice = (process.env.AIGENIUS_TTS_VOICE || 'alba').trim() || 'alba';
