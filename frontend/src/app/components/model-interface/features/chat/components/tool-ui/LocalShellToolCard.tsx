'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { FiLoader, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { JsonSyntaxBlock } from '@/app/components/JsonSyntaxBlock';
import { MarkdownRenderer } from '@/app/components/model-interface/shared/components/MarkdownRenderer';
import { valueToDisplayString } from '@/lib/utils/messageTextUtils';
import { getToolDisplayName } from '../toolDisplayNames';
import { ERROR_MESSAGES } from '../../hooks/chatOperations.constants';
import type { ToolStreamingCardProps } from '../tool-streaming-card.types';
import { toolStreamingInlineStatus } from '../tool-streaming-inline-status';
import { shellTerminalPromptParts } from './local-shell-display.utils';
import { useLanguage } from '@/lib/providers/LanguageProvider';

type ToolLogEntry = { tag?: string; message: unknown };

function isStreamTag(tag: unknown): tag is 'stdout' | 'stderr' {
  return tag === 'stdout' || tag === 'stderr';
}

export function LocalShellToolCard({ streaming_tool, result, arguments: toolArgsProp }: ToolStreamingCardProps) {
  const { t } = useLanguage();
  const { tool, displayName, logs, loading, success } = streaming_tool;
  const toolArgs = toolArgsProp ?? streaming_tool.arguments;
  const [activityOpen, setActivityOpen] = useState(false);
  const [inputOpen, setInputOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [containerCollapsed, setContainerCollapsed] = useState(false);
  const wasLoadingRef = useRef(loading);
  const streamScrollRef = useRef<HTMLPreElement>(null);

  const streamLogs = useMemo(
    () => (logs as ToolLogEntry[]).filter((l) => isStreamTag(l.tag)),
    [logs],
  );

  const filteredLogs = useMemo(() => {
    return (logs as ToolLogEntry[]).filter((log) => {
      if (isStreamTag(log.tag)) return false;
      const msg = valueToDisplayString(log.message);
      return !msg.toLowerCase().includes('running on your device');
    });
  }, [logs]);

  const promptParts = useMemo(() => shellTerminalPromptParts(toolArgs), [toolArgs]);

  const hasStreamText = useMemo(
    () => streamLogs.some((l) => valueToDisplayString(l.message).length > 0),
    [streamLogs],
  );

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
    } else if (typeof parsedResult.error === 'string' && parsedResult.error.trim()) {
      rawStr = parsedResult.error;
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

  const activityTitle = toolArgs?.activityTitle as string | undefined;
  const resolvedDisplayName =
    activityTitle || displayName || getToolDisplayName(tool === 'run_command' ? 'run_command' : 'local_shell');

  const statusText = toolStreamingInlineStatus(loading, success);

  const showResultSection = loading || parsedResult !== null || hasStreamText;

  const showTerminalPre = Boolean(promptParts || loading || hasStreamText);

  useEffect(() => {
    if (loading && filteredLogs.length > 1) {
      setActivityOpen(true);
    }
  }, [loading, filteredLogs.length]);

  useEffect(() => {
    if (loading) {
      setResultOpen(true);
    }
  }, [loading]);

  useEffect(() => {
    if (wasLoadingRef.current && !loading) {
      if (success === true) {
        setActivityOpen(false);
      }
      if (success === false) {
        setActivityOpen(true);
        setResultOpen(true);
      }
    }
    wasLoadingRef.current = loading;
  }, [loading, success]);

  useEffect(() => {
    if (!resultOpen || !loading || !streamScrollRef.current || !showTerminalPre) return;
    const el = streamScrollRef.current;
    el.scrollTop = el.scrollHeight;
  }, [streamLogs, loading, resultOpen, showTerminalPre]);

  return (
    <div className="my-1 w-full text-[12px] leading-snug text-slate-600 dark:text-zinc-400">
      <button
        type="button"
        onClick={() => setContainerCollapsed(!containerCollapsed)}
        className="flex w-full flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-sm px-0 py-0.5 text-left transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/80 dark:hover:text-zinc-100 dark:focus-visible:ring-zinc-600/80"
        aria-expanded={!containerCollapsed}
      >
        <span className="min-w-0 shrink font-medium text-slate-700 dark:text-zinc-200">{resolvedDisplayName}</span>
        <span className="shrink-0 text-slate-400 dark:text-zinc-500">· {statusText}</span>
        <span className="shrink-0 text-slate-400 tabular-nums dark:text-zinc-500" aria-hidden>
          {containerCollapsed ? '▸' : '▾'}
        </span>
      </button>

      {!containerCollapsed && (
        <div className="mt-1.5 space-y-3 border-l border-slate-200/90 pl-2.5 text-[11px] leading-relaxed text-slate-600 dark:border-zinc-700/80 dark:text-zinc-400">
          {filteredLogs.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <span
                  className={`mt-1.5 shrink-0 font-mono text-[10px] text-slate-400 select-none dark:text-zinc-500 ${
                    loading && filteredLogs.length === 1 ? 'animate-pulse' : ''
                  }`}
                >
                  {loading && filteredLogs.length === 1 ? '•' : '–'}
                </span>
                <p className="flex-1 min-w-0">{valueToDisplayString(filteredLogs[0].message)}</p>
              </div>

              {filteredLogs.length > 1 && (
                <div className="pl-3">
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
                          <span
                            className={`mt-1.5 shrink-0 font-mono text-[10px] text-slate-400 select-none dark:text-zinc-500 ${
                              loading && i + 1 === filteredLogs.length - 1 ? 'animate-pulse' : ''
                            }`}
                          >
                            {loading && i + 1 === filteredLogs.length - 1 ? '•' : '–'}
                          </span>
                          <p className="flex-1 min-w-0">{valueToDisplayString(log.message)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2.5 pt-0.5">
            {toolArgs && Object.keys(toolArgs).length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setInputOpen(!inputOpen)}
                  className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                >
                  <span>Input</span>
                  {inputOpen ? <FiChevronUp className="h-3 w-3" aria-hidden /> : <FiChevronDown className="h-3 w-3" aria-hidden />}
                </button>
                {inputOpen && (
                  <div className="mt-1 space-y-0.5 border-l border-slate-200/80 pl-2 text-slate-500 dark:border-zinc-700/80 dark:text-zinc-400">
                    {Object.entries(toolArgs).map(([k, v]) => {
                      if (k === 'activityTitle') return null;
                      return (
                        <div key={k} className="flex gap-1.5">
                          <span className="font-semibold text-slate-400 dark:text-zinc-500 shrink-0">{k}:</span>
                          <span className="break-all text-slate-700 dark:text-zinc-300">{typeof v === 'string' ? v : JSON.stringify(v)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {showResultSection && (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setResultOpen(!resultOpen)}
                  className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                    loading ? 'text-slate-700 dark:text-zinc-300' : 'text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300'
                  }`}
                >
                  <span>Result</span>
                  {loading && !hasStreamText && parsedResult === null ? (
                    <FiLoader className="h-3 w-3 animate-spin shrink-0" aria-hidden />
                  ) : resultOpen ? (
                    <FiChevronUp className="h-3 w-3" aria-hidden />
                  ) : (
                    <FiChevronDown className="h-3 w-3" aria-hidden />
                  )}
                </button>

                {resultOpen && (
                  <div
                    className={`max-h-[280px] overflow-y-auto rounded-sm border px-2.5 py-2 text-[11px] leading-relaxed custom-scrollbar border-slate-200/90 bg-white text-slate-900 dark:border-zinc-700/80 dark:bg-zinc-900 dark:text-zinc-100 ${
                      success === false ? 'text-red-900 dark:text-red-300 border-red-200 dark:border-red-900/50' : ''
                    }`}
                  >
                    {showTerminalPre && (
                      <pre
                        ref={streamScrollRef}
                        className={`m-0 font-mono text-[10px] leading-relaxed whitespace-pre-wrap break-words bg-transparent ${
                          parsedResult !== null && contentToRender ? 'mb-2 pb-2 border-b border-slate-200/70 dark:border-zinc-700/80' : ''
                        }`}
                      >
                        {promptParts ? (
                          <>
                            <span className="text-slate-500 dark:text-zinc-400">{promptParts.cwdDisplay}</span>
                            {promptParts.sep === '>' ? (
                              <span className="text-slate-600 dark:text-zinc-400">{promptParts.sep} </span>
                            ) : (
                              <span className="text-slate-600 dark:text-zinc-400">
                                {' '}
                                {promptParts.sep}{' '}
                              </span>
                            )}
                            <span className="text-slate-900 dark:text-zinc-100">{promptParts.commandLine}</span>
                            {'\n'}
                          </>
                        ) : null}
                        {loading || hasStreamText ? (
                          streamLogs.length === 0 && loading ? (
                            <span className="italic text-slate-500 dark:text-zinc-400">{t('toolUi.localShellWaiting', 'Waiting for output from your device…')}</span>
                          ) : (
                            streamLogs.flatMap((log, i) => {
                              const msg = valueToDisplayString(log.message);
                              if (!msg) return [];
                              const stderr = log.tag === 'stderr';
                              return [
                                <span key={`shell-stream-${i}`} className={stderr ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-zinc-200'}>
                                  {msg}
                                </span>,
                              ];
                            })
                          )
                        ) : null}
                      </pre>
                    )}

                    {parsedResult !== null && contentToRender ? (
                      <MarkdownRenderer content={contentToRender} className="markdown-tool-result" />
                    ) : parsedResult !== null && !contentToRender ? (
                      <div className="opacity-80">
                        <JsonSyntaxBlock
                          value={parsedResult}
                          preClassName="max-h-60 border-none bg-transparent p-0"
                          codeClassName="text-[10px] leading-snug"
                        />
                      </div>
                    ) : null}
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
