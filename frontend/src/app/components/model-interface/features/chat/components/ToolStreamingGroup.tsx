'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ToolEvent } from '@/app/components/model-interface/shared/types';
import { ToolStreamingCard } from './ToolStreamingCard';
import { LocalApplyPatchToolCard } from './tool-ui/LocalApplyPatchToolCard';
import { buildToolClusterSummary } from './work-activity-summary.utils';
import styles from './ToolStreamingGroup.module.scss';

const PATCH_TOOL = 'local_apply_patch';

function isPatchToolEvent(event: ToolEvent): boolean {
  return event.tool === PATCH_TOOL;
}

export function ToolStreamingGroup({
  events,
  /** True while the assistant turn is still streaming (model request in flight). */
  messageStreaming = false,
}: {
  events: ToolEvent[];
  messageStreaming?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wasWorkingRef = useRef(false);

  const { compactEvents, patchEvents } = useMemo(() => {
    const compact: ToolEvent[] = [];
    const patch: ToolEvent[] = [];
    for (const evt of events) {
      if (isPatchToolEvent(evt)) {
        patch.push(evt);
      } else {
        compact.push(evt);
      }
    }
    return { compactEvents: compact, patchEvents: patch };
  }, [events]);

  const toolsInFlight = events.some((e) => e.loading);
  const requestInProgress = messageStreaming || toolsInFlight;
  const completedSummary = useMemo(() => buildToolClusterSummary(events), [events]);
  const headerLabel = requestInProgress
    ? 'Working…'
    : completedSummary ?? 'Worked';

  useEffect(() => {
    if (requestInProgress) {
      setOpen(true);
      wasWorkingRef.current = true;
      return;
    }

    if (wasWorkingRef.current) {
      setOpen(false);
      wasWorkingRef.current = false;
    }
  }, [requestInProgress]);

  return (
    <div className={styles.group}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={styles.header}
        aria-expanded={open}
      >
        <span className={`${styles.headerLabel} ${requestInProgress ? styles.headerLabelActive : ''}`}>
          {headerLabel}
        </span>
        <span className={styles.chevron} aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open ? (
        <div className={styles.body}>
          {compactEvents.length > 0 ? (
            <ul className={styles.list}>
              {compactEvents.map((evt, idx) => (
                <li key={`${evt.tool}-${evt.timestamp}-${idx}`} className={styles.listItem}>
                  <ToolStreamingCard
                    groupItem
                    streaming_tool={{
                      tool: evt.tool,
                      displayName: evt.displayName,
                      logs: evt.logs,
                      loading: evt.loading,
                      success: evt.success,
                      arguments: evt.arguments,
                    }}
                    result={evt.result}
                    arguments={evt.arguments}
                  />
                </li>
              ))}
            </ul>
          ) : null}

          {patchEvents.length > 0 ? (
            <div className={styles.patchSection} aria-label="File patches">
              {patchEvents.map((evt, idx) => (
                <div key={`patch-${evt.timestamp}-${idx}`} className={styles.patchItem}>
                  <LocalApplyPatchToolCard
                    groupItem
                    streaming_tool={{
                      tool: evt.tool,
                      displayName: evt.displayName,
                      logs: evt.logs,
                      loading: evt.loading,
                      success: evt.success,
                      arguments: evt.arguments,
                    }}
                    result={evt.result}
                    arguments={evt.arguments}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
