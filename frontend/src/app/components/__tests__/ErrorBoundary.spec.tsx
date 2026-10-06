/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

function Boom(): React.ReactElement {
  throw new Error(
    'Minified React error #306; visit https://reactjs.org/docs/error-decoder.html?invariant=306&args[]=undefined&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.',
  );
}

describe('ErrorBoundary', () => {
  const realError = console.error;

  beforeEach(() => {
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = realError;
  });

  it('shows the decoded React error instead of only the minified text', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getAllByText(/Element type is invalid\. Received a promise that resolves to: undefined/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/error-decoder\.html/)).not.toBeInTheDocument();
  });
});
