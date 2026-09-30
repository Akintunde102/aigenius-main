'use client';

import { useEffect } from 'react';
import { capturePageView } from '@/lib/analytics/track';
import { getPostHogClient } from '@/lib/analytics/posthog-client';
import { useAnalyticsConsent } from '@/lib/analytics/useAnalyticsConsent';

/** Fires a manual PostHog `$pageview` when the route pathname changes. */
export function useAnalyticsPageView(pathname: string | null | undefined): void {
  const { consentGranted } = useAnalyticsConsent();

  useEffect(() => {
    if (!pathname || !consentGranted) {
      return;
    }

    getPostHogClient();
    capturePageView(pathname);
  }, [pathname, consentGranted]);
}
