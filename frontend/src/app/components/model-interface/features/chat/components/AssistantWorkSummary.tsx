'use client';

import React, { useState } from 'react';
import type { ToolEvent } from '@/app/components/model-interface/shared/types';
import type { WorkTimelineItem } from './assistant-turn-summary.utils';
import { buildAssistantTurnSummary, buildSingleToolTimelineLabel } from './assistant-turn-summary.utils';
import { ReasoningGroup } from './ReasoningGroup';
import { ToolStreamingCard } from './ToolStreamingCard';
import styles from './AssistantWorkSummary.module.scss';

type AssistantWorkSummaryProps = {
  items: WorkTimelineItem[];
};

export function AssistantWorkSummary({ items }: AssistantWorkSummaryProps) {
  const [open, setOpen] = useState(false);
  const summary = buildAssistantTurnSummary(items);

  if (!summary) {
    return null;
  }

  return (
    <div className={styles.root} role="region" aria-label="Assistant work summary">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={styles.header}
        aria-expanded={open}
      >
        <span className={styles.headerLabel}>{summary}</span>
        <span className={styles.chevron} aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open ? (
        <div className={styles.timeline}>
          {items.map((item, index) => {
            if (item.kind === 'thinking') {
              return (
                <div key={`thought-${item.event.timestamp}-${index}`} className={styles.timelineItem}>
                  <ReasoningGroup event={item.event} variant="timeline" />
                </div>
              );
            }

            const label = buildSingleToolTimelineLabel(item.event);
            return (
              <ToolTimelineRow
                key={`tool-${item.event.tool}-${item.event.timestamp}-${index}`}
                label={label}
                event={item.event}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ToolTimelineRow({
  label,
  event,
}: {
  label: string;
  event: ToolEvent;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.timelineItem}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={styles.timelineHeader}
        aria-expanded={open}
      >
        <span className={styles.timelineLabel}>{label}</span>
        <span className={styles.chevron} aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open ? (
        <div className={styles.timelineBody}>
          <ToolStreamingCard
            groupItem
            streaming_tool={{
              tool: event.tool,
              displayName: event.displayName,
              logs: event.logs,
              loading: event.loading,
              success: event.success,
              arguments: event.arguments,
            }}
            result={event.result}
            arguments={event.arguments}
          />
        </div>
      ) : null}
    </div>
  );
}
