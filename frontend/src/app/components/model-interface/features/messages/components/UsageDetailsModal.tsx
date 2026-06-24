'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiInfo, FiX } from 'react-icons/fi';
import { ChatMessage as ChatMessageType } from '@/app/components/model-interface/shared/types';

/** Matches backend `USD_TO_NAIRA_RATE` for display (see OpenAI chat completions service). */
const USD_TO_NAIRA_RATE = 1400;

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

function MetricPair({
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
            className={`min-w-0 px-2 py-1.5 ${emphasize ? 'bg-slate-50/80 dark:bg-zinc-900/80' : 'bg-white dark:bg-zinc-800'}`}
        >
            <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">{label}</div>
            <div className="mt-0.5 text-xs font-semibold tabular-nums text-slate-900 dark:text-zinc-100 break-all text-right leading-tight">
                {value}
            </div>
        </div>
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
    const modelUsd =
        msg.cost !== undefined && toolUsdTotal > 0
            ? Math.max(0, msg.cost - toolUsdTotal)
            : undefined;

    if (!showUsageDetails || !mounted) return null;

    const modal = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 dark:bg-black/60 p-4 backdrop-blur-[2px]"
            onClick={() => setShowUsageDetails(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="usage-details-title"
        >
            <div
                className="flex max-h-[min(90vh,640px)] w-full max-w-[24.36rem] flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white dark:border-zinc-700 dark:bg-zinc-800 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/[0.04] dark:shadow-black/50"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-100 dark:border-zinc-700/50 px-3.5 py-2">
                    <div>
                        <h3 id="usage-details-title" className="text-[13px] font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
                            Token Usage Details
                        </h3>
                        <p className="mt-0 text-[10px] leading-tight text-slate-500 dark:text-zinc-400">This message</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowUsageDetails(false)}
                        className="-m-1 rounded-full p-1.5 text-slate-400 dark:text-zinc-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-700/50 dark:hover:text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
                        aria-label="Close token details"
                        title="Close (Esc)"
                    >
                        <FiX size={16} strokeWidth={2} />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-2 text-[12px] leading-snug">
                    {streaming ? (
                        <div className="flex items-center justify-center gap-2 py-4">
                            <div
                                className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600 dark:border-zinc-700 dark:border-t-zinc-400"
                                aria-hidden
                            />
                            <span className="text-[11px] text-slate-600 dark:text-zinc-400">Calculating cost and usage…</span>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {msg.usage && (
                                <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50/40 dark:border-zinc-700/80 dark:bg-zinc-900/40">
                                    <div className="grid min-w-0 grid-cols-2 divide-x divide-slate-200/80 dark:divide-zinc-700/80">
                                        <MetricPair
                                            label="Prompt"
                                            value={msg.usage.prompt_tokens.toLocaleString()}
                                        />
                                        <MetricPair
                                            label="Completion"
                                            value={msg.usage.completion_tokens.toLocaleString()}
                                        />
                                    </div>
                                    <div className="border-t border-slate-200/80 dark:border-zinc-700/80">
                                        <MetricPair
                                            label="Total tokens"
                                            value={msg.usage.total_tokens.toLocaleString()}
                                            emphasize
                                        />
                                    </div>
                                </div>
                            )}

                            {msg.tool_usage_charges && msg.tool_usage_charges.length > 0 ? (
                                <div className="rounded-lg border border-slate-200/80 bg-white dark:border-zinc-700/80 dark:bg-zinc-800">
                                    <div className="border-b border-slate-100 dark:border-zinc-700/50 px-2 py-1.5">
                                        <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                                            Tools charged
                                        </div>
                                        <p className="mt-0 text-[9px] leading-snug text-slate-500 dark:text-zinc-500">
                                            Server amounts (USD + ₦ per invocation).
                                        </p>
                                    </div>
                                    <ul className="max-h-[7.2rem] divide-y divide-slate-100 dark:divide-zinc-700/50 overflow-y-auto">
                                        {msg.tool_usage_charges.map((row, i) => (
                                            <li key={`${row.tool}-${i}`} className="px-2 py-1.5">
                                                <div className="text-[11px] font-medium text-slate-800 dark:text-zinc-200">
                                                    {row.display_name || row.tool}
                                                </div>
                                                <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-2 text-[10px] text-slate-600 dark:text-zinc-400">
                                                    <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-500">{row.tool}</span>
                                                    <span className="tabular-nums">
                                                        ₦{row.cost_naira.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                        <span className="text-slate-400 dark:text-zinc-600"> · </span>
                                                        ${row.cost_usd.toFixed(6)}
                                                    </span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : (
                                msg.usage?.tool_cost_usd !== undefined &&
                                msg.usage.tool_cost_usd > 0 && (
                                    <div className="rounded-lg border border-slate-200/80 bg-white dark:border-zinc-700/80 dark:bg-zinc-800 px-2 py-1.5">
                                        <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                                            Tool usage (USD)
                                        </div>
                                        <div className="mt-0.5 text-xs font-semibold tabular-nums text-slate-900 dark:text-zinc-100 break-all text-right">
                                            ${msg.usage.tool_cost_usd.toFixed(6)}
                                        </div>
                                        <p className="mt-1 text-[9px] leading-snug text-slate-500 dark:text-zinc-500">
                                            Included in total cost below when shown.
                                        </p>
                                    </div>
                                )
                            )}

                            {msg.cost !== undefined && modelUsd !== undefined && (
                                <div>
                                    <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                                        Model (tokens)
                                    </div>
                                    <div className="space-y-0 overflow-hidden rounded-lg border border-slate-200/80 dark:border-zinc-700/80">
                                        <div className="flex items-baseline justify-between gap-2 border-b border-slate-100 dark:border-zinc-700/50 bg-white dark:bg-zinc-800 px-2 py-1.5">
                                            <span className="text-[11px] text-slate-600 dark:text-zinc-400">USD</span>
                                            <span className="text-xs font-semibold tabular-nums text-slate-900 dark:text-zinc-100 break-all text-right">
                                                ${modelUsd.toFixed(6)}
                                            </span>
                                        </div>
                                        <div className="flex items-baseline justify-between gap-2 bg-slate-50/60 dark:bg-zinc-900/60 px-2 py-1.5">
                                            <span className="text-[11px] text-slate-600 dark:text-zinc-400">Naira</span>
                                            <span className="text-xs font-semibold tabular-nums text-slate-900 dark:text-zinc-100 break-all text-right">
                                                ₦{(modelUsd * USD_TO_NAIRA_RATE).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="mt-1 text-[9px] leading-snug text-slate-500 dark:text-zinc-500">
                                        LLM usage after subtracting tool charges from total.
                                    </p>
                                </div>
                            )}

                            {msg.cost !== undefined && (
                                <div>
                                    <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                                        Total cost
                                    </div>
                                    <div className="space-y-0 overflow-hidden rounded-lg border border-slate-200/80 dark:border-zinc-700/80">
                                        <div className="flex items-baseline justify-between gap-2 border-b border-slate-100 dark:border-zinc-700/50 bg-white dark:bg-zinc-800 px-2 py-1.5">
                                            <span className="text-[11px] text-slate-600 dark:text-zinc-400">USD</span>
                                            <span className="text-xs font-semibold tabular-nums text-slate-900 dark:text-zinc-100 break-all text-right">
                                                ${msg.cost.toFixed(6)}
                                            </span>
                                        </div>
                                        <div className="flex items-baseline justify-between gap-2 bg-slate-50/60 dark:bg-zinc-900/60 px-2 py-1.5">
                                            <span className="text-[11px] text-slate-600 dark:text-zinc-400">Naira</span>
                                            <span className="text-xs font-semibold tabular-nums text-slate-900 dark:text-zinc-100 break-all text-right">
                                                ₦{(msg.cost * USD_TO_NAIRA_RATE).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!msg.usage &&
                                !msg.cost &&
                                !(msg.tool_usage_charges && msg.tool_usage_charges.length > 0) && (
                                    <div className="py-4 text-center">
                                        <FiInfo size={22} className="mx-auto text-slate-300 dark:text-zinc-600" strokeWidth={1.5} aria-hidden />
                                        <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-zinc-400">
                                            No usage or cost information for this message.
                                        </p>
                                    </div>
                                )}
                        </div>
                    )}
                </div>

                <div className="shrink-0 border-t border-slate-100 dark:border-zinc-700/50 bg-slate-50/50 dark:bg-zinc-800/50 px-3.5 py-2">
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setShowUsageDetails(false)}
                            className="rounded-lg bg-slate-900 dark:bg-zinc-200 px-3 py-1 text-[11px] font-medium text-white dark:text-zinc-900 shadow-sm transition-colors hover:bg-slate-800 dark:hover:bg-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
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
