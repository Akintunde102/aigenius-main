import { renderHook, waitFor } from '@testing-library/react';
import { useDesktopSessionRestore } from '../use-desktop-session-restore';

const mockEnsureGatewayAuthReady = jest.fn();
const mockGetValidAccessToken = jest.fn();
const mockHasAuthSession = jest.fn();
const mockSyncAuthSessionCookiesFromStorage = jest.fn();
const mockResolveAigeniusDesktopRuntime = jest.fn();
const mockResolveAuthenticatedDesktopShellRedirect = jest.fn();

jest.mock('next/navigation', () => ({
    usePathname: () => '/desktop-login',
}));

jest.mock('@/lib/api/auth-client', () => ({
    ensureGatewayAuthReady: () => mockEnsureGatewayAuthReady(),
    getValidAccessToken: () => mockGetValidAccessToken(),
}));

jest.mock('@/lib/utils/auth-session', () => ({
    hasAuthSession: () => mockHasAuthSession(),
    syncAuthSessionCookiesFromStorage: () => mockSyncAuthSessionCookiesFromStorage(),
}));

jest.mock('@/lib/utils/safe-internal-next-path', () => ({
    resolveAuthenticatedDesktopShellRedirect: (...args: unknown[]) =>
        mockResolveAuthenticatedDesktopShellRedirect(...args),
}));

jest.mock('@/lib/utils/desktop-runtime', () => ({
    DESKTOP_SHELL_ENTRY_QUERY_PARAM: 'aigenius_shell',
    getDesktopShellEntryRuntimeResolveOptions: () => ({ pollMs: 1, maxAttempts: 1 }),
    isAigeniusDesktopRuntime: jest.fn().mockReturnValue(false),
    isDesktopShellFromBuild: jest.fn().mockReturnValue(true),
    isLikelyElectronRenderer: jest.fn().mockReturnValue(false),
    resolveAigeniusDesktopRuntime: (onResolved: (isDesktop: boolean) => void) => {
        mockResolveAigeniusDesktopRuntime();
        onResolved(true);
        return () => undefined;
    },
}));

describe('useDesktopSessionRestore', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockEnsureGatewayAuthReady.mockResolvedValue(undefined);
        mockGetValidAccessToken.mockReturnValue(undefined);
        mockHasAuthSession.mockReturnValue(false);
        mockResolveAuthenticatedDesktopShellRedirect.mockReturnValue('/');
        window.history.replaceState({}, '', '/desktop-login?aigenius_shell=1');
    });

    it('restores a stored desktop session on cold start', async () => {
        mockEnsureGatewayAuthReady.mockResolvedValue('restored-jwt');
        mockGetValidAccessToken.mockReturnValue('restored-jwt');

        const { result } = renderHook(() => useDesktopSessionRestore());

        expect(result.current.restoring).toBe(true);

        await waitFor(() => {
            expect(mockEnsureGatewayAuthReady).toHaveBeenCalled();
            expect(mockSyncAuthSessionCookiesFromStorage).toHaveBeenCalled();
            expect(mockResolveAuthenticatedDesktopShellRedirect).toHaveBeenCalledWith(
                '/desktop-login',
                '?aigenius_shell=1',
            );
        });
    });

    it('stops restoring and shows sign-in when no session exists', async () => {
        const { result } = renderHook(() => useDesktopSessionRestore());

        await waitFor(() => {
            expect(result.current.restoring).toBe(false);
        });

        expect(mockResolveAuthenticatedDesktopShellRedirect).not.toHaveBeenCalled();
    });
});
