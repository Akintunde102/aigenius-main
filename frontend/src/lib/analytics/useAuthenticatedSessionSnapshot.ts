'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { hasAuthSession } from '@/lib/utils/auth-session';

/** Tracks whether the browser currently has an auth session (for public vs app UI). */
export function useAuthenticatedSessionSnapshot(): boolean {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const sync = () => {
      setIsAuthenticated(hasAuthSession());
    };

    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('auth:token-refreshed', sync);

    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('auth:token-refreshed', sync);
    };
  }, [pathname]);

  return isAuthenticated;
}
