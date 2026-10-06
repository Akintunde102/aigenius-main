/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TOOL_DISPLAY_NAMES } from '@/shared/tool-display-names';
import { ToolExecutionDisplay } from '../ToolExecutionDisplay';

const CHECK_SLUG = JSON.stringify({
  success: true,
  slug: 'roi-calc',
  available: true,
  normalized: 'roi-calc',
  suggestions: ['roi-calc-1'],
});

describe('ToolExecutionDisplay', () => {
  it('expands a Check Slug result without leaving the list', () => {
    render(
      <div>
        <p>chat still here</p>
        <ToolExecutionDisplay
          tool_executions={[
            {
              tool: 'check_slug_availability',
              arguments: { slug: 'roi-calc' },
              result: CHECK_SLUG,
              timestamp: Date.UTC(2026, 9, 5, 12, 0, 0),
            },
          ]}
        />
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Check Slug/i }));

    expect(screen.getByText('chat still here')).toBeInTheDocument();
    expect(document.body.textContent).toContain('roi-calc');
    expect(document.body.textContent).toContain('"available": true');
  });

  it('does not crash when a result has a non-array messages field', () => {
    render(
      <ToolExecutionDisplay
        tool_executions={[
          {
            tool: 'gmail_list_messages',
            arguments: {},
            result: JSON.stringify({ messages: { unexpected: true }, slug: 'roi-calc' }),
            timestamp: Date.UTC(2026, 9, 5, 12, 0, 0),
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /List Emails/i }));
    expect(document.body.textContent).toContain('roi-calc');
  });

  it('labels every display-name tool without throwing', () => {
    const executions = Object.keys(TOOL_DISPLAY_NAMES).map((tool, index) => ({
      tool,
      arguments: { slug: 'roi-calc' },
      result: CHECK_SLUG,
      timestamp: Date.UTC(2026, 9, 5, 12, 0, index),
    }));

    render(<ToolExecutionDisplay tool_executions={executions} />);

    expect(screen.getAllByRole('button').length).toBe(executions.length);
  });
});
