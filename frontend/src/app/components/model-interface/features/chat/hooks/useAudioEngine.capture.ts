import { useCallback } from 'react';
import { float32PcmToWavBlob, MIN_NEURAL_VAD_SAMPLES } from './neuralVadWav';
import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';
import { loadMicVad } from './vadLazyLoader';
import { AUDIO_CONSTANTS } from './audio.constants';
import type { MicVadLike, SpeechRecognitionConstructor, SpeechRecognitionLike, UseAudioEngineOptions } from './useAudioEngine.types';
import type { AudioStatus } from './audioMode.utils';

export function useAudioEngineCapture(deps: {
  optionsRef: React.MutableRefObject<UseAudioEngineOptions>;
  sharedContextRef: React.MutableRefObject<AudioContext | null>;
  analyzerRef: React.MutableRefObject<AnalyserNode | null>;
  gainNodeRef: React.MutableRefObject<GainNode | null>;
  scriptProcessorRef: React.MutableRefObject<ScriptProcessorNode | null>;
  mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
  silenceTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  chunksRef: React.MutableRefObject<Blob[]>;
  animationFrameRef: React.MutableRefObject<number | null>;
  lastVolumeUpdateRef: React.MutableRefObject<number>;
  streamRef: React.MutableRefObject<MediaStream | null>;
  micVadRef: React.MutableRefObject<MicVadLike | null>;
  neuralVadReadyRef: React.MutableRefObject<boolean>;
  vadFinalizeLockRef: React.MutableRefObject<boolean>;
  speechRecognitionRef: React.MutableRefObject<SpeechRecognitionLike | null>;
  suppressFinalizeOnRecorderStopRef: React.MutableRefObject<boolean>;
  pauseMicForAssistantPlaybackRef: React.MutableRefObject<() => void>;
  resumeMicAfterAssistantPlaybackRef: React.MutableRefObject<() => void>;
  isRecordingRef: React.MutableRefObject<boolean>;
  streamFlushPendingRef: React.MutableRefObject<boolean>;
  isSpeechDetectedRef: React.MutableRefObject<boolean>;
  statusRef: React.MutableRefObject<AudioStatus>;
  duckingTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  isDuckedRef: React.MutableRefObject<boolean>;
  stopAISpeechRef: React.MutableRefObject<() => void>;
  setStatus: (s: AudioStatus) => void;
  setIsRecording: (v: boolean) => void;
  setVolume: (v: number) => void;
  silenceThreshold: number;
  interruptionThreshold: number;
}) {
  const {
    optionsRef,
    sharedContextRef,
    analyzerRef,
    gainNodeRef,
    scriptProcessorRef,
    mediaRecorderRef,
    silenceTimerRef,
    chunksRef,
    animationFrameRef,
    lastVolumeUpdateRef,
    streamRef,
    micVadRef,
    neuralVadReadyRef,
    vadFinalizeLockRef,
    speechRecognitionRef,
    suppressFinalizeOnRecorderStopRef,
    pauseMicForAssistantPlaybackRef,
    resumeMicAfterAssistantPlaybackRef,
    isRecordingRef,
    streamFlushPendingRef,
    isSpeechDetectedRef,
    statusRef,
    duckingTimerRef,
    isDuckedRef,
    stopAISpeechRef,
    setStatus,
    setIsRecording,
    setVolume,
    silenceThreshold,
    interruptionThreshold,
  } = deps;

  const getSharedContext = useCallback(async () => {
      if (!sharedContextRef.current || sharedContextRef.current.state === 'closed') {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          sharedContextRef.current = new AudioCtx();
          gainNodeRef.current = null; // Reset nodes for new context
          analyzerRef.current = null;
      }
      if (sharedContextRef.current.state === 'suspended') {
          await sharedContextRef.current.resume();
      }
      return sharedContextRef.current;
  }, []);

  const stopLiveSpeechRecognition = useCallback(() => {
      if (!speechRecognitionRef.current) return;

      speechRecognitionRef.current.onresult = null;
      speechRecognitionRef.current.onerror = null;
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
  }, []);

  const startLiveSpeechRecognition = useCallback(() => {
      // Only use native browser speech recognition in the web browser.
      // Desktop uses the sidecar (Whisper) for all STT needs.
      if (isAigeniusDesktopRuntime()) return;

      // Developer option: Bypass native browser speech recognition and use cloud backend STT
      if (AUDIO_CONSTANTS.BROWSER_STT_ENGINE === 'cloud') return;

      const SpeechRecognitionCtor =
          (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;

      if (!SpeechRecognitionCtor) return;

      stopLiveSpeechRecognition();

      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';
      recognition.onresult = (event) => {
          // Block live speech previews from being emitted if neural VAD is enabled, active,
          // and has NOT approved/detected active speech (e.g. background fan noise/typing clacks).
          const isVadActive = optionsRef.current.neuralVad !== false && neuralVadReadyRef.current;
          if (isVadActive && !isSpeechDetectedRef.current) {
              return;
          }

          let interimText = '';
          let finalText = '';

          for (let i = 0; i < event.results.length; i += 1) {
              const result = event.results[i];
              const transcript = result[0]?.transcript ?? '';
              if (result.isFinal) {
                  finalText += transcript;
              } else {
                  interimText += transcript;
              }
          }

          const text = (finalText || interimText).trim();
          if (text) {
              optionsRef.current.onLiveTranscript?.(text, Boolean(finalText));
          }
      };
      recognition.onerror = (event: any) => {
          const errName = event.error || 'unknown';
          console.error('[AudioEngine] SpeechRecognition error:', errName);
          import('react-hot-toast').then(({ toast }) => {
              if (errName === 'not-allowed') {
                  toast.error('Browser blocked voice recognition. Grant microphone permissions in browser.');
              } else if (errName === 'network') {
                  toast.error('Voice recognition network error. Please try again.');
              } else {
                  toast.error(`Voice recognition error: ${errName}`);
              }
          }).catch(() => {});
          stopLiveSpeechRecognition();
      };

      recognition.onend = () => {
          if (isRecordingRef.current && speechRecognitionRef.current === recognition) {
              console.log('[AudioEngine] SpeechRecognition ended while recording, restarting...');
              try {
                  recognition.start();
              } catch (e) {
                  console.warn('[AudioEngine] Failed to restart SpeechRecognition:', e);
              }
          }
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
  }, [stopLiveSpeechRecognition]);

  const destroyMicVad = useCallback(() => {
      // We no longer destroy, we just pause to keep the WASM session alive for reuse.
      const v = micVadRef.current;
      if (!v) return;
      try {
          void v.pause?.();
      } catch (e) {
          console.warn('[AudioEngine] Failed to pause VAD', e);
      }
  }, []);

  /**
   * MicVAD `onSpeechEnd`: tear down capture and hand off a 16 kHz WAV blob (no WebM silence tail).
   */
  const finalizeNeuralUtteranceFromCallback = useCallback(
      async (wavBlob: Blob) => {
          if (vadFinalizeLockRef.current) return;
          if (!isRecordingRef.current) return;
          if (statusRef.current === 'speaking') return;

          vadFinalizeLockRef.current = true;
          isSpeechDetectedRef.current = false;
          try {
              console.log('[AudioEngine] Sending STT wav blob:', { size: wavBlob.size, type: wavBlob.type });
              if (wavBlob.size < 1000) {
                  console.warn('[AudioEngine] STT wav blob is very small (<1KB), transcription might fail.');
              }

              suppressFinalizeOnRecorderStopRef.current = true;
              if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                  try {
                      mediaRecorderRef.current.stop();
                  } catch {
                      suppressFinalizeOnRecorderStopRef.current = false;
                  }
              }

              destroyMicVad();

              if (silenceTimerRef.current) {
                  clearTimeout(silenceTimerRef.current);
                  silenceTimerRef.current = null;
              }
              if (animationFrameRef.current) {
                  cancelAnimationFrame(animationFrameRef.current);
                  animationFrameRef.current = null;
              }

              stopLiveSpeechRecognition();

              if (streamRef.current) {
                  streamRef.current.getTracks().forEach((track) => track.stop());
                  streamRef.current = null;
              }

              isRecordingRef.current = false;
              setIsRecording(false);
              mediaRecorderRef.current = null;
              chunksRef.current = [];
              analyzerRef.current = null;

              optionsRef.current.onSilence?.(wavBlob);
          } finally {
              vadFinalizeLockRef.current = false;
          }
      },
      [destroyMicVad, stopLiveSpeechRecognition],
  );

  const initMicVad = useCallback(async (stream: MediaStream) => {
      if (micVadRef.current || optionsRef.current.neuralVad === false) return;

      try {
          const MicVAD = await loadMicVad();
          const origin = window.location.origin;
          // Use precise path without trailing slash issues to avoid 302
          const vad = await MicVAD.new({
              getStream: async () => stream,
              onSpeechStart: () => {
                  isSpeechDetectedRef.current = true;
                  console.log('[AudioEngine] Neural VAD approved speech start.');

                  // Instant Interruption: Trigger immediately when VAD hears voice
                  if (statusRef.current === 'speaking') {
                      console.log('[AudioEngine] Interruption confirmed instantly onSpeechStart by Neural VAD!');

                      if (duckingTimerRef.current) {
                          clearTimeout(duckingTimerRef.current);
                          duckingTimerRef.current = null;
                      }
                      isDuckedRef.current = false;

                      if (silenceTimerRef.current) {
                          clearTimeout(silenceTimerRef.current);
                          silenceTimerRef.current = null;
                      }

                      stopAISpeechRef.current();
                      optionsRef.current.onInterruption?.();
                      setStatus('listening');
                  }
              },
              onSpeechEnd: (audio: Float32Array) => {
                  isSpeechDetectedRef.current = false;
                  console.log('[AudioEngine] Neural VAD registered speech end.');
                  if (!isRecordingRef.current || vadFinalizeLockRef.current) return;
                  if (statusRef.current === 'speaking') return;
                  if (audio.length < MIN_NEURAL_VAD_SAMPLES) return;
                  const wav = float32PcmToWavBlob(audio, 16000);
                  void finalizeNeuralUtteranceFromCallback(wav);
              },
              baseAssetPath: `${origin}/vad/`,
              onnxWASMBasePath: `${origin}/vad/ort/`,
              positiveSpeechThreshold: AUDIO_CONSTANTS.VAD_POSITIVE_SPEECH_THRESHOLD,
              negativeSpeechThreshold: AUDIO_CONSTANTS.VAD_NEGATIVE_SPEECH_THRESHOLD,
              redemptionMs: AUDIO_CONSTANTS.VAD_REDEMPTION_FRAMES * 30,
          });
          micVadRef.current = vad as MicVadLike;
          neuralVadReadyRef.current = true;
          console.log('[AudioEngine] Neural VAD initialized and ready with custom sensitivity.');
      } catch (e) {
          console.warn('[AudioEngine] MicVAD failed to initialize', e);
          neuralVadReadyRef.current = false;
      }
  }, [finalizeNeuralUtteranceFromCallback]);

  /** Snapshot of audio recorded so far without stopping (e.g. desktop local partial STT). */
  const peekRecordingBlob = useCallback((): Blob | null => {
      if (!chunksRef.current.length) {
          return null;
      }
      const t = chunksRef.current[0]?.type || 'audio/webm';
      return new Blob([...chunksRef.current], { type: t });
  }, []);

  const stopRecording = useCallback(() => {
      if (isRecordingRef.current) {
          console.log('[AudioEngine] Stopping recording...');
      }
      isRecordingRef.current = false;
      setIsRecording(false);
      isSpeechDetectedRef.current = false;

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
      }

      if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
      }

      if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
      }

      if (scriptProcessorRef.current) {
          scriptProcessorRef.current.disconnect();
          scriptProcessorRef.current = null;
      }

      destroyMicVad();

      if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
      }

      stopLiveSpeechRecognition();
  }, [stopLiveSpeechRecognition, destroyMicVad]);

  const bindMediaRecorderEvents = useCallback((mr: MediaRecorder) => {
      mr.ondataavailable = (e) => {
          if (e.data.size > 0) {
              chunksRef.current.push(e.data);
              optionsRef.current.onAudioChunk?.(e.data);
          }
      };
      mr.onstop = () => {
          if (suppressFinalizeOnRecorderStopRef.current) {
              suppressFinalizeOnRecorderStopRef.current = false;
              chunksRef.current = [];
              mediaRecorderRef.current = null;
              return;
          }
          console.log('[AudioEngine] MediaRecorder stopped, blobs:', chunksRef.current.length);
          if (chunksRef.current.length > 0) {
              const t = chunksRef.current[0]?.type || 'audio/webm';
              const blob = new Blob(chunksRef.current, { type: t });
              optionsRef.current.onSilence?.(blob);
              chunksRef.current = [];
          }
      };
      mr.onerror = (e) => {
          console.error('[AudioEngine] MediaRecorder error:', e);
          stopRecording();
      };
  }, [stopRecording]);

  /** Stop streaming mic chunks while assistant audio plays; keep stream + analyzer for barge-in. */
  const pauseMicCaptureForAssistantPlayback = useCallback(() => {
      stopLiveSpeechRecognition();

      try {
          void micVadRef.current?.pause?.();
      } catch {
          /* ignore */
      }

      if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
      }

      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === 'inactive' || mr.state === 'paused') return;

      const recorderWithPause = mr as MediaRecorder & { pause?: () => void; resume?: () => void };
      if (typeof recorderWithPause.pause === 'function') {
          try {
              recorderWithPause.pause();
              if ((mr.state as MediaRecorder['state']) === 'paused') return;
          } catch {
              /* fall through to stop+recreate path */
          }
      }

      suppressFinalizeOnRecorderStopRef.current = true;
      try {
          mr.stop();
      } catch {
          suppressFinalizeOnRecorderStopRef.current = false;
      }
      mediaRecorderRef.current = null;
  }, [stopLiveSpeechRecognition]);

  const resumeMicCaptureAfterAssistantPlayback = useCallback(() => {
      if (!isRecordingRef.current || !streamRef.current) return;

      try {
          void micVadRef.current?.start?.();
      } catch {
          /* ignore */
      }

      const stream = streamRef.current;
      let mr = mediaRecorderRef.current;

      const recorderWithResume = mr as MediaRecorder & { resume?: () => void };
      if (mr?.state === 'paused' && typeof recorderWithResume.resume === 'function') {
          try {
              recorderWithResume.resume();
              if (mediaRecorderRef.current?.state === 'recording') {
                  startLiveSpeechRecognition();
                  return;
              }
          } catch {
              /* recreate */
          }
      }

      if (mr && mr.state !== 'inactive' && mr.state !== 'paused') return;

      chunksRef.current = [];

      // Opus Compression (Network Optimization)
      let options: MediaRecorderOptions | undefined;
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options = { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 16000 };
      }
      mr = new MediaRecorder(stream, options);
      bindMediaRecorderEvents(mr);
      mediaRecorderRef.current = mr;
      try {
          mr.start(250);
      } catch (e) {
          console.error('[AudioEngine] Failed to restart MediaRecorder after TTS', e);
          return;
      }
      startLiveSpeechRecognition();
  }, [bindMediaRecorderEvents, startLiveSpeechRecognition]);

  return {
    getSharedContext,
    stopLiveSpeechRecognition,
    startLiveSpeechRecognition,
    destroyMicVad,
    finalizeNeuralUtteranceFromCallback,
    initMicVad,
    peekRecordingBlob,
    stopRecording,
    bindMediaRecorderEvents,
    pauseMicCaptureForAssistantPlayback,
    resumeMicCaptureAfterAssistantPlayback,
  };
}
