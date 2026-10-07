const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

/** True when the analytics feature flag is on (banner + consent flow). */
export function isAnalyticsConsentFeatureEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';
}

function isNextDevelopmentBuild(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
}

/**
 * Local Tilt / `next dev`: use a separate PostHog project via NEXT_PUBLIC_POSTHOG_KEY_DEV.
 * Auto-consent applies only in this mode (see analytics-consent.ts).
 */
export function isAnalyticsLocalDevMode(): boolean {
  return (
    isAnalyticsConsentFeatureEnabled()
    && isNextDevelopmentBuild()
    && Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY_DEV?.trim())
  );
}

/** True when PostHog can actually initialize (flag + project key). */
export function isAnalyticsEnabled(): boolean {
  return isAnalyticsConsentFeatureEnabled() && Boolean(getPostHogKey());
}

export function getPostHogKey(): string | undefined {
  if (isNextDevelopmentBuild()) {
    const devKey = process.env.NEXT_PUBLIC_POSTHOG_KEY_DEV?.trim();
    if (devKey) {
      return devKey;
    }
  }

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  return key || undefined;
}

export function getAnalyticsDeployment(): 'local' | 'production' {
  return isAnalyticsLocalDevMode() ? 'local' : 'production';
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
