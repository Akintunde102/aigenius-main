import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import {
  analyticsAuthVariant,
  analyticsModelProps,
  analyticsWalletProvider,
  classifyChatFailureReason,
} from '@/lib/analytics/analytics-props.utils';
import { trackEvent } from '@/lib/analytics/track';
import type { Model } from '@/app/components/model-interface/shared/types';

type AuthVariant = 'login' | 'signup';

type ModelLike = Pick<Model, 'id'> & { ownedBy?: string | null } | null | undefined;

export function trackAuthGoogleStarted(variant: AuthVariant): void {
  trackEvent(ANALYTICS_EVENTS.AUTH_GOOGLE_STARTED, analyticsAuthVariant(variant));
}

export function trackAuthCompleted(args: {
  method: 'google';
  variant?: AuthVariant;
  isNewUser?: boolean;
}): void {
  trackEvent(ANALYTICS_EVENTS.AUTH_COMPLETED, {
    method: args.method,
    ...(args.variant ? analyticsAuthVariant(args.variant) : {}),
    ...(args.isNewUser === true ? { is_new_user: true } : {}),
  });
}

export function trackChatMessageSent(args: {
  model: ModelLike;
  streaming: boolean;
  conversationId?: string | null;
  messageCount: number;
  hasAttachments?: boolean;
}): void {
  trackEvent(ANALYTICS_EVENTS.CHAT_MESSAGE_SENT, {
    ...analyticsModelProps(args.model),
    streaming: args.streaming,
    ...(args.conversationId ? { conversation_id: args.conversationId } : {}),
    message_count: args.messageCount,
    ...(args.hasAttachments ? { has_attachments: true } : {}),
  });
}

export function trackChatSendBlockedInsufficientBalance(args: {
  model: ModelLike;
  requiredBalance: number;
  walletBalance: number | null;
}): void {
  trackEvent(ANALYTICS_EVENTS.CHAT_SEND_BLOCKED_INSUFFICIENT_BALANCE, {
    ...analyticsModelProps(args.model),
    required_balance: args.requiredBalance,
    ...(args.walletBalance != null ? { wallet_balance: args.walletBalance } : {}),
  });
}

export function trackChatResponseCompleted(args: {
  model: ModelLike;
  streaming: boolean;
  durationMs: number;
  conversationId?: string | null;
}): void {
  trackEvent(ANALYTICS_EVENTS.CHAT_RESPONSE_COMPLETED, {
    ...analyticsModelProps(args.model),
    streaming: args.streaming,
    duration_ms: Math.max(0, Math.round(args.durationMs)),
    ...(args.conversationId ? { conversation_id: args.conversationId } : {}),
  });
}

export function trackChatResponseFailed(args: {
  model: ModelLike;
  streaming: boolean;
  durationMs: number;
  error: unknown;
  conversationId?: string | null;
}): void {
  trackEvent(ANALYTICS_EVENTS.CHAT_RESPONSE_FAILED, {
    ...analyticsModelProps(args.model),
    streaming: args.streaming,
    duration_ms: Math.max(0, Math.round(args.durationMs)),
    failure_reason: classifyChatFailureReason(args.error),
    ...(args.conversationId ? { conversation_id: args.conversationId } : {}),
  });
}

export function trackConversationOpened(conversationId: string): void {
  trackEvent(ANALYTICS_EVENTS.CONVERSATION_OPENED, { conversation_id: conversationId });
}

export function trackConversationCreated(): void {
  trackEvent(ANALYTICS_EVENTS.CONVERSATION_CREATED);
}

export function trackConversationDeleted(conversationId: string): void {
  trackEvent(ANALYTICS_EVENTS.CONVERSATION_DELETED, { conversation_id: conversationId });
}

export function trackConversationPublished(args: {
  conversationId: string;
  isRepublishing: boolean;
}): void {
  trackEvent(ANALYTICS_EVENTS.CONVERSATION_PUBLISHED, {
    conversation_id: args.conversationId,
    is_republishing: args.isRepublishing,
  });
}

export function trackModelSelected(args: {
  model: ModelLike;
  source: 'model_picker';
}): void {
  trackEvent(ANALYTICS_EVENTS.MODEL_SELECTED, {
    ...analyticsModelProps(args.model),
    source: args.source,
  });
}

export function trackWalletModalOpened(): void {
  trackEvent(ANALYTICS_EVENTS.WALLET_MODAL_OPENED);
}

export function trackWalletTopUpStarted(args: {
  provider: string;
  credits: number;
}): void {
  trackEvent(ANALYTICS_EVENTS.WALLET_TOP_UP_STARTED, {
    ...analyticsWalletProvider(args.provider),
    credits: args.credits,
  });
}

export function trackWalletTopUpCompleted(args: {
  provider?: string;
  reference?: string | null;
}): void {
  trackEvent(ANALYTICS_EVENTS.WALLET_TOP_UP_COMPLETED, {
    ...analyticsWalletProvider(args.provider),
    ...(args.reference ? { payment_reference: args.reference } : {}),
  });
}

export function trackWalletTopUpFailed(args: {
  provider?: string;
  reference?: string | null;
  reason?: string;
}): void {
  trackEvent(ANALYTICS_EVENTS.WALLET_TOP_UP_FAILED, {
    ...analyticsWalletProvider(args.provider),
    ...(args.reference ? { payment_reference: args.reference } : {}),
    ...(args.reason ? { failure_reason: args.reason } : {}),
  });
}

export function trackIntegrationConnected(args: {
  integration: 'gmail' | 'linkedin';
  success: boolean;
}): void {
  trackEvent(ANALYTICS_EVENTS.INTEGRATION_CONNECTED, {
    integration: args.integration,
    success: args.success,
  });
}
