'use client';

import React from 'react';
import { UnifiedDiffPanel } from './UnifiedDiffPanel';
import {
  countDiffDisplayStats,
  fileExtensionLabel,
  fileNameFromPath,
  type DiffDisplayLine,
} from './patch-diff-display.utils';
import { openLocalFilePreviewFromPath } from '@/app/components/model-interface/shared/components/localFilePreview';
import { isAbsoluteFilesystemPath } from '@/lib/utils/localPathLinks';

export function PatchFileDiffCard({
  path,
  lines,
  badgeLabel,
}: {
  path: string;
  lines: DiffDisplayLine[];
  badgeLabel?: string;
}) {
  const stats = countDiffDisplayStats(lines);
  const fileName = fileNameFromPath(path);
  const extLabel = fileExtensionLabel(path);
  const canOpen = isAbsoluteFilesystemPath(path);

  const handleOpen = (event: React.MouseEvent) => {
    if (!canOpen) return;
    event.preventDefault();
    event.stopPropagation();
    openLocalFilePreviewFromPath(path);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-700/60 bg-zinc-900 text-zinc-100 shadow-sm">
      <div className="flex items-center gap-2 border-b border-zinc-700/70 px-3 py-2">
        <span
          className="shrink-0 rounded border border-sky-500/40 bg-sky-950/60 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-300"
          aria-hidden
        >
          {extLabel}
        </span>
        {canOpen ? (
          <button
            type="button"
            onClick={handleOpen}
            className="min-w-0 truncate font-mono text-[12px] text-sky-300 underline decoration-sky-500/40 underline-offset-2 transition-colors hover:text-sky-200"
            title={path}
          >
            {fileName}
          </button>
        ) : (
          <span className="min-w-0 truncate font-mono text-[12px] text-zinc-100" title={path}>
            {fileName}
          </span>
        )}
        {badgeLabel ? (
          <span className="shrink-0 rounded border border-zinc-600 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-300">
            {badgeLabel}
          </span>
        ) : null}
        <span className="ml-auto flex shrink-0 items-center gap-1.5 font-mono text-[11px] tabular-nums">
          {stats.additions > 0 ? (
            <span className="text-emerald-400">+{stats.additions}</span>
          ) : null}
          {stats.deletions > 0 ? (
            <span className="text-red-400">-{stats.deletions}</span>
          ) : null}
        </span>
      </div>
      <UnifiedDiffPanel lines={lines} filePath={path} variant="cursor" />
    </div>
  );
}
