import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModelSelectionFiltersNew } from '../ModelSelectionFiltersNew';

const baseProps = {
  orderBy: 'default' as const,
  setOrderBy: jest.fn(),
  orderDir: 'asc' as const,
  setOrderDir: jest.fn(),
  imageFilterOnly: false,
  setImageFilterOnly: jest.fn(),
  selectedProviders: [] as string[],
  setSelectedProviders: jest.fn(),
  showWebSearch: false,
  setShowWebSearch: jest.fn(),
};

describe('ModelSelectionFiltersNew', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows collection pills and toggles the default-models catalog filter', () => {
    const onToggleCatalogFilter = jest.fn();

    render(
      <ModelSelectionFiltersNew
        {...baseProps}
        catalogFilter="all"
        onToggleCatalogFilter={onToggleCatalogFilter}
        defaultModelsCount={6}
        showOllamaCatalogFilter
        ollamaModelsCount={5}
      />,
    );

    expect(screen.getByText('Default models')).toBeInTheDocument();
    expect(screen.getByText('Ollama')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Filter to default models/i }));

    expect(onToggleCatalogFilter).toHaveBeenCalledWith('default');
  });

  it('toggles the files and images capability filter', () => {
    const setImageFilterOnly = jest.fn();

    render(
      <ModelSelectionFiltersNew
        {...baseProps}
        setImageFilterOnly={setImageFilterOnly}
      />,
    );

    fireEvent.click(screen.getByRole('switch', { name: /Toggle files and images filter/i }));

    expect(setImageFilterOnly).toHaveBeenCalled();
  });
});
