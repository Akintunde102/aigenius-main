/**
 * Desktop cold-start: expired access JWT + keychain refresh token must restore
 * without clearing the session.
 */

const mockGetString = jest.fn();
const mockSetString = jest.fn();
const mockRemoveItem = jest.fn();
const mockAxiosPost = jest.fn();
const mockHasAuthSession = jest.fn();
const mockCanUseHttpOnlyRefreshCookie = jest.fn();
const mockCanUseDesktopStoredRefreshToken = jest.fn();
const mockReadDesktopStoredRefreshToken = jest.fn();
const mockWriteDesktopStoredRefreshToken = jest.fn();
const mockWaitForAigeniusDesktopBridge = jest.fn();
const mockIsAigeniusDesktopRuntime = jest.fn();
const mockIsDesktopShellFromBuild = jest.fn();
const mockIsLikelyElectronRenderer = jest.fn();

jest.mock('@/lib/utils/store', () => ({
    __esModule: true,
    storage: () => ({
        getString: mockGetString,
        setString: mockSetString,
        removeItem: mockRemoveItem,
    }),
}));

jest.mock('@/lib/utils/navigate', () => ({
    __esModule: true,
    navigateTo: jest.fn(),
}));

jest.mock('@/lib/e2e-wallet-bypass', () => ({
    __esModule: true,
    getE2eWalletBypassHeaders: () => ({}),
}));

jest.mock('@/lib/links', () => ({
    __esModule: true,
    LINKS: {
        internalPages: { login: { github: '/login' } },
        noboxAPIRootUrl: 'http://api.test',
    },
}));

jest.mock('@/lib/utils/auth-session', () => ({
    __esModule: true,
    canUseHttpOnlyRefreshCookie: () => mockCanUseHttpOnlyRefreshCookie(),
    hasAuthSession: () => mockHasAuthSession(),
    syncAuthSessionCookiesFromStorage: jest.fn(),
}));

jest.mock('@/lib/utils/desktop-auth-refresh', () => ({
    __esModule: true,
    canUseDesktopStoredRefreshToken: () => mockCanUseDesktopStoredRefreshToken(),
    readDesktopStoredRefreshToken: () => mockReadDesktopStoredRefreshToken(),
    writeDesktopStoredRefreshToken: (...args: unknown[]) => mockWriteDesktopStoredRefreshToken(...args),
    getDesktopNativeClientHeaders: () => ({ 'x-aigenius-desktop': '1' }),
    clearDesktopStoredRefreshToken: jest.fn(),
}));

jest.mock('@/lib/api/resolve-gateway-api-root', () => ({
    __esModule: true,
    primeDesktopGatewayApiRoot: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/utils/desktop-runtime', () => ({
    __esModule: true,
    isAigeniusDesktopRuntime: () => mockIsAigeniusDesktopRuntime(),
    isDesktopShellFromBuild: () => mockIsDesktopShellFromBuild(),
    isLikelyElectronRenderer: () => mockIsLikelyElectronRenderer(),
    waitForAigeniusDesktopBridge: (...args: unknown[]) => mockWaitForAigeniusDesktopBridge(...args),
}));

jest.mock('axios', () => ({
    __esModule: true,
    default: {
        post: (...args: unknown[]) => mockAxiosPost(...args),
        create: jest.fn(() => ({
            interceptors: {
                request: { use: jest.fn() },
                response: { use: jest.fn() },
            },
        })),
    },
    AxiosHeaders: class {
        private headers = new Map<string, string>();
        constructor(init?: Record<string, string>) {
            if (init) {
                for (const [key, value] of Object.entries(init)) {
                    this.headers.set(key, value);
                }
            }
        }
        set(key: string, value: string) {
            this.headers.set(key, value);
        }
        has(key: string) {
            return this.headers.has(key);
        }
    },
}));

function futureJwt(secondsFromNow: number): string {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + secondsFromNow }))
        .toString('base64url');
    return `${header}.${payload}.sig`;
}

