'use client';

import React from 'react';
import { classifyDiffLine } from './patch-diff-display.utils';

function lineClass(kind: ReturnType<typeof classifyDiffLine>): string {
  switch (kind) {
    case 'add':
      return 'bg-emerald-50/90 text-emerald-950';
    case 'remove':
      return 'bg-orange-50/90 text-orange-950';
    case 'header':
    case 'hunk':
      return 'bg-slate-100 text-slate-700 font-medium';
    case 'context':
      return 'bg-white text-slate-800';
    default:
      return 'bg-white text-slate-700';
  }
}

export function UnifiedDiffPanel({ lines }: { lines: string[] }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 overflow-hidden">
      <div className="max-h-52 overflow-auto">
        <div className="min-w-0 font-mono text-[11px] leading-[1.35]">
          {lines.map((line, i) => {
            const k = classifyDiffLine(line);
            return (
              <div
                key={i}
                className={`flex gap-0 border-b border-slate-100/80 last:border-b-0 ${lineClass(k)}`}
              >
                <span className="w-8 shrink-0 select-none border-r border-slate-200/80 bg-slate-100/80 text-right pr-1.5 pt-px text-slate-400 tabular-nums">
                  {i + 1}
                </span>
                <pre className="m-0 flex-1 min-w-0 whitespace-pre-wrap break-all px-2 py-px text-inherit">
                  {line || ' '}
                </pre>
              </div>
            );
          })}
        </div>
      </div>
      <p className="border-t border-slate-200 bg-white px-2 py-1.5 text-[10px] text-slate-500">
        Unified-style view of the proposed file body (no previous version is shown—only what the model sent).
      </p>
    </div>
  );
}
