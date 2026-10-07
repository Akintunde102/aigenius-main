import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FavoritesEmptyState } from '../FavoritesEmptyState';

describe('FavoritesEmptyState', () => {
  it('explains how to add quick models and opens the full catalog on browse', async () => {
    const user = userEvent.setup();
    const onBrowse = jest.fn();

    render(<FavoritesEmptyState onBrowse={onBrowse} />);

    expect(screen.getByText(/No quick models yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Toggle models on in/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Browse All Models/i }));

    expect(onBrowse).toHaveBeenCalledTimes(1);
  });
});
