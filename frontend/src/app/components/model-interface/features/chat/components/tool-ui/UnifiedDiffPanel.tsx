'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import 'highlight.js/styles/github.css';
import '@/app/components/model-interface/shared/components/hljs-dark-theme.scss';
import {
  type DiffDisplayLine,
  EXPAND_STEP_LINES,
  sliceDiffWindow,
} from './patch-diff-display.utils';
import { highlightPatchLine } from './patch-diff-highlight.utils';

function lineClass(kind: DiffDisplayLine['kind'], variant: 'default' | 'cursor'): string {
  if (variant === 'cursor') {
    switch (kind) {
      case 'add':
        return 'bg-emerald-950/70 text-emerald-100';
      case 'remove':
        return 'bg-red-950/70 text-red-100';
      case 'context':
        return 'bg-zinc-900 text-zinc-300';
      default:
        return 'bg-zinc-900 text-zinc-400';
    }
  }

  switch (kind) {
    case 'add':
      return 'bg-emerald-50/90 text-emerald-950';
    case 'remove':
      return 'bg-orange-50/90 text-orange-950';
    case 'context':
      return 'bg-white text-slate-800';
    default:
      return 'bg-white text-slate-700';
  }
}

function ExpandButton({
  direction,
  hiddenCount,
  onClick,
}: {
  direction: 'up' | 'down';
  hiddenCount: number;
  onClick: () => void;
}) {
  if (hiddenCount <= 0) return null;
  const Icon = direction === 'up' ? FiChevronUp : FiChevronDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1 border-y border-zinc-800/80 bg-zinc-900/95 py-0.5 text-[10px] text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
      aria-label={direction === 'up' ? `Show ${hiddenCount} more lines above` : `Show ${hiddenCount} more lines below`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      <span className="tabular-nums">{hiddenCount}</span>
    </button>
  );
}

export function UnifiedDiffPanel({
  lines,
  filePath,
  variant = 'default',
}: {
  lines: DiffDisplayLine[];
  filePath: string;
  variant?: 'default' | 'cursor';
}) {
  const isCursor = variant === 'cursor';
  const [expandAbove, setExpandAbove] = useState(0);
  const [expandBelow, setExpandBelow] = useState(0);

  useEffect(() => {
    setExpandAbove(0);
    setExpandBelow(0);
  }, [lines]);

  const window = useMemo(
    () => sliceDiffWindow(lines, expandAbove, expandBelow),
    [lines, expandAbove, expandBelow],
  );

  const highlighted = useMemo(
    () => window.visible.map((line) => highlightPatchLine(line.text, filePath)),
    [window.visible, filePath],
  );

  return (
    <div
      className={
        isCursor
          ? 'overflow-hidden bg-zinc-900'
          : 'rounded-md border border-slate-200 bg-slate-50 overflow-hidden'
      }
    >
      <ExpandButton
        direction="up"
        hiddenCount={window.hiddenAbove}
        onClick={() => setExpandAbove((n) => n + EXPAND_STEP_LINES)}
      />
      <div className={isCursor ? 'max-h-72 overflow-auto' : 'max-h-60 overflow-auto'}>
        <div className="min-w-0 font-mono text-[11px] leading-[1.45]">
          {window.visible.map((line, i) => (
            <div
              key={`${line.lineNumber ?? 'x'}-${i}-${line.prefix}`}
              className={`flex gap-0 ${lineClass(line.kind, variant)}`}
            >
              <span
                className={
                  isCursor
                    ? 'w-9 shrink-0 select-none border-r border-zinc-800/80 pr-1.5 text-right pt-px text-zinc-500 tabular-nums'
                    : 'w-9 shrink-0 select-none border-r border-slate-200/80 bg-slate-100/80 pr-1.5 text-right pt-px text-slate-400 tabular-nums'
                }
              >
                {line.lineNumber ?? ''}
              </span>
              <span
                className={
                  isCursor
                    ? 'w-4 shrink-0 select-none text-center pt-px text-zinc-500'
                    : 'w-4 shrink-0 select-none text-center pt-px text-slate-400'
                }
                aria-hidden
              >
                {line.prefix || ' '}
              </span>
              <pre
                className="hljs m-0 min-w-0 flex-1 whitespace-pre-wrap break-all bg-transparent px-2 py-px text-inherit"
                dangerouslySetInnerHTML={{ __html: highlighted[i] || ' ' }}
              />
            </div>
          ))}
        </div>
      </div>
      <ExpandButton
        direction="down"
        hiddenCount={window.hiddenBelow}
        onClick={() => setExpandBelow((n) => n + EXPAND_STEP_LINES)}
      />
    </div>
  );
}
