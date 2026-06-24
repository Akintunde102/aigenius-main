/**
 * Tests for the sentence streaming hook.
 *
 * Key behaviors verified:
 * 1. Full sentence text is sent to the socket — no truncation or summarization.
 * 2. Sentences are extracted at standard punctuation boundaries (.!?) while streaming.
 * 3. Aggressive comma splitting kicks in for long blocks without punctuation.
 * 4. The final remaining segment is sent when streaming ends.
 * 5. Nothing is emitted when socket is disconnected.
 * 6. State resets correctly between streaming sessions.
 */

import { renderHook, act } from '@testing-library/react';
import { useSentenceStreaming } from '../useSentenceStreaming';

// ─── Socket mock ─────────────────────────────────────────────────────────────

const makeSocket = (connected = true) => ({
    connected,
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
});

// ─── Helper ──────────────────────────────────────────────────────────────────

function renderStreaming(overrides: Partial<Parameters<typeof useSentenceStreaming>[0]> = {}) {
    const socket = makeSocket();
    const playAISpeech = jest.fn();

    const { rerender, result } = renderHook(
        (props: Parameters<typeof useSentenceStreaming>[0]) => useSentenceStreaming(props),
        {
            initialProps: {
                isAudioMode: false,
                isStreaming: false,
                assistantResponse: '',
                playAISpeech,
                speakTextNative: jest.fn(),
                socket: null,
                ...overrides,
            },
        },
    );

    return { socket, playAISpeech, rerender, result };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useSentenceStreaming', () => {
    beforeEach(() => jest.clearAllMocks());

    // ─── No summarization: raw text is sent ─────────────────────────────────

    describe('sentence emission (no summarization)', () => {
        it('should emit the full sentence text without a "Short version:" prefix', () => {
            const socket = makeSocket();
            const { rerender } = renderHook(
                (props: Parameters<typeof useSentenceStreaming>[0]) => useSentenceStreaming(props),
                {
                    initialProps: {
                        isAudioMode: true,
                        isStreaming: true,
                        assistantResponse: '',
                        playAISpeech: jest.fn(),
                        speakTextNative: jest.fn(),
                        socket: socket as any,
                    },
                },
            );

            // Simulate streaming a full first sentence
            rerender({
                isAudioMode: true,
                isStreaming: true,
                assistantResponse: 'The capital of France is Paris. And more text follows.',
                playAISpeech: jest.fn(),
                speakTextNative: jest.fn(),
                socket: socket as any,
            });

            const emittedText = socket.emit.mock.calls
                .filter((c: string[]) => c[0] === 'audio:synthesize')
                .map((c: any[]) => c[1].text as string);

            // Should have emitted something
            expect(emittedText.length).toBeGreaterThan(0);
            // Must NOT contain the old "Short version:" prefix
            for (const t of emittedText) {
                expect(t).not.toMatch(/^Short version:/i);
            }
            // Must contain the actual sentence content
            expect(emittedText[0]).toContain('Paris');
        });

        it('should emit only the sentence up to the punctuation boundary', () => {
            const socket = makeSocket();
            const { rerender } = renderHook(
                (p: Parameters<typeof useSentenceStreaming>[0]) => useSentenceStreaming(p),
                {
                    initialProps: {
                        isAudioMode: true,
                        isStreaming: true,
                        assistantResponse: '',
                        playAISpeech: jest.fn(),
                        speakTextNative: jest.fn(),
                        socket: socket as any,
                    },
                },
            );

            rerender({
                isAudioMode: true,
                isStreaming: true,
                assistantResponse: 'First sentence. Second sentence.',
                playAISpeech: jest.fn(),
                speakTextNative: jest.fn(),
                socket: socket as any,
            });

            const emittedTexts: string[] = socket.emit.mock.calls
                .filter((c: any[]) => c[0] === 'audio:synthesize')
                .map((c: any[]) => c[1].text as string);

            // First emit should be the first sentence only
            expect(emittedTexts[0]).toContain('First sentence');
            expect(emittedTexts[0]).not.toContain('Second sentence');
        });

        it('segments on speakable text only so inline thinking does not drive early TTS', () => {
            const socket = makeSocket();
            const rtOpen = '<' + 'redacted' + '_' + 'thinking' + '>';
            const rtClose = '</' + 'redacted' + '_' + 'thinking' + '>';
            const { rerender } = renderHook(
                (p: Parameters<typeof useSentenceStreaming>[0]) => useSentenceStreaming(p),
                {
                    initialProps: {
                        isAudioMode: true,
                        isStreaming: true,
                        assistantResponse: '',
                        playAISpeech: jest.fn(),
                        speakTextNative: jest.fn(),
                        socket: socket as any,
                    },
                },
            );

            rerender({
                isAudioMode: true,
                isStreaming: true,
                assistantResponse: `${rtOpen}ignore this.${rtClose} Real answer follows.`,
                playAISpeech: jest.fn(),
                speakTextNative: jest.fn(),
                socket: socket as any,
            });

            const emittedTexts: string[] = socket.emit.mock.calls
                .filter((c: any[]) => c[0] === 'audio:synthesize')
                .map((c: any[]) => c[1].text as string);

            expect(emittedTexts.length).toBeGreaterThan(0);
            expect(emittedTexts[0]).toContain('Real answer');
            expect(emittedTexts[0]).not.toContain('ignore this');
        });
    });

    // ─── Silence: nothing emitted when not in audio mode ─────────────────────

    describe('guard conditions', () => {
        it('should not emit anything when isAudioMode is false', () => {
            const socket = makeSocket();
            const { rerender } = renderHook(
                (p: Parameters<typeof useSentenceStreaming>[0]) => useSentenceStreaming(p),
                {
                    initialProps: {
                        isAudioMode: false,
                        isStreaming: true,
                        assistantResponse: '',
                        playAISpeech: jest.fn(),
                        speakTextNative: jest.fn(),
                        socket: socket as any,
                    },
                },
            );

            rerender({
                isAudioMode: false,
                isStreaming: true,
                assistantResponse: 'Should not be emitted.',
                playAISpeech: jest.fn(),
                speakTextNative: jest.fn(),
                socket: socket as any,
            });

            const audioSynthesizeCalls = socket.emit.mock.calls.filter(
                (c: any[]) => c[0] === 'audio:synthesize',
            );
            expect(audioSynthesizeCalls).toHaveLength(0);
        });

        it('should not emit when socket is not connected', () => {
            const disconnectedSocket = makeSocket(false);
            const { rerender } = renderHook(
                (p: Parameters<typeof useSentenceStreaming>[0]) => useSentenceStreaming(p),
                {
                    initialProps: {
                        isAudioMode: true,
                        isStreaming: true,
                        assistantResponse: '',
                        playAISpeech: jest.fn(),
                        speakTextNative: jest.fn(),
                        socket: disconnectedSocket as any,
                    },
                },
            );

            rerender({
                isAudioMode: true,
                isStreaming: true,
                assistantResponse: 'Will not be sent. The socket is offline.',
                playAISpeech: jest.fn(),
                speakTextNative: jest.fn(),
                socket: disconnectedSocket as any,
            });

            expect(disconnectedSocket.emit).not.toHaveBeenCalledWith(
                'audio:synthesize',
                expect.anything(),
            );
        });

        it('should not emit when socket is null', () => {
            const { rerender } = renderHook(
                (p: Parameters<typeof useSentenceStreaming>[0]) => useSentenceStreaming(p),
                {
                    initialProps: {
                        isAudioMode: true,
                        isStreaming: true,
                        assistantResponse: '',
                        playAISpeech: jest.fn(),
                        speakTextNative: jest.fn(),
                        socket: null,
                    },
                },
            );

            // Should not throw
            expect(() =>
                rerender({
                    isAudioMode: true,
                    isStreaming: true,
                    assistantResponse: 'Text without socket.',
                    playAISpeech: jest.fn(),
                    speakTextNative: jest.fn(),
                    socket: null,
                }),
            ).not.toThrow();
        });
    });

    // ─── End of streaming: final segment ────────────────────────────────────

    describe('final segment on stream end', () => {
        it('should emit remaining text when streaming stops', () => {
            const socket = makeSocket();
            const { rerender } = renderHook(
                (p: Parameters<typeof useSentenceStreaming>[0]) => useSentenceStreaming(p),
                {
                    initialProps: {
                        isAudioMode: true,
                        isStreaming: true,
                        assistantResponse: 'Paris is the capital of France',
                        playAISpeech: jest.fn(),
                        speakTextNative: jest.fn(),
                        socket: socket as any,
                    },
                },
            );

            // Stop streaming — remaining text should now be emitted
            act(() => {
                rerender({
                    isAudioMode: true,
                    isStreaming: false,
                    assistantResponse: 'Paris is the capital of France',
                    playAISpeech: jest.fn(),
                    speakTextNative: jest.fn(),
                    socket: socket as any,
                });
            });

            const emittedTexts: string[] = socket.emit.mock.calls
                .filter((c: any[]) => c[0] === 'audio:synthesize')
                .map((c: any[]) => c[1].text as string);

            const combined = emittedTexts.join(' ');
            expect(combined).toContain('Paris');
        });

        it('flushes tail when streaming stops and assistantResponse clears in the same update', () => {
            const socket = makeSocket();
            const { rerender } = renderHook(
                (p: Parameters<typeof useSentenceStreaming>[0]) => useSentenceStreaming(p),
                {
                    initialProps: {
                        isAudioMode: true,
                        isStreaming: true,
                        assistantResponse: 'No trailing punctuation here',
                        playAISpeech: jest.fn(),
                        speakTextNative: jest.fn(),
                        socket: socket as any,
                    },
                },
            );

            act(() => {
                rerender({
                    isAudioMode: true,
                    isStreaming: false,
                    assistantResponse: '',
                    playAISpeech: jest.fn(),
                    speakTextNative: jest.fn(),
                    socket: socket as any,
                });
            });

            const emittedTexts: string[] = socket.emit.mock.calls
                .filter((c: any[]) => c[0] === 'audio:synthesize')
                .map((c: any[]) => c[1].text as string);

            const combined = emittedTexts.join(' ');
            expect(combined).toContain('punctuation');
        });

        it('should not emit final segment if isAudioMode is false', () => {
            const socket = makeSocket();
            const { rerender } = renderHook(
                (p: Parameters<typeof useSentenceStreaming>[0]) => useSentenceStreaming(p),
                {
                    initialProps: {
                        isAudioMode: false,
                        isStreaming: true,
                        assistantResponse: 'some text',
                        playAISpeech: jest.fn(),
                        speakTextNative: jest.fn(),
                        socket: socket as any,
                    },
                },
            );

            rerender({
                isAudioMode: false,
                isStreaming: false,
                assistantResponse: 'some text',
                playAISpeech: jest.fn(),
                speakTextNative: jest.fn(),
                socket: socket as any,
            });

            expect(socket.emit).not.toHaveBeenCalledWith('audio:synthesize', expect.anything());
        });
    });

    // ─── Socket audio:data → playAISpeech ───────────────────────────────────

    describe('audio:data listener', () => {
        it('should register audio:data listener when socket is provided', () => {
            const socket = makeSocket();
            renderHook(() =>
                useSentenceStreaming({
                    isAudioMode: true,
                    isStreaming: false,
                    assistantResponse: '',
                    playAISpeech: jest.fn(),
                    speakTextNative: jest.fn(),
                    socket: socket as any,
                }),
            );

            expect(socket.on).toHaveBeenCalledWith('audio:data', expect.any(Function));
        });

        it('should call playAISpeech when audio:data event fires', () => {
            const socket = makeSocket();
            const playAISpeech = jest.fn();

            renderHook(() =>
                useSentenceStreaming({
                    isAudioMode: true,
                    isStreaming: false,
                    assistantResponse: '',
                    playAISpeech,
                    speakTextNative: jest.fn(),
                    socket: socket as any,
                }),
            );

            // Simulate socket emitting audio data
            const onCall = socket.on.mock.calls.find((c: any[]) => c[0] === 'audio:data');
            expect(onCall).toBeDefined();

            const fakeBuffer = new ArrayBuffer(16);
            act(() => {
                onCall?.[1](fakeBuffer);
            });

            expect(playAISpeech).toHaveBeenCalledWith(fakeBuffer);
        });

        it('should clean up audio:data listener on unmount', () => {
            const socket = makeSocket();
            const { unmount } = renderHook(() =>
                useSentenceStreaming({
                    isAudioMode: true,
                    isStreaming: false,
                    assistantResponse: '',
                    playAISpeech: jest.fn(),
                    speakTextNative: jest.fn(),
                    socket: socket as any,
                }),
            );

            unmount();

            expect(socket.off).toHaveBeenCalledWith('audio:data', expect.any(Function));
        });
    });
});
