import { useCallback } from 'react';
import type { AudioStatus } from './audioMode.utils';
import type { UseAudioEngineOptions } from './useAudioEngine.types';

export function useAudioEnginePlayback(deps: {
  optionsRef: React.MutableRefObject<UseAudioEngineOptions>;
  audioQueueRef: React.MutableRefObject<AudioBuffer[]>;
  isPlayingRef: React.MutableRefObject<boolean>;
  gainNodeRef: React.MutableRefObject<GainNode | null>;
  currentSourceRef: React.MutableRefObject<AudioBufferSourceNode | null>;
  nativeUtteranceQueueRef: React.MutableRefObject<Set<SpeechSynthesisUtterance>>;
  isDuckedRef: React.MutableRefObject<boolean>;
  duckingTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  streamFlushPendingRef: React.MutableRefObject<boolean>;
  sharedContextRef: React.MutableRefObject<AudioContext | null>;
  pauseMicForAssistantPlaybackRef: React.MutableRefObject<() => void>;
  resumeMicAfterAssistantPlaybackRef: React.MutableRefObject<() => void>;
  statusRef: React.MutableRefObject<AudioStatus>;
  playbackEpochRef: React.MutableRefObject<number>;
  nextBufferIndexRef: React.MutableRefObject<number>;
  expectedBufferIndexRef: React.MutableRefObject<number>;
  decodedBuffersMapRef: React.MutableRefObject<Map<number, AudioBuffer>>;
  getSharedContext: () => Promise<AudioContext>;
  setStatus: (s: AudioStatus) => void;
}) {
  const {
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
  } = deps;

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

  return { stopAISpeech, processQueue, playAISpeech, speakTextNative };
}
