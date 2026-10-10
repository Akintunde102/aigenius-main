import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModalityIcon } from '../ModalityIcon';

describe('ModalityIcon', () => {
  it('shows modality labels when requested', () => {
    render(<ModalityIcon mod="image" showLabel />);

    expect(screen.getByText('Image')).toBeInTheDocument();
  });

  it('renders icon-only mode without duplicating the label in the tree', () => {
    const { container } = render(<ModalityIcon mod="video" />);

    expect(container.querySelector('span.font-medium')).not.toBeInTheDocument();
  });
});
