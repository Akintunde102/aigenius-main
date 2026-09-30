/** @jest-environment jsdom */

import {
  isAnalyticsConsentGranted,
  isAnalyticsConsentRequired,
  readAnalyticsConsentChoice,
  writeAnalyticsConsentChoice,
} from '@/lib/analytics/analytics-consent';

describe('analytics-consent', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    window.localStorage.clear();
    delete process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does not grant consent when analytics is disabled', () => {
    writeAnalyticsConsentChoice('granted');
    expect(isAnalyticsConsentGranted()).toBe(false);
  });

  it('requires consent when only the analytics feature flag is on', () => {
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'true';

    expect(isAnalyticsConsentRequired()).toBe(true);
  });

  it('persists granted consent when analytics is enabled', () => {
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'true';
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test';

    writeAnalyticsConsentChoice('granted');

    expect(readAnalyticsConsentChoice()).toBe('granted');
    expect(isAnalyticsConsentGranted()).toBe(true);
  });

  it('persists denied consent', () => {
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'true';
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test';

    writeAnalyticsConsentChoice('denied');

    expect(readAnalyticsConsentChoice()).toBe('denied');
    expect(isAnalyticsConsentGranted()).toBe(false);
  });
});
