const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

/** True when the analytics feature flag is on (banner + consent flow). */
export function isAnalyticsConsentFeatureEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';
}

/** True when PostHog can actually initialize (flag + project key). */
export function isAnalyticsEnabled(): boolean {
  return (
    isAnalyticsConsentFeatureEnabled()
    && Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim())
  );
}

export function getPostHogKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  return key || undefined;
}

export function getPostHogHost(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST;
}

export function getAnalyticsEnvironment(): 'development' | 'production' | 'test' {
  if (process.env.NODE_ENV === 'test') {
    return 'test';
  }
  if (process.env.NODE_ENV === 'development') {
    return 'development';
  }
  return 'production';
}
