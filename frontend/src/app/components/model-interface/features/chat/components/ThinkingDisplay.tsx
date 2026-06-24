import React, { useEffect, useRef } from 'react';
import styles from './ThinkingDisplay.module.scss';
import { textPartToPlainString } from '@/lib/utils/messageTextUtils';
import { MarkdownRenderer } from '@/app/components/model-interface/shared/components';

interface ThinkingDisplayProps {
    reasoning?: string;
    reasoningDetails?: Array<{
        index?: number;
        type?: string;
        text?: string;
        format?: string;
    }>;
}

/**
 * Ephemeral thinking stream: appears above the message, dim text only (no border/background).
 * Shown only while streaming and before any message content; parent hides this once content arrives.
 */
export function ThinkingDisplay({ reasoning, reasoningDetails }: ThinkingDisplayProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const displayText =
        textPartToPlainString(reasoning) || textPartToPlainString(reasoningDetails?.[0]?.text) || '';

    useEffect(() => {
        if (!displayText || !scrollRef.current) return;
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [displayText]);

    if (!displayText.trim()) {
        return null;
    }

    return (
        <div className={styles.streamingThinking} role="log" aria-live="polite" aria-label="Model thinking">
            <div ref={scrollRef} className={styles.streamingThinkingScroll}>
                <div className={styles.streamingThinkingMarkdownWrap}>
                    <MarkdownRenderer content={displayText} className="markdown-thinking-stream" />
                </div>
            </div>
        </div>
    );
}
