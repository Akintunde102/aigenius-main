/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('editorjs-html', () => () => ({
  parse: () => {
    throw new Error('bad editor payload');
  },
}));

import PreviewRenderer from '../PreviewRenderer';

describe('PreviewRenderer', () => {
  const realError = console.error;

  beforeEach(() => {
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = realError;
  });

  it('shows a contained error when Editor.js data cannot be parsed', () => {
    render(
      <PreviewRenderer data={{ time: 1, blocks: [] } as import('@editorjs/editorjs').OutputData} />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Preview unavailable.');
  });
});
