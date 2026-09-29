import { act, renderHook } from '@testing-library/react';
import type { SpeechRecognitionLike } from '../../chat/hooks/useAudioEngine.types';
import { useVoiceConversation } from '../useVoiceConversation';

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

class FakeRecognition implements SpeechRecognitionLike {
  static instances: FakeRecognition[] = [];

  continuous = false;
  interimResults = false;
  lang = '';
  onresult: SpeechRecognitionLike['onresult'] = null;
  onerror: SpeechRecognitionLike['onerror'] = null;
  onend: SpeechRecognitionLike['onend'] = null;
  start = jest.fn();
  stop = jest.fn();

  constructor() {
    FakeRecognition.instances.push(this);
  }
}

describe('useVoiceConversation', () => {
  const speechWindow = window as SpeechWindow;
  const originalSpeechRecognition = speechWindow.SpeechRecognition;

  beforeEach(() => {
    FakeRecognition.instances = [];
    speechWindow.SpeechRecognition = FakeRecognition;
  });

  afterEach(() => {
    speechWindow.SpeechRecognition = originalSpeechRecognition;
  });

  it('sends a final utterance and ignores punctuation-only results', async () => {
    const onTranscriptionComplete = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useVoiceConversation({
      onTranscriptionComplete,
      isLoading: false,
      isStreaming: false,
      audioSession: { socket: null },
    }));

    act(() => {
      result.current.toggleAudioMode(true);
    });

    const recognition = FakeRecognition.instances[0];
    expect(recognition.start).toHaveBeenCalled();

    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: { isFinal: true, 0: { transcript: '.' } },
        },
      });
    });

    expect(onTranscriptionComplete).not.toHaveBeenCalled();

    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: { isFinal: true, 0: { transcript: 'Summarize this chat' } },
        },
      });
    });

    expect(onTranscriptionComplete).toHaveBeenCalledWith('Summarize this chat');
    expect(result.current.audioTranscription).toBe('Summarize this chat');
    expect(result.current.isAudioMode).toBe(true);
  });

  it('stops the microphone while a reply is in progress', () => {
    const { result, rerender } = renderHook(
      (props: { isStreaming: boolean }) => useVoiceConversation({
        onTranscriptionComplete: jest.fn().mockResolvedValue(undefined),
        isLoading: false,
        isStreaming: props.isStreaming,
        audioSession: { socket: null },
      }),
      { initialProps: { isStreaming: false } },
    );

    act(() => {
      result.current.toggleAudioMode(true);
    });

    const recognition = FakeRecognition.instances[0];
    recognition.start.mockClear();

    rerender({ isStreaming: true });

    expect(result.current.audioStatus).toBe('thinking');
    expect(recognition.stop).toHaveBeenCalled();
  });

  it('explains when speech recognition is missing', () => {
    delete speechWindow.SpeechRecognition;
    delete speechWindow.webkitSpeechRecognition;

    const { result } = renderHook(() => useVoiceConversation({
      onTranscriptionComplete: jest.fn().mockResolvedValue(undefined),
      isLoading: false,
      isStreaming: false,
      audioSession: { socket: null },
    }));

    act(() => {
      result.current.toggleAudioMode(true);
    });

    expect(result.current.audioNotice).toMatch(/not available/i);
    expect(result.current.isConversationalRecording).toBe(false);
  });
});
