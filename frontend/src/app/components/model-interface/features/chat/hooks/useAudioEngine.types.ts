import type { AudioStatus } from './audioMode.utils';

export type MicVadLike = {
  pause: () => void | Promise<void>;
  start: () => void | Promise<void>;
  destroy?: () => void | Promise<void>;
};

export type SpeechRecognitionResultLike = {
  isFinal: boolean;
  [index: number]: { transcript: string };
};

export type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

export type SpeechRecognitionErrorEventLike = {
  error?: string;
};

export type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export interface UseAudioEngineOptions {
  onTranscription?: (text: string) => void;
  onLiveTranscript?: (text: string, isFinal: boolean) => void;
  onSilence?: (blob: Blob) => void;
  onAudioChunk?: (blob: Blob) => void;
  onInterruption?: () => void;
  /** Fired when queued assistant TTS playback finishes (not user silence). */
  onAssistantPlaybackEnded?: () => void;
  onStatusChange?: (status: AudioStatus) => void;
  silenceThreshold?: number;
  interruptionThreshold?: number;
  /** Disable automatic silence thresholds from stopping recording. */
  disableAutoSilence?: boolean;
  /**
   * When true (default), load @ricky0123/vad-web MicVAD and finalize each utterance from VAD
   * (16 kHz WAV) instead of energy-timer + WebM. Requires `public/vad` assets from postinstall.
   */
  neuralVad?: boolean;
}
