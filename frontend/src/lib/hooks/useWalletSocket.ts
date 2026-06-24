'use client';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken, refreshAccessToken, subscribeToTokenRefresh } from '@/lib/api/auth-client';
import { clearUserDetailsCache } from '@/lib/calls/get-logged-user-details';

interface WalletUpdatedPayload {
    userId: string;
    newBalance: number;
    reason: string;
}

interface UseWalletSocketOptions {
    onWalletUpdated: (newBalance: number) => void;
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

    // Keep callbackRef fresh without reconnecting the socket
    useEffect(() => {
        callbackRef.current = onWalletUpdated;
    }, [onWalletUpdated]);

    useEffect(() => {
        const backendUrl = process.env.NEXT_PUBLIC_NOBOX_API_ROOT_URL;
        const token = getAccessToken();

        if (!token || !backendUrl) return;

        const socket = io(`${backendUrl}/wallet`, {
            auth: { token },
            transports: ['websocket'],
            reconnectionAttempts: 5,
            reconnectionDelay: 3000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            // Only log if we stayed connected for more than a brief moment
            // to avoid spamming during React dev-mode double mounts.
        });

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

        const unsubscribe = subscribeToTokenRefresh(() => {
            const latestToken = getAccessToken();
            if (!latestToken) return;
            socket.auth = { token: latestToken };
            if (!socket.connected) {
                socket.connect();
            }
        });

        return () => {
            unsubscribe();
            socket.disconnect();
            socketRef.current = null;
        };
    }, []); // intentionally empty — connect once per mount
}
