import type { Model } from '@/app/components/model-interface/shared/types';

type ModelLike = Pick<Model, 'id'> & { ownedBy?: string | null } | null | undefined;

/** Safe model metadata for analytics — never includes prompts or message text. */
export function analyticsModelProps(model: ModelLike) {
  if (!model?.id) {
    return {};
  }

  const provider = typeof model.ownedBy === 'string' ? model.ownedBy : undefined;

  return {
    model_id: model.id,
    ...(provider ? { provider } : {}),
  };
}

export function analyticsAuthVariant(variant: 'login' | 'signup') {
  return { auth_variant: variant };
}

export function classifyChatFailureReason(error: unknown): string {
  if ((error as { name?: string })?.name === 'AbortError') {
    return 'aborted';
  }

  const message = (error as { message?: string })?.message?.toLowerCase() ?? '';
  if (message.includes('abort')) {
    return 'aborted';
  }
  if (message.includes('insufficient') || message.includes('wallet')) {
    return 'insufficient_balance';
  }
  if (message.includes('session') || message.includes('auth')) {
    return 'auth';
  }

  return 'unknown';
}

export function analyticsWalletProvider(
  provider: 'paystack' | 'payaza' | 'flutterwave' | string | undefined,
) {
  return provider ? { payment_provider: provider } : {};
}

type MessageContent = string | Array<{
  type: string;
  image_url?: { url: string };
  file_url?: { url: string; name?: string };
  input_audio?: { data: string; format: string };
}>;

export function messageHasAttachments(content: MessageContent | undefined): boolean {
  if (!Array.isArray(content)) {
    return false;
  }

  return content.some((part) =>
    part.type === 'image_url'
    || part.type === 'file_url'
    || Boolean(part.input_audio),
  );
}
