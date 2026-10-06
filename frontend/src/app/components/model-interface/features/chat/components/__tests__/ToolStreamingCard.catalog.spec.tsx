/**
 * @jest-environment jsdom
 *
 * Every chat tool must render a Check Slug-style multi-field JSON result.
 * That payload used to mount a broken lazy JSON view and replace the page
 * with "Something went wrong".
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('lucide-react', () => {
  return new Proxy(
    {},
    {
      get: () => () => null,
    },
  );
});

import ErrorBoundary from '@/app/components/ErrorBoundary';
import { TOOL_PERMISSION_CATALOG } from '@/lib/tool-permissions/catalog';
import { TOOL_DISPLAY_NAMES, getToolDisplayName } from '@/shared/tool-display-names';
import { ToolStreamingCard } from '../ToolStreamingCard';
import { resolveToolStreamingUi } from '../tool-ui/tool-ui-registry';

const CHECK_SLUG_RESULT = JSON.stringify({
  success: true,
  slug: 'roi-calc',
  available: true,
  normalized: 'roi-calc',
  suggestions: ['roi-calc-1'],
});

const ERROR_RESULT = JSON.stringify({
  error: 'tool failed',
  code: 'bad_request',
  slug: 'roi-calc',
  available: false,
});

function everyToolId(): string[] {
  const ids = new Set<string>(Object.keys(TOOL_DISPLAY_NAMES));
  for (const entry of TOOL_PERMISSION_CATALOG) {
    ids.add(entry.id);
    for (const alias of entry.aliases ?? []) {
      ids.add(alias);
    }
  }
  return Array.from(ids).sort();
}

function renderTool(tool: string, result: string) {
  return render(
    <ErrorBoundary>
      <div>
        <p>chat still here</p>
        <ToolStreamingCard
          streaming_tool={{
            tool,
            displayName: getToolDisplayName(tool),
            logs: [],
            loading: false,
            success: !result.includes('"error"'),
            arguments: { slug: 'roi-calc' },
          }}
          arguments={{ slug: 'roi-calc' }}
          result={result}
        />
      </div>
    </ErrorBoundary>,
  );
}

function assertChatStayedUp() {
  expect(screen.getByText('chat still here')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Something went wrong' })).not.toBeInTheDocument();
}

describe('ToolStreamingCard result safety', () => {
  const tools = everyToolId();

  it('covers Check Slug and every other registered tool', () => {
    expect(tools).toContain('check_slug_availability');
    expect(tools.length).toBeGreaterThan(40);
  });

  it.each(tools)('shows a multi-field %s result inside the chat', (tool) => {
    const view = renderTool(tool, CHECK_SLUG_RESULT);
    assertChatStayedUp();
    if (resolveToolStreamingUi(tool)) {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    } else {
      expect(document.body.textContent).toContain('roi-calc');
      expect(document.body.textContent).toContain('"available": true');
    }
    view.unmount();
  });

  it.each(tools)('shows a %s error payload as an in-card error', (tool) => {
    const view = renderTool(tool, ERROR_RESULT);
    assertChatStayedUp();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    if (!resolveToolStreamingUi(tool)) {
      expect(document.body.textContent).toContain('tool failed');
    }
    view.unmount();
  });

  it('opens a grouped Check Slug card without replacing the page', () => {
    render(
      <ErrorBoundary>
        <div>
          <p>chat still here</p>
          <ToolStreamingCard
            groupItem
            streaming_tool={{
              tool: 'check_slug_availability',
              displayName: 'Check Slug',
              logs: [],
              loading: false,
              success: true,
              arguments: { slug: 'roi-calc' },
            }}
            result={CHECK_SLUG_RESULT}
          />
        </div>
      </ErrorBoundary>,
    );

    const toggle = screen.getByRole('button', { name: /Check Slug/i });
    if (toggle.getAttribute('aria-expanded') !== 'true') {
      fireEvent.click(toggle);
    }

    assertChatStayedUp();
    expect(document.body.textContent).toContain('"available": true');
  });

  it('keeps the chat up when Check Slug returns plain text', () => {
    renderTool('check_slug_availability', 'not json');
    assertChatStayedUp();
    expect(document.body.textContent).toContain('not json');
  });
});
