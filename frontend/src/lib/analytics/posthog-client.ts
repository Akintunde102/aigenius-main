import posthog from 'posthog-js';
import {
  getAnalyticsDeployment,
  getAnalyticsEnvironment,
  getPostHogHost,
  getPostHogKey,
  isAnalyticsEnabled,
} from '@/lib/analytics/config';
import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';
import { isAnalyticsConsentGranted } from '@/lib/analytics/analytics-consent';

let initialized = false;

/** CSS selectors masked in session replay to avoid capturing chat content. */
export const SESSION_REPLAY_MASK_TEXT_SELECTOR = [
  '.ph-no-capture',
  '[data-ph-no-capture]',
  '.chat-message',
  '[data-chat-message-index]',
  'textarea',
].join(', ');

export function getPostHogClient(): typeof posthog | null {
  if (!isAnalyticsEnabled() || typeof window === 'undefined') {
    return null;
  }

  if (!isAnalyticsConsentGranted()) {
    return null;
  }

  if (!initialized) {
    const apiKey = getPostHogKey();
    if (!apiKey) {
      return null;
    }

    posthog.init(apiKey, {
      api_host: getPostHogHost(),
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: true,
      persistence: 'localStorage',
      person_profiles: 'identified_only',
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: SESSION_REPLAY_MASK_TEXT_SELECTOR,
      },
    });

    posthog.register({
      platform: isAigeniusDesktopRuntime() ? 'desktop' : 'web',
      environment: getAnalyticsEnvironment(),
      analytics_deployment: getAnalyticsDeployment(),
    });

    initialized = true;
  }

  return posthog;
}

/** Test-only reset — avoids init guard leaking across Jest cases. */
export function resetPostHogClientForTests(): void {
  initialized = false;
}
