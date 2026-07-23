'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { ThinkingEvent } from '@/app/components/model-interface/shared/types';
import { MarkdownRenderer } from '@/app/components/model-interface/shared/components';
import styles from './ReasoningGroup.module.scss';

interface ReasoningGroupProps {
  event: ThinkingEvent;
  /** True while the assistant turn is still streaming. */
  messageStreaming?: boolean;
  /** Timeline rows inside the completed turn summary — label only, content on expand. */
  variant?: 'live' | 'timeline';
}

export function ReasoningGroup({
  event,
  messageStreaming = false,
  variant = 'live',
}: ReasoningGroupProps) {
  const [open, setOpen] = useState(false);
  const wasThinkingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isTimeline = variant === 'timeline';
  const thinkingInProgress = !isTimeline && (messageStreaming || event.loading);
  const headerLabel = thinkingInProgress ? 'Thinking…' : 'Thought:';

  useEffect(() => {
    if (isTimeline) return;
    if (thinkingInProgress) {
      setOpen(true);
      wasThinkingRef.current = true;
      return;
    }

    if (wasThinkingRef.current) {
      setOpen(false);
      wasThinkingRef.current = false;
    }
  }, [isTimeline, thinkingInProgress]);

  useEffect(() => {
    if (!event.content || !scrollRef.current || !open) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [event.content, open]);

  if (!event.content.trim()) {
    return null;
  }

  return (
    <div className={`${styles.group} ${isTimeline ? styles.timeline : ''}`} role="region" aria-label="Model reasoning">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={styles.header}
        aria-expanded={open}
      >
        <span className={`${styles.headerLabel} ${thinkingInProgress ? styles.headerLabelActive : ''}`}>
          {headerLabel}
        </span>
        <span className={styles.chevron} aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open ? (
        <div ref={scrollRef} className={styles.body} aria-live={thinkingInProgress ? 'polite' : 'off'}>
          <div className={styles.markdownWrap}>
            <MarkdownRenderer content={event.content} className="markdown-thinking-stream" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
