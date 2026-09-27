import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecentModelChips } from '../RecentModelChips';
import { Model } from '@/app/components/model-interface/shared/types';
import '@testing-library/jest-dom';

const recentModels: Model[] = [
    { id: 'google/gemini-3-flash', name: 'Gemini 3 Flash', description: '', context_length: 8192 },
    { id: 'anthropic/claude-sonnet-5', name: 'Claude Sonnet 5', description: '', context_length: 8192 },
];

describe('RecentModelChips', () => {
    it('renders a horizontal Recently Picked section with model chips', () => {
        render(
            <RecentModelChips
                recentModels={recentModels}
                onPick={jest.fn()}
                isMobile={false}
            />,
        );

        const section = screen.getByRole('region', { name: 'Recently Picked' });
        expect(section).toBeInTheDocument();
        expect(screen.getByText('Recently Picked')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Gemini 3 Flash/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Claude Sonnet 5/i })).toBeInTheDocument();
        expect(section.querySelector('.overflow-x-auto.flex-nowrap')).toBeTruthy();
    });

    it('returns nothing when there are no recent models', () => {
        const { container } = render(
            <RecentModelChips recentModels={[]} onPick={jest.fn()} isMobile={false} />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('calls onPick when a chip is clicked', () => {
        const onPick = jest.fn();
        render(
            <RecentModelChips
                recentModels={recentModels}
                onPick={onPick}
                isMobile={false}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /Gemini 3 Flash/i }));
        expect(onPick).toHaveBeenCalledWith(recentModels[0]);
    });
});
