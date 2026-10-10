/**
 * Catalog integration: uses the real ModelSelectionGrid (not mocked).
 * Guards against blank-list regressions when the scroll pane has no measured height.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelSelectionModal } from '../ModelSelectionModal';
import { Model } from '@/app/components/model-interface/shared/types';
import '@testing-library/jest-dom';

jest.mock('../ModelSelectionFiltersNew', () => ({
  ModelSelectionFiltersNew: () => <div data-testid="filters-stub" />,
}));

jest.mock('../RecentModelChips', () => ({
  RecentModelChips: () => null,
}));

const mockModels: Model[] = [
  {
    id: 'google/gemini-flash',
    name: 'Google: Gemini 3.8 Flash',
    provider: 'google',
    created_at: '2024-01-01T00:00:00Z',
    description: 'Fast model',
    context_length: 8192,
  },
  {
    id: 'openai/gpt-5',
    name: 'OpenAI: GPT-5.3-Codex',
    provider: 'openai',
    created_at: '2024-02-01T00:00:00Z',
    description: 'Code model',
    context_length: 4096,
  },
];

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  models: mockModels,
  search: '',
  setSearch: jest.fn(),
  selectedModel: null,
  setSelectedModel: jest.fn(),
  selectedModelForDetails: null,
  setSelectedModelForDetails: jest.fn(),
  handleShowModelDetails: jest.fn(),
  pinnedModelIds: [],
  isModelPinned: jest.fn(() => false),
  togglePinModel: jest.fn(),
  recentModels: [],
  orderBy: 'default' as const,
  setOrderBy: jest.fn(),
  orderDir: 'asc' as const,
  setOrderDir: jest.fn(),
  imageFilterOnly: false,
  setImageFilterOnly: jest.fn(),
};

describe('ModelSelectionModal catalog integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders model rows through the real grid in the catalog pane', () => {
    render(<ModelSelectionModal {...defaultProps} favoritesLoaded />);

    expect(screen.getByRole('heading', { name: /All Models/i })).toBeInTheDocument();
    expect(screen.getByText('Gemini 3.8 Flash')).toBeInTheDocument();
    expect(screen.getByText('GPT-5.3-Codex')).toBeInTheDocument();
  });

  it('shows the filtered empty state when search matches nothing', () => {
    render(<ModelSelectionModal {...defaultProps} favoritesLoaded />);

    fireEvent.change(screen.getByPlaceholderText(/Search models/i), {
      target: { value: 'zzznomatch' },
    });

    expect(screen.getByRole('heading', { name: /No matching models found/i })).toBeInTheDocument();
    expect(screen.queryByText('Gemini 3.8 Flash')).not.toBeInTheDocument();
  });
});