describe('restoreAccessTokenFromStoredSession', () => {
    beforeEach(() => {
        jest.resetModules();
        mockGetString.mockReset();
        mockSetString.mockReset();
        mockRemoveItem.mockReset();
        mockAxiosPost.mockReset();
        mockHasAuthSession.mockReset();
        mockCanUseHttpOnlyRefreshCookie.mockReset();
        mockCanUseDesktopStoredRefreshToken.mockReset();
        mockReadDesktopStoredRefreshToken.mockReset();
        mockWriteDesktopStoredRefreshToken.mockReset();
        mockWaitForAigeniusDesktopBridge.mockReset();
        mockIsAigeniusDesktopRuntime.mockReset();
        mockIsDesktopShellFromBuild.mockReset();
        mockIsLikelyElectronRenderer.mockReset();

        mockCanUseHttpOnlyRefreshCookie.mockReturnValue(false);
        mockCanUseDesktopStoredRefreshToken.mockReturnValue(true);
        mockIsAigeniusDesktopRuntime.mockReturnValue(true);
        mockIsDesktopShellFromBuild.mockReturnValue(true);
        mockIsLikelyElectronRenderer.mockReturnValue(true);
        mockWaitForAigeniusDesktopBridge.mockResolvedValue(true);
        mockReadDesktopStoredRefreshToken.mockResolvedValue('desktop-refresh-token');
    });

    it('returns the existing access token when it is still valid', async () => {
        const validToken = futureJwt(3600);
        mockGetString.mockReturnValue(validToken);

        const { restoreAccessTokenFromStoredSession } = await import('@/lib/api/auth-client');
        await expect(restoreAccessTokenFromStoredSession()).resolves.toBe(validToken);
        expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('refreshes via the desktop refresh token when the access JWT is expired', async () => {
        const expiredToken = futureJwt(-60);
        const refreshedToken = futureJwt(3600);
        mockGetString.mockImplementation(() => {
            if (mockSetString.mock.calls.length > 0) {
                return mockSetString.mock.calls[mockSetString.mock.calls.length - 1][0];
            }
            return expiredToken;
        });
        mockHasAuthSession.mockReturnValue(true);
        mockAxiosPost.mockResolvedValue({
            data: { token: refreshedToken, refreshToken: 'rotated-refresh' },
        });

        const { restoreAccessTokenFromStoredSession } = await import('@/lib/api/auth-client');
        await expect(restoreAccessTokenFromStoredSession()).resolves.toBe(refreshedToken);

        expect(mockAxiosPost).toHaveBeenCalledWith(
            'http://api.test/auth/_/refresh',
            { refreshToken: 'desktop-refresh-token' },
            expect.objectContaining({
                headers: expect.objectContaining({ 'x-aigenius-desktop': '1' }),
            }),
        );
        expect(mockSetString).toHaveBeenCalledWith(refreshedToken);
        expect(mockWriteDesktopStoredRefreshToken).toHaveBeenCalledWith('rotated-refresh');
    });

    it('waits for the Electron bridge before attempting desktop refresh', async () => {
        const expiredToken = futureJwt(-60);
        const refreshedToken = futureJwt(3600);
        mockGetString.mockReturnValue(expiredToken);
        mockHasAuthSession.mockReturnValue(true);
        mockIsAigeniusDesktopRuntime.mockReturnValue(false);
        mockAxiosPost.mockResolvedValue({ data: { token: refreshedToken } });

        const { restoreAccessTokenFromStoredSession } = await import('@/lib/api/auth-client');
        await restoreAccessTokenFromStoredSession();

        expect(mockWaitForAigeniusDesktopBridge).toHaveBeenCalledWith(8000);
    });

    it('returns undefined when there is no stored session or refresh token', async () => {
        mockGetString.mockReturnValue(undefined);
        mockHasAuthSession.mockReturnValue(false);
        mockReadDesktopStoredRefreshToken.mockResolvedValue(undefined);

        const { restoreAccessTokenFromStoredSession } = await import('@/lib/api/auth-client');
        await expect(restoreAccessTokenFromStoredSession()).resolves.toBeUndefined();
        expect(mockAxiosPost).not.toHaveBeenCalled();
    });
});
