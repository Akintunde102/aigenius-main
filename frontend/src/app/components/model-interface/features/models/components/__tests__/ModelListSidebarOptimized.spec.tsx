import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModelListSidebarOptimized } from '../ModelListSidebarOptimized';
import { Model } from '@/app/components/model-interface/shared/types';

jest.mock('@/lib/utils/modelInterfaceUtils', () => ({
  getPinnedModels: () => [],
  getDeletedModels: () => [],
  setPinnedModels: jest.fn(),
  setDeletedModels: jest.fn(),
}));

const model: Model = {
  id: 'google/gemini',
  name: 'Gemini 3.8 Flash',
  provider: 'google',
  created_at: '2024-01-01T00:00:00Z',
  description: 'Flash',
  context_length: 8192,
};

describe('ModelListSidebarOptimized', () => {
  it('shows a loading spinner while models are fetching', () => {
    const { container } = render(
      <ModelListSidebarOptimized
        models={[]}
        selectedModel={null}
        setSelectedModel={jest.fn()}
        search=""
        setSearch={jest.fn()}
        loading
      />,
    );

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('lists models when loaded', () => {
    render(
      <ModelListSidebarOptimized
        models={[model]}
        selectedModel={model}
        setSelectedModel={jest.fn()}
        search=""
        setSearch={jest.fn()}
      />,
    );

    expect(screen.getByText('Gemini 3.8 Flash')).toBeInTheDocument();
  });
});
