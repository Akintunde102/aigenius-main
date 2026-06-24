import { AUDIO_CONSTANTS } from './audio.constants';

export type AudioStatus =
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'interrupted';

export function composeLiveVoiceDraft(baseText: string, transcript: string): string {
  const cleanBase = baseText.trimEnd();
  const cleanTranscript = transcript.trim();

  if (!cleanTranscript) return cleanBase;
  if (!cleanBase) return cleanTranscript;

  return `${cleanBase} ${cleanTranscript}`;
}

export function buildConversationalReport(text: string): string {
  // UPDATED: No longer summarizing - return full streaming text for TTS
  // Desktop pocketTTS will read the complete response as it streams
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized;
}

/** Avoid a typo-prone single literal (`redacted_thinking` vs `redacted_thinking`). */
const REDACTED_THINKING_TAG = 'redacted' + '_' + 'thinking';
const THINKING_BLOCK_TAGS = [REDACTED_THINKING_TAG, 'thinking', 'reasoning'] as const;

/** Strips one outer `<tagName ...>...</tagName>` block per iteration (attributes on the open tag allowed). */
function stripOuterTaggedBlock(text: string, tagName: string): string {
  const openPrefix = `<${tagName}`;
  const closeTag = `</${tagName}>`;
  let out = text;
  while (true) {
    const start = out.toLowerCase().indexOf(openPrefix.toLowerCase());
    if (start === -1) break;
    const openEnd = out.indexOf('>', start);
    if (openEnd === -1) break;
    const closeIdx = out.toLowerCase().indexOf(closeTag.toLowerCase(), openEnd + 1);
    if (closeIdx === -1) break;
    out = `${out.slice(0, start)}${out.slice(closeIdx + closeTag.length)}`;
  }
  return out;
}

/**
 * Whisper-class STT often emits a lone "." / "…" / punctuation on near-silence or room tone,
 * even when the WebM blob is several KB (above {@link AUDIO_CONSTANTS.MIN_LOCAL_PARTIAL_STT_BYTES}).
 */
function isSttPunctuationOnlyHallucination(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t.length > 12) return false;
  if (/[a-z0-9]/i.test(t)) return false;
  return /^[\s.,!?;:'"\u2026\u2013\u2014\-]+$/u.test(t);
}

/**
 * Very short STT outputs that often appear on silence / corrupt buffers (Whisper hallucinations).
 * Punctuation-only lines are dropped regardless of blob size; other patterns use byte threshold.
 */
export function isLikelyNoiseOnlyConversationalStt(text: string, audioBlobBytes: number): boolean {
  const t = text.trim();
  if (!t) return true;
  if (isSttPunctuationOnlyHallucination(t)) return true;
  if (t.length > 64) return false;
  if (audioBlobBytes >= AUDIO_CONSTANTS.MIN_LOCAL_PARTIAL_STT_BYTES) return false;
  return /^(thank you|thanks|thank you\.|thanks\.|mm+h?|hm+|mhm|uh\??|uh huh|yeah)\.?$/i.test(t);
}

/**
 * Removes model "thinking" fragments that sometimes arrive inside the normal content stream so TTS does not read them aloud.
 * Handles complete blocks and an incomplete trailing opener while streaming.
 */
export function stripNonSpeechContentForTTS(text: string): string {
  let out = text;
  for (const tag of THINKING_BLOCK_TAGS) {
    out = stripOuterTaggedBlock(out, tag);
  }

  const markers = [`<${REDACTED_THINKING_TAG}`, '<thinking', '<reasoning'] as const;
  let cut = -1;
  for (const m of markers) {
    const idx = out.toLowerCase().lastIndexOf(m.toLowerCase());
    if (idx > cut) cut = idx;
  }
  if (cut !== -1) {
    const tail = out.slice(cut);
    const looksClosed = /<\/(?:redacted_thinking|thinking|reasoning)>/i.test(tail);
    if (!looksClosed) {
      out = out.slice(0, cut);
    }
  }

  return out.replace(/\s+/g, ' ').trim();
}

export function getAudioStatusCopy(status: AudioStatus, isConversationalMode: boolean) {
  if (status === 'interrupted') {
    return {
      title: 'Interrupted',
      description: 'You spoke over the reply. Playback and generation were stopped.',
    };
  }

  if (status === 'transcribing') {
    return {
      title: 'Transcribing',
      description: isConversationalMode
        ? 'Turning your speech into a message.'
        : 'Adding your words to the input.',
    };
  }

  if (status === 'thinking') {
    return {
      title: 'Waiting',
      description: 'Your message is in the conversation. I am preparing the response.',
    };
  }

  if (status === 'speaking') {
    return {
      title: 'Speaking',
      description: 'Reading the response as it streams.',
    };
  }

  return {
    title: 'Listening',
    description: isConversationalMode
      ? 'Speak naturally. I will send it when you pause.'
      : 'Speak naturally. I will type it into the input.',
  };
}
