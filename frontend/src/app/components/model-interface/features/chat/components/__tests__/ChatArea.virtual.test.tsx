import React, { createRef } from 'react';
import { render, waitFor } from '@testing-library/react';
import { ChatArea } from '../ChatArea';
import type { ChatMessage as ChatMessageType, Model } from '@/app/components/model-interface/shared/types';

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const { ChatAreaVirtualizedList } = require('../ChatAreaVirtualizedList');
    return ChatAreaVirtualizedList;
  },
}));

jest.mock('@/app/components/model-interface/shared/hooks', () => ({
  useBrowserDetection: () => ({ isMobile: false }),
}));

jest.mock('../../../messages/components/ChatMessageWrapper', () => ({
  ChatMessageWrapper: ({
    msg,
    idx,
  }: {
    msg: ChatMessageType;
    idx: number;
  }) => (
    <div data-chat-message-index={idx} style={{ minHeight: 48 }}>
      {typeof msg.content === 'string' ? msg.content : ''}
    </div>
  ),
}));

jest.mock('../TypingIndicator', () => ({
  TypingIndicator: () => <div data-testid="typing-indicator" />,
}));

jest.mock('../EmptyState', () => ({
  EmptyState: () => <div data-testid="empty-state" />,
}));

beforeAll(() => {
  global.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
});

const model: Model = {
  id: 'm1',
  name: 'Test',
  description: 'd',
  context_length: 8192,
};

function buildMessages(n: number): ChatMessageType[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `msg-${i}`,
    role: 'user' as const,
    content: `Message body ${i} `.repeat(8).trim(),
    timestamp: 1_700_000_000_000 + i * 1000,
    modelId: 'm1',
    modelName: 'Test',
  }));
}

describe('ChatArea virtualization', () => {
  it('renders a tall virtual list spacer for many messages', async () => {
    const chat = buildMessages(48);
    const chatEndRef = createRef<HTMLDivElement>();
    const chatAreaRef = createRef<HTMLDivElement>();

    const { container } = render(
      <div style={{ height: 280, width: 400, overflow: 'hidden' }}>
        <ChatArea
          chat={chat}
          selectedModel={model}
          models={[model]}
          showCosts={false}
          showNaira={false}
          showTyping={false}
          loading={false}
          imagePreview={null}
          setImagePreview={jest.fn()}
          chatEndRef={chatEndRef}
          chatAreaRef={chatAreaRef}
          onDeleteMessage={jest.fn()}
          onSaveMessage={jest.fn()}
          onReplayMessage={jest.fn()}
        />
      </div>,
    );

    await waitFor(() => {
      const listSpacer = container.querySelector('.chat-area .w-full') as HTMLElement | null;
      expect(listSpacer).not.toBeNull();
      const totalPx = Number.parseInt(listSpacer!.style.height.replace('px', ''), 10);
      expect(Number.isFinite(totalPx)).toBe(true);
      expect(totalPx).toBeGreaterThan(chat.length * 80);
    });
  });

  it('shows empty state when chat is only system messages', () => {
    const chatEndRef = createRef<HTMLDivElement>();
    const chatAreaRef = createRef<HTMLDivElement>();
    const systemOnly: ChatMessageType[] = [
      {
        id: 'sys-1',
        role: 'system',
        content: 'hidden',
        timestamp: 1,
        modelId: 'm1',
        modelName: 'Test',
      },
    ];
    const { getByTestId } = render(
      <div style={{ height: 400 }}>
        <ChatArea
          chat={systemOnly}
          selectedModel={model}
          models={[model]}
          showCosts={false}
          showNaira={false}
          showTyping={false}
          loading={false}
          imagePreview={null}
          setImagePreview={jest.fn()}
          chatEndRef={chatEndRef}
          chatAreaRef={chatAreaRef}
          onDeleteMessage={jest.fn()}
          onSaveMessage={jest.fn()}
          onReplayMessage={jest.fn()}
        />
      </div>,
    );
    expect(getByTestId('empty-state')).toBeInTheDocument();
  });

  it('shows empty state when there are no user-visible messages', () => {
    const chatEndRef = createRef<HTMLDivElement>();
    const chatAreaRef = createRef<HTMLDivElement>();
    const { getByTestId } = render(
      <div style={{ height: 400 }}>
        <ChatArea
          chat={[]}
          selectedModel={model}
          models={[model]}
          showCosts={false}
          showNaira={false}
          showTyping={false}
          loading={false}
          imagePreview={null}
          setImagePreview={jest.fn()}
          chatEndRef={chatEndRef}
          chatAreaRef={chatAreaRef}
          onDeleteMessage={jest.fn()}
          onSaveMessage={jest.fn()}
          onReplayMessage={jest.fn()}
        />
      </div>,
    );
    expect(getByTestId('empty-state')).toBeInTheDocument();
  });
});
