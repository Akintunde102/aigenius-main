'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';

type ShellApprovalPayload = {
  command: string;
  cwdDisplay: string;
  timeoutLabel: string;
};

type PatchApprovalRow = {
  variant: 'create' | 'update' | 'delete';
  verb: string;
  fileName: string;
  directory: string;
  fullPath: string;
};

type PatchApprovalPayload = {
  count: number;
  rows: PatchApprovalRow[];
  blastRadius?: {
    certain: number;
    heuristic: number;
    inferred: number;
    total: number;
  };
};

type DesktopToolApprovalRequest = {
  requestId: string;
  kind: 'shell' | 'patch';
  payload: Record<string, unknown>;
};

type PendingApproval =
  | {
      requestId: string;
      kind: 'shell';
      payload: ShellApprovalPayload;
      respond: (approved: boolean) => void;
    }
  | {
      requestId: string;
      kind: 'patch';
      payload: PatchApprovalPayload;
      respond: (approved: boolean) => void;
    };

function ShellApprovalDialog({
  payload,
  onDecision,
}: {
  payload: ShellApprovalPayload;
  onDecision: (approved: boolean) => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="desktop-shell-approval-title"
      className="app-modal-panel mx-4 max-w-lg"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="app-modal-panel-header">
        <h2 id="desktop-shell-approval-title" className="text-base font-semibold">
          Allow this command?
        </h2>
        <p className="mt-1 text-xs" style={{ color: 'var(--modal-muted-fg)' }}>
          <span className="font-semibold">Dir</span> {payload.cwdDisplay}
          {' · '}
          <span className="font-semibold">Limit</span> {payload.timeoutLabel}
        </p>
      </div>
      <div className="app-modal-panel-body">
        <pre
          className="max-h-56 overflow-auto rounded-lg p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words"
          style={{
            border: '1px solid var(--modal-border)',
            background: 'var(--modal-bg-muted)',
            color: 'var(--modal-fg)',
          }}
        >
          {payload.command}
        </pre>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
            style={{
              border: '1px solid var(--modal-border)',
              color: 'var(--modal-muted-fg)',
            }}
            onClick={() => onDecision(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="app-modal-btn-primary px-4 py-2 text-sm"
            onClick={() => onDecision(true)}
          >
            Run
          </button>
        </div>
      </div>
    </div>
  );
}

function PatchApprovalDialog({
  payload,
  onDecision,
}: {
  payload: PatchApprovalPayload;
  onDecision: (approved: boolean) => void;
}) {
  const title =
    payload.count === 1 ? 'Apply 1 file change?' : `Apply ${payload.count} file changes?`;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="desktop-patch-approval-title"
      className="app-modal-panel mx-4 max-w-lg"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="app-modal-panel-header">
        <h2 id="desktop-patch-approval-title" className="text-base font-semibold">
          {title}
        </h2>
        {payload.blastRadius && payload.blastRadius.total > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
            {payload.blastRadius.certain > 0 && (
              <span
                className="rounded-md px-2 py-1"
                style={{
                  border: '1px solid color-mix(in srgb, var(--chat-accent) 30%, var(--modal-border))',
                  background: 'color-mix(in srgb, var(--chat-accent) 10%, transparent)',
                  color: 'var(--chat-accent)',
                }}
              >
                {payload.blastRadius.certain} confirmed
              </span>
            )}
            {payload.blastRadius.heuristic > 0 && (
              <span
                className="rounded-md px-2 py-1"
                style={{
                  border: '1px solid var(--modal-border)',
                  background: 'var(--modal-bg-muted)',
                  color: 'var(--modal-fg)',
                }}
              >
                {payload.blastRadius.heuristic} heuristic
              </span>
            )}
            {payload.blastRadius.inferred > 0 && (
              <span
                className="rounded-md px-2 py-1"
                style={{
                  border: '1px solid var(--modal-border)',
                  background: 'var(--surface-muted)',
                  color: 'var(--modal-muted-fg)',
                }}
              >
                {payload.blastRadius.inferred} inferred
              </span>
            )}
          </div>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto px-5 py-3">
        {payload.rows.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: 'var(--modal-muted-fg)' }}>
            No changes.
          </p>
        ) : (
          <ul className="space-y-2">
            {payload.rows.map((row) => (
              <li
                key={`${row.variant}-${row.fullPath}`}
                className="flex items-start gap-3 rounded-lg px-3 py-2.5"
                style={{
                  border: '1px solid var(--modal-border)',
                  background: 'var(--modal-bg-muted)',
                }}
                title={row.fullPath}
              >
                <span
                  className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    border: '1px solid var(--modal-border)',
                    background: 'color-mix(in srgb, var(--chat-accent) 12%, transparent)',
                    color: 'var(--chat-accent)',
                  }}
                >
                  {row.verb}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{row.fileName}</div>
                  <div className="truncate text-xs" style={{ color: 'var(--modal-muted-fg)' }}>
                    {row.directory}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div
        className="flex justify-end gap-2 px-5 py-4"
        style={{ borderTop: '1px solid var(--modal-border)' }}
      >
        <button
          type="button"
          className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
          style={{
            border: '1px solid var(--modal-border)',
            color: 'var(--modal-muted-fg)',
          }}
          onClick={() => onDecision(false)}
        >
          Cancel
        </button>
        <button
          type="button"
          className="app-modal-btn-primary px-4 py-2 text-sm"
          onClick={() => onDecision(true)}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

function ApprovalOverlay({
  pending,
  onDecision,
}: {
  pending: PendingApproval;
  onDecision: (approved: boolean) => void;
}) {
  const overlay = (
    <div
      role="presentation"
      className="app-modal-overlay z-[10050]"
      onClick={() => onDecision(false)}
    >
      {pending.kind === 'shell' ? (
        <ShellApprovalDialog payload={pending.payload} onDecision={onDecision} />
      ) : (
        <PatchApprovalDialog payload={pending.payload} onDecision={onDecision} />
      )}
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }
  return createPortal(overlay, document.getElementById('modal-root') ?? document.body);
}

/**
 * Listens for main-process local tool approval requests and shows an in-app modal.
 * Avoids separate Electron BrowserWindows that can render blank on Windows.
 */
export default function DesktopToolApprovalHost() {
  const [pending, setPending] = useState<PendingApproval | null>(null);
  const queueRef = useRef<PendingApproval[]>([]);

  useEffect(() => {
    if (!isAigeniusDesktopRuntime()) {
      return;
    }
    const bridge = window.aigeniusDesktop;
    if (!bridge?.onToolApprovalRequest || !bridge.respondToolApproval) {
      return;
    }

    return bridge.onToolApprovalRequest((request: DesktopToolApprovalRequest) => {
      console.log('[DEBUG] DesktopToolApprovalHost received onToolApprovalRequest:', request);
      const item: PendingApproval =
        request.kind === 'shell'
          ? {
              requestId: request.requestId,
              kind: 'shell',
              payload: request.payload as ShellApprovalPayload,
              respond: (approved) => {
                console.log(`[DEBUG] Responding to tool approval ${request.requestId} with:`, approved);
                bridge.respondToolApproval!(request.requestId, approved);
              },
            }
          : {
              requestId: request.requestId,
              kind: 'patch',
              payload: request.payload as PatchApprovalPayload,
              respond: (approved) => {
                console.log(`[DEBUG] Responding to tool approval ${request.requestId} with:`, approved);
                bridge.respondToolApproval!(request.requestId, approved);
              },
            };
      queueRef.current.push(item);
      setPending((current) => current ?? item);
    });
  }, []);

  const handleDecision = (approved: boolean) => {
    if (!pending) {
      return;
    }
    pending.respond(approved);
    queueRef.current = queueRef.current.filter((item) => item !== pending);
    setPending(queueRef.current[0] ?? null);
  };

  if (!pending) {
    return null;
  }

  return <ApprovalOverlay pending={pending} onDecision={handleDecision} />;
}
