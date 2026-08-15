import {
  isRuntimeContextUserMessage,
  isVisibleChatMessage,
  normalizeChatMessages,
} from '../messageContentUtils';

describe('runtime context message helpers', () => {
  const runtimeContext = {
    role: 'user' as const,
    content: '<runtime_context reported_at="2026-08-15T14:17:19.324Z">\nsurface: desktop\n</runtime_context>',
  };

  it('detects server-injected runtime_context user messages', () => {
    expect(isRuntimeContextUserMessage(runtimeContext)).toBe(true);
    expect(isRuntimeContextUserMessage({ role: 'user', content: 'Hello' })).toBe(false);
    expect(isRuntimeContextUserMessage({ role: 'assistant', content: '<runtime_context>' })).toBe(false);
  });

  it('treats runtime_context as non-visible in the transcript', () => {
    expect(isVisibleChatMessage(runtimeContext)).toBe(false);
    expect(isVisibleChatMessage({ role: 'system', content: 'Be helpful' })).toBe(false);
    expect(isVisibleChatMessage({ role: 'user', content: 'Hello' })).toBe(true);
  });

  it('strips runtime_context messages when normalizing loaded history', () => {
    const normalized = normalizeChatMessages([
      runtimeContext,
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' },
    ]);

    expect(normalized).toHaveLength(2);
    expect(normalized[0].content).toBe('Hello');
    expect(normalized[1].content).toBe('Hi');
  });
});
