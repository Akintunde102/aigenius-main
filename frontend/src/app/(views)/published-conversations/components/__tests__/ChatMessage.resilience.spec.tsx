/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('../TextMessage', () => ({
  TextMessage: () => {
    throw new Error('text render failed');
  },
}));

import { ChatMessage } from '../ChatMessage';

describe('published ChatMessage resilience', () => {
  const realError = console.error;

  beforeEach(() => {
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = realError;
  });

  it('contains a broken message body without removing the thread chrome', () => {
    render(
      <div>
        <p>thread still here</p>
        <ChatMessage
          msg={{
            id: 'm1',
            role: 'user',
            content: 'hello world',
            timestamp: Date.UTC(2026, 9, 6, 12, 0, 0),
          }}
          idx={0}
          selectedModel={null}
          showCosts={false}
          onSave={() => undefined}
          onCopy={() => undefined}
          onReplay={() => undefined}
          onImagePreview={() => undefined}
          imagePreview={null}
          setImagePreview={() => undefined}
          formatCost={() => ''}
        />
      </div>,
    );

    expect(screen.getByText('thread still here')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('This message could not be shown.');
  });
});
