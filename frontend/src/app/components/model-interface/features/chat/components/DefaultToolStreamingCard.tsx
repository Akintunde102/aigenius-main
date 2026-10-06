'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { FiLoader } from 'react-icons/fi';
import { JsonSyntaxBlock } from '@/app/components/JsonSyntaxBlock';

import { valueToDisplayString } from '@/lib/utils/messageTextUtils';
import {
  extractWorkflowIdsFromToolResult,
  openWorkflow,
  workflowStudioPath,
} from '@/lib/utils/open-workflow';
import { ERROR_MESSAGES } from '../hooks/chatOperations.constants';
import { WorkflowIntentTranscriptExpand } from './WorkflowIntentTranscriptExpand';
import { MarkdownRenderer } from '@/app/components/model-interface/shared/components/MarkdownRenderer';
import { RenderErrorBoundary } from '@/app/components/RenderErrorBoundary';
import { ToolSearchFilesHover } from './tool-ui/ToolSearchFilesHover';
import { resolveStreamingToolRowLabel } from './cluster-tool-display-blocks';
import type { ToolStreamingCardProps } from './tool-streaming-card.types';
import cardStyles from './DefaultToolStreamingCard.module.scss';

export const DefaultToolStreamingCard = React.memo(function DefaultToolStreamingCard({
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

  const subagentConversationId =
    tool === 'subagent' &&
      parsedResult &&
      typeof parsedResult === 'object' &&
      typeof (parsedResult as { conversation_id?: unknown }).conversation_id === 'string'
      ? (parsedResult as { conversation_id: string }).conversation_id
      : null;

  const workflowAgentRunId =
    (tool === 'workflow_agent' || tool === 'workflow_intent') &&
      parsedResult &&
      typeof parsedResult === 'object' &&
      typeof (parsedResult as { agent_run_id?: unknown }).agent_run_id === 'string'
      ? (parsedResult as { agent_run_id: string }).agent_run_id
      : null;

  const workflowIdsTouched = useMemo(() => {
    if (tool !== 'workflow_agent' && tool !== 'workflow_intent') {
      return [];
    }
    return extractWorkflowIdsFromToolResult(parsedResult);
  }, [tool, parsedResult]);

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
    if (!loading && wasGroupLoadingRef.current) {
      // Auto-collapse when done — keeps chat clean.
      setContainerCollapsed(true);
      wasGroupLoadingRef.current = false;
    }
    if (loading) {
      wasGroupLoadingRef.current = true;
    }
  }, [groupItem, detailsOnly, loading]);

  useEffect(() => {
    if (groupItem) return;
    // Do not auto-open activity logs while running —
    // the user opens the panel manually.
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
        <div className={groupItem ? cardStyles.details : cardStyles.standaloneDetails}>
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
              className={`${cardStyles.ioUnifiedPanel} custom-scrollbar ${success === false ? cardStyles.ioUnifiedPanelError : ''}`}
            >
              {hasInput && (
                <div className={cardStyles.ioBlock}>
                  <div className={cardStyles.ioBlockLabel}>
                    Input
                  </div>
                  <div className={cardStyles.ioBlockContent}>
                    {inputEntries.map(([k, v]) => (
                      <div key={k} className={cardStyles.ioRow}>
                        <span className={cardStyles.ioKey}>{k}</span>
                        <span className={cardStyles.ioValue}>
                          {typeof v === 'string' ? v : JSON.stringify(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showOutputSection && (
                <div className={cardStyles.ioBlock}>
                  <div
                    className={`${cardStyles.ioBlockLabel} ${loading && parsedResult === null ? cardStyles.ioBlockLabelActive : ''}`}
                  >
                    <span>Output</span>
                    {loading && parsedResult === null ? (
                      <FiLoader className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
                    ) : null}
                  </div>
                  <div
                    className={`${cardStyles.ioBlockContent} ${success === false ? cardStyles.ioBlockContentError : ''}`}
                  >
                    {parsedResult !== null ? (
                      <RenderErrorBoundary logLabel="[tool-output]">
                        {contentToRender ? (
                          <MarkdownRenderer content={contentToRender} className="markdown-tool-result" />
                        ) : (
                          <div className={cardStyles.ioJsonWrap}>
                            <JsonSyntaxBlock
                              value={parsedResult}
                              preClassName="max-h-60 border-none bg-transparent p-0"
                              codeClassName="text-[10px] leading-snug"
                            />
                          </div>
                        )}
                      </RenderErrorBoundary>
                    ) : (
                      <span className="text-[10px] italic opacity-60">
                        Waiting for output…
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {workflowIdsTouched.length > 0 && success !== false && (
            <div className="flex flex-wrap gap-2 border-t border-slate-200/70 pt-2 dark:border-zinc-700/80">
              {workflowIdsTouched.map((workflowId) => (
                <button
                  key={workflowId}
                  type="button"
                  onClick={() => openWorkflow(workflowStudioPath(workflowId))}
                  className="text-[10px] font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  Open workflow in studio
                </button>
              ))}
            </div>
          )}

          {subagentConversationId && success !== false && (
            <div className="border-t border-slate-200/70 pt-2 dark:border-zinc-700/80">
              <Link
                href={`/chat/${subagentConversationId}`}
                className="text-[10px] font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Open subagent conversation
              </Link>
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
});
