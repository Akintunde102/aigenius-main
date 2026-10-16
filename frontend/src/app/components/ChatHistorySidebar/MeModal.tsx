'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCheck, FiCopy } from 'react-icons/fi';
import { useLanguage } from '@/lib/providers/LanguageProvider';
import { getUserDetails } from '@/lib/calls/get-logged-user-details';
import { RenderErrorBoundary } from '@/app/components/RenderErrorBoundary';
import { AppModal, AppModalBody, AppModalHeader } from '@/app/components/modals/AppModal';
import {
  type AccountDetailsUser,
  formatAccountDisplayName,
  formatMemberSinceDate,
  formatPricePlanLabel,
  formatWalletBalance,
  getAccountAvatarInitials,
} from './me-account-display.utils';

type MeModalProps = {
  onClose: () => void;
};

function MeModalContent({ onClose }: MeModalProps) {
  const { t, languageInfo } = useLanguage();
  const [user, setUser] = useState<AccountDetailsUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const details = (await getUserDetails(true)) as AccountDetailsUser;
      setUser(details);
    } catch {
      setError(t('modals.meLoadError', 'Could not load your account details.'));
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayName = useMemo(() => formatAccountDisplayName(user), [user]);
  const initials = useMemo(() => getAccountAvatarInitials(user), [user]);
  const memberSince = useMemo(
    () => formatMemberSinceDate(user?.createdAt, languageInfo?.code),
    [user?.createdAt, languageInfo?.code],
  );
  const planLabel = useMemo(() => formatPricePlanLabel(user?.pricePlan), [user?.pricePlan]);
  const walletLabel = useMemo(
    () => formatWalletBalance(user?.config?.wallet, languageInfo?.code),
    [user?.config?.wallet, languageInfo?.code],
  );

  const handleCopyId = async () => {
    const id = user?.id?.trim();
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(true);
      window.setTimeout(() => setCopiedId(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <AppModal
      open
      onClose={onClose}
      size="sm"
      ariaLabelledBy="me-modal-title"
      panelClassName="flex max-h-[min(90vh,560px)] flex-col overflow-hidden"
    >
      <AppModalHeader
        titleId="me-modal-title"
        title={t('modals.meTitle', 'Me')}
        subtitle={t('modals.meSubtitle', 'Your account at a glance')}
        onClose={onClose}
      />
      <AppModalBody className="min-h-0 flex-1 overflow-y-auto">
        {loading && (
          <p className="text-sm" style={{ color: 'var(--modal-muted-fg)' }}>
            {t('common.loading', 'Loading...')}
          </p>
        )}

        {!loading && error && (
          <div className="space-y-3">
            <p className="text-sm text-red-500" role="alert">{error}</p>
            <button
              type="button"
              className="app-modal-btn-primary rounded-lg px-3 py-2 text-sm font-medium"
              onClick={() => void load()}
            >
              {t('common.retry', 'Retry')}
            </button>
          </div>
        )}

        {!loading && !error && user && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <div
                className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-lg font-semibold"
                style={{
                  background: 'color-mix(in srgb, var(--chat-accent) 18%, var(--modal-bg-muted))',
                  color: 'var(--chat-accent)',
                  border: '1px solid var(--modal-border)',
                }}
              >
                {user.profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.profileImage}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span aria-hidden>{initials}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold leading-tight">{displayName}</p>
                {user.email && (
                  <p className="mt-1 truncate text-sm" style={{ color: 'var(--modal-muted-fg)' }}>
                    {user.email}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      background: user.verified
                        ? 'color-mix(in srgb, #22c55e 14%, transparent)'
                        : 'color-mix(in srgb, var(--modal-muted-fg) 12%, transparent)',
                      color: user.verified ? '#16a34a' : 'var(--modal-muted-fg)',
                    }}
                  >
                    {user.verified ? (
                      <>
                        <FiCheck size={12} strokeWidth={2.5} aria-hidden />
                        {t('modals.meVerified', 'Email verified')}
                      </>
                    ) : (
                      t('modals.meNotVerified', 'Email not verified')
                    )}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium capitalize"
                    style={{
                      background: 'var(--modal-bg-muted)',
                      border: '1px solid var(--modal-border)',
                      color: 'var(--modal-muted-fg)',
                    }}
                  >
                    {planLabel}
                  </span>
                </div>
              </div>
            </div>

            <dl className="grid gap-3">
              <MeField label={t('modals.meCredits', 'Credit balance')} value={walletLabel} />
              {memberSince && (
                <MeField label={t('modals.meMemberSince', 'Member since')} value={memberSince} />
              )}
              {user.id && (
                <div
                  className="rounded-xl px-3 py-2.5"
                  style={{
                    background: 'var(--modal-bg-muted)',
                    border: '1px solid var(--modal-border)',
                  }}
                >
                  <dt className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--modal-muted-fg)' }}>
                    {t('modals.meUserId', 'User ID')}
                  </dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate text-xs font-mono">{user.id}</code>
                    <button
                      type="button"
                      className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors hover:[background-color:var(--modal-bg)]"
                      style={{ color: 'var(--modal-muted-fg)', border: '1px solid var(--modal-border)' }}
                      onClick={() => void handleCopyId()}
                    >
                      <FiCopy size={12} aria-hidden />
                      {copiedId ? t('common.copied', 'Copied') : t('common.copy', 'Copy')}
                    </button>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </AppModalBody>
    </AppModal>
  );
}

function MeField({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{
        background: 'var(--modal-bg-muted)',
        border: '1px solid var(--modal-border)',
      }}
    >
      <dt className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--modal-muted-fg)' }}>
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}

export function MeModal(props: MeModalProps) {
  return (
    <RenderErrorBoundary logLabel="[me-modal]" recoverable>
      <MeModalContent {...props} />
    </RenderErrorBoundary>
  );
}

export default MeModal;
