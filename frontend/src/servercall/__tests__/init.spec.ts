/**
 * Unit tests for frontend/src/servercall/init.ts › handleServerError
 *
 * Mocking strategy
 * ─────────────────
 * 1. 'servercall'           → createServerCall returns the config object directly,
 *                             giving us access to handleServerError without HTTP.
 * 2. '@/lib/utils/navigate' → navigateTo / reloadPage are jest fns – no need to
 *                             touch window.location (non-configurable in jsdom).
 * 3. '@/lib/utils/store'    → storage() always returns the same spy fns.
 */

// ─── shared spy refs ────────────────────────────────────────────────────────
const mockSetString   = jest.fn();
const mockRemoveItem  = jest.fn();
const mockGetString   = jest.fn();
const mockNavigateTo  = jest.fn();
const mockRefreshAccessToken = jest.fn();
const mockHandleSessionExpired = jest.fn();
const mockIsRefreshableAuthError = jest.fn();
const mockIsSessionTerminalError = jest.fn();
const mockBaseServerCall = jest.fn();

// ─── module mocks ────────────────────────────────────────────────────────────

jest.mock('@/lib/utils/navigate', () => ({
    __esModule: true,
    navigateTo: (...args: any[]) => mockNavigateTo(...args),
}));

jest.mock('@/lib/api/auth-client', () => ({
    __esModule: true,
    handleSessionExpired: (...args: any[]) => mockHandleSessionExpired(...args),
    isRefreshableAuthError: (...args: any[]) => mockIsRefreshableAuthError(...args),
    isSessionTerminalError: (...args: any[]) => mockIsSessionTerminalError(...args),
    refreshAccessToken: (...args: any[]) => mockRefreshAccessToken(...args),
    shouldLogoutOnRefreshFailure: (e: unknown) => {
        if (e instanceof Error && e.message === 'network') {
            return false;
        }
        return true;
    },
}));

jest.mock('@/lib/utils/store', () => ({
    __esModule: true,
    storage: () => ({
        setString: mockSetString,
        removeItem: mockRemoveItem,
        getString:  mockGetString,
    }),
}));

jest.mock('@/lib/links', () => ({
    __esModule: true,
    LINKS: {
        internalPages: { login: { github: '/login' } },
        noboxAPIRootUrl: 'http://api.test',
    },
}));

jest.mock('@/lib/constants', () => ({
    __esModule: true,
    storageConstants: {
        NOBOX_TOKEN:           'nobox_token',
        NOBOX_CLIENT_TOKEN:    'nobox_client_token',
        LOGGED_USER_DETAILS:   'logged_user_details',
        NOBOX_REFRESH_TOKEN:   'nobox_refresh_token',
    },
}));

// createServerCall returns the config object so handleServerError is accessible
jest.mock('servercall', () => ({
    __esModule: true,
    createServerCall: jest.fn().mockImplementation((cfg: any) => {
        const callable = (...args: any[]) => mockBaseServerCall(...args);
        return Object.assign(callable, cfg);
    }),
}));

// ─── imports ─────────────────────────────────────────────────────────────────
import { serverCall } from '../init';

// ─── helpers ─────────────────────────────────────────────────────────────────
/** Fresh reference every call – guards against stale closure captures. */
const fn = () => (serverCall as any).handleServerError as (args: any) => void;
const invoke = (args: any) => (serverCall as any)(args);

const makeError = (responseOverride: Record<string, any>) => ({
    error: { response: responseOverride },
});

