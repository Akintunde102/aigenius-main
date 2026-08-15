'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { JsonSyntaxBlock } from '@/app/components/JsonSyntaxBlock';
import { FiLoader } from 'react-icons/fi';
import { valueToDisplayString } from '@/lib/utils/messageTextUtils';
import { ERROR_MESSAGES } from '../hooks/chatOperations.constants';
import { WorkflowIntentTranscriptExpand } from './WorkflowIntentTranscriptExpand';
import { MarkdownRenderer } from '@/app/components/model-interface/shared/components/MarkdownRenderer';
import { ToolSearchFilesHover } from './tool-ui/ToolSearchFilesHover';
import { resolveStreamingToolRowLabel } from './cluster-tool-display-blocks';
import type { ToolStreamingCardProps } from './tool-streaming-card.types';
import cardStyles from './DefaultToolStreamingCard.module.scss';

export function DefaultToolStreamingCard({
  streaming_tool,
  result,
  arguments: toolArgsProp,
  groupItem = false,
  detailsOnly = false,
}: ToolStreamingCardProps) {
  const { tool, displayName, logs, loading, success } = streaming_tool;
  const toolArgs = toolArgsProp ?? streaming_tool.arguments;
  const [activityOpen, setActivityOpen] = useState(false);
  const [containerCollapsed, setContainerCollapsed] = useState(groupItem && !detailsOnly);
  const wasLoadingRef = useRef(loading);
  const wasGroupLoadingRef = useRef(loading);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const msg = valueToDisplayString(log.message);
      return !msg.toLowerCase().includes('running on your device');
    });
  }, [logs]);

  const parsedResult = useMemo(() => {
    if (!result) return null;
    try { return JSON.parse(result); } catch { return { raw: result }; }
  }, [result]);

  const contentToRender = useMemo(() => {
    if (!parsedResult) return null;
    let rawStr = '';

    if (typeof parsedResult !== 'object') {
      rawStr = valueToDisplayString(parsedResult);
    } else if (parsedResult.error) {
      rawStr = valueToDisplayString(parsedResult.error) || ERROR_MESSAGES.TOOL_EXECUTION_FAILED;
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

  const workflowAgentRunId =
    (tool === 'workflow_agent' || tool === 'workflow_intent') &&
      parsedResult &&
      typeof parsedResult === 'object' &&
      typeof (parsedResult as { agent_run_id?: unknown }).agent_run_id === 'string'
      ? (parsedResult as { agent_run_id: string }).agent_run_id
      : null;

  const resolvedDisplayName = resolveStreamingToolRowLabel({
    tool,
    displayName,
    arguments: toolArgs ?? {},
    result,
    loading,
    success,
  });

  useEffect(() => {
    if (!groupItem || detailsOnly) return;
    if (loading) {
      setContainerCollapsed(false);
      wasGroupLoadingRef.current = true;
      return;
    }

    if (wasGroupLoadingRef.current) {
      setContainerCollapsed(true);
      wasGroupLoadingRef.current = false;
    }
  }, [groupItem, detailsOnly, loading]);

  useEffect(() => {
    if (groupItem) return;
    if (loading && filteredLogs.length > 1) {
      setActivityOpen(true);
    }
  }, [groupItem, loading, filteredLogs.length]);

  useEffect(() => {
    if (groupItem) return;
    if (wasLoadingRef.current && !loading) {
      if (success === true) {
        setActivityOpen(false);
      }
      if (success === false) {
        setActivityOpen(true);
      }
    }
    wasLoadingRef.current = loading;
  }, [groupItem, loading, success]);

  const inputEntries = useMemo(() => {
    if (!toolArgs) return [];
    return Object.entries(toolArgs).filter(([k]) => k !== 'activityTitle');
  }, [toolArgs]);

  const hasInput = inputEntries.length > 0;
  const showOutputSection = parsedResult !== null || loading;
  const showUnifiedIo = hasInput || showOutputSection;

  const showActivityLogs = !groupItem && filteredLogs.length > 0;

  const toggleButton = (
    <button
      type="button"
      onClick={() => setContainerCollapsed(!containerCollapsed)}
      className={groupItem ? cardStyles.toggle : 'flex w-full flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-sm px-0 py-0.5 text-left transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/80 dark:hover:text-zinc-100 dark:focus-visible:ring-zinc-600/80'}
      aria-expanded={!containerCollapsed}
    >
      <span
        className={
          groupItem
            ? `${cardStyles.title} ${loading ? cardStyles.titleLoading : ''}`
            : 'min-w-0 shrink font-medium text-slate-700 dark:text-zinc-200'
        }
      >
        {resolvedDisplayName}
      </span>
      <span
        className={groupItem ? cardStyles.chevron : 'shrink-0 text-slate-400 tabular-nums dark:text-zinc-500'}
        aria-hidden
      >
        {containerCollapsed ? '▸' : '▾'}
      </span>
    </button>
  );

  return (
    <div className={`${cardStyles.root} ${groupItem ? cardStyles.rootGroupItem : 'my-1 w-full text-[12px] leading-snug text-slate-600 dark:text-zinc-400'}`}>
      {!detailsOnly ? (
        groupItem ? (
          <ToolSearchFilesHover tool={tool} arguments={toolArgs} result={result}>
            {toggleButton}
          </ToolSearchFilesHover>
        ) : (
          toggleButton
        )
      ) : null}

      {!containerCollapsed && (
        <div
          className={
            groupItem
              ? cardStyles.details
              : 'mt-1.5 space-y-3 border-l border-slate-200/90 pl-2.5 text-[11px] leading-relaxed text-slate-600 dark:border-zinc-700/80 dark:text-zinc-400'
          }
        >
          {showActivityLogs && (
            <div className="space-y-1.5">
              <div key={0} className="flex items-start gap-2">
                <span className="mt-1.5 shrink-0 font-mono text-[10px] text-slate-400 select-none dark:text-zinc-500">
                  {loading && filteredLogs.length === 1 ? '•' : '–'}
                </span>
                <p className="min-w-0 flex-1">{valueToDisplayString(filteredLogs[0].message)}</p>
              </div>

              {filteredLogs.length > 1 && (
                <div className="pl-4">
                  <button
                    type="button"
                    onClick={() => setActivityOpen(!activityOpen)}
                    className="text-[10px] font-medium text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
                  >
                    {activityOpen ? 'Hide steps' : `Show ${filteredLogs.length - 1} more`}
                  </button>
                  {activityOpen && (
                    <div className="mt-1 space-y-1 border-l border-slate-200/80 pl-2 dark:border-zinc-700/80">
                      {filteredLogs.slice(1).map((log, i) => (
                        <div key={i + 1} className="flex items-start gap-2 text-slate-500 dark:text-zinc-400">
                          <span className="mt-1.5 shrink-0 font-mono text-[10px] text-slate-400 select-none dark:text-zinc-500">
                            {loading && i + 1 === filteredLogs.length - 1 ? '•' : '–'}
                          </span>
                          <p className="min-w-0 flex-1">{valueToDisplayString(log.message)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {showUnifiedIo && (
            <div
              className={
                groupItem
                  ? `${cardStyles.ioUnifiedPanel} ${success === false ? cardStyles.ioUnifiedPanelError : ''}`
                  : `max-h-[280px] overflow-y-auto rounded-sm border custom-scrollbar border-slate-200/90 bg-slate-50/60 dark:border-zinc-700/80 dark:bg-zinc-900/35 ${success === false ? 'border-red-200/80 dark:border-red-900/50' : ''}`
              }
            >
              {hasInput && (
                <div className={groupItem ? cardStyles.ioBlock : undefined}>
                  <div
                    className={
                      groupItem
                        ? cardStyles.ioBlockLabel
                        : 'px-2.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500'
                    }
                  >
                    Input
                  </div>
                  <div
                    className={
                      groupItem
                        ? cardStyles.ioBlockContent
                        : 'space-y-0.5 px-2.5 pb-2 text-[11px] text-slate-500 dark:text-zinc-400'
                    }
                  >
                    {inputEntries.map(([k, v]) => (
                      <div key={k} className={groupItem ? cardStyles.ioRow : 'flex gap-1.5'}>
                        <span
                          className={
                            groupItem
                              ? cardStyles.ioKey
                              : 'shrink-0 font-semibold text-slate-400 dark:text-zinc-500'
                          }
                        >
                          {k}
                        </span>
                        <span className={groupItem ? cardStyles.ioValue : 'break-all'}>
                          {typeof v === 'string' ? v : JSON.stringify(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showOutputSection && (
                <div
                  className={
                    groupItem
                      ? cardStyles.ioBlock
                      : hasInput
                        ? 'border-t border-slate-200/80 dark:border-zinc-700/80'
                        : undefined
                  }
                >
                  <div
                    className={
                      groupItem
                        ? `${cardStyles.ioBlockLabel} ${loading && parsedResult === null ? cardStyles.ioBlockLabelActive : ''}`
                        : `flex items-center gap-1 px-2.5 pt-2 text-[10px] font-semibold uppercase tracking-wide ${loading ? 'text-slate-700 dark:text-zinc-300' : 'text-slate-400 dark:text-zinc-500'}`
                    }
                  >
                    <span>Output</span>
                    {loading && parsedResult === null ? (
                      <FiLoader className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
                    ) : null}
                  </div>
                  <div
                    className={
                      groupItem
                        ? `${cardStyles.ioBlockContent} ${success === false ? cardStyles.ioBlockContentError : ''}`
                        : `px-2.5 pb-2 text-[11px] leading-relaxed ${success === false ? 'text-red-900 dark:text-red-300' : 'text-slate-900 dark:text-zinc-100'}`
                    }
                  >
                    {parsedResult !== null ? (
                      contentToRender ? (
                        <MarkdownRenderer content={contentToRender} className="markdown-tool-result" />
                      ) : (
                        <div className={groupItem ? cardStyles.ioJsonWrap : 'opacity-80'}>
                          <JsonSyntaxBlock
                            value={parsedResult}
                            preClassName="max-h-60 border-none bg-transparent p-0"
                            codeClassName="text-[10px] leading-snug"
                          />
                        </div>
                      )
                    ) : (
                      <span className="text-[10px] italic text-slate-400 dark:text-zinc-500">
                        Waiting for output…
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {workflowAgentRunId && success !== false && (
            <div className="border-t border-slate-200/70 pt-2 dark:border-zinc-700/80">
              <WorkflowIntentTranscriptExpand agentRunId={workflowAgentRunId} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
