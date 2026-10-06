/** @jest-environment jsdom */

import {
  analyticsModelProps,
  classifyChatFailureReason,
  messageHasAttachments,
} from '@/lib/analytics/analytics-props.utils';

describe('analytics-props.utils', () => {
  it('extracts safe model metadata', () => {
    expect(analyticsModelProps({ id: 'openai/gpt-4o', ownedBy: 'openai' })).toEqual({
      model_id: 'openai/gpt-4o',
      provider: 'openai',
    });
  });

  it('detects structured attachments without message text', () => {
    expect(messageHasAttachments([
      { type: 'image_url', image_url: { url: 'https://example.com/a.png' } },
    ])).toBe(true);
  });

  it('classifies abort errors separately from wallet failures', () => {
    expect(classifyChatFailureReason({ name: 'AbortError' })).toBe('aborted');
    expect(classifyChatFailureReason(new Error('Insufficient wallet balance'))).toBe('insufficient_balance');
  });
});
