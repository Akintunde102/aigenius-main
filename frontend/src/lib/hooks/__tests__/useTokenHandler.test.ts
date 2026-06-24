import { renderHook } from '@testing-library/react';
import useTokenHandler from '../useTokenHandler';
import { storage } from '../../utils/store';

const mockNavigateTo = jest.fn();

// Mock the store
jest.mock('../../utils/store', () => ({
    storage: jest.fn(),
}));

jest.mock('../../utils/navigate', () => ({
    navigateTo: (...args: any[]) => mockNavigateTo(...args),
}));

// Mock hasAuthSession so auth state is always false (unauthenticated) by default
jest.mock('../../utils/auth-session', () => ({
    hasAuthSession: jest.fn().mockReturnValue(false),
}));

describe('useTokenHandler', () => {
    let urlParamsGetMock: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock URLSearchParams
        urlParamsGetMock = jest.fn();
        (global as any).URLSearchParams = jest.fn().mockImplementation(() => ({
            get: urlParamsGetMock,
        }));
    });

    it('should redirect to /login if no token in storage and no token in URL', () => {
        (storage as jest.Mock).mockReturnValue({
            getString: jest.fn().mockReturnValue(null),
        });
        urlParamsGetMock.mockReturnValue(null);

        renderHook(() => useTokenHandler());

        expect(mockNavigateTo).toHaveBeenCalledWith('/login');
    });

    it('should NOT redirect to /login if no token in storage BUT token IS in URL', () => {
        (storage as jest.Mock).mockReturnValue({
            getString: jest.fn().mockReturnValue(null),
        });
        urlParamsGetMock.mockReturnValue('some-token');

        renderHook(() => useTokenHandler());

        expect(mockNavigateTo).not.toHaveBeenCalled();
    });

    it('should NOT redirect if token exists in storage', () => {
        (storage as jest.Mock).mockReturnValue({
            getString: jest.fn().mockReturnValue('existing-token'),
        });

        renderHook(() => useTokenHandler());

        expect(mockNavigateTo).not.toHaveBeenCalled();
    });
});
