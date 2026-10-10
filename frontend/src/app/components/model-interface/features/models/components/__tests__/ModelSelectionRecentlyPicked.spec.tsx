import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ModelSelectionRecentlyPicked from '../ModelSelectionRecentlyPicked';
import { Model } from '@/app/components/model-interface/shared/types';

const model: Model = {
  id: 'openai/gpt',
  name: 'GPT-5.3-Codex',
  provider: 'openai',
  created_at: '2024-01-01T00:00:00Z',
  description: 'Code',
  context_length: 8192,
};

describe('ModelSelectionRecentlyPicked', () => {
  it('renders nothing without recent models', () => {
    const { container } = render(
      <ModelSelectionRecentlyPicked
        recentModels={[]}
        selectedModel={null}
        onPick={jest.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('highlights the active model and forwards picks', () => {
    const onPick = jest.fn();

    render(
      <ModelSelectionRecentlyPicked
        recentModels={[model]}
        selectedModel={model}
        onPick={onPick}
      />,
    );

    expect(screen.getByText('Recently Picked')).toBeInTheDocument();
    fireEvent.click(screen.getByText('GPT-5.3-Codex'));
    expect(onPick).toHaveBeenCalledWith(model);
  });
});
