/** @jest-environment jsdom */

jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    register: jest.fn(),
  },
}));

import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { trackChatMessageSent } from '@/lib/analytics/product-events';
import posthog from 'posthog-js';
import {
  getPostHogClient,
  resetPostHogClientForTests,
  SESSION_REPLAY_MASK_TEXT_SELECTOR,
} from '@/lib/analytics/posthog-client';
import {
  capturePageView,
  identifyAnalyticsUser,
  resetAnalytics,
  trackEvent,
} from '@/lib/analytics/track';

const capture = posthog.capture as jest.Mock;
const identify = posthog.identify as jest.Mock;
const reset = posthog.reset as jest.Mock;

const localStorageStore: Record<string, string> = {};

function installWorkingLocalStorageMock(): void {
  Object.keys(localStorageStore).forEach((key) => delete localStorageStore[key]);
  (window.localStorage.getItem as jest.Mock).mockImplementation(
    (key: string) => localStorageStore[key] ?? null,
  );
  (window.localStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
    localStorageStore[key] = value;
  });
  (window.localStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
    delete localStorageStore[key];
  });
  (window.localStorage.clear as jest.Mock).mockImplementation(() => {
    Object.keys(localStorageStore).forEach((key) => delete localStorageStore[key]);
  });
}

describe('analytics track', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    installWorkingLocalStorageMock();
    resetPostHogClientForTests();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('is a no-op when analytics is disabled', () => {
    trackEvent('test_event');
    capturePageView('/chat/abc');
    identifyAnalyticsUser('user-1', { email: 'a@example.com' });
    resetAnalytics();

    expect(getPostHogClient()).toBeNull();
    expect(capture).not.toHaveBeenCalled();
    expect(identify).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
  });

  it('captures events when analytics is enabled', () => {
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'true';
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key';
    window.localStorage.setItem('aigenius_analytics_consent_v1', 'granted');

    trackEvent('test_event', { source: 'jest' });

    expect(posthog.init).toHaveBeenCalledWith(
      'phc_test_key',
      expect.objectContaining({
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: SESSION_REPLAY_MASK_TEXT_SELECTOR,
        },
      }),
    );
    expect(capture).toHaveBeenCalledWith('test_event', { source: 'jest' });
  });

  it('identifies users with non-empty traits only', () => {
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'true';
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key';
    window.localStorage.setItem('aigenius_analytics_consent_v1', 'granted');

    identifyAnalyticsUser('user-123', {
      email: 'user@example.com',
      first_name: 'Ada',
      last_name: null,
    });

    expect(identify).toHaveBeenCalledWith('user-123', {
      email: 'user@example.com',
      first_name: 'Ada',
    });
  });

  it('routes product events through the shared capture helper', () => {
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'true';
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key';
    window.localStorage.setItem('aigenius_analytics_consent_v1', 'granted');

    trackChatMessageSent({
      model: { id: 'anthropic/claude-sonnet-4', ownedBy: 'anthropic' },
      streaming: true,
      messageCount: 3,
      hasAttachments: false,
    });

    expect(capture).toHaveBeenCalledWith(ANALYTICS_EVENTS.CHAT_MESSAGE_SENT, {
      model_id: 'anthropic/claude-sonnet-4',
      provider: 'anthropic',
      streaming: true,
      message_count: 3,
    });
  });
});
