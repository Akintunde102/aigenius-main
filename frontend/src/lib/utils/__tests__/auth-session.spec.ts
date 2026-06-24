import { storageConstants } from '@/lib/constants';
import { clearAuthSession, setAuthSessionTokens } from '../auth-session';
import axios from 'axios';

const mockSetString = jest.fn();
const mockRemoveItem = jest.fn();
const mockGetString = jest.fn();

import { storage } from '@/lib/utils/store';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

jest.mock('@/lib/utils/store', () => {
  return {
    __esModule: true,
    storage: jest.fn().mockImplementation(() => ({
      setString: mockSetString,
      removeItem: mockRemoveItem,
      getString: mockGetString,
    }))
  };
});

describe('Auth Session Utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (axios.post as jest.Mock).mockResolvedValue(undefined);
    });

    describe('setAuthSessionTokens', () => {
        it('should correctly store auth and client tokens', () => {
            setAuthSessionTokens({
                clientToken: 'client-123',
                authToken: 'auth-123',
            });

            expect(storage).toHaveBeenCalledWith(storageConstants.NOBOX_CLIENT_TOKEN);
            expect(storage).toHaveBeenCalledWith(storageConstants.NOBOX_TOKEN);
            expect(storage).not.toHaveBeenCalledWith(storageConstants.NOBOX_REFRESH_TOKEN);
            expect(mockSetString).toHaveBeenCalledWith('auth-123');
        });
    });

    describe('clearAuthSession', () => {
        it('should clear local auth state and request backend logout', () => {
            clearAuthSession();
            
            expect(axios.post).toHaveBeenCalled();
            expect(storage).not.toHaveBeenCalledWith(storageConstants.NOBOX_REFRESH_TOKEN);
            expect(mockRemoveItem).toHaveBeenCalledTimes(3);
        });
    });
});
