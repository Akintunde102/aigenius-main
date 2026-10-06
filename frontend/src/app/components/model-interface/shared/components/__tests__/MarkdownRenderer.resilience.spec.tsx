/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MarkdownRenderer } from '../MarkdownRenderer';

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: function BrokenMarkdown() {
    throw new Error('malformed markdown');
  },
}));

describe('MarkdownRenderer resilience', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the raw answer when markdown rendering throws', () => {
    render(<MarkdownRenderer content={'Hello **world**'} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Hello **world**');
  });

  it('renders nothing for blank content', () => {
    const { container } = render(<MarkdownRenderer content="   " />);
    expect(container).toBeEmptyDOMElement();
  });
});
