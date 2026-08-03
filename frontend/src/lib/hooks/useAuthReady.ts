'use client';

import { useEffect, useState } from 'react';
import { getValidAccessToken, subscribeToTokenRefresh } from '@/lib/api/auth-client';

/**
 * True once a JWT is present — use to gate React Query / effects that need gateway auth.
 */
export function useAuthReady(): boolean {
    const [ready, setReady] = useState(() =>
        typeof window !== 'undefined' && Boolean(getValidAccessToken()),
    );

    useEffect(() => {
        if (ready) {
            return;
        }

        const markReady = () => {
            if (getValidAccessToken()) {
                setReady(true);
            }
        };

        markReady();
        const unsubscribe = subscribeToTokenRefresh(markReady);
        const pollId = window.setInterval(markReady, 50);

        return () => {
            unsubscribe();
            window.clearInterval(pollId);
        };
    }, [ready]);

    return ready;
}
