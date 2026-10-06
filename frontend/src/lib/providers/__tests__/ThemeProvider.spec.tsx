/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/lib/providers/ThemeProvider';

function ThemeProbe() {
  const { theme, resolvedTheme } = useTheme();
  return <p>{`${theme}:${resolvedTheme}`}</p>;
}

describe('useTheme', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('returns a safe fallback outside ThemeProvider', () => {
    render(<ThemeProbe />);

    expect(screen.getByText('system:dark')).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith(
      'useTheme was called outside ThemeProvider. Using a safe fallback.',
    );
  });

  it('returns the provider value when ThemeProvider is mounted', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByText(/^(system|light|dark):(light|dark)$/)).toBeInTheDocument();
  });
});
