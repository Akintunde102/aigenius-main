import { useState, useRef, useCallback } from 'react';
import { voiceObs } from './voiceObservability';
import { isLikelyNoiseOnlyConversationalStt } from './audioMode.utils';

interface UseTranscriptManagerProps {
  onTranscriptionComplete: (text: string) => Promise<void>;
  startRecording: () => void;
  setAudioStatus: (status: any) => void;
  audioStatusRef: React.MutableRefObject<any>;
}

export function useTranscriptManager({
  onTranscriptionComplete,
  startRecording,
  setAudioStatus,
  audioStatusRef,
}: UseTranscriptManagerProps) {
  const [audioTranscription, setAudioTranscription] = useState("");
  const audioTranscriptionRef = useRef("");
  const lastCommittedTranscriptRef = useRef<{ text: string; atMs: number }>({ text: "", atMs: 0 });
  const onTranscriptionCompleteRef = useRef(onTranscriptionComplete);

  // Sync refs
  onTranscriptionCompleteRef.current = onTranscriptionComplete;
  audioTranscriptionRef.current = audioTranscription;

  const commitTranscript = useCallback(async (
    rawText: string,
    opts?: { audioBlobBytes?: number },
  ) => {
    const text = rawText.trim();
    const blobBytes = opts?.audioBlobBytes ?? 0;

    if (!text) {
      voiceObs('conversational', 'commit_empty', { blobBytes });
      setAudioTranscription("");
      setAudioStatus('listening');
      startRecording();
      return;
    }

    if (isLikelyNoiseOnlyConversationalStt(text, blobBytes)) {
      console.warn('[TranscriptManager] Dropping likely noise-only transcript');
      voiceObs('conversational', 'commit_noise_filtered', { blobBytes, charCount: text.length });
      setAudioTranscription("");
      setAudioStatus('listening');
      startRecording();
      return;
    }

    const statusNow = audioStatusRef.current;
    if (statusNow !== 'listening' && statusNow !== 'transcribing') {
      console.warn('[TranscriptManager] Ignoring final transcription, not in listening/transcribing state:', statusNow);
      voiceObs('conversational', 'commit_wrong_status', { statusNow, charCount: text.length });
      return;
    }

    const last = lastCommittedTranscriptRef.current;
    const now = Date.now();
    if (last.text === text && now - last.atMs < 4500) {
      console.warn('[TranscriptManager] Dropping duplicate final transcript');
      voiceObs('conversational', 'commit_duplicate', { charCount: text.length, msSinceLast: now - last.atMs });
      setAudioStatus('listening');
      startRecording();
      return;
    }

    lastCommittedTranscriptRef.current = { text, atMs: now };
    setAudioTranscription(text);
    setAudioStatus('thinking');
    voiceObs('conversational', 'commit_send', { charCount: text.length, blobBytes });
    await onTranscriptionCompleteRef.current(text);
  }, [startRecording, setAudioStatus, audioStatusRef]);

  return {
    audioTranscription,
    setAudioTranscription,
    audioTranscriptionRef,
    commitTranscript,
    resetTranscriptState: useCallback(() => {
      setAudioTranscription("");
      audioTranscriptionRef.current = "";
      lastCommittedTranscriptRef.current = { text: "", atMs: 0 };
    }, []),
  };
}
