import { useCallback, useRef, useState } from 'react';

function preferredEnglishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.name.includes('Google US English') || voice.name.includes('Aria'))
    ?? voices.find((voice) => voice.lang.startsWith('en'))
  );
}

/**
 * Spoken replies for conversational mode.
 * Native `speechSynthesis` is the browser path. WAV buffers cover desktop HTTP TTS.
 */
export function useBrowserSpeechPlayback() {
  const utterancesRef = useRef<Set<SpeechSynthesisUtterance>>(new Set());
  const wavQueueRef = useRef<Promise<void>>(Promise.resolve());
  const epochRef = useRef(0);
  const streamFlushPendingRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const refreshSpeaking = useCallback((epoch: number) => {
    if (epoch !== epochRef.current) return;
    setIsSpeaking(utterancesRef.current.size > 0);
  }, []);

  const stopAISpeech = useCallback(() => {
    epochRef.current += 1;
    utterancesRef.current.clear();
    wavQueueRef.current = Promise.resolve();
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speakTextNative = useCallback((text: string) => {
    const normalized = text.trim();
    if (!normalized || typeof window === 'undefined' || !window.speechSynthesis) return;

    const epoch = epochRef.current;
    const utterance = new SpeechSynthesisUtterance(normalized);
    const voice = preferredEnglishVoice();
    if (voice) utterance.voice = voice;

    const finish = () => {
      utterancesRef.current.delete(utterance);
      if (streamFlushPendingRef.current) return;
      refreshSpeaking(epoch);
    };

    utterance.onend = finish;
    utterance.onerror = finish;
    utterancesRef.current.add(utterance);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [refreshSpeaking]);

  const playAISpeech = useCallback((buffer: ArrayBuffer) => {
    if (typeof window === 'undefined' || buffer.byteLength === 0) return;

    const epoch = epochRef.current;
    setIsSpeaking(true);

    wavQueueRef.current = wavQueueRef.current.then(async () => {
      if (epoch !== epochRef.current) return;
      const context = new AudioContext();
      try {
        const decoded = await context.decodeAudioData(buffer.slice(0));
        if (epoch !== epochRef.current) return;
        await new Promise<void>((resolve) => {
          const source = context.createBufferSource();
          source.buffer = decoded;
          source.connect(context.destination);
          source.onended = () => resolve();
          source.start();
        });
      } finally {
        await context.close().catch(() => undefined);
        if (epoch === epochRef.current && utterancesRef.current.size === 0) {
          setIsSpeaking(false);
        }
      }
    });
  }, []);

  return {
    isSpeaking,
    speakTextNative,
    playAISpeech,
    stopAISpeech,
    streamFlushPendingRef,
  };
}
