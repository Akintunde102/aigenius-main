/** PostHog reserved pageview event — captured manually in Phase 1. */
export const ANALYTICS_PAGE_VIEW = '$pageview' as const;

/** Product event names — snake_case, stable for dashboards and funnels. */
export const ANALYTICS_EVENTS = {
  AUTH_GOOGLE_STARTED: 'auth_google_started',
  AUTH_COMPLETED: 'auth_completed',
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  CHAT_SEND_BLOCKED_INSUFFICIENT_BALANCE: 'chat_send_blocked_insufficient_balance',
  CHAT_RESPONSE_COMPLETED: 'chat_response_completed',
  CHAT_RESPONSE_FAILED: 'chat_response_failed',
  CONVERSATION_OPENED: 'conversation_opened',
  CONVERSATION_CREATED: 'conversation_created',
  CONVERSATION_DELETED: 'conversation_deleted',
  CONVERSATION_PUBLISHED: 'conversation_published',
  MODEL_SELECTED: 'model_selected',
  WALLET_MODAL_OPENED: 'wallet_modal_opened',
  WALLET_TOP_UP_STARTED: 'wallet_top_up_started',
  WALLET_TOP_UP_COMPLETED: 'wallet_top_up_completed',
  WALLET_TOP_UP_FAILED: 'wallet_top_up_failed',
  INTEGRATION_CONNECTED: 'integration_connected',
} as const;

export type AnalyticsEventName =
  typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS]
  | typeof ANALYTICS_PAGE_VIEW;
