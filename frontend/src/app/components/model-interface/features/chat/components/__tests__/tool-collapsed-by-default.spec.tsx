/**
 * @jest-environment jsdom
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { DefaultToolStreamingCard } from '../DefaultToolStreamingCard';
import { LocalShellToolCard } from '../tool-ui/LocalShellToolCard';

jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

describe('tool cards stay collapsed until the user opens them', () => {
  afterEach(() => {
    cleanup();
  });

  it('DefaultToolStreamingCard does not show output while loading', () => {
    render(
      <DefaultToolStreamingCard
        streaming_tool={{
          tool: 'web_search',
          displayName: 'Web search',
          logs: [{ tag: 'info', message: 'Searching…' }],
          loading: true,
        }}
      />,
    );

    const toggle = screen.getByRole('button', { name: /web search/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Output')).not.toBeInTheDocument();
  });

  it('LocalShellToolCard does not expand terminal output while loading', () => {
    render(
      <LocalShellToolCard
        streaming_tool={{
          tool: 'local_shell',
          displayName: 'Local terminal',
          logs: [],
          loading: true,
          arguments: { command: 'echo hi' },
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /local terminal/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/running…/i)).toBeInTheDocument();
  });
});
