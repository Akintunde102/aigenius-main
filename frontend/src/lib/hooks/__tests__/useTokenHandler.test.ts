import { renderHook, waitFor } from '@testing-library/react';
import useTokenHandler from '../useTokenHandler';
import { storage } from '../../utils/store';

const mockNavigateTo = jest.fn();
const mockRestoreAccessTokenFromStoredSession = jest.fn();
const mockWaitForAigeniusDesktopBridge = jest.fn();
const mockGetAccessToken = jest.fn();
const mockHasAuthSession = jest.fn();
const mockSyncAuthSessionCookiesFromStorage = jest.fn();

jest.mock('../../utils/store', () => ({
    storage: jest.fn(),
}));

jest.mock('../../utils/navigate', () => ({
    navigateTo: (...args: unknown[]) => mockNavigateTo(...args),
}));

jest.mock('../../utils/auth-session', () => ({
    hasAuthSession: () => mockHasAuthSession(),
    syncAuthSessionCookiesFromStorage: () => mockSyncAuthSessionCookiesFromStorage(),
}));

jest.mock('../../api/auth-client', () => ({
    getAccessToken: () => mockGetAccessToken(),
    restoreAccessTokenFromStoredSession: () => mockRestoreAccessTokenFromStoredSession(),
}));

jest.mock('../../utils/desktop-runtime', () => ({
    DESKTOP_SHELL_ENTRY_QUERY_PARAM: 'aigenius_shell',
    isAigeniusDesktopRuntime: jest.fn().mockReturnValue(false),
    isDesktopShellFromBuild: jest.fn().mockReturnValue(false),
    isLikelyElectronRenderer: jest.fn().mockReturnValue(false),
    waitForAigeniusDesktopBridge: (...args: unknown[]) => mockWaitForAigeniusDesktopBridge(...args),
}));

describe('useTokenHandler', () => {
    let urlParamsGetMock: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockHasAuthSession.mockReturnValue(false);
        mockGetAccessToken.mockReturnValue(undefined);
        mockRestoreAccessTokenFromStoredSession.mockResolvedValue(undefined);
        mockWaitForAigeniusDesktopBridge.mockResolvedValue(false);

        urlParamsGetMock = jest.fn();
        (global as any).URLSearchParams = jest.fn().mockImplementation(() => ({
            get: urlParamsGetMock,
        }));
        window.history.replaceState({}, '', '/chat');
    });

    it('should redirect to /login if no token in storage and no token in URL', async () => {
        (storage as jest.Mock).mockReturnValue({
            getString: jest.fn().mockReturnValue(null),
        });
        urlParamsGetMock.mockReturnValue(null);

        renderHook(() => useTokenHandler());

        await waitFor(() => {
            expect(mockNavigateTo).toHaveBeenCalledWith('/login');
        });
    });

    it('should NOT redirect to /login if no token in storage BUT token IS in URL', async () => {
        (storage as jest.Mock).mockReturnValue({
            getString: jest.fn().mockReturnValue(null),
        });
        urlParamsGetMock.mockReturnValue('some-token');

        renderHook(() => useTokenHandler());

        await waitFor(() => {
            expect(mockNavigateTo).not.toHaveBeenCalled();
        });
    });

    it('should NOT redirect if token exists in storage', async () => {
        (storage as jest.Mock).mockReturnValue({
            getString: jest.fn().mockReturnValue('existing-token'),
        });

        renderHook(() => useTokenHandler());

        await waitFor(() => {
            expect(mockNavigateTo).not.toHaveBeenCalled();
        });
    });

    it('should restore desktop session before redirecting on Electron cold start', async () => {
        const desktopRuntime = jest.requireMock('../../utils/desktop-runtime');
        desktopRuntime.isDesktopShellFromBuild.mockReturnValue(true);
        mockRestoreAccessTokenFromStoredSession.mockResolvedValue('restored-jwt');

        (storage as jest.Mock).mockReturnValue({
            getString: jest.fn()
                .mockReturnValueOnce(null)
                .mockReturnValueOnce('client-token'),
        });
        urlParamsGetMock.mockReturnValue(null);

        renderHook(() => useTokenHandler());

        await waitFor(() => {
            expect(mockWaitForAigeniusDesktopBridge).toHaveBeenCalled();
            expect(mockRestoreAccessTokenFromStoredSession).toHaveBeenCalled();
            expect(mockSyncAuthSessionCookiesFromStorage).toHaveBeenCalled();
            expect(mockNavigateTo).not.toHaveBeenCalled();
        });
    });
});
