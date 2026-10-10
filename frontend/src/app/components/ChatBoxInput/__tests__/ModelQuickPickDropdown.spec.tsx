import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModelQuickPickDropdown } from '../ModelQuickPickDropdown';
import { Model } from '@/app/components/model-interface/shared/types';

const quickPick: Model = {
  id: 'google/gemini-flash',
  name: 'Google: Gemini 3.8 Flash',
  provider: 'google',
  created_at: '2024-01-01T00:00:00Z',
  description: 'Fast',
  context_length: 8192,
};

describe('ModelQuickPickDropdown', () => {
  it('shows a loading state until favorites are loaded', async () => {
    render(
      <ModelQuickPickDropdown
        selectedModel={quickPick}
        quickPickModels={[quickPick]}
        favoritesLoaded={false}
        onSelectModel={jest.fn()}
        onOpenFullPicker={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { expanded: false }));

    await waitFor(() => {
      expect(screen.getByRole('status', { name: /Loading models/i })).toBeInTheDocument();
    });
  });

  it('lists quick picks and routes Add models to the full picker', async () => {
    const onSelectModel = jest.fn();
    const onOpenFullPicker = jest.fn();

    render(
      <ModelQuickPickDropdown
        selectedModel={quickPick}
        quickPickModels={[quickPick]}
        favoritesLoaded
        onSelectModel={onSelectModel}
        onOpenFullPicker={onOpenFullPicker}
      />,
    );

    fireEvent.click(screen.getByRole('button', { expanded: false }));

    await waitFor(() => {
      expect(screen.getByRole('listbox', { name: /Quick pick models/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('option', { name: /Gemini 3\.8 Flash/i }));
    expect(onSelectModel).toHaveBeenCalledWith(quickPick);

    fireEvent.click(screen.getByRole('button', { expanded: false }));
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Add models/i }));
    expect(onOpenFullPicker).toHaveBeenCalledTimes(1);
  });
});
