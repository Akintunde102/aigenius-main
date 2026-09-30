import { renderHook } from '@testing-library/react';
import { useSentenceStreaming } from '../useSentenceStreaming';

jest.mock('@/lib/utils/desktop-runtime', () => ({
  isAigeniusDesktopRuntime: () => false,
}));

jest.mock('../audio.constants', () => {
  const actual = jest.requireActual('../audio.constants') as { AUDIO_CONSTANTS: Record<string, unknown> };
  return {
    AUDIO_CONSTANTS: {
      ...actual.AUDIO_CONSTANTS,
      BROWSER_TTS_ENGINE: 'native',
    },
  };
});

describe('useSentenceStreaming native speech', () => {
  it('speaks a finished sentence when the cloud audio socket is disconnected', () => {
    const speakTextNative = jest.fn();
    const socket = { connected: false, emit: jest.fn(), on: jest.fn(), off: jest.fn() };

    const { rerender } = renderHook(
      (props: Parameters<typeof useSentenceStreaming>[0]) => useSentenceStreaming(props),
      {
        initialProps: {
          isAudioMode: true,
          isStreaming: true,
          assistantResponse: '',
          playAISpeech: jest.fn(),
          speakTextNative,
          socket: socket as never,
        },
      },
    );

    rerender({
      isAudioMode: true,
      isStreaming: true,
      assistantResponse: 'Hello from voice mode.',
      playAISpeech: jest.fn(),
      speakTextNative,
      socket: socket as never,
    });

    expect(speakTextNative).toHaveBeenCalledWith('Hello from voice mode.');
    expect(socket.emit).not.toHaveBeenCalled();
  });
});
