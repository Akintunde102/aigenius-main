import {
  buildConversationalReport,
  composeLiveVoiceDraft,
  getAudioStatusCopy,
  stripNonSpeechContentForTTS,
} from '../audioMode.utils';

describe('audioMode utilities', () => {
  it('appends live voice transcript to an existing composer draft', () => {
    expect(composeLiveVoiceDraft('Draft intro', 'rough live words')).toBe(
      'Draft intro rough live words',
    );
  });

  it('uses only transcript when the composer is empty', () => {
    expect(composeLiveVoiceDraft('', 'rough live words')).toBe('rough live words');
  });

  it('returns full text without summarization for conversational mode', () => {
    const report = buildConversationalReport(
      'The workflow has been created and is ready to review. It includes three scheduled actions and a notification step.',
    );

    // Should return full text, not summarized
    expect(report).toBe('The workflow has been created and is ready to review. It includes three scheduled actions and a notification step.');
    expect(report).not.toContain('Short version:');
  });

  it('stripNonSpeechContentForTTS removes thinking blocks and incomplete trailing openers', () => {
    const rtOpen = '<' + 'redacted' + '_' + 'thinking' + '>';
    const rtClose = '</' + 'redacted' + '_' + 'thinking' + '>';
    expect(stripNonSpeechContentForTTS(`Hello. ${rtOpen}secret${rtClose} World.`)).toBe('Hello. World.');

    expect(stripNonSpeechContentForTTS('Answer only.<thinking>x</thinking> Done.')).toBe('Answer only. Done.');

    expect(stripNonSpeechContentForTTS('Start ' + '<' + 'redacted' + '_' + 'thinking')).toBe('Start');
  });

  it('shows interruption copy for conversational barge-in', () => {
    expect(getAudioStatusCopy('interrupted', true)).toEqual({
      title: 'Interrupted',
      description: 'You spoke over the reply. Playback and generation were stopped.',
    });
  });

  it('distinguishes conversational listening from voice draft listening', () => {
    expect(getAudioStatusCopy('listening', true).description).toBe(
      'Speak naturally. I will send it when you pause.',
    );
    expect(getAudioStatusCopy('listening', false).description).toBe(
      'Speak naturally. I will type it into the input.',
    );
  });
});
