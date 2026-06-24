import { getAccessToken, handleSessionExpired as expireAuthSession, isRefreshableAuthError, isSessionTerminalError, refreshAccessToken, shouldLogoutOnRefreshFailure } from '@/lib/api/auth-client';
import { LINKS } from '@/lib/links';
import { createServerCall } from 'servercall';

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

const baseServerCall = createServerCall({
    baseUrl: LINKS.noboxAPIRootUrl,
    logger: console,
    defaultAuthSource: () => getAccessToken() || "",
    defaultResponseDataDept: (response: any) => response?.['data'],
    successFieldDept: (response: any) => !!response.data,
    handleServerError: rawHandleServerError,
});

async function executeAuthorizedServerCall(args: any, allowRetry = true): Promise<any> {
    try {
        return await (baseServerCall as any)(args);
    } catch (error: any) {
        if (isSessionTerminalError(error)) {
            handleSessionExpired('revoked');
            throw error;
        }

        if (allowRetry && isRefreshableAuthError(error)) {
            try {
                await refreshAccessToken();
            } catch (refreshError) {
                if (shouldLogoutOnRefreshFailure(refreshError)) {
                    handleSessionExpired('refresh_failed');
                }
                throw refreshError;
            }

            return executeAuthorizedServerCall(args, false);
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
