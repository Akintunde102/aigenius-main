import { useState, useCallback, useRef, useEffect } from 'react';
import type { MutableRefObject } from 'react';
import { authorizedFetch } from '@/lib/api/auth-client';
import { LINKS } from '@/lib/links';
import { useAudioEngine } from './useAudioEngine';
import { composeLiveVoiceDraft } from './audioMode.utils';
import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';

import { Socket } from 'socket.io-client';
import { AUDIO_CONSTANTS } from './audio.constants';
import { resetVoiceTraceSession, voiceObs } from './voiceObservability';

interface UseAudioSTTProps {
  input: string;
  setInput: (text: string) => void;
  onTranscriptionComplete?: (text: string) => void;
  socket: Socket | null;
  /** When true, do not emit mic chunks / partial flushes (conversational mode owns capture). */
  peerMicSuppressRef?: MutableRefObject<boolean>;
}

export function useAudioSTT({ input, setInput, onTranscriptionComplete, socket, peerMicSuppressRef }: UseAudioSTTProps) {
  const [isSTTActive, setIsSTTActive] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const voiceDraftBaseRef = useRef("");

  const partialTranscriptionInFlightRef = useRef(false);
  const desktopSessionIdRef = useRef<string | null>(null);
  /** Mutex: only one session-start HTTP call in-flight at a time. All concurrent chunks await this. */
  const desktopSessionStartRef = useRef<Promise<string | null> | null>(null);
  /** Count consecutive partial-flush errors so we stop hammering a broken file. */
  const partialFlushErrorCountRef = useRef(0);
  /**
   * Serialize `audio:chunk` sends so WebM segments stay in recorder order on the server
   * (parallel `arrayBuffer()` completions can reorder chunks → invalid file → STT failures).
   */
  const socketChunkSendChainRef = useRef(Promise.resolve<void>(undefined));

  useEffect(() => {
    if (!isSTTActive) {
      socketChunkSendChainRef.current = Promise.resolve(undefined);
    }
  }, [isSTTActive]);

  const {
    isRecording,
    startRecording,
    stopRecording,
  } = useAudioEngine({
    onLiveTranscript: useCallback((text: string) => {
      // Browser-native STT (webkitSpeechRecognition)
      setInput(composeLiveVoiceDraft(voiceDraftBaseRef.current, text));
    }, [setInput]),
    onAudioChunk: useCallback((blob: Blob) => {
      if (peerMicSuppressRef?.current) {
        voiceObs('dictation', 'chunk_suppressed_peer_mic', { bytes: blob.size });
        return;
      }
      // Web/Remote: Stream to socket every 250ms
      if (isSTTActive && socket?.connected) {
        socketChunkSendChainRef.current = socketChunkSendChainRef.current
          .catch(() => undefined)
          .then(async () => {
            if (!socket?.connected) return;
            const buffer = await blob.arrayBuffer();
            socket.emit('audio:chunk', buffer);
          });
        return;
      }

      // Desktop: Stream to local sidecar
      if (isSTTActive && isAigeniusDesktopRuntime()) {
        void blob.arrayBuffer().then(async (buffer) => {
          // Ensure exactly one session-start is in-flight — concurrent chunks share the same promise.
          if (!desktopSessionIdRef.current) {
            if (!desktopSessionStartRef.current) {
              desktopSessionStartRef.current = (async () => {
                try {
                  const res = await authorizedFetch(AUDIO_CONSTANTS.LOCAL_DESKTOP_STT_STREAM_START_URL, { method: 'POST' });
                  if (res.ok) {
                    const data = await res.json() as { sessionId: string };
                    desktopSessionIdRef.current = data.sessionId;
                    partialFlushErrorCountRef.current = 0;
                    voiceObs('dictation', 'desktop_stt_session_started', {
                      sessionIdPrefix: data.sessionId.slice(0, 8),
                    });
                    return data.sessionId;
                  }
                } catch (e) {
                  console.error('[AudioSTT] Failed to start desktop STT session:', e);
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
            console.warn('[AudioSTT] Failed to send desktop STT chunk:', e);
          }
        });
      }
    }, [isSTTActive, socket, peerMicSuppressRef]),
    onSilence: useCallback(async (blob: Blob) => {
      // Guard: conversational mode owns the mic — do not send a finalize that
      // would produce a ghost transcript in the conversational flow.
      if (peerMicSuppressRef?.current) {
        voiceObs('dictation', 'silence_peer_suppressed', { blobBytes: blob.size });
        return;
      }

      if (blob.size === 0) {
        voiceObs('dictation', 'silence_vad_empty', {});
        setIsTranscribing(false);
        setTimeout(() => {
          setIsSTTActive(false);
        }, 500);
        return;
      }

      // Web/Remote: Finalize via socket
      if (socket?.connected) {
        voiceObs('dictation', 'silence_finalize_socket', { blobBytes: blob.size });
        await socketChunkSendChainRef.current.catch(() => undefined);
        socketChunkSendChainRef.current = Promise.resolve(undefined);
        if (socket.connected) {
          const buffer = await blob.arrayBuffer();
          socket.emit('audio:finalize', buffer);
        }
        return;
      }

      setIsTranscribing(true);

      if (isAigeniusDesktopRuntime()) {
        const sid = desktopSessionIdRef.current;
        try {
          if (sid) {
            const res = await authorizedFetch(AUDIO_CONSTANTS.LOCAL_DESKTOP_STT_STREAM_TRANSCRIBE_URL, {
              method: 'POST',
              headers: { 'X-Session-ID': sid },
              body: JSON.stringify({ beam_size: 5 }),
            });

            // End session immediately after final transcription request starts
            desktopSessionIdRef.current = null;
            desktopSessionStartRef.current = null;
            partialFlushErrorCountRef.current = 0;
            void authorizedFetch(AUDIO_CONSTANTS.LOCAL_DESKTOP_STT_STREAM_END_URL, {
              method: 'POST',
              headers: { 'X-Session-ID': sid },
            });

            if (res.ok) {
              const data = (await res.json()) as { text?: string };
              const text = data.text?.trim() ?? '';
              if (text) {
                const finalDraft = composeLiveVoiceDraft(voiceDraftBaseRef.current, text);
                setInput(finalDraft);
                onTranscriptionComplete?.(text);
              }
            }
          } else if (blob.size > 0) {
            // Fallback to legacy single-upload if no session exists
            const formData = new FormData();
            const ext = blob.type.includes('wav') ? 'audio.wav' : 'audio.webm';
            formData.append('file', blob, ext);
            const res = await authorizedFetch(AUDIO_CONSTANTS.LOCAL_DESKTOP_STT_TRANSCRIBE_URL, {
              method: 'POST',
              body: formData,
            });
            if (res.ok) {
              const data = (await res.json()) as { text?: string };
              const text = data.text?.trim() ?? '';
              if (text) {
                const finalDraft = composeLiveVoiceDraft(voiceDraftBaseRef.current, text);
                setInput(finalDraft);
                onTranscriptionComplete?.(text);
              }
            }
          }
        } catch (e) {
          console.warn('[AudioSTT] Local finalize STT failed', e);
        } finally {
          setIsTranscribing(false);
          setTimeout(() => {
            setIsSTTActive(false);
          }, 500);
        }
        return;
      }

      // Web fallback
      try {
        const formData = new FormData();
        const ext = blob.type.includes('wav') ? 'audio.wav' : 'audio.webm';
        formData.append('file', blob, ext);

        const transcribeUrl = `${LINKS.noboxAPIRootUrl}/gateway/*/audio/transcribe`;

        const sttResponse = await authorizedFetch(
          transcribeUrl,
          { method: 'POST', body: formData },
        );

        if (!sttResponse.ok) throw new Error('STT failed');

        const { text } = await sttResponse.json();
        if (text.trim()) {
          const finalDraft = composeLiveVoiceDraft(voiceDraftBaseRef.current, text);
          setInput(finalDraft);
          onTranscriptionComplete?.(text);
        }
      } catch (err) {
        console.error('[AudioSTT] Transcription failed', err);
      } finally {
        setIsTranscribing(false);
        setTimeout(() => {
          setIsSTTActive(false);
        }, 500);
      }
    }, [socket, setInput, onTranscriptionComplete, peerMicSuppressRef]),
    neuralVad: isAigeniusDesktopRuntime() ? true : (AUDIO_CONSTANTS.BROWSER_STT_ENGINE === 'cloud'),
  });

  // Desktop socket transcription listener
  useEffect(() => {
    if (!socket) return;
    const onTranscription = ({ text, partial }: { text: string; partial?: boolean }) => {
      if (!isSTTActive) return;
      setInput(composeLiveVoiceDraft(voiceDraftBaseRef.current, text));
      if (partial === false) {
        setIsSTTActive(false);
      }
    };
    const onPartialIdle = () => {
      partialTranscriptionInFlightRef.current = false;
    };

    socket.on('audio:transcription', onTranscription);
    socket.on('audio:partialIdle', onPartialIdle);
    socket.on('disconnect', onPartialIdle);
    return () => {
      socket.off('audio:transcription', onTranscription);
      socket.off('audio:partialIdle', onPartialIdle);
      socket.off('disconnect', onPartialIdle);
    };
  }, [socket, isSTTActive, setInput]);

  // 2.5s Partial Flush Interval for Desktop STT
  useEffect(() => {
    if (!isSTTActive || !isRecording) return;

    const id = window.setInterval(() => {
      if (peerMicSuppressRef?.current) return;
      if (partialTranscriptionInFlightRef.current) {
        return;
      }

      if (isAigeniusDesktopRuntime()) {
        const sid = desktopSessionIdRef.current;
        if (!sid) return;
        // Back off after 3 consecutive errors on the same session to avoid hammering a broken file.
        if (partialFlushErrorCountRef.current >= 3) return;

        partialTranscriptionInFlightRef.current = true;
        void (async () => {
          try {
            const res = await authorizedFetch(AUDIO_CONSTANTS.LOCAL_DESKTOP_STT_STREAM_TRANSCRIBE_URL, {
              method: 'POST',
              headers: { 'X-Session-ID': sid },
              body: JSON.stringify({ beam_size: 1 }), // Fast partial
            });
            if (res.ok) {
              partialFlushErrorCountRef.current = 0;
              const data = (await res.json()) as { text?: string };
              const text = data.text?.trim() ?? '';
              if (text && isSTTActive) {
                setInput(composeLiveVoiceDraft(voiceDraftBaseRef.current, text));
              }
            } else {
              partialFlushErrorCountRef.current += 1;
            }
          } catch (e) {
            console.warn('[AudioSTT] Local STT partial failed', e);
            partialFlushErrorCountRef.current += 1;
          } finally {
            partialTranscriptionInFlightRef.current = false;
          }
        })();
        return;
      }

      if (!socket?.connected) return;

      partialTranscriptionInFlightRef.current = true;
      socket.emit('audio:partialFlush');
    }, AUDIO_CONSTANTS.PARTIAL_TRANSCRIPTION_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [isSTTActive, isRecording, socket, setInput, peerMicSuppressRef]);

  const toggleSTT = useCallback(() => {
    if (isRecording) {
      voiceObs('dictation', 'toggle_off', {});
      resetVoiceTraceSession();
      stopRecording();
      setIsSTTActive(false);
    } else {
      resetVoiceTraceSession();
      voiceObs('dictation', 'toggle_on', {});
      voiceDraftBaseRef.current = input;
      startRecording();
      setIsSTTActive(true);
    }
  }, [input, isRecording, startRecording, stopRecording]);

  /** End dictation without toggling — used when entering conversational mode. */
  const exitDictation = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
    const abandonedSid = desktopSessionIdRef.current;
    voiceObs('dictation', 'exit_dictation', { hadDesktopSession: Boolean(abandonedSid) });
    resetVoiceTraceSession();
    // Abandon any in-progress desktop session so the next dictation starts clean.
    desktopSessionIdRef.current = null;
    desktopSessionStartRef.current = null;
    partialFlushErrorCountRef.current = 0;
    if (abandonedSid && isAigeniusDesktopRuntime()) {
      void authorizedFetch(AUDIO_CONSTANTS.LOCAL_DESKTOP_STT_STREAM_END_URL, {
        method: 'POST',
        headers: { 'X-Session-ID': abandonedSid },
      }).catch(() => { /* best-effort cleanup */ });
    }
    setIsSTTActive(false);
    setIsTranscribing(false);
  }, [isRecording, stopRecording]);

  return {
    isSTTActive,
    isTranscribing,
    isRecording,
    toggleSTT,
    exitDictation,
  };
}
