import { useEffect, useRef } from 'react';
import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';
import { authorizedFetch } from '@/lib/api/auth-client';
import { AUDIO_CONSTANTS } from './audio.constants';
import { voiceObs } from './voiceObservability';
import { AudioStatus } from './audioMode.utils';
import { Socket } from 'socket.io-client';

interface UseVoiceLoopMaintenanceProps {
  isAudioMode: boolean;
  isRecording: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  audioStatus: AudioStatus;
  audioStatusRef: React.MutableRefObject<AudioStatus>;
  peerMicSuppressRef?: React.MutableRefObject<boolean>;
  desktopSessionIdRef: React.MutableRefObject<string | null>;
  socketRef: React.MutableRefObject<Socket | null>;
  startRecording: () => void;
  setAudioTranscription: (text: string) => void;
  desktopChunkSendChainRef: React.MutableRefObject<Promise<void>>;
}

export function useVoiceLoopMaintenance({
  isAudioMode,
  isRecording,
  isLoading,
  isStreaming,
  audioStatus,
  audioStatusRef,
  peerMicSuppressRef,
  desktopSessionIdRef,
  socketRef,
  startRecording,
  setAudioTranscription,
  desktopChunkSendChainRef,
}: UseVoiceLoopMaintenanceProps) {
  const partialTranscriptionInFlightRef = useRef(false);
  const partialFlushErrorCountRef = useRef(0);

  // Periodic partial STT sync
  useEffect(() => {
    if (!isAudioMode || !isRecording) return;

    const id = window.setInterval(() => {
      if (peerMicSuppressRef?.current) return;
      if (audioStatusRef.current !== 'listening') return;

      if (partialTranscriptionInFlightRef.current) {
        return;
      }

      if (isAigeniusDesktopRuntime()) {
        const sid = desktopSessionIdRef.current;
        if (!sid) return;
        if (partialFlushErrorCountRef.current >= 3) return;

        partialTranscriptionInFlightRef.current = true;
        void (async () => {
          try {
            await desktopChunkSendChainRef.current.catch(() => undefined);
            const currentSid = desktopSessionIdRef.current;
            if (!currentSid || currentSid !== sid || audioStatusRef.current !== 'listening') return;

            const res = await authorizedFetch(AUDIO_CONSTANTS.LOCAL_DESKTOP_STT_STREAM_TRANSCRIBE_URL, {
              method: 'POST',
              headers: { 'X-Session-ID': currentSid },
              body: JSON.stringify({ beam_size: 1 }),
            });
            if (!res.ok) {
              partialFlushErrorCountRef.current += 1;
              return;
            }
            partialFlushErrorCountRef.current = 0;
            const data = (await res.json()) as { text?: string };
            const text = data.text?.trim() ?? '';
            if (text && audioStatusRef.current === 'listening') {
              setAudioTranscription(text);
            }
          } catch {
            partialFlushErrorCountRef.current += 1;
          } finally {
            partialTranscriptionInFlightRef.current = false;
          }
        })();
        return;
      }

      const s = socketRef.current;
      if (!s?.connected) return;
      partialTranscriptionInFlightRef.current = true;
      s.emit('audio:partialFlush');
      // Reset flight flag on socket emits immediately as we don't await response here
      partialTranscriptionInFlightRef.current = false;
    }, AUDIO_CONSTANTS.PARTIAL_TRANSCRIPTION_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [isAudioMode, isRecording, setAudioTranscription, socketRef, desktopSessionIdRef, audioStatusRef, peerMicSuppressRef]);

  // Loop recovery safety
  useEffect(() => {
    if (!isAudioMode) return;

    const isBusy = isLoading || isStreaming || audioStatus === 'speaking' || audioStatus === 'transcribing' || audioStatus === 'thinking';

    if (!isRecording && !isBusy) {
      const timer = setTimeout(() => {
        voiceObs('conversational', 'recovery_restart_mic', {});
        setAudioTranscription("");
        startRecording();
      }, AUDIO_CONSTANTS.RECOVERY_TIMEOUT_MS);
      return () => clearTimeout(timer);
    }
  }, [isAudioMode, isRecording, isLoading, isStreaming, audioStatus, startRecording, setAudioTranscription]);
}
