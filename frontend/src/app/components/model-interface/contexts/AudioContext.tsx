"use client";
/**
 * AudioContext — optional wiring of STT / conversational mode / sentence TTS.
 * Must sit under {@link ChatOperationsProvider} (uses useChatOperationsContext).
 * Production chat mounts audio from {@link useModelInterface} instead; AllProviders does not include this tree.
 */

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useAudioSocket } from '../features/chat/hooks/useAudioSocket';
import { useAudioSTT } from '../features/chat/hooks/useAudioSTT';
import { useConversationalMode } from '../features/chat/hooks/useConversationalMode';
import { useSentenceStreaming } from '../features/chat/hooks/useSentenceStreaming';
import { useChatOperationsContext } from './ChatOperationsContext';
import { useChatContext } from './ChatContext';
import { AudioStatus } from '../features/chat/hooks/audioMode.utils';

export interface AudioContextValue {
  isAudioMode: boolean;
  audioTranscription: string;
  audioStatus: AudioStatus;
  audioNotice: string;
  audioVolume: number;
  handleAudioModeToggle: (enabled: boolean) => void;
  isMiniMode: boolean;
  handleMiniModeToggle: () => void;
  isSTTActive: boolean;
  handleStartSTT: () => void;
  isTranscribing: boolean;
  analyzer: AnalyserNode | null;
  exitDictation: () => void;
}

const AudioContext = createContext<AudioContextValue | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const {
    input,
    setInput,
    handleSend,
    handleStop,
    assistantResponse
  } = useChatOperationsContext();

  const { isLoading, isStreaming } = useChatContext();

  const audioSession = useAudioSocket();

  const {
    isSTTActive,
    isTranscribing,
    toggleSTT,
    exitDictation,
  } = useAudioSTT({
    input,
    setInput,
    socket: audioSession.socket,
  });

  const {
    isAudioMode,
    audioTranscription,
    audioStatus,
    audioNotice,
    audioVolume,
    toggleAudioMode,
    isMiniMode,
    toggleMiniMode,
    playAISpeech,
    speakTextNative,
    stopAISpeech,
    socket: audioSocket,
    analyzer,
    streamFlushPendingRef,
  } = useConversationalMode({
    onTranscriptionComplete: handleSend,
    isLoading: isLoading,
    isStreaming: isStreaming,
    audioSession,
    onEnterAudioMode: exitDictation,
    onBargeIn: handleStop,
  });

  useSentenceStreaming({
    isAudioMode,
    isStreaming,
    assistantResponse,
    playAISpeech,
    speakTextNative,
    socket: audioSocket,
    streamFlushPendingRef,
  });

  const handleStartSTT = useCallback(() => {
    if (isAudioMode) {
      toggleAudioMode(false);
    }
    toggleSTT();
  }, [isAudioMode, toggleAudioMode, toggleSTT]);

  const value = {
    isAudioMode,
    audioTranscription,
    audioStatus,
    audioNotice,
    audioVolume,
    handleAudioModeToggle: toggleAudioMode,
    isMiniMode,
    handleMiniModeToggle: toggleMiniMode,
    isSTTActive,
    handleStartSTT,
    isTranscribing,
    analyzer,
    exitDictation,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudioContext() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudioContext must be used within an AudioProvider');
  }
  return context;
}
