'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { ToolEvent } from '@/app/components/model-interface/shared/types';
import { ToolStreamingCard } from './ToolStreamingCard';
import styles from './ToolStreamingGroup.module.scss';

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

  const toolsInFlight = events.some((e) => e.loading);
  const requestInProgress = messageStreaming || toolsInFlight;
  const headerLabel = requestInProgress ? 'Working…' : 'Worked';

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
        <span className={styles.headerLabel}>{headerLabel}</span>
        <span className={styles.chevron} aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open ? (
        <ul className={styles.list}>
          {events.map((evt, idx) => (
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
    </div>
  );
}
