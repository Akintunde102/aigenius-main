'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { JsonSyntaxBlock } from '@/app/components/JsonSyntaxBlock';
import { FiLoader, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { valueToDisplayString } from '@/lib/utils/messageTextUtils';
import { getToolDisplayName } from '../toolDisplayNames';
import type { ToolStreamingCardProps } from '../tool-streaming-card.types';
import { toolStreamingInlineStatus } from '../tool-streaming-inline-status';
import { MarkdownRenderer } from '@/app/components/model-interface/shared/components/MarkdownRenderer';
import {
  parsePatchOperationsForDisplay,
  proposedBodyAsUnifiedDiffLines,
  type ParsedPatchOperation,
} from './parse-patch-operations-display.utils';
import { UnifiedDiffPanel } from './UnifiedDiffPanel';

function opBadge(kind: ParsedPatchOperation['kind']): { label: string; className: string } {
  switch (kind) {
    case 'create_file':
      return { label: 'Create', className: 'bg-emerald-50 text-emerald-800 border-emerald-100' };
    case 'update_file':
      return { label: 'Update', className: 'bg-amber-50 text-amber-900 border-amber-100' };
    case 'delete_file':
      return { label: 'Delete', className: 'bg-orange-50 text-orange-900 border-orange-100' };
    default:
      return { label: 'Issue', className: 'bg-slate-100 text-slate-700 border-slate-100' };
  }
}

export function LocalApplyPatchToolCard({ streaming_tool, result, arguments: toolArgsProp }: ToolStreamingCardProps) {
  const { displayName, logs, loading, success } = streaming_tool;
  const toolArgs = toolArgsProp ?? streaming_tool.arguments;
  const [inputOpen, setInputOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [containerCollapsed, setContainerCollapsed] = useState(false);
  const [expandedOps, setExpandedOps] = useState<Record<number, boolean>>({});
  const wasLoadingRef = useRef(loading);

  const parsed = useMemo(() => parsePatchOperationsForDisplay(toolArgs), [toolArgs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
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

  const contentToRender = useMemo(() => {
    if (!parsedResult) return null;
    let rawStr = '';
    if (typeof parsedResult !== 'object') {
      rawStr = valueToDisplayString(parsedResult);
    } else if (parsedResult.error) {
      rawStr = valueToDisplayString(parsedResult.error);
    } else if (parsedResult.message) {
      rawStr = valueToDisplayString(parsedResult.message);
    } else if (parsedResult.result) {
      rawStr = valueToDisplayString(parsedResult.result);
    } else {
      const keys = Object.keys(parsedResult).filter(k => k !== 'success' && k !== 'activityTitle');
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

  const toggleOp = (i: number) => setExpandedOps((p) => ({ ...p, [i]: !p[i] }));

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
          {parsed.ok && (
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
              {parsed.operations.map((op, i) => {
                const badge = opBadge(op.kind);
                const hasBody = op.kind !== 'invalid' && op.kind !== 'delete_file' && op.content != null && op.content.length > 0;
                const isOpen = expandedOps[i] ?? false;
                return (
                  <div key={i} className="rounded border border-slate-100 bg-slate-50/20 p-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`rounded border px-1 py-0.5 text-[8px] font-bold uppercase ${badge.className}`}>{badge.label}</span>
                      <span className="font-medium text-slate-500 truncate flex-1 text-[10.5px]">{op.path}</span>
                      {hasBody && (
                        <button type="button" onClick={() => toggleOp(i)} className="text-[9px] font-bold text-blue-600 uppercase px-1">
                          {isOpen ? 'Hide' : 'View'}
                        </button>
                      )}
                    </div>
                    {hasBody && isOpen && (
                      <div className="mt-1.5">
                        <UnifiedDiffPanel lines={proposedBodyAsUnifiedDiffLines(op.path, op.content!)} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {filteredLogs.length > 0 && (
            <div className="space-y-1">
              <div key={0} className="flex items-start gap-2">
                <span className={`mt-1.5 shrink-0 font-mono text-[10px] text-slate-400 select-none ${loading && filteredLogs.length === 1 ? 'animate-pulse' : ''}`}>
                  {loading && filteredLogs.length === 1 ? '•' : '–'}
                </span>
                 <p className="flex-1 min-w-0">{valueToDisplayString(filteredLogs[0].message)}</p>
              </div>
            </div>
          )}

          <div className="space-y-2.5 border-t border-slate-200/70 pt-2">
            {/* Input */}
            {toolArgs && Object.keys(toolArgs).length > 0 && (
              <div>
                <button type="button" onClick={() => setInputOpen(!inputOpen)} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600">
                  <span>Input</span>
                  {inputOpen ? <FiChevronUp className="h-3 w-3" aria-hidden /> : <FiChevronDown className="h-3 w-3" aria-hidden />}
                </button>
                {inputOpen && (
                  <div className="mt-1 space-y-0.5 border-l border-slate-200/80 pl-2 text-slate-500">
                    {!parsed.ok && parsed.detail && <p className="italic text-slate-400 mb-0.5">{parsed.detail}</p>}
                    {Object.entries(toolArgs).map(([k, v]) => {
                      if (k === 'activityTitle') return null;
                      return (
                        <div key={k} className="flex gap-1.5">
                          <span className="font-semibold text-slate-400 shrink-0">{k}:</span>
                          <span className="break-all">{typeof v === 'string' ? v : JSON.stringify(v)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Result Section */}
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
                    <FiLoader className="h-3 w-3 animate-spin shrink-0" aria-hidden />
                  ) : resultOpen ? (
                    <FiChevronUp className="h-3 w-3" aria-hidden />
                  ) : (
                    <FiChevronDown className="h-3 w-3" aria-hidden />
                  )}
                </button>
                {resultOpen && parsedResult !== null && (
                  <div
                    className={`max-h-[180px] overflow-y-auto rounded-sm border px-2.5 py-2 text-[11px] leading-relaxed custom-scrollbar border-slate-200/90 ${
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
