import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// We need to disable the actual components from Next if needed, but since we're rendering it...
// Actually, let's mock anything that tries to use Next Router just in case
jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn() })
}));

jest.mock('servercall', () => ({
    __esModule: true,
    createServerCall: jest.fn(),
    ServerCallVerbs: { Get: 'GET', Post: 'POST', Put: 'PUT', Delete: 'DELETE' }
}));

jest.mock('@/lib/calls/admin', () => ({
    __esModule: true,
    searchAdminUsers: jest.fn(),
    getAdminCreditsHistory: jest.fn(),
}));

import GrantCreditsModal from '../GrantCreditsModal';

import { searchAdminUsers } from '@/lib/calls/admin';

const mockedSearchAdminUsers = searchAdminUsers as jest.Mock;

describe('GrantCreditsModal', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('debounces input, calls API, and uses cache on subsequent calls', async () => {
        mockedSearchAdminUsers.mockResolvedValueOnce([
            { id: '1', email: 'user@example.com', firstName: 'John' },
        ]);

        render(<GrantCreditsModal onClose={jest.fn()} onWalletUpdate={jest.fn()} />);

        const input = screen.getByPlaceholderText('Search user by email or name…');
        fireEvent.change(input, { target: { value: 'user' } });

        // Fast forward less than debounce limit (150ms)
        jest.advanceTimersByTime(100);
        expect(mockedSearchAdminUsers).not.toHaveBeenCalled();

        // Fast forward past debounce
        jest.advanceTimersByTime(60);

        await waitFor(() => {
            expect(mockedSearchAdminUsers).toHaveBeenCalledWith('user');
        });

        const item = await screen.findByText('user@example.com');
        expect(item).toBeInTheDocument();

        // Use cache: clear input then type again
        fireEvent.change(input, { target: { value: '' } });
        jest.advanceTimersByTime(200);

        fireEvent.change(input, { target: { value: 'user' } });
        jest.advanceTimersByTime(200);

        await waitFor(() => {
            expect(mockedSearchAdminUsers).toHaveBeenCalledTimes(1); // Should still be 1 (cache hit)
        });
        expect(await screen.findByText('user@example.com')).toBeInTheDocument();
    });

    it('shows and hides dropdown correctly on focus/blur', async () => {
        mockedSearchAdminUsers.mockResolvedValueOnce([
            { id: '1', email: 'user@test.com' },
        ]);

        render(<GrantCreditsModal onClose={jest.fn()} onWalletUpdate={jest.fn()} />);
        const input = screen.getByPlaceholderText('Search user by email or name…');
        
        fireEvent.change(input, { target: { value: 'test' } });
        jest.advanceTimersByTime(200);

        await screen.findByText('user@test.com'); // wait for results
        
        fireEvent.blur(input);

        await waitFor(() => {
            expect(screen.queryByText('user@test.com')).not.toBeInTheDocument();
        });

        fireEvent.focus(input);
        expect(screen.getByText('user@test.com')).toBeInTheDocument();
    });
});
