'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiInfo, FiX } from 'react-icons/fi';
import { ChatMessage as ChatMessageType } from '@/app/components/model-interface/shared/types';
import { getModelRoundCount } from './usageMetrics.utils';

import { formatCredits, usdCostToCredits } from '@/lib/credits';

function resolveToolUsdTotal(msg: ChatMessageType): number {
    const rows = msg.tool_usage_charges;
    if (rows && rows.length > 0) {
        return rows.reduce((sum, row) => sum + row.cost_usd, 0);
    }
    const fromUsage = msg.usage?.tool_cost_usd;
    if (fromUsage !== undefined && fromUsage > 0) {
        return fromUsage;
    }
    return 0;
}

/** Width: 87% of `max-w-md` (~13% narrower than Integrations). Max-height/scroll match that modal. Portals to `document.body` so fixed positioning is not trapped by message `backdrop-blur` ancestors. */
interface UsageDetailsModalProps {
    showUsageDetails: boolean;
    setShowUsageDetails: (show: boolean) => void;
    msg: ChatMessageType;
    streaming: boolean;
}

function MetricStat({
    label,
    value,
    emphasize
}: {
    label: string;
    value: string;
    emphasize?: boolean;
}) {
    return (
        <div
            className={`min-w-0 rounded-lg px-3 py-2.5 ${
                emphasize
                    ? 'bg-white/70 dark:bg-zinc-800/70'
                    : 'bg-white/40 dark:bg-zinc-800/40'
            }`}
        >
            <div className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">{label}</div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-slate-900 dark:text-zinc-100">
                {value}
            </div>
        </div>
    );
}

function CostPair({
    usd,
    nairaUsd
}: {
    usd: number;
    nairaUsd?: number;
}) {
    const credits = usdCostToCredits(nairaUsd ?? usd);
    return (
        <div className="overflow-hidden rounded-xl bg-slate-50/80 dark:bg-zinc-900/50">
            <div className="flex items-baseline justify-between gap-3 px-3 py-2">
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">USD</span>
                <span className="text-xs font-semibold tabular-nums text-slate-900 dark:text-zinc-100">
                    ${usd.toFixed(6)}
                </span>
            </div>
            <div className="flex items-baseline justify-between gap-3 bg-white/50 px-3 py-2 dark:bg-zinc-800/30">
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">Credits</span>
                <span className="text-xs font-semibold tabular-nums text-slate-900 dark:text-zinc-100">
                    {formatCredits(credits, { compact: true })}
                </span>
            </div>
        </div>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="mb-1.5 text-[11px] font-medium text-slate-500 dark:text-zinc-400">{children}</p>
    );
}

