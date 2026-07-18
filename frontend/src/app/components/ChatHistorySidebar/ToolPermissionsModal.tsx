'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiShield, FiX } from 'react-icons/fi';
import {
  useToolPermissions,
  type DesktopToolPermissionEntry,
} from '@/lib/hooks/useToolPermissions';

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
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        checked ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-600',
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
    <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 dark:border-slate-700">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-slate-100">{tool.label}</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{tool.description}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <PermissionToggle
          checked={tool.requiresApproval}
          disabled={disabled}
          onChange={onToggle}
          label={`Ask before ${tool.label}`}
        />
        <span className="text-[10px] text-gray-400 dark:text-slate-500">
          {tool.requiresApproval ? 'Ask first' : 'Auto-run'}
        </span>
      </div>
    </div>
  );
}

export const ToolPermissionsModal: React.FC<ToolPermissionsModalProps> = ({ onClose }) => {
  const { loading, state, error, setAutoApproveAll, setToolRequiresApproval } =
    useToolPermissions();
  const [showAutoApproveWarning, setShowAutoApproveWarning] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  const overlay = (
    <div
      role="presentation"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/45 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tool-permissions-title"
        className="mx-4 flex max-h-[min(640px,90vh)] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <FiShield className="text-sky-600" size={18} aria-hidden />
            <h2 id="tool-permissions-title" className="text-lg font-semibold text-gray-900 dark:text-slate-50">
              Tool permissions
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Choose which tools should ask for your approval before running. Workflows are not included.
          </p>

          <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-slate-100">
                Auto-approve all tools
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                Skip every approval prompt until you turn this off.
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
              label="Auto-approve all tools"
            />
          </div>

          {state?.autoApproveAll && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
              All tools will run without asking. Per-tool settings apply again when auto-approve is off.
            </p>
          )}

          {loading && (
            <p className="mt-4 text-sm text-gray-500 dark:text-slate-400">Loading permissions…</p>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {state && (
            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700">
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
        </div>
      </div>
    </div>
  );

  const warningOverlay = showAutoApproveWarning ? (
    <div
      role="presentation"
      className="fixed inset-0 z-[10002] flex items-center justify-center bg-slate-900/50"
      onClick={() => setShowAutoApproveWarning(false)}
    >
      <div
        role="alertdialog"
        className="mx-4 w-full max-w-md rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-50">Auto-approve all tools?</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
          Tools can run without asking — including shell commands, file changes, emails, and other
          data-altering actions. Only enable this if you trust the current session.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm"
            onClick={() => setShowAutoApproveWarning(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white"
            onClick={() => {
              setAutoApproveAll(true);
              setShowAutoApproveWarning(false);
            }}
          >
            Turn on
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (typeof document === 'undefined') {
    return null;
  }

  const portalTarget = document.getElementById('modal-root') ?? document.body;
  return (
    <>
      {createPortal(overlay, portalTarget)}
      {warningOverlay ? createPortal(warningOverlay, portalTarget) : null}
    </>
  );
};

export default ToolPermissionsModal;