// ─── suite ───────────────────────────────────────────────────────────────────
describe('serverCall › handleServerError', () => {
    beforeEach(() => {
        mockSetString .mockClear();
        mockRemoveItem.mockClear();
        mockGetString .mockClear();
        mockNavigateTo.mockClear();
        mockRefreshAccessToken.mockClear();
        mockHandleSessionExpired.mockClear();
        mockBaseServerCall.mockReset();
        mockIsRefreshableAuthError.mockReset();
        mockIsSessionTerminalError.mockReset();
        mockHandleSessionExpired.mockImplementation(() => {
            mockNavigateTo('/login');
        });
        mockIsRefreshableAuthError.mockImplementation((error: any) => error?.response?.data?.error === 'Authorization error');
        mockIsSessionTerminalError.mockImplementation((error: any) => error?.response?.data?.error === 'Token has been revoked' || error?.response?.data?.code === 'TOKEN_STALE');
    });

    // ── Network Error ──────────────────────────────────────────────────────────
    describe('network errors', () => {
        it('rethrows the raw network error and does nothing else', () => {
            expect(() => fn()({ error: { message: 'Network Error' } })).toThrow('Network Error');
            expect(mockNavigateTo).not.toHaveBeenCalled();
            expect(mockRemoveItem).not.toHaveBeenCalled();
        });
    });

    // ── Token-level session expiry ─────────────────────────────────────────────
    describe('session expiry', () => {
        it('clears all session storage and redirects to /login when token is revoked', async () => {
            mockBaseServerCall.mockRejectedValue({ response: { data: { error: 'Token has been revoked' } } });
            await expect(invoke({ serverCallProps: { call: 'anything' } })).rejects.toEqual(
                expect.objectContaining({ response: { data: { error: 'Token has been revoked' } } }),
            );

            expect(mockHandleSessionExpired).toHaveBeenCalled();
            expect(mockNavigateTo).toHaveBeenCalledWith('/login');
        });

        it('clears session and redirects when token is stale (TOKEN_STALE / 401)', async () => {
            mockBaseServerCall.mockRejectedValue({ response: { status: 401, data: { code: 'TOKEN_STALE' } } });
            await expect(invoke({ serverCallProps: { call: 'anything' } })).rejects.toEqual(
                expect.objectContaining({ response: { status: 401, data: { code: 'TOKEN_STALE' } } }),
            );

            expect(mockHandleSessionExpired).toHaveBeenCalled();
            expect(mockNavigateTo).toHaveBeenCalledWith('/login');
        });
    });

    // ── Authorization error – silent refresh path ──────────────────────────────
    describe('silent token refresh', () => {
        it('handleServerError rethrows refreshable auth errors for the wrapper to handle', () => {
            expect(() => fn()(makeError({ data: { error: 'Authorization error' } }))).toThrow();
        });

        it('retries the original request after a successful refresh instead of reloading', async () => {
            mockBaseServerCall
                .mockRejectedValueOnce({ response: { data: { error: 'Authorization error' } } })
                .mockResolvedValueOnce({ dataReturned: { ok: true } });
            mockRefreshAccessToken.mockResolvedValue('new-access');

            const result = await invoke({ serverCallProps: { call: 'anything' } });

            expect(result).toEqual({ dataReturned: { ok: true } });
            expect(mockRefreshAccessToken).toHaveBeenCalledTimes(1);
            expect(mockBaseServerCall).toHaveBeenCalledTimes(2);
            expect(mockNavigateTo).not.toHaveBeenCalledWith('/login');
        });

        it('does not log out when refresh fails with a recoverable (e.g. network) error', async () => {
            mockBaseServerCall.mockRejectedValue({ response: { data: { error: 'Authorization error' } } });
            mockRefreshAccessToken.mockRejectedValue(new Error('network'));

            await expect(invoke({ serverCallProps: { call: 'anything' } })).rejects.toThrow('network');
            expect(mockHandleSessionExpired).not.toHaveBeenCalled();
            expect(mockNavigateTo).not.toHaveBeenCalled();
        });

        it('logs out when refresh fails with an auth error from the server', async () => {
            mockBaseServerCall.mockRejectedValue({ response: { data: { error: 'Authorization error' } } });
            mockRefreshAccessToken.mockRejectedValue({
                isAxiosError: true,
                response: { status: 401, data: { error: 'Invalid refresh request' } },
            });

            await expect(invoke({ serverCallProps: { call: 'anything' } })).rejects.toMatchObject({
                response: { status: 401 },
            });
            expect(mockHandleSessionExpired).toHaveBeenCalled();
            expect(mockNavigateTo).toHaveBeenCalledWith('/login');
        });
    });

    // ── Bad Request (validation arrays from NestJS) ────────────────────────────
    describe('bad request errors', () => {
        it('throws a comma-joined string when message is an array', () => {
            let thrown: unknown;
            try {
                fn()(makeError({ data: { error: 'Bad Request', message: ['Name required', 'Email invalid'] } }));
            } catch (e) { thrown = e; }

            expect(thrown).toBe('Name required, Email invalid');
        });

        it('throws the scalar message string when message is a plain string', () => {
            let thrown: unknown;
            try {
                fn()(makeError({ data: { error: 'Bad Request', message: 'Validation failed' } }));
            } catch (e) { thrown = e; }

            expect(thrown).toBe('Validation failed');
        });
    });

    // ── Generic API errors ─────────────────────────────────────────────────────
    describe('generic api errors', () => {
        it('throws the dataMessage array for errors with an array message field', () => {
            let thrown: unknown;
            try {
                fn()(makeError({ data: { message: ['first error', 'second error'] } }));
            } catch (e) { thrown = e; }

            expect(thrown).toEqual(['first error', 'second error']);
        });

        it('throws the string error field for errors with a string error field', () => {
            let thrown: unknown;
            try {
                fn()(makeError({ data: { error: 'Something went wrong' } }));
            } catch (e) { thrown = e; }

            expect(thrown).toBe('Something went wrong');
        });

        it('throws the raw error object when no message or error fields exist', () => {
            const rawError = { response: { data: {} } };
            let thrown: unknown;
            try {
                fn()({ error: rawError });
            } catch (e) { thrown = e; }

            expect(thrown).toBe(rawError);
        });

        it('throws the raw error when there is no response body at all', () => {
            const rawError = { message: 'unknown failure' };
            let thrown: unknown;
            try {
                fn()({ error: rawError });
            } catch (e) { thrown = e; }

            expect(thrown).toBe(rawError);
        });
    });
});
