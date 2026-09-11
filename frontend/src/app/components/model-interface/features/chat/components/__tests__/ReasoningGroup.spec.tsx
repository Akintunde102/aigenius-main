/**
 * @jest-environment jsdom
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { ReasoningGroup } from '../ReasoningGroup';

jest.mock('@/app/components/model-interface/shared/components', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => (
    <div data-testid="reasoning-markdown">{content}</div>
  ),
}));

jest.mock('../ReasoningGroup.module.scss', () => ({
  group: 'group',
  timeline: 'timeline',
  header: 'header',
  headerLabel: 'headerLabel',
  headerLabelActive: 'headerLabelActive',
  chevron: 'chevron',
  body: 'body',
  markdownWrap: 'markdownWrap',
}));

describe('ReasoningGroup', () => {
  afterEach(() => {
    cleanup();
  });

  it('stays expanded and labeled Thinking… while reasoning is loading', () => {
    render(
      <ReasoningGroup
        event={{ type: 'thinking', content: 'Plan the rename', loading: true, timestamp: 1 }}
        messageStreaming
      />,
    );

    expect(screen.getByRole('button', { name: /thinking/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('reasoning-markdown')).toHaveTextContent('Plan the rename');
  });

  it('collapses once thinking finishes even if the turn is still streaming', () => {
    const { rerender } = render(
      <ReasoningGroup
        event={{ type: 'thinking', content: 'Plan the rename', loading: true, timestamp: 1 }}
        messageStreaming
      />,
    );

    rerender(
      <ReasoningGroup
        event={{ type: 'thinking', content: 'Plan the rename', loading: false, timestamp: 1 }}
        messageStreaming
      />,
    );

    expect(screen.getByRole('button', { name: /thought/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('reasoning-markdown')).not.toBeInTheDocument();
  });

  it('does not keep the Thinking… label after loading ends just because the message is still streaming', () => {
    render(
      <ReasoningGroup
        event={{ type: 'thinking', content: 'Plan the rename', loading: false, timestamp: 1 }}
        messageStreaming
      />,
    );

    expect(screen.getByRole('button', { name: /thought/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /thinking/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('reasoning-markdown')).not.toBeInTheDocument();
  });
});
