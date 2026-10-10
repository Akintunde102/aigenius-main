import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { RecentModelChips } from '../RecentModelChips';
import { Model } from '@/app/components/model-interface/shared/types';

const model: Model = {
  id: 'anthropic/claude-sonnet',
  name: 'Anthropic: Claude Sonnet 5.5',
  provider: 'anthropic',
  created_at: '2024-01-01T00:00:00Z',
  description: 'Sonnet',
  context_length: 200_000,
};

describe('RecentModelChips', () => {
  it('renders nothing when there are no recent models', () => {
    const { container } = render(
      <RecentModelChips
        recentModels={[]}
        onPick={jest.fn()}
        isMobile={false}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('lists recent models and forwards picks', async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();

    render(
      <RecentModelChips
        recentModels={[model]}
        highlightedModelId={model.id}
        onPick={onPick}
        isMobile={false}
      />,
    );

    expect(screen.getByRole('region', { name: /Recently Picked/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Claude Sonnet 5\.5/i }));

    expect(onPick).toHaveBeenCalledWith(model);
  });
});
