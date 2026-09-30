'use client';

import { useEffect } from 'react';
import { getStoredUserDetailsSnapshot, getUserDetails } from '@/lib/calls/get-logged-user-details';
import { identifyAnalyticsUser } from '@/lib/analytics/track';
import { getPostHogClient } from '@/lib/analytics/posthog-client';
import { useAuthReady } from '@/lib/hooks/useAuthReady';
import { useAnalyticsConsent } from '@/lib/analytics/useAnalyticsConsent';

type StoredUserDetails = {
  id?: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
};

function resolveUserTraits(user: StoredUserDetails) {
  return {
    email: user.email,
    first_name: user.firstName,
    last_name: user.lastName,
    created_at: user.createdAt ?? user.created_at,
  };
}

function identifyStoredUser(user: StoredUserDetails | null | undefined): boolean {
  if (!user?.id) {
    return false;
  }

  identifyAnalyticsUser(user.id, resolveUserTraits(user));
  return true;
}

/**
 * Links the PostHog person profile to the logged-in gateway user once auth is ready.
 */
export function useAnalyticsIdentity(): void {
  const authReady = useAuthReady();
  const { consentGranted } = useAnalyticsConsent();

  useEffect(() => {
    if (!authReady || !consentGranted) {
      return;
    }

    getPostHogClient();

    if (identifyStoredUser(getStoredUserDetailsSnapshot<StoredUserDetails>())) {
      return;
    }

    void getUserDetails()
      .then((user) => {
        identifyStoredUser(user as StoredUserDetails);
      })
      .catch(() => undefined);
  }, [authReady, consentGranted]);
}
