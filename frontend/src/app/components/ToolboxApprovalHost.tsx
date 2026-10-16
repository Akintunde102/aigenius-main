'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';
import { FEATURE_FLAGS } from '@/lib/config/features';
import {
  ToolboxApprovalDialog,
  type ToolboxApprovalViewPayload,
} from './ToolboxApprovalDialog';

type PendingToolbox = {
  requestId: string;
  payload: ToolboxApprovalViewPayload;
  respond: (approved: boolean) => void;
};

export default function ToolboxApprovalHost() {
  const [pending, setPending] = useState<PendingToolbox | null>(null);
  const queueRef = useRef<PendingToolbox[]>([]);

  useEffect(() => {
    if (!FEATURE_FLAGS.TOOLBOX || !isAigeniusDesktopRuntime()) {
      return;
    }
    const bridge = window.aigeniusDesktop as {
      onToolboxApprovalRequest?: (
        handler: (request: {
          requestId: string;
          kind: 'toolbox';
          payload: Record<string, unknown>;
        }) => void,
      ) => () => void;
      respondToolboxApproval?: (requestId: string, approved: boolean) => void;
    };
    if (!bridge?.onToolboxApprovalRequest || !bridge.respondToolboxApproval) {
      return;
    }

    const unsubscribe = bridge.onToolboxApprovalRequest((request) => {
      const raw = request.payload;
      const files = Array.isArray(raw.files)
        ? raw.files
            .filter((f): f is { path: string; content: string } => {
              return (
                f &&
                typeof f === 'object' &&
                typeof (f as { path?: unknown }).path === 'string' &&
                typeof (f as { content?: unknown }).content === 'string'
              );
            })
        : [];
      const item: PendingToolbox = {
        requestId: request.requestId,
        payload: {
          kind: raw.kind === 'run' ? 'run' : 'save',
          toolName: typeof raw.toolName === 'string' ? raw.toolName : 'tool',
          scopeLabel: typeof raw.scopeLabel === 'string' ? raw.scopeLabel : '',
          description: typeof raw.description === 'string' ? raw.description : undefined,
          usageNotes: typeof raw.usageNotes === 'string' ? raw.usageNotes : undefined,
          files,
          capabilityLabels: Array.isArray(raw.capabilityLabels)
            ? raw.capabilityLabels.filter((x): x is string => typeof x === 'string')
            : [],
          undeclaredFlags: Array.isArray(raw.undeclaredFlags)
            ? raw.undeclaredFlags.filter((x): x is string => typeof x === 'string')
            : [],
        },
        respond: (approved) => bridge.respondToolboxApproval!(request.requestId, approved),
      };
      queueRef.current.push(item);
      setPending((current) => current ?? item);
    });

    return () => {
      unsubscribe?.();
      for (const item of queueRef.current) {
        try {
          item.respond(false);
        } catch {
          /* ignore */
        }
      }
      queueRef.current = [];
    };
  }, []);

  const handleDecision = (approved: boolean) => {
    if (!pending) {
      return;
    }
    pending.respond(approved);
    queueRef.current = queueRef.current.filter((item) => item !== pending);
    setPending(queueRef.current[0] ?? null);
  };

  if (!pending || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      role="presentation"
      className="app-modal-overlay z-[10060]"
      onClick={() => handleDecision(false)}
    >
      <ToolboxApprovalDialog payload={pending.payload} onDecision={handleDecision} />
    </div>,
    document.getElementById('modal-root') ?? document.body,
  );
}
