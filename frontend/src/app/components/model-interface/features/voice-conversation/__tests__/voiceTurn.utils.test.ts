import type { SpeechRecognitionEventLike } from '../../chat/hooks/useAudioEngine.types';
import {
  nextConversationStatus,
  readRecognitionTranscript,
  shouldCommitConversationalUtterance,
  shouldListenForUser,
} from '../voiceTurn.utils';

function recognitionEvent(
  pieces: Array<{ transcript: string; isFinal: boolean }>,
  resultIndex = 0,
): SpeechRecognitionEventLike {
  const results = {
    length: pieces.length,
  } as SpeechRecognitionEventLike['results'];

  pieces.forEach((piece, index) => {
    results[index] = {
      isFinal: piece.isFinal,
      0: { transcript: piece.transcript },
    };
  });

  return { resultIndex, results };
}

describe('voice conversation turns', () => {
  it('reads the latest final transcript and ignores earlier finals', () => {
    const event = recognitionEvent([
      { transcript: 'older phrase', isFinal: true },
      { transcript: 'what is the weather', isFinal: true },
    ], 1);

    expect(readRecognitionTranscript(event)).toEqual({
      finalText: 'what is the weather',
      interimText: '',
    });
  });

  it('keeps an in-progress caption separate from a final utterance', () => {
    const event = recognitionEvent([
      { transcript: 'hello', isFinal: true },
      { transcript: 'there', isFinal: false },
    ]);

    expect(readRecognitionTranscript(event)).toEqual({
      finalText: 'hello',
      interimText: 'there',
    });
  });

  it('commits a real sentence and drops silence hallucinations', () => {
    expect(shouldCommitConversationalUtterance('What time is it?')).toBe(true);
    expect(shouldCommitConversationalUtterance('.')).toBe(false);
    expect(shouldCommitConversationalUtterance('yeah')).toBe(false);
    expect(shouldCommitConversationalUtterance('   ')).toBe(false);
  });

  it('shows speaking ahead of thinking, then listening when the turn is idle', () => {
    expect(nextConversationStatus({ isSpeaking: true, isBusy: true })).toBe('speaking');
    expect(nextConversationStatus({ isSpeaking: false, isBusy: true })).toBe('thinking');
    expect(nextConversationStatus({ isSpeaking: false, isBusy: false })).toBe('listening');
  });

  it('listens only while conversation mode is on and the assistant is idle', () => {
    expect(shouldListenForUser({
      isAudioMode: true,
      isSpeaking: false,
      isBusy: false,
    })).toBe(true);

    expect(shouldListenForUser({
      isAudioMode: true,
      isSpeaking: true,
      isBusy: false,
    })).toBe(false);

    expect(shouldListenForUser({
      isAudioMode: false,
      isSpeaking: false,
      isBusy: false,
    })).toBe(false);
  });
});
