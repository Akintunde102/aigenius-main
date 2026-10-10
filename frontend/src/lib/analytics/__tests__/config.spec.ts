import {
  getAnalyticsDeployment,
  getPostHogKey,
  isAnalyticsLocalDevMode,
} from '@/lib/analytics/config';

describe('analytics config', () => {
  const originalEnv = process.env;

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses the dev PostHog key during next dev when configured', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      NEXT_PUBLIC_ENABLE_ANALYTICS: 'true',
      NEXT_PUBLIC_POSTHOG_KEY_DEV: 'phc_dev',
      NEXT_PUBLIC_POSTHOG_KEY: 'phc_prod',
    };

    expect(getPostHogKey()).toBe('phc_dev');
    expect(isAnalyticsLocalDevMode()).toBe(true);
    expect(getAnalyticsDeployment()).toBe('local');
  });

  it('uses the production key in production builds', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      NEXT_PUBLIC_POSTHOG_KEY_DEV: 'phc_dev',
      NEXT_PUBLIC_POSTHOG_KEY: 'phc_prod',
    };

    expect(getPostHogKey()).toBe('phc_prod');
    expect(isAnalyticsLocalDevMode()).toBe(false);
    expect(getAnalyticsDeployment()).toBe('production');
  });

  it('never uses the dev key in production builds', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      NEXT_PUBLIC_POSTHOG_KEY_DEV: 'phc_dev',
    };

    expect(getPostHogKey()).toBeUndefined();
  });
});
