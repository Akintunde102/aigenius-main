'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiLoader } from 'react-icons/fi';
import { JsonSyntaxBlock } from '@/app/components/JsonSyntaxBlock';
import { MarkdownRenderer } from '@/app/components/model-interface/shared/components/MarkdownRenderer';
import { valueToDisplayString } from '@/lib/utils/messageTextUtils';
import { ERROR_MESSAGES } from '../../hooks/chatOperations.constants';
import { ToolSearchFilesHover } from './ToolSearchFilesHover';
import { resolveStreamingToolRowLabel } from '../cluster-tool-display-blocks';
import type { ToolStreamingCardProps } from '../tool-streaming-card.types';
import cardStyles from '../DefaultToolStreamingCard.module.scss';
import { DirectoryListingDisplay } from './DirectoryListingDisplay';
import { parseDirectoryListingResult } from './list-directory-result.utils';

export function LocalListDirectoryToolCard({
  streaming_tool,
  result,
  arguments: toolArgsProp,
  groupItem = false,
  detailsOnly = false,
}: ToolStreamingCardProps) {
  const { tool, displayName, logs, loading, success } = streaming_tool;
  const toolArgs = toolArgsProp ?? streaming_tool.arguments;
  const [inputOpen, setInputOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [containerCollapsed, setContainerCollapsed] = useState(groupItem && !detailsOnly);
  const wasLoadingRef = useRef(loading);
  const wasGroupLoadingRef = useRef(loading);

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
      const keys = Object.keys(parsedResult).filter((k) => k !== 'success' && k !== 'activityTitle');
      if (keys.length === 1) {
        rawStr = valueToDisplayString(parsedResult[keys[0]]);
      }
    }

    if (!rawStr) return null;
    return rawStr.replace(/\\n/g, '\n').replace(/\\r/g, '').trim();
  }, [parsedResult]);

  const listing = useMemo(
    () => parseDirectoryListingResult(result ?? contentToRender ?? undefined),
    [result, contentToRender],
  );

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
      setInputOpen(false);
      setResultOpen(false);
      wasGroupLoadingRef.current = false;
    }
  }, [groupItem, detailsOnly, loading]);

  useEffect(() => {
    if (groupItem) return;
    if (wasLoadingRef.current && !loading) {
      if (success === true && listing) {
        setResultOpen(true);
      }
      if (success === false) {
        setResultOpen(true);
      }
    }
    wasLoadingRef.current = loading;
  }, [groupItem, loading, success, listing]);

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
          <div className={groupItem ? cardStyles.ioSections : 'space-y-2.5 pt-0.5'}>
            {toolArgs && Object.keys(toolArgs).length > 0 && (
              <div className={groupItem ? cardStyles.ioSection : undefined}>
                <button
                  type="button"
                  onClick={() => setInputOpen(!inputOpen)}
                  className={groupItem ? cardStyles.ioToggle : 'flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300'}
                >
                  <span>Input</span>
                  <span className={cardStyles.ioChevron} aria-hidden>
                    {inputOpen ? '▾' : '▸'}
                  </span>
                </button>
                {inputOpen && (
                  <div className={groupItem ? cardStyles.ioPanel : 'mt-1 space-y-0.5 border-l border-slate-200/80 pl-2 text-slate-500 dark:border-zinc-700/80 dark:text-zinc-400'}>
                    {Object.entries(toolArgs).map(([k, v]) => {
                      if (k === 'activityTitle') return null;
                      return (
                        <div key={k} className={groupItem ? cardStyles.ioRow : 'flex gap-1.5'}>
                          <span className={groupItem ? cardStyles.ioKey : 'shrink-0 font-semibold text-slate-400 dark:text-zinc-500'}>
                            {k}
                          </span>
                          <span className={groupItem ? cardStyles.ioValue : 'break-all'}>
                            {typeof v === 'string' ? v : JSON.stringify(v)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {(parsedResult !== null || loading) && (
              <div className={groupItem ? cardStyles.ioSection : 'space-y-1'}>
                <button
                  type="button"
                  onClick={() => parsedResult !== null && setResultOpen(!resultOpen)}
                  className={
                    groupItem
                      ? `${cardStyles.ioToggle} ${loading && parsedResult === null ? cardStyles.ioToggleActive : ''}`
                      : `flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide transition-colors ${loading
                          ? 'text-slate-700 dark:text-zinc-300'
                          : 'text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300'
                        }`
                  }
                  disabled={loading && parsedResult === null}
                >
                  <span>Output</span>
                  {loading && parsedResult === null ? (
                    <FiLoader className="h-3 w-3 animate-spin shrink-0" aria-hidden />
                  ) : (
                    <span className={cardStyles.ioChevron} aria-hidden>
                      {resultOpen ? '▾' : '▸'}
                    </span>
                  )}
                </button>

                {resultOpen && parsedResult !== null && (
                  <div
                    className={
                      groupItem
                        ? `${cardStyles.ioPanel} ${success === false ? cardStyles.ioPanelError : ''}`
                        : `max-h-[280px] overflow-y-auto rounded-sm border px-2.5 py-2 text-[11px] leading-relaxed custom-scrollbar border-slate-200/90 dark:border-zinc-700/80 ${success === false ? 'text-red-900 dark:text-red-300' : 'text-slate-900 dark:text-zinc-100'
                          }`
                    }
                  >
                    {listing ? (
                      <DirectoryListingDisplay listing={listing} />
                    ) : contentToRender ? (
                      <MarkdownRenderer content={contentToRender} className="markdown-tool-result" />
                    ) : (
                      <div className={groupItem ? cardStyles.ioJsonWrap : 'opacity-80'}>
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
