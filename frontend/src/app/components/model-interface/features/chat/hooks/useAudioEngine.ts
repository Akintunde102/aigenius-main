import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { AudioStatus } from './audioMode.utils';
import { AUDIO_CONSTANTS } from './audio.constants';
import { float32PcmToWavBlob, MIN_NEURAL_VAD_SAMPLES } from './neuralVadWav';
import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';
import { loadMicVad } from './vadLazyLoader';

type MicVadLike = {
    pause: () => void | Promise<void>;
    start: () => void | Promise<void>;
    destroy?: () => void | Promise<void>;
};

type SpeechRecognitionResultLike = {
    isFinal: boolean;
    [index: number]: { transcript: string };
};

type SpeechRecognitionEventLike = {
    resultIndex: number;
    results: {
        length: number;
        [index: number]: SpeechRecognitionResultLike;
    };
};

type SpeechRecognitionLike = {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: (() => void) | null;
    start: () => void;
    stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

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

    const sharedContextRef = useRef<AudioContext | null>(null);
    const analyzerRef = useRef<AnalyserNode | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const animationFrameRef = useRef<number | null>(null);
    const lastVolumeUpdateRef = useRef<number>(0);
    const streamRef = useRef<MediaStream | null>(null);
    /** Silero MicVAD — when set, energy silence timer does not submit; `onSpeechEnd` drives finalize. */
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

    useLayoutEffect(() => {
        statusRef.current = status;
    }, [status]);

    useEffect(() => {
        optionsRef.current.onStatusChange?.(status);
    }, [status]);

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

                        stopAISpeech();
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

    useLayoutEffect(() => {
        pauseMicForAssistantPlaybackRef.current = pauseMicCaptureForAssistantPlayback;
        resumeMicAfterAssistantPlaybackRef.current = resumeMicCaptureAfterAssistantPlayback;
    }, [pauseMicCaptureForAssistantPlayback, resumeMicCaptureAfterAssistantPlayback]);

    const stopAISpeech = useCallback(() => {
        // Increment the playback epoch to invalidate any pending decode promises
        playbackEpochRef.current += 1;
        nextBufferIndexRef.current = 0;
        expectedBufferIndexRef.current = 0;
        decodedBuffersMapRef.current.clear();

        if (currentSourceRef.current) {
            try {
                currentSourceRef.current.stop();
            } catch {
                // Already stopped
            }
            currentSourceRef.current = null;
        }

        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            nativeUtteranceQueueRef.current.clear();
        }

        audioQueueRef.current = [];
        isPlayingRef.current = false;

        // Reset ducking states
        if (duckingTimerRef.current) {
            clearTimeout(duckingTimerRef.current);
            duckingTimerRef.current = null;
        }
        isDuckedRef.current = false;
        if (gainNodeRef.current && sharedContextRef.current) {
            try {
                gainNodeRef.current.gain.setValueAtTime(1.0, sharedContextRef.current.currentTime);
            } catch { /* ignore */ }
        }

        resumeMicAfterAssistantPlaybackRef.current();
        setStatus('listening');
    }, []);

    const processQueue = useCallback(async () => {
        if (isPlayingRef.current || audioQueueRef.current.length === 0) return;

        const ctx = await getSharedContext();
        isPlayingRef.current = true;
        const decodedBuffer = audioQueueRef.current.shift()!;

        try {
            if (ctx.state === 'closed') {
                console.error('[AudioEngine] AudioContext is closed, cannot play audio');
                isPlayingRef.current = false;
                audioQueueRef.current = [];
                resumeMicAfterAssistantPlaybackRef.current();
                return;
            }

            const source = ctx.createBufferSource();
            source.buffer = decodedBuffer;

            if (!gainNodeRef.current || gainNodeRef.current.context !== ctx) {
                gainNodeRef.current = ctx.createGain();
                gainNodeRef.current.connect(ctx.destination);
            }

            source.connect(gainNodeRef.current);
            currentSourceRef.current = source;

            pauseMicForAssistantPlaybackRef.current();
            setStatus('speaking');

            source.onended = () => {
                if (currentSourceRef.current === source) {
                    currentSourceRef.current = null;
                    isPlayingRef.current = false;
                    if (audioQueueRef.current.length > 0) {
                        processQueue();
                    } else {
                        console.log('[AudioEngine] Queue empty, ending speech');
                        resumeMicAfterAssistantPlaybackRef.current();
                        setStatus('listening');
                        optionsRef.current.onAssistantPlaybackEnded?.();
                    }
                }
            };

            source.start(0);
        } catch (err) {
            console.error('[AudioEngine] Error playing AI speech chunk:', err);
            isPlayingRef.current = false;
            resumeMicAfterAssistantPlaybackRef.current();
            processQueue();
        }
    }, [getSharedContext]);

    const playAISpeech = useCallback(async (buffer: ArrayBuffer) => {
        const targetEpoch = playbackEpochRef.current;
        const bufferIndex = nextBufferIndexRef.current;
        nextBufferIndexRef.current += 1;

        console.log('[AudioEngine] Decoding AI speech chunk:', { bytes: buffer.byteLength, epoch: targetEpoch, index: bufferIndex });
        try {
            const ctx = await getSharedContext();
            const decodedBuffer = await ctx.decodeAudioData(buffer);

            // If the playback epoch changed while decoding, discard!
            if (playbackEpochRef.current !== targetEpoch) {
                console.log('[AudioEngine] Discarded late-decoded audio chunk from stale epoch:', targetEpoch);
                return;
            }

            // Store in our order-preserving map
            decodedBuffersMapRef.current.set(bufferIndex, decodedBuffer);

            // Drain the order-preserving map into the play queue in the correct sequence
            while (decodedBuffersMapRef.current.has(expectedBufferIndexRef.current)) {
                const idx = expectedBufferIndexRef.current;
                const nextBuf = decodedBuffersMapRef.current.get(idx)!;
                decodedBuffersMapRef.current.delete(idx);
                audioQueueRef.current.push(nextBuf);
                expectedBufferIndexRef.current += 1;
            }

            processQueue();
        } catch (err) {
            console.error('[AudioEngine] Failed to decode audio chunk:', err);
        }
    }, [getSharedContext, processQueue]);

    const speakTextNative = useCallback((text: string) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        pauseMicForAssistantPlaybackRef.current();
        setStatus('speaking');

        const utterance = new SpeechSynthesisUtterance(text);

        // Voice selection: Prefer 'Google US English' or 'Microsoft Aria' if available
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v =>
            v.name.includes('Google US English') ||
            v.name.includes('Aria') ||
            v.name.includes('Natural')
        ) || voices.find(v => v.lang.startsWith('en'));

        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.onend = () => {
            // Remove from our active set (prevents memory leak and GC bug)
            nativeUtteranceQueueRef.current.delete(utterance);

            if (nativeUtteranceQueueRef.current.size === 0 && !streamFlushPendingRef.current) {
                resumeMicAfterAssistantPlaybackRef.current();
                setStatus('listening');
                optionsRef.current.onAssistantPlaybackEnded?.();
            }
        };

        utterance.onerror = (e) => {
            nativeUtteranceQueueRef.current.delete(utterance);

            // 'interrupted' is thrown when cancel() is called, which is expected during barge-in.
            if (e.error !== 'interrupted') {
                console.error('[AudioEngine] Native TTS error:', e);
            }

            if (nativeUtteranceQueueRef.current.size === 0 && !streamFlushPendingRef.current) {
                resumeMicAfterAssistantPlaybackRef.current();
                setStatus('listening');
            }
        };

        // Store strong reference to prevent Chrome garbage collection bug
        nativeUtteranceQueueRef.current.add(utterance);
        window.speechSynthesis.speak(utterance);
    }, []);

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
