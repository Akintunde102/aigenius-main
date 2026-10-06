/**
 * @jest-environment jsdom
 *
 * A tool card that throws must stay inside the card. The page error screen
 * ("Something went wrong") is for errors above the chat, not a bad tool result.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('lucide-react', () => {
  return new Proxy(
    {},
    {
      get: () => () => null,
    },
  );
});

jest.mock('../DefaultToolStreamingCard', () => ({
  DefaultToolStreamingCard: function BrokenToolCard() {
    throw new Error('card blew up');
  },
}));

import ErrorBoundary from '@/app/components/ErrorBoundary';
import { ToolStreamingCard } from '../ToolStreamingCard';

describe('ToolStreamingCard when a tool view throws', () => {
  const realError = console.error;

  beforeEach(() => {
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = realError;
  });

  it('shows an inline error and leaves the chat mounted', () => {
    render(
      <ErrorBoundary>
        <div>
          <p>chat still here</p>
          <ToolStreamingCard
            streaming_tool={{
              tool: 'check_slug_availability',
              displayName: 'Check Slug',
              logs: [],
              loading: false,
              success: true,
            }}
            result={JSON.stringify({ success: true, slug: 'roi-calc', available: true })}
          />
        </div>
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Could not show this result.');
    expect(screen.getByText('chat still here')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Something went wrong' })).not.toBeInTheDocument();
  });
});
