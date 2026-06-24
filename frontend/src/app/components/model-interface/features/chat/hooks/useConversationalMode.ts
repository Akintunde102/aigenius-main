import { useState, useCallback, useRef, useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { Socket } from 'socket.io-client';
import { authorizedFetch } from '@/lib/api/auth-client';
import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';
import { AudioStatus, isLikelyNoiseOnlyConversationalStt } from './audioMode.utils';
import { useAudioEngine } from './useAudioEngine';
import { AUDIO_CONSTANTS } from './audio.constants';
import { resetVoiceTraceSession, voiceObs } from './voiceObservability';
import { useTranscriptManager } from './useTranscriptManager';
import { useVoiceLoopMaintenance } from './useVoiceLoopMaintenance';

export interface UseConversationalModeAudioSession {
  socket: Socket | null;
  connect: () => void;
  disconnect: () => void;
}

interface UseConversationalModeProps {
  onTranscriptionComplete: (text: string) => Promise<void>;
  isLoading: boolean;
  isStreaming: boolean;
  audioSession: UseConversationalModeAudioSession;
  /** Mic dictation cleanup — conversational mode must not compete with STT. */
  onEnterAudioMode?: () => void;
  /** User spoke over assistant — abort LLM + TTS. */
  onBargeIn?: () => void;
  /** When true, do not emit mic chunks / finalize (dictation owns the mic). */
  peerMicSuppressRef?: MutableRefObject<boolean>;
}

export function useConversationalMode({
  onTranscriptionComplete,
  isLoading,
  isStreaming,
  audioSession,
  onEnterAudioMode,
  onBargeIn,
  peerMicSuppressRef,
}: UseConversationalModeProps) {
  const { socket, connect, disconnect } = audioSession;
  const [isAudioMode, setIsAudioMode] = useState(false);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('listening');
  const [audioNotice, setAudioNotice] = useState("");

  const interruptedUntilRef = useRef(0);
  const startRecordingRef = useRef<() => void>(() => { });
  const stopRecordingRef = useRef<() => void>(() => { });
  const socketRef = useRef<Socket | null>(null);
  const audioStatusRef = useRef<AudioStatus>('listening');
  const desktopSessionIdRef = useRef<string | null>(null);
  /** Mutex: one session-start at a time so WebM header + chunks stay in one file. */
  const desktopSessionStartRef = useRef<Promise<string | null> | null>(null);
  /** Bytes of the blob last finalized (socket + desktop) for noise-only STT filtering. */
  const lastFinalizeAudioBlobBytesRef = useRef(0);
  const nativeFinalTranscriptRef = useRef("");
  /**
   * MediaRecorder fires `ondataavailable` in order, but `blob.arrayBuffer()` resolves asynchronously.
   * Parallel emits reorder chunks on the server → invalid WebM → Groq "not a valid media file" on later turns.
   */
  const socketChunkSendChainRef = useRef(Promise.resolve<void>(undefined));
  const onBargeInRef = useRef(onBargeIn);
  const partialTranscriptionInFlightRef = useRef(false);
  const partialFlushErrorCountRef = useRef(0);

  useEffect(() => {
    onBargeInRef.current = onBargeIn;
  }, [onBargeIn]);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    if (!isAudioMode) {
      socketChunkSendChainRef.current = Promise.resolve(undefined);
    }
  }, [isAudioMode]);

  useEffect(() => {
    audioStatusRef.current = audioStatus;
  }, [audioStatus]);

  /** End the desktop HTTP stream session (best-effort). Safe to call multiple times. */
  const abandonDesktopSttSession = useCallback(() => {
    const sid = desktopSessionIdRef.current;
    desktopSessionIdRef.current = null;
    desktopSessionStartRef.current = null;
    partialFlushErrorCountRef.current = 0;
    if (!sid || !isAigeniusDesktopRuntime()) return;
    void authorizedFetch(AUDIO_CONSTANTS.LOCAL_DESKTOP_STT_STREAM_END_URL, {
      method: 'POST',
      headers: { 'X-Session-ID': sid },
    }).catch(() => { /* best-effort */ });
  }, []);

  /**
   * Desktop STT: same HTTP stream path as dictation, then VAD WAV upload if the WebM
   * stream was empty (e.g. chunks never reached the server).
   */
  const finalizeDesktopStt = useCallback(async (wavBlob: Blob): Promise<string> => {
    const sid = desktopSessionIdRef.current;
    let text = '';

    if (sid) {
      try {
        const res = await authorizedFetch(AUDIO_CONSTANTS.LOCAL_DESKTOP_STT_STREAM_TRANSCRIBE_URL, {
          method: 'POST',
          headers: { 'X-Session-ID': sid },
          body: JSON.stringify({ beam_size: 5 }),
        });
        if (res.ok) {
          const data = (await res.json()) as { text?: string };
          text = data.text?.trim() ?? '';
        }
      } catch (e) {
        console.warn('[ConversationalMode] Stream finalize STT failed', e);
      }
      abandonDesktopSttSession();
    }

    if (!text && wavBlob.size > 0) {
      voiceObs('conversational', 'silence_desktop_wav_fallback', { blobBytes: wavBlob.size });
      try {
        const formData = new FormData();
        const ext = wavBlob.type.includes('wav') ? 'audio.wav' : 'audio.webm';
        formData.append('file', wavBlob, ext);
        const res = await authorizedFetch(AUDIO_CONSTANTS.LOCAL_DESKTOP_STT_TRANSCRIBE_URL, {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const data = (await res.json()) as { text?: string };
          text = data.text?.trim() ?? '';
        }
      } catch (e) {
        console.warn('[ConversationalMode] WAV fallback STT failed', e);
      }
    }

    return text;
  }, [abandonDesktopSttSession]);

  const {
    audioTranscription,
    setAudioTranscription,
    audioTranscriptionRef,
    commitTranscript,
    resetTranscriptState,
  } = useTranscriptManager({
    onTranscriptionComplete,
    startRecording: () => startRecordingRef.current(),
    setAudioStatus,
    audioStatusRef,
  });

  // Listen for transcription from socket
  useEffect(() => {
    if (!socket) return;

    const onTranscription = async ({ text, partial }: { text: string; partial?: boolean }) => {
      if (partial === true) {
        if (audioStatusRef.current !== 'listening') return;
        setAudioTranscription(text);
        return;
      }

      voiceObs('conversational', 'socket_final_transcription', { charCount: text.trim().length });
      await commitTranscript(text, { audioBlobBytes: lastFinalizeAudioBlobBytesRef.current });
    };

    const onPartialIdle = () => {
      partialTranscriptionInFlightRef.current = false;
    };

    const onError = (err: { message: string }) => {
      console.error('[ConversationalMode] WebSocket Error:', err.message);
      const tr = audioTranscriptionRef.current;
      const st = audioStatusRef.current;
      if (tr.trim() && st === 'transcribing') {
        console.log('[ConversationalMode] Falling back to local transcript');
        void commitTranscript(tr, { audioBlobBytes: lastFinalizeAudioBlobBytesRef.current });
        return;
      }
      partialTranscriptionInFlightRef.current = false;
      setAudioTranscription("");
      setAudioStatus('listening');
      startRecordingRef.current();
    };

    // Electron: the Mojo pipe error (chunked_data_pipe_upload_data_stream Error -2)
    // silently drops the WebSocket mid-send. The server-side `finally` emits
    // audio:partialIdle but the client is already gone, so the in-flight lock
    // never resets. Clear it immediately on disconnect so the next reconnect
    // tick can fire without waiting for the stale-lock auto-reset.
    const onDisconnect = (reason: string) => {
      console.warn('[ConversationalMode] Socket disconnected:', reason, '— resetting in-flight lock');
      voiceObs('conversational', 'socket_disconnect', { reason });
      partialTranscriptionInFlightRef.current = false;
      socketChunkSendChainRef.current = Promise.resolve(undefined);
    };

    socket.on('audio:transcription', onTranscription);
    socket.on('audio:partialIdle', onPartialIdle);
    socket.on('audio:error', onError);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('audio:transcription', onTranscription);
      socket.off('audio:partialIdle', onPartialIdle);
      socket.off('audio:error', onError);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket, commitTranscript]);

  // Handle connection/disconnection
  useEffect(() => {
    if (isAudioMode) {
      voiceObs('conversational', 'socket_connect_requested', {});
      connect();
      return () => {
        voiceObs('conversational', 'socket_disconnect_requested', { source: 'cleanup' });
        disconnect();
      };
    }
  }, [isAudioMode, connect, disconnect]);

  const {
    isRecording,
    volume,
    startRecording,
    stopRecording,
    peekRecordingBlob,
    playAISpeech,
    speakTextNative,
    stopAISpeech,
    analyzer,
    isNativeSpeechActive,
    streamFlushPendingRef,
  } = useAudioEngine({
    onLiveTranscript: useCallback((text: string, isFinal?: boolean) => {
      // Priority: use native browser STT if available (fluid/instant)
      if (audioStatusRef.current !== 'listening') return;
      setAudioTranscription(text);
      if (isFinal) {
        nativeFinalTranscriptRef.current = text;
      }
    }, []),
    onAudioChunk: useCallback((blob: Blob) => {
      if (peerMicSuppressRef?.current) {
        voiceObs('conversational', 'chunk_suppressed_peer_mic', { bytes: blob.size });
        return;
      }
      const s = socketRef.current;
      // Browser (unchanged): stream WebM chunks to cloud /audio socket when native STT is off.
      if (!isAigeniusDesktopRuntime() && s?.connected && !isNativeSpeechActive) {
        socketChunkSendChainRef.current = socketChunkSendChainRef.current
          .catch(() => undefined)
          .then(async () => {
            const sock = socketRef.current;
            if (!sock?.connected) return;
            const buffer = await blob.arrayBuffer();
            sock.emit('audio:chunk', buffer);
          });
        return;
      }

      // Desktop (Electron): HTTP /stt/stream/* only — same pipeline as dictation.
      if (isAigeniusDesktopRuntime()) {
        void blob.arrayBuffer().then(async (buffer) => {
          if (!desktopSessionIdRef.current) {
            if (!desktopSessionStartRef.current) {
              desktopSessionStartRef.current = (async () => {
                try {
                  const res = await authorizedFetch(AUDIO_CONSTANTS.LOCAL_DESKTOP_STT_STREAM_START_URL, { method: 'POST' });
                  if (res.ok) {
                    const data = await res.json() as { sessionId: string };
                    desktopSessionIdRef.current = data.sessionId;
                    partialFlushErrorCountRef.current = 0;
                    voiceObs('conversational', 'desktop_stt_session_started', {
                      sessionIdPrefix: data.sessionId.slice(0, 8),
                    });
                    return data.sessionId;
                  }
                } catch (e) {
                  console.error('[ConversationalMode] Failed to start desktop STT session:', e);
                }
                return null;
              })();
            }
            await desktopSessionStartRef.current;
          }

          const sid = desktopSessionIdRef.current;
          if (!sid) return;

          try {
            await authorizedFetch(AUDIO_CONSTANTS.LOCAL_DESKTOP_STT_STREAM_CHUNK_URL, {
              method: 'POST',
              headers: { 'X-Session-ID': sid },
              body: buffer,
            });
          } catch (e) {
            console.warn('[ConversationalMode] Failed to send desktop STT chunk:', e);
          }
        });
      }
    }, [peerMicSuppressRef]),
    onSilence: useCallback(async (blob: Blob) => {
      if (peerMicSuppressRef?.current) {
        voiceObs('conversational', 'silence_peer_suppressed', { blobBytes: blob.size });
        setAudioStatus('listening');
        startRecordingRef.current();
        return;
      }

      if (blob.size === 0) {
        voiceObs('conversational', 'silence_vad_no_speech', {});
        setAudioStatus('listening');
        startRecordingRef.current();
        return;
      }

      lastFinalizeAudioBlobBytesRef.current = blob.size;

      // Browser Fallback Optimization: Use Google API result if available
      if (!isAigeniusDesktopRuntime() && isNativeSpeechActive && nativeFinalTranscriptRef.current) {
        const text = nativeFinalTranscriptRef.current;
        nativeFinalTranscriptRef.current = ""; // Reset for next turn
        voiceObs('conversational', 'silence_finalize_native', { blobBytes: blob.size, textChars: text.length });
        await commitTranscript(text, { audioBlobBytes: blob.size });
        return;
      }

      // Desktop (Electron): finalize via HTTP stream (+ VAD WAV fallback).
      if (isAigeniusDesktopRuntime()) {
        voiceObs('conversational', 'silence_desktop_finalize', {
          blobBytes: blob.size,
          hasSession: Boolean(desktopSessionIdRef.current),
        });
        setAudioStatus('transcribing');
        const text = await finalizeDesktopStt(blob);
        if (text) {
          await commitTranscript(text, { audioBlobBytes: blob.size });
          return;
        }
      }

      // Browser (unchanged): finalize via cloud /audio socket.
      const s = socketRef.current;
      if (s?.connected) {
        voiceObs('conversational', 'silence_finalize_socket', { blobBytes: blob.size });
        setAudioStatus('transcribing');

        await socketChunkSendChainRef.current.catch(() => undefined);
        socketChunkSendChainRef.current = Promise.resolve(undefined);

        const sock = socketRef.current;
        if (sock?.connected) {
          const buffer = await blob.arrayBuffer();
          sock.emit('audio:finalize', buffer);
        }
        return;
      }
      voiceObs('conversational', 'silence_restart_listening', { blobBytes: blob.size });
      setAudioStatus('listening');
      startRecordingRef.current();
    }, [peerMicSuppressRef, commitTranscript, finalizeDesktopStt]),
    onInterruption: useCallback(() => {
      onBargeInRef.current?.();
      abandonDesktopSttSession();

      // Instantly send interruption signal to backend to clear queued synthesis
      const s = socketRef.current;
      if (s?.connected) {
        console.log('[ConversationalMode] Sending audio:interrupt event to server...');
        s.emit('audio:interrupt');
      }

      interruptedUntilRef.current = Date.now() + AUDIO_CONSTANTS.INTERRUPTION_LOCKOUT_MS;
      setAudioStatus('interrupted');
      setAudioNotice('You interrupted — generation was stopped.');

      partialTranscriptionInFlightRef.current = false;
      stopRecordingRef.current();
      setTimeout(() => {
        if (isAudioMode) startRecordingRef.current();
      }, 50);
    }, [isAudioMode, abandonDesktopSttSession]),
    onAssistantPlaybackEnded: useCallback(() => {
      if (!isAudioMode) return;
      if (Date.now() < interruptedUntilRef.current) return;
      setAudioTranscription("");
      startRecordingRef.current();
    }, [isAudioMode]),
    onStatusChange: useCallback((status: AudioStatus) => {
      if (status === 'listening' && Date.now() < interruptedUntilRef.current) {
        return;
      }
      setAudioStatus(status);
      if (status !== 'interrupted') {
        setAudioNotice("");
      }
    }, []),
    neuralVad: isAigeniusDesktopRuntime() ? true : (AUDIO_CONSTANTS.BROWSER_STT_ENGINE === 'cloud'),
  });

  useEffect(() => {
    startRecordingRef.current = startRecording;
  }, [startRecording]);

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  useVoiceLoopMaintenance({
    isAudioMode,
    isRecording,
    isLoading,
    isStreaming,
    audioStatus,
    audioStatusRef,
    peerMicSuppressRef,
    desktopSessionIdRef,
    socketRef,
    startRecording: () => startRecordingRef.current(),
    setAudioTranscription,
  });

  const [isMiniMode, setIsMiniMode] = useState(false);

  const toggleAudioMode = useCallback((enabled: boolean) => {
    resetVoiceTraceSession();
    voiceObs('conversational', 'toggle_audio_mode', { enabled });
    setIsAudioMode(enabled);
    setAudioNotice("");
    if (enabled) {
      resetTranscriptState();
      onEnterAudioMode?.();
      partialTranscriptionInFlightRef.current = false;
      partialFlushErrorCountRef.current = 0;
      nativeFinalTranscriptRef.current = "";
      setAudioStatus('listening');
      startRecording();
    } else {
      partialTranscriptionInFlightRef.current = false;
      partialFlushErrorCountRef.current = 0;
      stopRecordingRef.current();
      stopAISpeech();
      resetTranscriptState();
      setAudioStatus('listening');
      interruptedUntilRef.current = 0;
      abandonDesktopSttSession();
    }
  }, [startRecording, stopAISpeech, onEnterAudioMode, abandonDesktopSttSession]);

  const toggleMiniMode = useCallback(() => {
    setIsMiniMode(prev => !prev);
  }, []);

  return {
    isAudioMode,
    audioTranscription,
    audioStatus,
    audioNotice,
    audioVolume: volume,
    toggleAudioMode,
    isMiniMode,
    toggleMiniMode,
    playAISpeech,
    speakTextNative,
    stopAISpeech,
    volume,
    socket,
    analyzer,
    isConversationalRecording: isRecording,
    streamFlushPendingRef,
  };
}
