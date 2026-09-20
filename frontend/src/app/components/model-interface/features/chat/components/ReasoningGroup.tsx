'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { ThinkingEvent } from '@/app/components/model-interface/shared/types';
import { MarkdownRenderer } from '@/app/components/model-interface/shared/components';
import styles from './ReasoningGroup.module.scss';

interface ReasoningGroupProps {
  event: ThinkingEvent;
  /**
   * True while the assistant turn is still streaming.
   * Must not keep this panel open — thinking closes as soon as `event.loading` is false,
   * so later tool/text streams are not covered by an expanded Thinking… block.
   */
  messageStreaming?: boolean;
  /** Timeline rows inside the completed turn summary — label only, content on expand. */
  variant?: 'live' | 'timeline';
}

export function ReasoningGroup({
  event,
  variant = 'live',
}: ReasoningGroupProps) {
  const isTimeline = variant === 'timeline';
  const thinkingInProgress = !isTimeline && event.loading;
  const [open, setOpen] = useState(() => thinkingInProgress);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wasThinkingRef = useRef(thinkingInProgress);

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
        <span className={styles.chevron} aria-hidden>
          {open ? '▾' : '▸'}
        </span>
        <span className={`${styles.headerLabel} ${thinkingInProgress ? styles.headerLabelActive : ''}`}>
          {headerLabel}
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
