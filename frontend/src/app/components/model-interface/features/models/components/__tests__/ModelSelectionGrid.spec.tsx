import React, { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ModelSelectionGrid } from '../ModelSelectionGrid';
import { Model } from '@/app/components/model-interface/shared/types';

jest.mock('../ModelSelectionCard', () => ({
  ModelSelectionCard: jest.fn(({ model }: { model: Model }) => (
    <div data-testid="model-card">{model.name}</div>
  )),
}));

const baseModel = (id: string, name: string): Model => ({
  id,
  name,
  provider: 'openai',
  created_at: '2024-01-01T00:00:00Z',
  description: name,
  context_length: 8192,
});

const defaultProps = {
  parentRef: createRef<HTMLDivElement>(),
  isMobile: false,
  isModelPinned: () => false,
  togglePinModel: jest.fn(),
  onSelect: jest.fn(),
  avgCostById: new Map<string, number>(),
  handleShowModelDetails: jest.fn(),
  isSortingByReleaseDate: false,
};

describe('ModelSelectionGrid', () => {
  const cardMock = jest.requireMock('../ModelSelectionCard') as {
    ModelSelectionCard: jest.Mock;
  };

  beforeEach(() => {
    cardMock.ModelSelectionCard.mockImplementation(({ model }: { model: Model }) => (
      <div data-testid="model-card">{model.name}</div>
    ));
  });

  it('collapses Quick picks when the section title is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ModelSelectionGrid
        {...defaultProps}
        sections={[
          {
            title: 'Quick picks',
            models: [baseModel('1', 'Model One'), baseModel('2', 'Model Two')],
          },
        ]}
      />,
    );

    expect(screen.getAllByTestId('model-card')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Quick picks' }));

    expect(screen.queryByTestId('model-card')).not.toBeInTheDocument();
    expect(screen.getByText('2 models')).toBeInTheDocument();
  });

  it('starts Need more credits collapsed and expands on click', async () => {
    const user = userEvent.setup();

    render(
      <ModelSelectionGrid
        {...defaultProps}
        sections={[
          {
            title: 'Need more credits',
            models: [baseModel('locked', 'Locked Model')],
          },
        ]}
      />,
    );

    expect(screen.queryByTestId('model-card')).not.toBeInTheDocument();
    expect(screen.getByText('1 model')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Need more credits' }));

    expect(screen.getByTestId('model-card')).toHaveTextContent('Locked Model');
  });

  it('collapses Models you can use when the section title is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ModelSelectionGrid
        {...defaultProps}
        sections={[
          {
            title: 'Models you can use',
            models: [baseModel('affordable', 'Affordable Model')],
          },
        ]}
      />,
    );

    expect(screen.getByTestId('model-card')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Models you can use' }));

    expect(screen.queryByTestId('model-card')).not.toBeInTheDocument();
    expect(screen.getByText('1 model')).toBeInTheDocument();
  });

  it('renders model rows when the scroll pane has not been measured', () => {
    const scrollParent = document.createElement('div');
    Object.defineProperty(scrollParent, 'clientHeight', { value: 0 });
    const parentRef = { current: scrollParent };

    render(
      <ModelSelectionGrid
        {...defaultProps}
        parentRef={parentRef}
        sections={[
          {
            title: '',
            models: [baseModel('1', 'Hy3'), baseModel('2', 'Gemini 3.8 Flash')],
          },
        ]}
      />,
    );

    expect(screen.getByText('Hy3')).toBeInTheDocument();
    expect(screen.getByText('Gemini 3.8 Flash')).toBeInTheDocument();
  });

  it('contains a broken model card without leaving the list blank', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    cardMock.ModelSelectionCard.mockImplementation(() => {
      throw new Error('card failed');
    });

    render(
      <div>
        <p>Model picker chrome</p>
        <ModelSelectionGrid
          {...defaultProps}
          models={[baseModel('1', 'Hy3')]}
        />
      </div>,
    );

    expect(screen.getByText('Model picker chrome')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/could not show the model list/i);
    consoleError.mockRestore();
  });
});
