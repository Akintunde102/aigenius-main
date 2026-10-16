'use client';

import React from 'react';
import { RenderErrorBoundary } from '@/app/components/RenderErrorBoundary';

export type ToolboxApprovalViewPayload = {
  kind: 'save' | 'run';
  toolName: string;
  scopeLabel: string;
  description?: string;
  usageNotes?: string;
  files: Array<{ path: string; content: string }>;
  capabilityLabels: string[];
  undeclaredFlags: string[];
};

export function ToolboxApprovalDialog({
  payload,
  onDecision,
}: {
  payload: ToolboxApprovalViewPayload;
  onDecision: (approved: boolean) => void;
}) {
  const title = payload.kind === 'save' ? 'Save this toolbox tool?' : 'Run this toolbox tool?';

  return (
    <RenderErrorBoundary logLabel="[toolbox-approval]">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="toolbox-approval-title"
        className="app-modal-panel mx-4 max-h-[90vh] max-w-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="app-modal-panel-header shrink-0">
          <h2 id="toolbox-approval-title" className="text-base font-semibold">
            {title}
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--modal-muted-fg)' }}>
            {payload.scopeLabel}
          </p>
          {payload.description ? (
            <p className="mt-2 text-sm" style={{ color: 'var(--modal-fg)' }}>
              {payload.description}
            </p>
          ) : null}
        </div>
        <div className="app-modal-panel-body min-h-0 flex-1 overflow-y-auto">
          {payload.capabilityLabels.length > 0 ? (
            <ul className="mb-3 list-disc pl-5 text-sm" style={{ color: 'var(--modal-muted-fg)' }}>
              {payload.capabilityLabels.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          ) : null}
          {payload.undeclaredFlags.length > 0 ? (
            <p className="mb-3 text-xs" style={{ color: 'var(--modal-muted-fg)' }}>
              The scan found capabilities not declared by the model: {payload.undeclaredFlags.join(', ')}
            </p>
          ) : null}
          {payload.files.map((file) => (
            <div key={file.path} className="mb-4">
              <div className="mb-1 font-mono text-xs" style={{ color: 'var(--modal-muted-fg)' }}>
                {file.path}
              </div>
              <pre
                className="max-h-48 overflow-auto rounded-lg p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words"
                style={{
                  border: '1px solid var(--modal-border)',
                  background: 'var(--modal-bg-muted)',
                  color: 'var(--modal-fg)',
                }}
              >
                {file.content}
              </pre>
            </div>
          ))}
        </div>
        <div
          className="flex shrink-0 justify-end gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--modal-border)' }}
        >
          <button
            type="button"
            className="app-modal-btn-secondary px-3.5 py-1.5 text-xs"
            onClick={() => onDecision(false)}
          >
            Deny
          </button>
          <button
            type="button"
            className="app-modal-btn-primary px-3.5 py-1.5 text-xs"
            onClick={() => onDecision(true)}
          >
            Approve
          </button>
        </div>
      </div>
    </RenderErrorBoundary>
  );
}
