import React from 'react';
import { render } from '@testing-library/react';
import type { ChatMessage as ChatMessageType, Model } from '@/app/components/model-interface/shared/types';

jest.mock('@/app/components/model-interface/features/chat/components', () => ({
  TimeDivider: () => null,
}));

jest.mock('../ChatMessage', () => ({
  ChatMessage: jest.fn((props: { msg: { content: string } }) => (
    <div data-testid="inner-msg">{props.msg.content}</div>
  )),
}));

import { ChatMessageWrapper } from '../ChatMessageWrapper';
import { ChatMessage } from '../ChatMessage';

const model: Model = {
  id: 'm1',
  name: 'Test',
  description: 'd',
  context_length: 8192,
};

const baseMsg = (i: number): ChatMessageType => ({
  id: `id-${i}`,
  role: 'user',
  content: `Hello ${i}`,
  timestamp: 1_700_000_000_000 + i * 1000,
  modelId: 'm1',
  modelName: 'Test',
});

describe('ChatMessageWrapper', () => {
  const onDeleteMessage = jest.fn();
  const onSaveMessage = jest.fn();
  const onReplayMessage = jest.fn();
  const onCopy = jest.fn();
  const setImagePreview = jest.fn();

  beforeEach(() => {
    jest.mocked(ChatMessage).mockClear();
  });

  it('does not re-render ChatMessage when props are referentially stable (memo)', () => {
    const msg = baseMsg(0);
    const props = {
      msg,
      idx: 0,
      displayIdx: 0,
      prevVisibleMsg: undefined,
      isLastVisibleMessage: true,
      selectedModel: model,
      models: [model] as Model[],
      showCosts: false,
      showNaira: false,
      onDeleteMessage,
      onSaveMessage,
      onReplayMessage,
      onCopy,
      imagePreview: null as string | null,
      setImagePreview,
      loading: false,
      streaming: false,
    };
    const { rerender } = render(<ChatMessageWrapper {...props} />);
    expect(jest.mocked(ChatMessage)).toHaveBeenCalledTimes(1);
    rerender(<ChatMessageWrapper {...props} />);
    expect(jest.mocked(ChatMessage)).toHaveBeenCalledTimes(1);
  });

  it('re-renders ChatMessage when message content reference changes', () => {
    const msgA = baseMsg(1);
    const propsA = {
      msg: msgA,
      idx: 1,
      displayIdx: 0,
      prevVisibleMsg: undefined,
      isLastVisibleMessage: true,
      selectedModel: model,
      models: [model] as Model[],
      showCosts: false,
      showNaira: false,
      onDeleteMessage,
      onSaveMessage,
      onReplayMessage,
      onCopy,
      imagePreview: null as string | null,
      setImagePreview,
      loading: false,
      streaming: false,
    };
    const { rerender } = render(<ChatMessageWrapper {...propsA} />);
    expect(jest.mocked(ChatMessage)).toHaveBeenCalledTimes(1);
    const msgB = { ...msgA, content: 'Updated' };
    rerender(<ChatMessageWrapper {...propsA} msg={msgB} />);
    expect(jest.mocked(ChatMessage)).toHaveBeenCalledTimes(2);
  });
});
