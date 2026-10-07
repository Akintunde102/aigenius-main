import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ModelPickerSectionLabel } from '../ModelPickerSectionLabel';

describe('ModelPickerSectionLabel', () => {
  it('renders static labels without a button role', () => {
    render(<ModelPickerSectionLabel>Quick picks</ModelPickerSectionLabel>);

    expect(screen.getByText('Quick picks')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders collapsible section headers as buttons', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();

    render(
      <ModelPickerSectionLabel onClick={onClick} ariaExpanded={false}>
        Need more credits
      </ModelPickerSectionLabel>,
    );

    const button = screen.getByRole('button', { name: 'Need more credits' });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
