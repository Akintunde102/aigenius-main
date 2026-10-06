/**
 * @jest-environment jsdom
 */
import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RenderErrorBoundary } from '../RenderErrorBoundary';

function Boom(): React.ReactElement {
  throw new Error('render failed');
}

function MaybeBoom({ boom }: { boom: boolean }) {
  if (boom) {
    throw new Error('render failed');
  }
  return <p>safe content</p>;
}

describe('RenderErrorBoundary', () => {
  const realError = console.error;

  beforeEach(() => {
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = realError;
  });

  it('renders children when they do not throw', () => {
    render(
      <RenderErrorBoundary>
        <p>result ok</p>
      </RenderErrorBoundary>,
    );
    expect(screen.getByText('result ok')).toBeInTheDocument();
  });

  it('shows an inline error and leaves the rest of the page mounted', () => {
    render(
      <div>
        <p>chat still here</p>
        <RenderErrorBoundary>
          <Boom />
        </RenderErrorBoundary>
      </div>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Could not show this result.');
    expect(screen.getByText('chat still here')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('uses a custom fallback when markdown should stay readable', () => {
    render(
      <RenderErrorBoundary fallback={<pre role="alert">raw answer</pre>}>
        <Boom />
      </RenderErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('raw answer');
  });

  it('recovers when Try again is pressed after the child stops throwing', () => {
    function Harness() {
      const [boom, setBoom] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setBoom(false)}>
            stop throwing
          </button>
          <RenderErrorBoundary recoverable message="Section failed.">
            <MaybeBoom boom={boom} />
          </RenderErrorBoundary>
        </>
      );
    }

    render(<Harness />);
    expect(screen.getByRole('alert')).toHaveTextContent('Section failed.');

    fireEvent.click(screen.getByRole('button', { name: 'stop throwing' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('safe content')).toBeInTheDocument();
  });

  it('clears a caught error when resetKey changes and the child is safe', () => {
    function Harness() {
      const [boom, setBoom] = useState(true);
      const [resetKey, setResetKey] = useState(1);
      return (
        <>
          <button type="button" onClick={() => setBoom(false)}>
            stop throwing
          </button>
          <button type="button" onClick={() => setResetKey(2)}>
            next content
          </button>
          <RenderErrorBoundary resetKey={resetKey}>
            <MaybeBoom boom={boom} />
          </RenderErrorBoundary>
        </>
      );
    }

    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'stop throwing' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'next content' }));
    expect(screen.getByText('safe content')).toBeInTheDocument();
  });

  it('stays failed when resetKey does not change', () => {
    function Harness() {
      const [boom, setBoom] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setBoom(false)}>
            stop throwing
          </button>
          <RenderErrorBoundary resetKey="same">
            <MaybeBoom boom={boom} />
          </RenderErrorBoundary>
        </>
      );
    }

    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'stop throwing' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not show this result.');
    expect(screen.queryByText('safe content')).not.toBeInTheDocument();
  });
});
