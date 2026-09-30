import { ANALYTICS_PAGE_VIEW } from '@/lib/analytics/events';
import { getPostHogClient } from '@/lib/analytics/posthog-client';

export type AnalyticsUserTraits = {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  created_at?: string | null;
};

export function trackEvent(
  event: string,
  properties?: Record<string, unknown>,
): void {
  getPostHogClient()?.capture(event, properties);
}

export function capturePageView(pathname: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  trackEvent(ANALYTICS_PAGE_VIEW, {
    $current_url: `${window.location.origin}${pathname}${window.location.search}`,
    pathname,
  });
}

export function identifyAnalyticsUser(
  userId: string,
  traits?: AnalyticsUserTraits,
): void {
  const client = getPostHogClient();
  if (!client || !userId) {
    return;
  }

  const personProperties = Object.fromEntries(
    Object.entries(traits ?? {}).filter(([, value]) => value != null && value !== ''),
  );

  client.identify(userId, personProperties);
}

export function resetAnalytics(): void {
  getPostHogClient()?.reset();
}
