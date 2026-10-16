import { getSidebarUserInitials } from '@/app/components/model-interface/utils/sidebarUserInitials.utils';

export type AccountDetailsUser = {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  pricePlan?: string | null;
  verified?: boolean;
  createdAt?: string;
  config?: { wallet?: number | null };
};

export function formatMeSidebarMenuLabel(email?: string | null, meLabel = 'Me'): string {
  const trimmed = typeof email === 'string' ? email.trim() : '';
  if (!trimmed) {
    return meLabel;
  }
  return `(${trimmed}) ${meLabel}`;
}

export function formatAccountDisplayName(user: AccountDetailsUser | null | undefined): string {
  if (!user) {
    return '';
  }
  const first = typeof user.firstName === 'string' ? user.firstName.trim() : '';
  const last = typeof user.lastName === 'string' ? user.lastName.trim() : '';
  const combined = [first, last].filter(Boolean).join(' ');
  if (combined) {
    return combined;
  }
  const email = typeof user.email === 'string' ? user.email.trim() : '';
  if (email) {
    return email;
  }
  return 'Account';
}

export function formatPricePlanLabel(plan: string | null | undefined): string {
  if (!plan || typeof plan !== 'string') {
    return 'Free';
  }
  const normalized = plan.trim().toLowerCase();
  if (normalized === 'pro') return 'Pro';
  if (normalized === 'premium') return 'Premium';
  if (normalized === 'free') return 'Free';
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

export function formatMemberSinceDate(createdAt: string | undefined, locale?: string): string | null {
  if (!createdAt) {
    return null;
  }
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatWalletBalance(wallet: number | null | undefined, locale?: string): string {
  const value = typeof wallet === 'number' && Number.isFinite(wallet) ? wallet : 0;
  return value.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getAccountAvatarInitials(user: AccountDetailsUser | null | undefined): string {
  return getSidebarUserInitials(user);
}
