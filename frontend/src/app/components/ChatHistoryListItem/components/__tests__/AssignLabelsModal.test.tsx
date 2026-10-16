import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { AssignLabelsModal } from '../AssignLabelsModal';
import toast from 'react-hot-toast';

jest.mock('react-hot-toast', () => ({
    __esModule: true,
    default: {
        error: jest.fn(),
        success: jest.fn(),
    },
}));

describe('AssignLabelsModal', () => {
    const mockSession: any = {
        id: 'session-123',
        title: 'Project Planning',
        labelIds: ['lbl-1'],
        labels: [{ id: 'lbl-1', name: 'Work', color: '#ff0000' }],
    };

    const mockCatalog: any[] = [
        { id: 'lbl-1', name: 'Work', color: '#ff0000' },
        { id: 'lbl-2', name: 'Personal', color: '#00ff00' },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('handles save successfully and closes the modal', async () => {
        const onSave = jest.fn().mockResolvedValue(undefined);
        const onClose = jest.fn();

        const { getByText } = render(
            <AssignLabelsModal
                isOpen={true}
                session={mockSession}
                catalog={mockCatalog}
                onClose={onClose}
                onSave={onSave}
            />
        );

        fireEvent.click(getByText('Save'));

        await waitFor(() => {
            expect(onSave).toHaveBeenCalledWith('session-123', ['lbl-1']);
            expect(onClose).toHaveBeenCalled();
        });
    });

    it('catches save failure, fires toast.error, and does not close modal (F-0016)', async () => {
        const onSave = jest.fn().mockRejectedValue(new Error('Network error'));
        const onClose = jest.fn();

        const { getByText } = render(
            <AssignLabelsModal
                isOpen={true}
                session={mockSession}
                catalog={mockCatalog}
                onClose={onClose}
                onSave={onSave}
            />
        );

        fireEvent.click(getByText('Save'));

        await waitFor(() => {
            expect(onSave).toHaveBeenCalled();
            expect(toast.error).toHaveBeenCalledWith('Network error');
            expect(onClose).not.toHaveBeenCalled();
        });
    });
});
