import type { SpeechRecognitionEventLike } from '../chat/hooks/useAudioEngine.types';
import { isLikelyNoiseOnlyConversationalStt, type AudioStatus } from '../chat/hooks/audioMode.utils';

export function readRecognitionTranscript(event: SpeechRecognitionEventLike): {
  finalText: string;
  interimText: string;
} {
  let finalText = '';
  let interimText = '';

  for (let i = event.resultIndex; i < event.results.length; i += 1) {
    const piece = event.results[i]?.[0]?.transcript ?? '';
    if (event.results[i]?.isFinal) finalText += piece;
    else interimText += piece;
  }

  return {
    finalText: finalText.trim(),
    interimText: interimText.trim(),
  };
}

/** Drop silence hallucinations before they become a chat message. */
export function shouldCommitConversationalUtterance(text: string): boolean {
  return !isLikelyNoiseOnlyConversationalStt(text, 0);
}

export function nextConversationStatus(input: {
  isSpeaking: boolean;
  isBusy: boolean;
}): AudioStatus {
  if (input.isSpeaking) return 'speaking';
  if (input.isBusy) return 'thinking';
  return 'listening';
}

/** Mic stays off while the assistant is generating or speaking, so TTS is not transcribed back. */
export function shouldListenForUser(input: {
  isAudioMode: boolean;
  isSpeaking: boolean;
  isBusy: boolean;
}): boolean {
  return input.isAudioMode && !input.isSpeaking && !input.isBusy;
}
