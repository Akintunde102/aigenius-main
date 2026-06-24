import { useEffect, useRef, useCallback, MutableRefObject } from 'react';
import { AUDIO_CONSTANTS } from './audio.constants';
import { stripNonSpeechContentForTTS } from './audioMode.utils';
import { voiceObs } from './voiceObservability';
import { Socket } from 'socket.io-client';
import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';
import { authorizedFetch } from '@/lib/api/auth-client';

interface UseSentenceStreamingProps {
  isAudioMode: boolean;
  isStreaming: boolean;
  assistantResponse: string;
  playAISpeech: (buffer: ArrayBuffer) => void;
  speakTextNative: (text: string) => void;
  stopAISpeech?: () => void;
  socket: Socket | null;
  /** Ref that, when set to true, prevents the audio engine from restoring the mic until the last TTS chunk is fully queued. */
  streamFlushPendingRef?: MutableRefObject<boolean>;
}

export function useSentenceStreaming({
  isAudioMode,
  isStreaming,
  assistantResponse,
  playAISpeech,
  speakTextNative,
  stopAISpeech,
  socket,
  streamFlushPendingRef,
}: UseSentenceStreamingProps) {
  /** Speakable-prefix length tracked as a string (see `.length`); only {@link stripNonSpeechContentForTTS} text is consumed for TTS. */
  const lastReportedTextRef = useRef("");
  /** Last stripped speakable stream while `isStreaming` — survives React batching when `streaming` and `assistantResponse` clear together. */
  const streamSpeechSnapshotRef = useRef("");
  /** Tracks `isStreaming` for end-of-stream flush only (declared before chunk effect so it runs first). */
  const prevIsStreamingForFlushRef = useRef(false);
  /** Tracks whether the chunk effect saw an active stream last time — detects new stream for ref resets. */
  const prevIsStreamingForChunkRef = useRef(false);
  const fetchChainRef = useRef<Promise<void>>(Promise.resolve());
  const requestEpochRef = useRef<number>(0);
  const partialSentenceTimerRef = useRef<NodeJS.Timeout | null>(null); // FIX: Add timeout for incomplete sentences

  // Listen for audio data from socket (browser / cloud conversational mode)
  useEffect(() => {
    if (!socket) return;

    const onAudioData = (buffer: ArrayBuffer) => {
      voiceObs('sentenceStreaming', 'audio:data', { bytes: buffer.byteLength });
      playAISpeech(buffer);
    };

    const onAudioError = (payload: { message?: string }) => {
      voiceObs('sentenceStreaming', 'audio:error', { message: payload?.message });
    };

    socket.on('audio:data', onAudioData);
    socket.on('audio:error', onAudioError);
    return () => {
      socket.off('audio:data', onAudioData);
      socket.off('audio:error', onAudioError);
    };
  }, [socket, playAISpeech]);

  const synthesizeNextReport = useCallback(async (text: string) => {
    const normalized = stripNonSpeechContentForTTS(text.replace(/\s+/g, ' ').trim());
    if (!normalized) return Promise.resolve();

    // ── Desktop (Electron): local HTTP TTS — separate from browser socket flow ──
    if (isAigeniusDesktopRuntime()) {
      const currentEpoch = requestEpochRef.current;

      const nextPromise = fetchChainRef.current.then(async () => {
        if (requestEpochRef.current !== currentEpoch) return; // interrupted before fetch

        try {
          voiceObs('sentenceStreaming', 'desktop_http_synthesize_begin', { charCount: normalized.length });
          const res = await authorizedFetch(AUDIO_CONSTANTS.LOCAL_DESKTOP_TTS_SYNTHESIZE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: normalized, voice: AUDIO_CONSTANTS.LOCAL_DESKTOP_TTS_VOICE }),
          });
          if (res.ok) {
            const buffer = await res.arrayBuffer();
            if (requestEpochRef.current !== currentEpoch) return; // interrupted during fetch

            if (buffer.byteLength > 0) {
              voiceObs('sentenceStreaming', 'desktop_http_synthesize_ok', { bytes: buffer.byteLength });
              playAISpeech(buffer);
            }
          } else {
            console.warn('[SentenceStreaming] Desktop HTTP TTS failed:', res.status);
          }
        } catch (err) {
          console.error('[SentenceStreaming] Desktop HTTP TTS error', err);
        }
      });

      fetchChainRef.current = nextPromise;
      return nextPromise;
    }

    // ── Browser (unchanged): cloud socket TTS + optional native speech API ──
    if (!socket?.connected) return Promise.resolve();

    try {
      if (
        typeof window !== 'undefined' &&
        AUDIO_CONSTANTS.BROWSER_TTS_ENGINE === 'native'
      ) {
        voiceObs('sentenceStreaming', 'native_synthesize_begin', { charCount: normalized.length });
        speakTextNative(normalized);
        return Promise.resolve();
      }

      console.log('[SentenceStreaming] Emitting audio:synthesize',
        JSON.stringify({
          normalizedText: normalized,
          charCount: normalized.length,
          socketConnected: socket.connected,
        }), null, 2);

      voiceObs('sentenceStreaming', 'audio:synthesize_emit', {
        normalizedText: normalized,
        charCount: normalized.length,
        socketConnected: socket.connected,
      });
      socket.emit('audio:synthesize', { text: normalized });
    } catch (err) {
      console.error('[SentenceStreaming] Synthesis emission failed', err);
    }
    return Promise.resolve();
  }, [socket, speakTextNative, playAISpeech]);

  // When a stream ends, flush TTS from snapshot (assistantResponse may already be '' in the same commit as streaming=false).
  useEffect(() => {
    if (!isAudioMode) {
      prevIsStreamingForFlushRef.current = false;
      return;
    }

    if (prevIsStreamingForFlushRef.current && !isStreaming) {
      if (partialSentenceTimerRef.current) {
        clearTimeout(partialSentenceTimerRef.current);
        partialSentenceTimerRef.current = null;
      }

      // Use assistantResponse directly from this effect's closure — it is the
      // final value captured when isStreaming just flipped to false. No setTimeout
      // needed; both effects run in the same React batch.
      const speechText = assistantResponse
        ? stripNonSpeechContentForTTS(assistantResponse)
        : streamSpeechSnapshotRef.current;

      const remainingText = speechText.slice(lastReportedTextRef.current.length).trim();

      if (remainingText) {
        // Gate mic restoration until this last chunk is added to the utterance queue.
        if (streamFlushPendingRef) streamFlushPendingRef.current = true;

        voiceObs('sentenceStreaming', 'end_stream_flush', {
          remainingChars: remainingText.length,
          snapshotChars: speechText.length,
          reportedPrefixChars: lastReportedTextRef.current.length,
        });
        synthesizeNextReport(remainingText).finally(() => {
          // The chunk is now queued in nativeUtteranceQueueRef — safe to allow mic restore.
          if (streamFlushPendingRef) streamFlushPendingRef.current = false;
        });
      }
      lastReportedTextRef.current = speechText;
    }

    prevIsStreamingForFlushRef.current = isStreaming;
  }, [isAudioMode, isStreaming, assistantResponse, streamFlushPendingRef, synthesizeNextReport]);

  // Watch for streaming text
  useEffect(() => {
    if (!isAudioMode) {
      if (partialSentenceTimerRef.current) {
        clearTimeout(partialSentenceTimerRef.current);
        partialSentenceTimerRef.current = null;
      }
      lastReportedTextRef.current = "";
      streamSpeechSnapshotRef.current = "";
      prevIsStreamingForChunkRef.current = false;
      prevIsStreamingForFlushRef.current = false;
      return;
    }

    if (!isStreaming) {
      if (partialSentenceTimerRef.current) {
        clearTimeout(partialSentenceTimerRef.current);
        partialSentenceTimerRef.current = null;
      }
      prevIsStreamingForChunkRef.current = false;
      return;
    }

    const streamJustStarted = !prevIsStreamingForChunkRef.current;
    if (streamJustStarted) {
      requestEpochRef.current += 1; // Bump epoch to discard queued fetches from old streams
      voiceObs('sentenceStreaming', 'stream_started', {});

      // Stop currently playing TTS and reset the playback queues instantly
      // so the new response starts on a clean slate!
      stopAISpeech?.();

      lastReportedTextRef.current = "";
      streamSpeechSnapshotRef.current = "";
      if (partialSentenceTimerRef.current) {
        clearTimeout(partialSentenceTimerRef.current);
        partialSentenceTimerRef.current = null;
      }
    }
    prevIsStreamingForChunkRef.current = true;

    if (!assistantResponse) {
      return;
    }

    const speechText = stripNonSpeechContentForTTS(assistantResponse);
    streamSpeechSnapshotRef.current = speechText;
    const newText = speechText.slice(lastReportedTextRef.current.length);

    // Multi-stage splitting: Standard punctuation OR aggressive comma splitting for long blocks
    const match = newText.match(AUDIO_CONSTANTS.SENTENCE_BOUNDARY_REGEX);
    let splitIndex = -1;

    if (match) {
      splitIndex = (match.index || 0) + match[0].length;
    } else if (newText.length > AUDIO_CONSTANTS.TTS_LONG_RUN_COMMA_AT) {
      const commaMatch = newText.slice(AUDIO_CONSTANTS.TTS_COMMA_SEARCH_MIN_NEW).indexOf(',');
      if (commaMatch !== -1) {
        splitIndex = AUDIO_CONSTANTS.TTS_COMMA_SEARCH_MIN_NEW + commaMatch + 1;
      }
    }

    if (splitIndex !== -1) {
      const sentenceToSynthesize = newText.slice(0, splitIndex).trim();

      if (sentenceToSynthesize) {
        if (partialSentenceTimerRef.current) {
          clearTimeout(partialSentenceTimerRef.current);
          partialSentenceTimerRef.current = null;
        }
        synthesizeNextReport(sentenceToSynthesize);
        lastReportedTextRef.current += newText.slice(0, splitIndex);
      }
    } else if (newText.trim().length > AUDIO_CONSTANTS.TTS_PARTIAL_MIN_CHARS) {
      if (!partialSentenceTimerRef.current) {
        partialSentenceTimerRef.current = setTimeout(() => {
          const pendingText = stripNonSpeechContentForTTS(assistantResponse)
            .slice(lastReportedTextRef.current.length)
            .trim();
          if (pendingText.length > AUDIO_CONSTANTS.TTS_PARTIAL_MIN_CHARS) {
            const lastSpace = pendingText.lastIndexOf(' ', 160);
            const textToSynthesize = lastSpace > AUDIO_CONSTANTS.TTS_PARTIAL_MIN_CHARS
              ? pendingText.slice(0, lastSpace)
              : pendingText.slice(0, 160);
            synthesizeNextReport(textToSynthesize);
            lastReportedTextRef.current += textToSynthesize;
          }
          partialSentenceTimerRef.current = null;
        }, AUDIO_CONSTANTS.TTS_PARTIAL_FLUSH_MS);
      }
    }
  }, [assistantResponse, isStreaming, isAudioMode, synthesizeNextReport]);

  // FIX: Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (partialSentenceTimerRef.current) {
        clearTimeout(partialSentenceTimerRef.current);
        partialSentenceTimerRef.current = null;
      }
    };
  }, []);
}
