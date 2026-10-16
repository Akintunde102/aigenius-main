import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MessagePromptButtons } from '../MessagePromptButtons';

jest.mock('@/lib/providers/LanguageProvider', () => ({
    useLanguage: () => ({
        t: (_key: string, fallback: string) => fallback,
    }),
}));

describe('MessagePromptButtons', () => {
    it('renders labels and sends on click', () => {
        const onSelect = jest.fn();
        render(
            <MessagePromptButtons
                labels={['Option A', 'Option B']}
                onSelect={onSelect}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Option A' }));
        expect(onSelect).toHaveBeenCalledWith('Option A');
    });

    it('renders nothing when labels are empty', () => {
        const { container } = render(
            <MessagePromptButtons labels={[]} onSelect={jest.fn()} />,
        );
        expect(container).toBeEmptyDOMElement();
    });
});
