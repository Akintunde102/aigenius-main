import { getValidAccessToken, handleSessionExpired as expireAuthSession, isAuthorizationFailure, isJwtExpired, isRefreshableAuthError, isSessionTerminalError, refreshAccessToken, shouldLogoutOnRefreshFailure } from '@/lib/api/auth-client';
import {
    getLocalMiniServerApiRootUrl,
    isDesktopProxyFailure,
    resolveGatewayApiBaseCandidates,
} from '@/lib/api/resolve-gateway-api-root';
import { LINKS } from '@/lib/links';
import { getLoggedUserToken } from '@/lib/calls/get-token';
import { canUseHttpOnlyRefreshCookie } from '@/lib/utils/auth-session';
import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';
import { createServerCall } from 'servercall';
import { isSuccessfulServerResponseBody, normalizeServerResponseBody } from '@/servercall/response-body';

/**
 * Force a clean logout and redirect to login.
 * Called when:
 *  - JWT is invalid / expired ("Authorization error")
 *  - JWT was revoked via the blocklist ("Token has been revoked")
 *  - JWT claims are stale — plan changed mid-session ("TOKEN_STALE")
 */
const handleSessionExpired = (reason?: string) => {
    // Clear cached tokens and user data so the next login starts fresh
    expireAuthSession();
}

function resolveAuthorizedRequestToken(): string {
    const accessToken = getValidAccessToken();
    if (accessToken) {
        return accessToken;
    }

    const fallback = getLoggedUserToken();
    if (!fallback) {
        return '';
    }

    // Gateway auth middleware expects a JWT; avoid sending the API key when the JWT slot is empty.
    if (fallback.split('.').length !== 3 || isJwtExpired(fallback)) {
        return '';
    }
    return fallback;
}

const rawHandleServerError = (args: any) => {
    const { error } = args;

    if (error.message === "Network Error") {
        throw error;
    }

    const { error: dataError, message: dataMessage } = error.response?.data ?? {};

    if (isSessionTerminalError(error) || isRefreshableAuthError(error)) {
        throw error;
    }

    const mappedDataMessageError = dataMessage?.error?.join?.("");
    const errorMessage = Array.isArray(dataMessage)
        ? dataMessage
        : Array.isArray(dataError)
            ? dataError[0]
            : dataError;

    if (dataMessage?.length && dataError === "Bad Request") {
        throw Array.isArray(dataMessage) ? dataMessage.join(", ") : dataMessage;
    }

    throw mappedDataMessageError || errorMessage || error;
};

const serverCallConfig = {
    logger: console,
    defaultAuthSource: () => resolveAuthorizedRequestToken(),
    defaultResponseDataDept: (response: any) => normalizeServerResponseBody(response?.data),
    successFieldDept: (response: any) => isSuccessfulServerResponseBody(response?.data),
    handleServerError: rawHandleServerError,
};

const serverCallsByBase = new Map<string, ReturnType<typeof createServerCall>>();

function getServerCallForBase(baseUrl: string) {
    const normalized = baseUrl.replace(/\/+$/, '');
    let call = serverCallsByBase.get(normalized);
    if (!call) {
        call = createServerCall({
            baseUrl: normalized,
            ...serverCallConfig,
        });
        serverCallsByBase.set(normalized, call);
    }
    return call;
}

const defaultLocalBase = getLocalMiniServerApiRootUrl() || LINKS.noboxAPIRootUrl;
const baseServerCall = getServerCallForBase(defaultLocalBase);

async function executeAuthorizedServerCall(
    args: any,
    allowRetry = true,
    baseIndex = 0,
    bases?: string[],
): Promise<any> {
    const candidates = bases ?? await resolveGatewayApiBaseCandidates();
    const baseUrl = candidates[baseIndex] ?? candidates[0] ?? defaultLocalBase;
    const call = getServerCallForBase(baseUrl);

    try {
        return await (call as any)(args);
    } catch (error: any) {
        if (baseIndex + 1 < candidates.length && isDesktopProxyFailure(error)) {
            return executeAuthorizedServerCall(args, allowRetry, baseIndex + 1, candidates);
        }

        if (isSessionTerminalError(error)) {
            handleSessionExpired('revoked');
            throw error;
        }

        if (allowRetry && isAuthorizationFailure(error)) {
            if (canUseHttpOnlyRefreshCookie()) {
                try {
                    await refreshAccessToken();
                } catch (refreshError) {
                    if (shouldLogoutOnRefreshFailure(refreshError)) {
                        handleSessionExpired('refresh_failed');
                    }
                    throw refreshError;
                }

                return executeAuthorizedServerCall(args, false, baseIndex, candidates);
            }

            if (isAigeniusDesktopRuntime()) {
                handleSessionExpired('desktop_auth');
            }
        }

        throw error;
    }
}

type ServerCallFn = typeof baseServerCall & {
    handleServerError: typeof rawHandleServerError;
};

export const serverCall = Object.assign(
    ((args: any) => executeAuthorizedServerCall(args)) as ServerCallFn,
    {
        handleServerError: rawHandleServerError,
    },
);
