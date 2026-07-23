'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { JsonSyntaxBlock } from '@/app/components/JsonSyntaxBlock';
import { FiLoader, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { valueToDisplayString } from '@/lib/utils/messageTextUtils';
import { getToolDisplayName } from '../toolDisplayNames';
import { ERROR_MESSAGES } from '../../hooks/chatOperations.constants';
import type { ToolStreamingCardProps } from '../tool-streaming-card.types';
import { toolStreamingInlineStatus } from '../tool-streaming-inline-status';
import { MarkdownRenderer } from '@/app/components/model-interface/shared/components/MarkdownRenderer';
import {
  parsePatchOperationsForDisplay,
  type ParsedPatchOperation,
} from './parse-patch-operations-display.utils';
import {
  buildContentDiffLines,
  buildDeleteDiffLines,
  buildHunkDiffLines,
} from './patch-diff-display.utils';
import { PatchFileDiffCard } from './PatchFileDiffCard';

function opBadgeLabel(kind: ParsedPatchOperation['kind']): string | undefined {
  switch (kind) {
    case 'create_file':
      return 'Create';
    case 'update_file':
      return 'Update';
    case 'apply_hunk':
      return 'Hunk';
    case 'delete_file':
      return 'Delete';
    default:
      return undefined;
  }
}

function confidenceBadgeClass(tier: string): string {
  if (tier === 'static-certain') return 'bg-emerald-50 text-emerald-800 border-emerald-100';
  if (tier === 'static-heuristic') return 'bg-amber-50 text-amber-900 border-amber-100';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

export function LocalApplyPatchToolCard({
  streaming_tool,
  result,
  arguments: toolArgsProp,
  groupItem = false,
}: ToolStreamingCardProps) {
  const { displayName, logs, loading, success } = streaming_tool;
  const toolArgs = toolArgsProp ?? streaming_tool.arguments;
  const [inputOpen, setInputOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [containerCollapsed, setContainerCollapsed] = useState(false);
  const wasLoadingRef = useRef(loading);

  const parsed = useMemo(() => parsePatchOperationsForDisplay(toolArgs), [toolArgs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const msg = valueToDisplayString(log.message);
      return !msg.toLowerCase().includes('running on your device');
    });
  }, [logs]);

  const parsedResult = useMemo(() => {
    if (!result) return null;
    try {
      return JSON.parse(result) as Record<string, unknown>;
    } catch {
      return { raw: result };
    }
  }, [result]);

  const blastRadius = useMemo(() => {
    const br = parsedResult?.blastRadius;
    if (!br || typeof br !== 'object') return null;
    const o = br as Record<string, unknown>;
    const certain = typeof o.certain === 'number' ? o.certain : 0;
    const heuristic = typeof o.heuristic === 'number' ? o.heuristic : 0;
    const inferred = typeof o.inferred === 'number' ? o.inferred : 0;
    const total = typeof o.total === 'number' ? o.total : certain + heuristic + inferred;
    if (total <= 0) return null;
    return { certain, heuristic, inferred, total };
  }, [parsedResult]);

  const contentToRender = useMemo(() => {
    if (!parsedResult) return null;
    let rawStr = '';
    if (typeof parsedResult !== 'object') {
      rawStr = valueToDisplayString(parsedResult);
    } else if (parsedResult.error) {
      rawStr = ERROR_MESSAGES.TOOL_EXECUTION_FAILED;
    } else if (parsedResult.message) {
      rawStr = valueToDisplayString(parsedResult.message);
    } else if (parsedResult.result) {
      rawStr = valueToDisplayString(parsedResult.result);
    } else {
      const keys = Object.keys(parsedResult).filter((k) => k !== 'success' && k !== 'activityTitle');
      if (keys.length === 1) {
        rawStr = valueToDisplayString(parsedResult[keys[0]]);
      }
    }
    if (!rawStr) return null;
    return rawStr.replace(/\\n/g, '\n').replace(/\\r/g, '').trim();
  }, [parsedResult]);

  useEffect(() => {
    if (wasLoadingRef.current && !loading) {
      if (success === false) {
        setResultOpen(true);
      }
    }
    wasLoadingRef.current = loading;
  }, [loading, success]);

  const activityTitle = toolArgs?.activityTitle as string | undefined;
  const resolvedDisplayName = activityTitle || displayName || getToolDisplayName('local_apply_patch');
  const statusText = toolStreamingInlineStatus(loading, success);

  const patchFileCards = parsed.ok ? (
    <div className="space-y-2">
      {parsed.operations.map((op, i) => {
        if (op.kind === 'invalid') {
          return (
            <div key={i} className="rounded-lg border border-red-200 bg-red-50/50 px-3 py-2 text-[11px] text-red-800">
              {op.detail}
            </div>
          );
        }
        if (op.kind === 'delete_file') {
          return (
            <PatchFileDiffCard
              key={i}
              path={op.path}
              lines={buildDeleteDiffLines()}
              badgeLabel="Delete"
            />
          );
        }
        if (op.kind === 'apply_hunk') {
          const lines = buildHunkDiffLines(op.search, op.replace);
          if (lines.length === 0) return null;
          return (
            <PatchFileDiffCard
              key={i}
              path={op.path}
              lines={lines}
              badgeLabel={opBadgeLabel(op.kind)}
            />
          );
        }
        if (!op.content) {
          return null;
        }
        return (
          <PatchFileDiffCard
            key={i}
            path={op.path}
            lines={buildContentDiffLines(op.content)}
            badgeLabel={opBadgeLabel(op.kind)}
          />
        );
      })}
    </div>
  ) : null;

  if (groupItem) {
    return (
      <div className="min-w-0 space-y-2">
        {patchFileCards}
        {filteredLogs.length > 0 ? (
          <p className="text-[11px] text-slate-500">{valueToDisplayString(filteredLogs[0].message)}</p>
        ) : null}
        {success === false && contentToRender ? (
          <p className="text-[11px] text-red-700">{contentToRender}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="my-1 w-full text-[12px] leading-snug text-slate-600">
      <button
        type="button"
        onClick={() => setContainerCollapsed(!containerCollapsed)}
        className="flex w-full flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-sm px-0 py-0.5 text-left transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/80"
        aria-expanded={!containerCollapsed}
      >
        <span className="min-w-0 shrink font-medium text-slate-700">{resolvedDisplayName}</span>
        <span className="shrink-0 text-slate-400">· {statusText}</span>
        <span className="shrink-0 text-slate-400 tabular-nums" aria-hidden>
          {containerCollapsed ? '▸' : '▾'}
        </span>
      </button>

      {!containerCollapsed && (
        <div className="mt-1.5 space-y-3 border-l border-slate-200/90 pl-2.5 text-[11px] leading-relaxed text-slate-600">
          {blastRadius && (
            <div className="rounded border border-sky-100 bg-sky-50/40 p-2">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                Structural impact
              </div>
              <div className="flex flex-wrap gap-1.5">
                {blastRadius.certain > 0 && (
                  <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${confidenceBadgeClass('static-certain')}`}>
                    {blastRadius.certain} confirmed
                  </span>
                )}
                {blastRadius.heuristic > 0 && (
                  <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${confidenceBadgeClass('static-heuristic')}`}>
                    {blastRadius.heuristic} heuristic
                  </span>
                )}
                {blastRadius.inferred > 0 && (
                  <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${confidenceBadgeClass('inferred')}`}>
                    {blastRadius.inferred} inferred
                  </span>
                )}
              </div>
            </div>
          )}

          {patchFileCards}

          {!parsed.ok && parsed.detail ? (
            <p className="italic text-slate-400">{parsed.detail}</p>
          ) : null}

          {filteredLogs.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-start gap-2">
                <span
                  className={`mt-1.5 shrink-0 font-mono text-[10px] text-slate-400 select-none ${loading && filteredLogs.length === 1 ? 'animate-pulse' : ''}`}
                >
                  {loading && filteredLogs.length === 1 ? '•' : '–'}
                </span>
                <p className="min-w-0 flex-1">{valueToDisplayString(filteredLogs[0].message)}</p>
              </div>
            </div>
          )}

          <div className="space-y-2.5 border-t border-slate-200/70 pt-2">
            {toolArgs && Object.keys(toolArgs).length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setInputOpen(!inputOpen)}
                  className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600"
                >
                  <span>Input</span>
                  {inputOpen ? <FiChevronUp className="h-3 w-3" aria-hidden /> : <FiChevronDown className="h-3 w-3" aria-hidden />}
                </button>
                {inputOpen && (
                  <div className="mt-1 space-y-0.5 border-l border-slate-200/80 pl-2 text-slate-500">
                    {Object.entries(toolArgs).map(([k, v]) => {
                      if (k === 'activityTitle') return null;
                      return (
                        <div key={k} className="flex gap-1.5">
                          <span className="shrink-0 font-semibold text-slate-400">{k}:</span>
                          <span className="break-all">{typeof v === 'string' ? v : JSON.stringify(v)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {(parsedResult !== null || loading) && (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => parsedResult !== null && setResultOpen(!resultOpen)}
                  className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                    loading ? 'text-slate-700' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  disabled={loading && parsedResult === null}
                >
                  <span>Result</span>
                  {loading && parsedResult === null ? (
                    <FiLoader className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
                  ) : resultOpen ? (
                    <FiChevronUp className="h-3 w-3" aria-hidden />
                  ) : (
                    <FiChevronDown className="h-3 w-3" aria-hidden />
                  )}
                </button>
                {resultOpen && parsedResult !== null && (
                  <div
                    className={`custom-scrollbar max-h-[180px] overflow-y-auto rounded-sm border px-2.5 py-2 text-[11px] leading-relaxed border-slate-200/90 ${
                      success === false ? 'text-red-900' : 'text-slate-900'
                    }`}
                  >
                    {contentToRender ? (
                      <MarkdownRenderer content={contentToRender} className="markdown-tool-result" />
                    ) : (
                      <div className="opacity-80">
                        <JsonSyntaxBlock
                          value={parsedResult}
                          preClassName="max-h-60 border-none bg-transparent p-0"
                          codeClassName="text-[10px] leading-snug"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
