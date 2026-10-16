'use client';

import React, { useState } from 'react';
import { useToolPermissions } from '@/lib/hooks/useToolPermissions';
import { type DesktopToolPermissionEntry } from '@/lib/hooks/useDesktopToolPermissions';
import { useLanguage } from '@/lib/providers/LanguageProvider';
import {
  AppModal,
  AppModalBody,
  AppModalHeader,
} from '@/app/components/modals/AppModal';

interface ToolPermissionsModalProps {
  onClose: () => void;
}

function PermissionToggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--chat-accent)_40%,transparent)]',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        checked ? 'bg-[var(--chat-accent)]' : 'bg-[color-mix(in_srgb,var(--modal-fg)_18%,transparent)]',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}

function ToolPermissionRow({
  tool,
  disabled,
  onToggle,
}: {
  tool: DesktopToolPermissionEntry;
  disabled: boolean;
  onToggle: (requiresApproval: boolean) => void;
}) {
  return (
    <div
      className="flex items-start justify-between gap-3 border-b px-3 py-2.5 last:border-b-0"
      style={{ borderColor: 'var(--modal-border)' }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--modal-fg)' }}>{tool.label}</p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--modal-muted-fg)' }}>{tool.description}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <PermissionToggle
          checked={tool.requiresApproval}
          disabled={disabled}
          onChange={onToggle}
          label={`Ask before ${tool.label}`}
        />
        <span className="text-[10px]" style={{ color: 'var(--modal-muted-fg)' }}>
          {tool.requiresApproval ? 'Ask first' : 'Auto-run'}
        </span>
      </div>
    </div>
  );
}

export const ToolPermissionsModal: React.FC<ToolPermissionsModalProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const { loading, state, error, setAutoApproveAll, setToolRequiresApproval } =
    useToolPermissions();
  const [showAutoApproveWarning, setShowAutoApproveWarning] = useState(false);

  const warningDialog = showAutoApproveWarning ? (
    <AppModal open onClose={() => setShowAutoApproveWarning(false)} size="sm" ariaLabelledBy="auto-approve-warn-title">
      <AppModalBody className="!py-4">
        <h3 id="auto-approve-warn-title" className="app-modal-title text-base">
          {t('sidebar.autoApproveWarningTitle', 'Auto-approve all tools?')}
        </h3>
        <p className="app-modal-subtitle mt-2 !text-sm">
          {t(
            'sidebar.autoApproveWarningText',
            'Tools can run without asking — including shell commands, file changes, emails, and other data-altering actions. Only enable this if you trust the current session.',
          )}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border px-3 py-1.5 text-sm"
            style={{ borderColor: 'var(--modal-border)', color: 'var(--modal-fg)' }}
            onClick={() => setShowAutoApproveWarning(false)}
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            className="app-modal-btn-primary px-3 py-1.5 text-sm"
            onClick={() => {
              setAutoApproveAll(true);
              setShowAutoApproveWarning(false);
            }}
          >
            {t('modals.turnOn', 'Turn on')}
          </button>
        </div>
      </AppModalBody>
    </AppModal>
  ) : null;

  return (
    <>
      <AppModal open onClose={onClose} size="md" ariaLabelledBy="tool-permissions-title">
        <AppModalHeader
          titleId="tool-permissions-title"
          title={t('modals.toolPermissionsTitle', 'Tool permissions')}
          subtitle={t(
            'modals.toolPermissionsIntro',
            'Choose which tools should ask for your approval before running. Workflows are not included.',
          )}
          onClose={onClose}
        />
        <AppModalBody className="!pt-2 space-y-3">
          <div
            className="flex items-center justify-between rounded-lg border px-3 py-2.5"
            style={{
              borderColor: 'var(--modal-border)',
              background: 'var(--modal-bg-muted)',
            }}
          >
            <div className="min-w-0 pr-2">
              <p className="text-sm font-medium" style={{ color: 'var(--modal-fg)' }}>
                {t('modals.autoApproveAllTools', 'Auto-approve all tools')}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--modal-muted-fg)' }}>
                {t('modals.autoApproveSkipHint', 'Skip every approval prompt until you turn this off.')}
              </p>
            </div>
            <PermissionToggle
              checked={state?.autoApproveAll ?? false}
              disabled={loading || !state}
              onChange={(next) => {
                if (next) {
                  setShowAutoApproveWarning(true);
                } else {
                  setAutoApproveAll(false);
                }
              }}
              label={t('modals.autoApproveAllTools', 'Auto-approve all tools')}
            />
          </div>

          {state?.autoApproveAll && (
            <p className="text-xs" style={{ color: 'var(--modal-muted-fg)' }}>
              {t(
                'modals.autoApproveOnNotice',
                'All tools will run without asking. Per-tool settings apply again when auto-approve is off.',
              )}
            </p>
          )}

          {loading && (
            <p className="text-sm" style={{ color: 'var(--modal-muted-fg)' }}>
              {t('modals.loadingPermissions', 'Loading permissions…')}
            </p>
          )}

          {error && (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          )}

          {state && (
            <div
              className="overflow-hidden rounded-lg border"
              style={{ borderColor: 'var(--modal-border)' }}
            >
              {state.tools.map((tool) => (
                <ToolPermissionRow
                  key={tool.id}
                  tool={tool}
                  disabled={loading || state.autoApproveAll}
                  onToggle={(requiresApproval) =>
                    void setToolRequiresApproval(tool.id, requiresApproval)
                  }
                />
              ))}
            </div>
          )}
        </AppModalBody>
      </AppModal>
      {warningDialog}
    </>
  );
};

export default ToolPermissionsModal;
