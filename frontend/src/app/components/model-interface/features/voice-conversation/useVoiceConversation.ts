import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { getSpeechRecognitionConstructor } from './browserSpeech';
import { useBrowserSpeechPlayback } from './useBrowserSpeechPlayback';
import {
  nextConversationStatus,
  readRecognitionTranscript,
  shouldCommitConversationalUtterance,
  shouldListenForUser,
} from './voiceTurn.utils';
import type { SpeechRecognitionLike } from '../chat/hooks/useAudioEngine.types';

export interface VoiceConversationAudioSession {
  socket: Socket | null;
}

interface UseVoiceConversationProps {
  onTranscriptionComplete: (text: string) => Promise<void>;
  isLoading: boolean;
  isStreaming: boolean;
  audioSession: VoiceConversationAudioSession;
  onEnterAudioMode?: () => void;
}

const DUPLICATE_UTTERANCE_MS = 2000;

/**
 * Phone-mode conversation.
 * Listens with the browser speech API, sends the final utterance through chat,
 * and speaks the streamed reply. The mic is paused while the assistant talks.
 */
export function useVoiceConversation({
  onTranscriptionComplete,
  isLoading,
  isStreaming,
  audioSession,
  onEnterAudioMode,
}: UseVoiceConversationProps) {
  const [isAudioMode, setIsAudioMode] = useState(false);
  const [audioTranscription, setAudioTranscription] = useState('');
  const [audioNotice, setAudioNotice] = useState('');
  const [isMiniMode, setIsMiniMode] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);

  const playback = useBrowserSpeechPlayback();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const wantListenRef = useRef(false);
  const lastSentRef = useRef({ text: '', at: 0 });
  const onTranscriptionCompleteRef = useRef(onTranscriptionComplete);
  const onEnterAudioModeRef = useRef(onEnterAudioMode);

  const isBusy = isLoading || isStreaming;
  const shouldListen = shouldListenForUser({
    isAudioMode,
    isSpeaking: playback.isSpeaking,
    isBusy,
  });
  const audioStatus = isAudioMode
    ? nextConversationStatus({ isSpeaking: playback.isSpeaking, isBusy })
    : 'listening';

  useEffect(() => {
    onTranscriptionCompleteRef.current = onTranscriptionComplete;
  }, [onTranscriptionComplete]);

  useEffect(() => {
    onEnterAudioModeRef.current = onEnterAudioMode;
  }, [onEnterAudioMode]);

  useEffect(() => {
    wantListenRef.current = shouldListen;
  }, [shouldListen]);

  useEffect(() => {
    if (!isAudioMode) return;

    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setAudioNotice('Speech recognition is not available in this browser. Use Chrome or Edge.');
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const { finalText, interimText } = readRecognitionTranscript(event);
      setAudioTranscription(finalText || interimText);
      if (!finalText || !shouldCommitConversationalUtterance(finalText)) return;

      const now = Date.now();
      if (
        finalText === lastSentRef.current.text
        && now - lastSentRef.current.at < DUPLICATE_UTTERANCE_MS
      ) {
        return;
      }

      lastSentRef.current = { text: finalText, at: now };
      void onTranscriptionCompleteRef.current(finalText);
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setAudioNotice('Microphone permission was blocked.');
        wantListenRef.current = false;
        return;
      }
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      setAudioNotice('Speech recognition stopped. It will retry while conversation mode is on.');
    };

    recognition.onend = () => {
      if (!wantListenRef.current) return;
      window.setTimeout(() => {
        if (!wantListenRef.current) return;
        try {
          recognition.start();
        } catch {
          // InvalidStateError when start races with an existing session.
        }
      }, 200);
    };

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // Already stopped.
      }
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };
  }, [isAudioMode]);

  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition || !isAudioMode) return;

    if (shouldListen) {
      try {
        recognition.start();
        setIsRecognizing(true);
      } catch {
        // Already started.
      }
      return;
    }

    try {
      recognition.stop();
    } catch {
      // Already stopped.
    }
    setIsRecognizing(false);
  }, [shouldListen, isAudioMode]);

  const toggleAudioMode = useCallback((enabled: boolean) => {
    setAudioNotice('');
    setAudioTranscription('');
    lastSentRef.current = { text: '', at: 0 };
    if (enabled) {
      onEnterAudioModeRef.current?.();
      setIsAudioMode(true);
      return;
    }
    wantListenRef.current = false;
    playback.stopAISpeech();
    setIsRecognizing(false);
    setIsAudioMode(false);
  }, [playback]);

  const toggleMiniMode = useCallback(() => {
    setIsMiniMode((current) => !current);
  }, []);

  return {
    isAudioMode,
    audioTranscription,
    audioStatus,
    audioNotice,
    audioVolume: 0,
    toggleAudioMode,
    isMiniMode,
    toggleMiniMode,
    playAISpeech: playback.playAISpeech,
    speakTextNative: playback.speakTextNative,
    stopAISpeech: playback.stopAISpeech,
    volume: 0,
    socket: audioSession.socket,
    analyzer: null as AnalyserNode | null,
    isConversationalRecording: isRecognizing,
    streamFlushPendingRef: playback.streamFlushPendingRef,
  };
}
