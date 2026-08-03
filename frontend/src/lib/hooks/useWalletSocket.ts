'use client';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { canUseHttpOnlyRefreshCookie } from '@/lib/utils/auth-session';
import { getAccessToken, refreshAccessToken, subscribeToTokenRefresh } from '@/lib/api/auth-client';
import { resolveDesktopUpstreamApiRootUrl, getLocalMiniServerApiRootUrl } from '@/lib/api/resolve-gateway-api-root';
import { clearUserDetailsCache } from '@/lib/calls/get-logged-user-details';
import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';

interface WalletUpdatedPayload {
    userId: string;
    newBalance: number;
    reason: string;
}

interface UseWalletSocketOptions {
    onWalletUpdated: (newBalance: number) => void;
}

async function resolveWalletSocketBaseUrl(): Promise<string | null> {
    const localApi = getLocalMiniServerApiRootUrl();
    if (!localApi) {
        return null;
    }

    if (!isAigeniusDesktopRuntime()) {
        return localApi;
    }

    const upstream = await resolveDesktopUpstreamApiRootUrl();
    return upstream || localApi;
}

/**
 * Connects to the /wallet Socket.io namespace on the backend.
 * Authenticates via the stored JWT, then fires `onWalletUpdated`
 * whenever the server pushes a `wallet:updated` event for this user.
 *
 * The connection is established only once and cleaned up on unmount.
 */
export function useWalletSocket({ onWalletUpdated }: UseWalletSocketOptions) {
    const socketRef = useRef<Socket | null>(null);
    const callbackRef = useRef(onWalletUpdated);
    const retryingRefreshRef = useRef(false);

    useEffect(() => {
        callbackRef.current = onWalletUpdated;
    }, [onWalletUpdated]);

    useEffect(() => {
        let cancelled = false;
        let unsubscribe: (() => void) | undefined;

        void (async () => {
            const token = getAccessToken();
            const backendUrl = await resolveWalletSocketBaseUrl();

            if (!token || !backendUrl || cancelled) {
                return;
            }

            const socket = io(`${backendUrl}/wallet`, {
                auth: { token },
                transports: ['websocket'],
                reconnectionAttempts: 5,
                reconnectionDelay: 3000,
            });

            socketRef.current = socket;

            socket.on('wallet:updated', (payload: WalletUpdatedPayload) => {
                console.log('[WalletSocket] wallet:updated', payload);
                clearUserDetailsCache();
                callbackRef.current(payload.newBalance);
            });

            socket.on('disconnect', (reason) => {
                if (reason !== 'io client disconnect') {
                    console.log('[WalletSocket] disconnected:', reason);
                }
            });

            socket.on('connect_error', (err) => {
                console.warn('[WalletSocket] connect_error:', err.message);
                if (!canUseHttpOnlyRefreshCookie()) {
                    return;
                }
                if (retryingRefreshRef.current) {
                    return;
                }

                retryingRefreshRef.current = true;
                refreshAccessToken()
                    .then((newToken) => {
                        socket.auth = { token: newToken };
                        socket.connect();
                    })
                    .catch(() => undefined)
                    .finally(() => {
                        retryingRefreshRef.current = false;
                    });
            });

            unsubscribe = subscribeToTokenRefresh(() => {
                const latestToken = getAccessToken();
                if (!latestToken) return;
                socket.auth = { token: latestToken };
                if (!socket.connected) {
                    socket.connect();
                }
            });
        })();

        return () => {
            cancelled = true;
            unsubscribe?.();
            socketRef.current?.disconnect();
            socketRef.current = null;
        };
    }, []);
}
