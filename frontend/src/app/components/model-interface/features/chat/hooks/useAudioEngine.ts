import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { AudioStatus } from './audioMode.utils';
import { AUDIO_CONSTANTS } from './audio.constants';
import type { MicVadLike, SpeechRecognitionLike, UseAudioEngineOptions } from './useAudioEngine.types';
import { useAudioEngineCapture } from './useAudioEngine.capture';
import { useAudioEnginePlayback } from './useAudioEngine.playback';

export type { UseAudioEngineOptions } from './useAudioEngine.types';

export function useAudioEngine(options: UseAudioEngineOptions) {
    const {
        silenceThreshold = AUDIO_CONSTANTS.SILENCE_THRESHOLD_MS,
        interruptionThreshold = AUDIO_CONSTANTS.INTERRUPTION_VOLUME_THRESHOLD
    } = options;

    const optionsRef = useRef(options);
    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    const [isRecording, setIsRecording] = useState(false);
    const [volume, setVolume] = useState(0);
    const [status, setStatus] = useState<AudioStatus>('listening');
    const statusRef = useRef<AudioStatus>(status);

    useLayoutEffect(() => {
        statusRef.current = status;
    }, [status]);

    useEffect(() => {
        optionsRef.current.onStatusChange?.(status);
    }, [status]);

    const sharedContextRef = useRef<AudioContext | null>(null);
    const analyzerRef = useRef<AnalyserNode | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const animationFrameRef = useRef<number | null>(null);
    const lastVolumeUpdateRef = useRef<number>(0);
    const streamRef = useRef<MediaStream | null>(null);
    /** Silero MicVAD ΓÇö when set, energy silence timer does not submit; `onSpeechEnd` drives finalize. */
    const micVadRef = useRef<MicVadLike | null>(null);
    /** True after MicVAD successfully started for this recording session. */
    const neuralVadReadyRef = useRef(false);
    const vadFinalizeLockRef = useRef(false);
    const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
    /** When true, MediaRecorder `onstop` discards chunks (pause-for-TTS path, not user finalize). */
    const suppressFinalizeOnRecorderStopRef = useRef(false);
    const pauseMicForAssistantPlaybackRef = useRef<() => void>(() => { });
    const resumeMicAfterAssistantPlaybackRef = useRef<() => void>(() => { });
    const isRecordingRef = useRef(false);
    // Set to true while the sentence-streaming flush is in-flight so that the
    // last utterance's onend doesn't prematurely open the microphone.
    const streamFlushPendingRef = useRef(false);
    const isSpeechDetectedRef = useRef(false);

    // Calibration and Noise Floor
    const [noiseFloor, setNoiseFloor] = useState(AUDIO_CONSTANTS.SPEECH_DETECTION_VOLUME_THRESHOLD);
    const isCalibratingRef = useRef(false);
    const calibrationBufferRef = useRef<number[]>([]);

    // Audio Output Queue
    const audioQueueRef = useRef<AudioBuffer[]>([]);
    const isPlayingRef = useRef(false);
    const gainNodeRef = useRef<GainNode | null>(null);
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const nativeUtteranceQueueRef = useRef<Set<SpeechSynthesisUtterance>>(new Set());
    const isDuckedRef = useRef(false);
    const duckingTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Order-preserving and Epoch-gating Refs for bulletproof sequential playback
    const playbackEpochRef = useRef(0);
    const nextBufferIndexRef = useRef(0);
    const expectedBufferIndexRef = useRef(0);
    const decodedBuffersMapRef = useRef<Map<number, AudioBuffer>>(new Map());
    const stopAISpeechRef = useRef<() => void>(() => {});


  const capture = useAudioEngineCapture({
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
  });
  const {
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
  } = capture;

  useLayoutEffect(() => {
    pauseMicForAssistantPlaybackRef.current = pauseMicCaptureForAssistantPlayback;
    resumeMicAfterAssistantPlaybackRef.current = resumeMicCaptureAfterAssistantPlayback;
  }, [pauseMicCaptureForAssistantPlayback, resumeMicCaptureAfterAssistantPlayback]);

  const playback = useAudioEnginePlayback({
    optionsRef,
    audioQueueRef,
    isPlayingRef,
    gainNodeRef,
    currentSourceRef,
    nativeUtteranceQueueRef,
    isDuckedRef,
    duckingTimerRef,
    streamFlushPendingRef,
    sharedContextRef,
    pauseMicForAssistantPlaybackRef,
    resumeMicAfterAssistantPlaybackRef,
    statusRef,
    playbackEpochRef,
    nextBufferIndexRef,
    expectedBufferIndexRef,
    decodedBuffersMapRef,
    getSharedContext,
    setStatus,
  });
  const { stopAISpeech, processQueue, playAISpeech, speakTextNative } = playback;
  stopAISpeechRef.current = stopAISpeech;
    const startRecording = useCallback(async () => {
        try {
            if (isRecordingRef.current) return true;
            if (isPlayingRef.current) {
                stopAISpeech();
            }

            console.log('[AudioEngine] Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });
            console.log('[AudioEngine] Microphone access granted');
            streamRef.current = stream;

            if (optionsRef.current.neuralVad !== false) {
                await initMicVad(stream);
                if (micVadRef.current) {
                    void micVadRef.current.start();
                }
            }

            const ctx = await getSharedContext();

            const source = ctx.createMediaStreamSource(stream);
            const analyzer = ctx.createAnalyser();
            analyzer.fftSize = 256;
            source.connect(analyzer);
            analyzerRef.current = analyzer;

            // Start calibration
            isCalibratingRef.current = true;
            calibrationBufferRef.current = [];

            const scriptProcessor = ctx.createScriptProcessor(2048, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (e) => {
                if (!isRecordingRef.current) return;

                const inputData = e.inputBuffer.getChannelData(0);
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) {
                    sum += Math.abs(inputData[i]);
                }
                // Normalize average to 0-100 range to match previous analyzer behavior
                const avg = (sum / inputData.length) * 100;

                const now = performance.now();
                if (now - lastVolumeUpdateRef.current > 100) {
                    setVolume(prev => Math.abs(avg - prev) > 2 ? avg : prev);
                    lastVolumeUpdateRef.current = now;
                }

                // Calibration logic
                if (isCalibratingRef.current) {
                    calibrationBufferRef.current.push(avg);
                    if (calibrationBufferRef.current.length >= 20) { // ~800ms at 2048 buffer
                        const maxNoise = Math.max(...calibrationBufferRef.current);
                        const newFloor = Math.max(AUDIO_CONSTANTS.SPEECH_DETECTION_VOLUME_THRESHOLD, maxNoise + 8);
                        setNoiseFloor(newFloor);
                        isCalibratingRef.current = false;
                        console.log('[AudioEngine] Calibrated noise floor:', newFloor);
                    }
                }

                // Interruption logic: If AI is speaking and user starts talking
                const currentInterruptionThreshold = Math.max(interruptionThreshold, noiseFloor + 20);
                const isVadActive = optionsRef.current.neuralVad !== false && neuralVadReadyRef.current;

                if (isVadActive) {
                    // 1. Soft-Ducking: volume crosses threshold while AI is speaking
                    if (statusRef.current === 'speaking' && avg > currentInterruptionThreshold && !isDuckedRef.current) {
                        console.log('[AudioEngine] Volume spike detected. Ducking AI speech. (Volume:', avg, ')');
                        isDuckedRef.current = true;

                        const ctx = sharedContextRef.current;
                        if (gainNodeRef.current && ctx) {
                            try {
                                gainNodeRef.current.gain.setValueAtTime(0.15, ctx.currentTime);
                            } catch (e) {
                                console.warn('[AudioEngine] Failed to duck gain:', e);
                            }
                        }

                        if (duckingTimerRef.current) {
                            clearTimeout(duckingTimerRef.current);
                        }

                        duckingTimerRef.current = setTimeout(() => {
                            // If VAD has NOT approved speech by now, restore volume (unduck)
                            if (!isSpeechDetectedRef.current && isDuckedRef.current) {
                                console.log('[AudioEngine] Ducking timeout reached. No speech detected. Restoring volume.');
                                isDuckedRef.current = false;
                                const context = sharedContextRef.current;
                                if (gainNodeRef.current && context) {
                                    try {
                                        gainNodeRef.current.gain.setValueAtTime(1.0, context.currentTime);
                                    } catch (e) { /* ignore */ }
                                }
                            }
                            duckingTimerRef.current = null;
                        }, 250); // 250ms validation window
                    }

                    // 2. Neural VAD Confirmation: if user speech starts while we are speaking (or in the active ducking window), fully abort!
                    if (statusRef.current === 'speaking' && isSpeechDetectedRef.current) {
                        console.log('[AudioEngine] Interruption confirmed by Neural VAD!');

                        if (duckingTimerRef.current) {
                            clearTimeout(duckingTimerRef.current);
                            duckingTimerRef.current = null;
                        }
                        isDuckedRef.current = false;

                        if (silenceTimerRef.current) {
                            clearTimeout(silenceTimerRef.current);
                            silenceTimerRef.current = null;
                        }

                        stopAISpeech();
                        optionsRef.current.onInterruption?.();
                        setStatus('listening');
                    }
                } else {
                    // Fallback: energy-only interruption when Neural VAD is not active
                    if (statusRef.current === 'speaking' && avg > currentInterruptionThreshold) {
                        console.log('[AudioEngine] Interruption detected (energy fallback) volume:', avg);
                        if (silenceTimerRef.current) {
                            clearTimeout(silenceTimerRef.current);
                            silenceTimerRef.current = null;
                        }
                        stopAISpeech();
                        optionsRef.current.onInterruption?.();
                        setStatus('listening');
                    }
                }

                // VAD logic for submission (energy fallback only when neural MicVAD is off)
                if (
                    statusRef.current === 'listening' &&
                    !isCalibratingRef.current &&
                    !neuralVadReadyRef.current &&
                    !optionsRef.current.disableAutoSilence
                ) {
                    if (avg > noiseFloor) { // Speech detected
                        isSpeechDetectedRef.current = true;
                        if (silenceTimerRef.current) {
                            clearTimeout(silenceTimerRef.current);
                            silenceTimerRef.current = null;
                        }
                    } else { // Silence detected
                        if (isSpeechDetectedRef.current) {
                            if (!silenceTimerRef.current) {
                                silenceTimerRef.current = setTimeout(() => {
                                    console.log('[AudioEngine] Silence threshold reached, submitting...');
                                    stopRecording();
                                }, silenceThreshold);
                            }
                        }
                    }
                }
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(ctx.destination);

            // Opus Compression (Network Optimization)
            let options: MediaRecorderOptions | undefined;
            if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                options = { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 16000 };
            }
            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;
            bindMediaRecorderEvents(mediaRecorder);

            mediaRecorder.start(250); // Emit data every 250ms for real-time streaming
            startLiveSpeechRecognition();
            isRecordingRef.current = true;
            setIsRecording(true);
            setStatus('listening');
            return true;
        } catch (err) {
            console.error('[AudioEngine] Failed to start recording:', err);
            import('react-hot-toast').then(({ toast }) => {
                toast.error(`Failed to start recording: ${(err as Error).message || err}`);
            }).catch(() => {});
            isRecordingRef.current = false;
            setIsRecording(false);
            setStatus('listening');
            return false;
        }
    }, [silenceThreshold, interruptionThreshold, stopAISpeech, stopRecording, startLiveSpeechRecognition, getSharedContext, bindMediaRecorderEvents, finalizeNeuralUtteranceFromCallback]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopRecording();
            stopAISpeech();
            if (duckingTimerRef.current) {
                clearTimeout(duckingTimerRef.current);
                duckingTimerRef.current = null;
            }
            if (micVadRef.current?.destroy) {
                void micVadRef.current.destroy();
            }
            if (sharedContextRef.current) {
                sharedContextRef.current.close().catch(() => { });
                sharedContextRef.current = null;
            }
        };
    }, [stopRecording, stopAISpeech]);


    return {
        isRecording,
        volume,
        status,
        setStatus,
        startRecording,
        stopRecording,
        peekRecordingBlob,
        playAISpeech,
        speakTextNative,
        stopAISpeech,
        analyzer: analyzerRef.current,
        isNativeSpeechActive: Boolean(speechRecognitionRef.current),
        streamFlushPendingRef,
    };
}

