'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ToolEvent } from '@/app/components/model-interface/shared/types';
import { ToolStreamingCard } from './ToolStreamingCard';
import { LocalApplyPatchToolCard } from './tool-ui/LocalApplyPatchToolCard';
import { buildInProgressClusterHeader } from './cluster-tool-display-blocks';
import { buildToolClusterSummary } from './work-activity-summary.utils';
import styles from './ToolStreamingGroup.module.scss';

const PATCH_TOOL = 'local_apply_patch';

function isPatchToolEvent(event: ToolEvent): boolean {
  return event.tool === PATCH_TOOL;
}

export const ToolStreamingGroup = React.memo(function ToolStreamingGroup({
  events,
}: {
  events: ToolEvent[];
  /**
   * True while the assistant turn is still streaming.
   * Must not keep this cluster working — in-progress UI is only for tools
   * in THIS cluster with `loading: true`, so a later tool/thinking block
   * does not leave earlier clusters spinning.
   */
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
  const completedSummary = useMemo(() => buildToolClusterSummary(events), [events]);
  const headerLabel = toolsInFlight
    ? buildInProgressClusterHeader(events) ?? 'Working…'
    : completedSummary ?? 'Worked';

  useEffect(() => {
    if (toolsInFlight) {
      wasWorkingRef.current = true;
      return;
    }

    if (wasWorkingRef.current) {
      setOpen(false);
      wasWorkingRef.current = false;
    }
  }, [toolsInFlight]);

  if (!events.length) return null;

  return (
    <div className={styles.group}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={styles.header}
        aria-expanded={open}
      >
        <span className={styles.chevron} aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
        <span className={styles.headerIcon}>
          {toolsInFlight ? (
            <span className={styles.spinner} aria-hidden="true" />
          ) : (
            <span className={styles.checkIcon} aria-hidden="true">✓</span>
          )}
        </span>
        <span className={`${styles.headerLabel} ${toolsInFlight ? styles.headerLabelActive : ''}`}>
          {headerLabel}
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
});
