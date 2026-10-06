import React from 'react';
import { render, screen } from '@testing-library/react';
import { ensureLazyDefault } from '../lazy-component';

describe('ensureLazyDefault', () => {
  it('keeps a function export', () => {
    function Panel() {
      return <span>panel</span>;
    }
    expect(ensureLazyDefault(Panel, 'panel').default).toBe(Panel);
  });

  it('keeps a forwardRef export', () => {
    const Avatar = React.forwardRef<HTMLSpanElement>(function Avatar(_props, ref) {
      return <span ref={ref}>avatar</span>;
    });
    expect(ensureLazyDefault(Avatar, 'avatar').default).toBe(Avatar);
  });

  it('renders a normal error when the export is missing', () => {
    const { default: Fallback } = ensureLazyDefault(undefined, 'avatar');
    render(React.createElement(Fallback));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load avatar.');
  });
});