export const UsageDetailsModal: React.FC<UsageDetailsModalProps> = ({
    showUsageDetails,
    setShowUsageDetails,
    msg,
    streaming
}) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!showUsageDetails) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowUsageDetails(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [showUsageDetails, setShowUsageDetails]);

    const toolUsdTotal = resolveToolUsdTotal(msg);
    const modelRoundCount = getModelRoundCount(msg.usage);
    const modelUsd =
        msg.cost !== undefined && toolUsdTotal > 0
            ? Math.max(0, msg.cost - toolUsdTotal)
            : undefined;

    if (!showUsageDetails || !mounted) return null;

    const modal = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] dark:bg-black/60"
            onClick={() => setShowUsageDetails(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="usage-details-title"
        >
            <div
                className="flex max-h-[min(90vh,640px)] w-full max-w-[24.36rem] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/15 dark:bg-zinc-800 dark:shadow-black/40"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-1 pt-4">
                    <div>
                        <h3
                            id="usage-details-title"
                            className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-zinc-100"
                        >
                            Token usage
                        </h3>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-zinc-400">This message</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowUsageDetails(false)}
                        className="-mr-1 -mt-1 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60 dark:text-zinc-500 dark:hover:bg-zinc-700/50 dark:hover:text-zinc-300"
                        aria-label="Close token details"
                        title="Close (Esc)"
                    >
                        <FiX size={16} strokeWidth={2} />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-[12px] leading-snug">
                    {streaming ? (
                        <div className="flex items-center justify-center gap-2 py-6">
                            <div
                                className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600 dark:border-zinc-700 dark:border-t-zinc-400"
                                aria-hidden
                            />
                            <span className="text-[11px] text-slate-600 dark:text-zinc-400">
                                Calculating cost and usage…
                            </span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {msg.usage && (
                                <section aria-label="Token counts">
                                    {modelRoundCount !== undefined && modelRoundCount > 1 && (
                                        <div className="mb-2 rounded-xl bg-slate-50/80 px-3 py-2.5 dark:bg-zinc-900/50">
                                            <div className="text-[11px] text-slate-500 dark:text-zinc-400">Agent run</div>
                                            <div className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900 dark:text-zinc-100">
                                                {modelRoundCount.toLocaleString()} model calls
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-1 rounded-xl bg-slate-50/80 p-1 dark:bg-zinc-900/50">
                                        <div className="grid min-w-0 grid-cols-2 gap-1">
                                            <MetricStat
                                                label="Prompt"
                                                value={msg.usage.prompt_tokens.toLocaleString()}
                                            />
                                            <MetricStat
                                                label="Completion"
                                                value={msg.usage.completion_tokens.toLocaleString()}
                                            />
                                        </div>
                                        <MetricStat
                                            label={
                                                modelRoundCount && modelRoundCount > 1
                                                    ? 'Total tokens (session)'
                                                    : 'Total tokens'
                                            }
                                            value={msg.usage.total_tokens.toLocaleString()}
                                            emphasize
                                        />
                                    </div>
                                </section>
                            )}

                            {msg.tool_usage_charges && msg.tool_usage_charges.length > 0 ? (
                                <section aria-label="Tool charges">
                                    <SectionLabel>Tools charged</SectionLabel>
                                    <ul className="max-h-[7.5rem] space-y-1 overflow-y-auto rounded-xl bg-slate-50/80 p-1 dark:bg-zinc-900/50">
                                        {msg.tool_usage_charges.map((row, i) => (
                                            <li
                                                key={`${row.tool}-${i}`}
                                                className="rounded-lg bg-white/50 px-3 py-2 dark:bg-zinc-800/40"
                                            >
                                                <div className="text-[11px] font-medium text-slate-800 dark:text-zinc-200">
                                                    {row.display_name || row.tool}
                                                </div>
                                                <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-2 text-[10px] text-slate-600 dark:text-zinc-400">
                                                    <span className="font-mono text-slate-500 dark:text-zinc-500">
                                                        {row.tool}
                                                    </span>
                                                    <span className="tabular-nums">
                                                        {formatCredits(usdCostToCredits(row.cost_usd), { compact: true })}
                                                        <span className="text-slate-400 dark:text-zinc-600"> · </span>
                                                        ${row.cost_usd.toFixed(6)}
                                                    </span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ) : (
                                msg.usage?.tool_cost_usd !== undefined &&
                                msg.usage.tool_cost_usd > 0 && (
                                    <section aria-label="Tool usage">
                                        <SectionLabel>Tool usage</SectionLabel>
                                        <CostPair usd={msg.usage.tool_cost_usd} />
                                    </section>
                                )
                            )}

                            {msg.cost !== undefined && modelUsd !== undefined && (
                                <section aria-label="Model cost">
                                    <SectionLabel>Model (tokens)</SectionLabel>
                                    <CostPair usd={modelUsd} />
                                </section>
                            )}

                            {msg.cost !== undefined && (
                                <section aria-label="Total cost">
                                    <SectionLabel>Total cost</SectionLabel>
                                    <CostPair usd={msg.cost} />
                                </section>
                            )}

                            {!msg.usage &&
                                !msg.cost &&
                                !(msg.tool_usage_charges && msg.tool_usage_charges.length > 0) && (
                                    <div className="py-6 text-center">
                                        <FiInfo
                                            size={22}
                                            className="mx-auto text-slate-300 dark:text-zinc-600"
                                            strokeWidth={1.5}
                                            aria-hidden
                                        />
                                        <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-zinc-400">
                                            No usage or cost information for this message.
                                        </p>
                                    </div>
                                )}
                        </div>
                    )}
                </div>

                <div className="shrink-0 px-4 pb-4 pt-1">
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setShowUsageDetails(false)}
                            className="rounded-lg bg-slate-900 px-4 py-1.5 text-[11px] font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
};
