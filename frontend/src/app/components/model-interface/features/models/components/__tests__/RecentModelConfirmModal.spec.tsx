import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecentModelConfirmModal } from '../RecentModelConfirmModal';
import { Model } from '@/app/components/model-interface/shared/types';
import '@testing-library/jest-dom';

const model: Model = {
    id: 'tencent/hy3',
    name: 'Hy3',
    description: 'A fast model for everyday tasks.',
    context_length: 128000,
    pricing: {
        prompt: '0.000001',
        completion: '0.000002',
    },
};

describe('RecentModelConfirmModal', () => {
    it('asks the user to confirm using the recently picked model', () => {
        render(
            <RecentModelConfirmModal
                isOpen
                model={model}
                onClose={jest.fn()}
                onConfirm={jest.fn()}
            />,
        );

        expect(screen.getByRole('dialog', { name: /Use Hy3/i })).toBeInTheDocument();
        expect(screen.getByText('Recently Picked')).toBeInTheDocument();
        expect(screen.getByText('A fast model for everyday tasks.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Use model' })).toBeInTheDocument();
    });

    it('confirms the pick from the primary action', () => {
        const onConfirm = jest.fn();
        render(
            <RecentModelConfirmModal
                isOpen
                model={model}
                onClose={jest.fn()}
                onConfirm={onConfirm}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Use model' }));
        expect(onConfirm).toHaveBeenCalledWith(model);
    });

    it('closes without confirming when cancelled', () => {
        const onClose = jest.fn();
        const onConfirm = jest.fn();
        render(
            <RecentModelConfirmModal
                isOpen
                model={model}
                onClose={onClose}
                onConfirm={onConfirm}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onClose).toHaveBeenCalled();
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('closes on Escape without confirming', () => {
        const onClose = jest.fn();
        render(
            <RecentModelConfirmModal
                isOpen
                model={model}
                onClose={onClose}
                onConfirm={jest.fn()}
            />,
        );

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).toHaveBeenCalled();
    });

    it('prompts for credits instead of confirming when the wallet is locked', () => {
        const onConfirm = jest.fn();
        const onAddCredits = jest.fn();
        render(
            <RecentModelConfirmModal
                isOpen
                model={model}
                onClose={jest.fn()}
                onConfirm={onConfirm}
                onAddCredits={onAddCredits}
                wallet={0}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Load credits to use' }));
        expect(onAddCredits).toHaveBeenCalled();
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('renders nothing when closed', () => {
        render(
            <RecentModelConfirmModal
                isOpen={false}
                model={model}
                onClose={jest.fn()}
                onConfirm={jest.fn()}
            />,
        );

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
