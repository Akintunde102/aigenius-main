import React from 'react';
import styles from './ContextSummaryBadge.module.scss';

export interface ContextSummaryBadgeProps {
    conversationSummary?: string;
    lastSummarizedAt?: string;
}

export const ContextSummaryBadge: React.FC<ContextSummaryBadgeProps> = ({
    conversationSummary,
    lastSummarizedAt,
}) => {
    if (!conversationSummary) {
        return null;
    }

    const formattedTime = lastSummarizedAt
        ? new Date(lastSummarizedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;

    const titleText = formattedTime
        ? `Middle context summarized at ${formattedTime}\n\n${conversationSummary.slice(0, 300)}...`
        : conversationSummary.slice(0, 300);

    return (
        <div className="flex justify-center my-2">
            <div
                className={styles.summaryBadge}
                title={titleText}
            >
                <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Context optimized (First 10 &amp; Last 40 turns active)</span>
            </div>
        </div>
    );
};
