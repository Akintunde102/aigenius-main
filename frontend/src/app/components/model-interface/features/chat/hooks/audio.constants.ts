export const AUDIO_CONSTANTS = {
  // Voice Activity Detection (VAD)
  SILENCE_THRESHOLD_MS: 520,
  VAD_POSITIVE_SPEECH_THRESHOLD: 0.65, // Increased from 0.5 to ignore background fan noise
  VAD_NEGATIVE_SPEECH_THRESHOLD: 0.45, // Increased from 0.35 to transition to silence quicker
  VAD_REDEMPTION_FRAMES: 30,           // Snappier silence finalization (900ms at 30ms frames)

  /** Server STT snapshots while the user is still talking (no silence required). */
  PARTIAL_TRANSCRIPTION_INTERVAL_MS: 750,
  INTERRUPTION_VOLUME_THRESHOLD: 45,
  SPEECH_DETECTION_VOLUME_THRESHOLD: 15,

  // Synthesis limits
  MAX_REPORT_CHARACTER_LENGTH: 250, // FIX: Increased from 180 for more complete thoughts
  CONVERSATIONAL_PREFIX: "", // REMOVED: No longer summarizing - stream full text to TTS

  // Regex for splitting streaming text into sentences
  // Splits on punctuation followed by space and a capital letter
  SENTENCE_BOUNDARY_REGEX: /[.!?](\s+|$)(?=[A-Z]|$)/,

  /** TTS: emit a chunk after this long without a sentence end (keep latency low). */
  TTS_PARTIAL_FLUSH_MS: 900,
  /** TTS: minimum new characters before partial flush applies. */
  TTS_PARTIAL_MIN_CHARS: 22,
  /** TTS: force comma break in long runs (start search after this many new chars). */
  TTS_COMMA_SEARCH_MIN_NEW: 38,
  /** TTS: comma break only if the run is at least this long. */
  TTS_LONG_RUN_COMMA_AT: 52,

  // Loop recovery
  RECOVERY_TIMEOUT_MS: 1500,
  INTERRUPTION_LOCKOUT_MS: 1200, // FIX: Reduced from 1800ms for more responsive feel

  /** Electron: Faster-Whisper via local desktop-server (default listen port). */
  LOCAL_DESKTOP_STT_TRANSCRIBE_URL: 'http://127.0.0.1:8001/stt/transcribe',
  LOCAL_DESKTOP_STT_STREAM_START_URL: 'http://127.0.0.1:8001/stt/stream/start',
  LOCAL_DESKTOP_STT_STREAM_CHUNK_URL: 'http://127.0.0.1:8001/stt/stream/chunk',
  LOCAL_DESKTOP_STT_STREAM_TRANSCRIBE_URL: 'http://127.0.0.1:8001/stt/stream/transcribe',
  LOCAL_DESKTOP_STT_STREAM_END_URL: 'http://127.0.0.1:8001/stt/stream/end',

  /** Electron: Pocket-TTS via local desktop-server. */
  LOCAL_DESKTOP_TTS_SYNTHESIZE_URL: 'http://127.0.0.1:8001/tts/synthesize',
  /**
   * Pocket-TTS preset passed on each synthesize request (server default is `AIGENIUS_TTS_VOICE` or `alba`).
   * Female presets: `alba`, `cosette`, `eponine`, `fantine`, `azelma`.
   */
  LOCAL_DESKTOP_TTS_VOICE: 'alba',

  /** Skip local partial STT until MediaRecorder has enough audio ( fragmented WebM ). */
  MIN_LOCAL_PARTIAL_STT_BYTES: 8000,

  // Developer switches for Browser Speech Engines (only applies in browser runtime)
  BROWSER_STT_ENGINE: 'cloud' as 'native' | 'cloud',
  BROWSER_TTS_ENGINE: 'cloud' as 'native' | 'cloud',
};

