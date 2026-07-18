'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiShield } from 'react-icons/fi';
import {
  registerToolApprovalHandler,
  type ToolApprovalPromptRequest,
} from '@/lib/tool-permissions/approval-prompt';

type PendingApproval = ToolApprovalPromptRequest & {
  resolve: (approved: boolean) => void;
};

function summarizeArgs(args?: Record<string, unknown>): string | null {
  if (!args || typeof args !== 'object') {
    return null;
  }
  try {
    const text = JSON.stringify(args, null, 2);
    if (text.length <= 1200) {
      return text;
    }
    return `${text.slice(0, 1200)}\n…`;
  } catch {
    return null;
  }
}

function RuntimeToolApprovalDialog({
  pending,
  onDecision,
}: {
  pending: PendingApproval;
  onDecision: (approved: boolean) => void;
}) {
  const argsPreview = summarizeArgs(pending.arguments);

  const overlay = (
    <div
      role="presentation"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px]"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="runtime-tool-approval-title"
        className="mx-4 w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <FiShield className="text-sky-600" size={18} aria-hidden />
            <h2 id="runtime-tool-approval-title" className="text-lg font-semibold text-gray-900 dark:text-slate-50">
              Allow tool?
            </h2>
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-gray-700 dark:text-slate-200">
            The assistant wants to run <strong>{pending.displayName || pending.tool}</strong>.
          </p>
          {argsPreview && (
            <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-slate-100 p-3 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {argsPreview}
            </pre>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => onDecision(false)}
            >
              Deny
            </button>
            <button
              type="button"
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
              onClick={() => onDecision(true)}
            >
              Allow
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }
  return createPortal(overlay, document.getElementById('modal-root') ?? document.body);
}

export function ToolApprovalProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingApproval | null>(null);
  const queueRef = useRef<PendingApproval[]>([]);

  useEffect(() => {
    registerToolApprovalHandler((request) =>
      new Promise<boolean>((resolve) => {
        const item: PendingApproval = { ...request, resolve };
        queueRef.current.push(item);
        setPending((current) => current ?? item);
      }),
    );
    return () => registerToolApprovalHandler(null);
  }, []);

  const handleDecision = (approved: boolean) => {
    if (!pending) {
      return;
    }
    pending.resolve(approved);
    queueRef.current = queueRef.current.filter((item) => item !== pending);
    const next = queueRef.current[0] ?? null;
    setPending(next);
  };

  return (
    <>
      {children}
      {pending && (
        <RuntimeToolApprovalDialog pending={pending} onDecision={handleDecision} />
      )}
    </>
  );
}
