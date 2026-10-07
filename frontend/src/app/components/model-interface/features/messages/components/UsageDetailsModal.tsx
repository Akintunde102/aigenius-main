'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiInfo, FiX } from 'react-icons/fi';
import { ChatMessage as ChatMessageType, ToolUsageCharge } from '@/app/components/model-interface/shared/types';
import { getModelRoundCount } from './usageMetrics.utils';
import { formatTime } from '@/lib/utils/modelInterfaceUtils';

import { formatCredits } from '@/lib/credits';
import { useLanguage } from '@/lib/providers/LanguageProvider';

function resolveToolCreditsTotal(msg: ChatMessageType): number {
    const rows = msg.tool_usage_charges;
    if (rows && rows.length > 0) {
        return rows.reduce((sum, row) => sum + (typeof row.cost_credits === 'number' ? row.cost_credits : 0), 0);
    }
    if (typeof msg.usage?.tool_cost_credits === 'number' && msg.usage.tool_cost_credits > 0) {
        return msg.usage.tool_cost_credits;
    }
    return 0;
}

function resolveMessageCredits(msg: ChatMessageType): number | undefined {
    if (typeof msg.cost_credits === 'number' && Number.isFinite(msg.cost_credits)) {
        return msg.cost_credits;
    }
    return undefined;
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

function CreditsAmount({ credits }: { credits: number }) {
    return (
        <div className="overflow-hidden rounded-xl bg-slate-50/80 px-3 py-2 dark:bg-zinc-900/50">
            <span className="text-xs font-semibold tabular-nums text-slate-900 dark:text-zinc-100">
                {formatCredits(credits, { compact: true })}
            </span>
        </div>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="mb-1.5 text-[11px] font-medium text-slate-500 dark:text-zinc-400">{children}</p>
    );
}

function toolStatusLabel(status: ToolUsageCharge['status']): string | null {
    if (status === 'reserved') {
        return 'reserved';
    }
    if (status === 'refunded') {
        return 'released';
    }
    return null;
}

function ToolChargeLedgerLine({
    label,
    at,
    credits,
}: {
    label: string;
    at?: number;
    credits?: number;
}) {
    return (
        <div className="mt-1.5 border-t border-slate-200/70 pt-1.5 dark:border-zinc-700/50">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-[10px] text-slate-600 dark:text-zinc-400">
                <span className="font-medium text-slate-700 dark:text-zinc-300">{label}</span>
                {typeof at === 'number' && Number.isFinite(at) && (
                    <span className="tabular-nums text-slate-400 dark:text-zinc-500" title={formatTime(at)}>
                        {formatTime(at)}
                    </span>
                )}
            </div>
            <div className="mt-0.5 text-[10px] tabular-nums text-slate-500 dark:text-zinc-500">
                {typeof credits === 'number' && Number.isFinite(credits)
                    ? formatCredits(credits, { compact: true })
                    : '—'}
            </div>
        </div>
    );
}

function ToolChargeRow({ row }: { row: ToolUsageCharge }) {
    const statusText = toolStatusLabel(row.status);
    const showLedger = Boolean(row.reserved_at || row.released_at || row.status === 'reserved' || row.status === 'settled' || row.status === 'refunded');
    const releasedCredits = row.status === 'refunded' ? (row.settled_credits ?? 0) : row.settled_credits;

    const chargeCredits = row.cost_credits;

    return (
        <li className="rounded-lg bg-white/50 px-3 py-2 dark:bg-zinc-800/40">
            <div className="text-[11px] font-medium text-slate-800 dark:text-zinc-200">
                {row.display_name || row.tool}
                {statusText ? (
                    <span className="ml-1 font-normal text-slate-500 dark:text-zinc-400">
                        ({statusText})
                    </span>
                ) : null}
            </div>
            <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-2 text-[10px] text-slate-600 dark:text-zinc-400">
                <span className="font-mono text-slate-500 dark:text-zinc-500">
                    {row.tool}
                </span>
                <span className="tabular-nums">
                    {formatCredits(chargeCredits, { compact: true })}
                </span>
            </div>
            {showLedger ? (
                <>
                    <ToolChargeLedgerLine
                        label="Reserved"
                        at={row.reserved_at}
                        credits={row.reserved_credits ?? (row.status === 'reserved' ? chargeCredits : undefined)}
                    />
                    {row.released_at !== undefined ? (
                        <ToolChargeLedgerLine
                            label="Released"
                            at={row.released_at}
                            credits={releasedCredits}
                        />
                    ) : null}
                </>
            ) : null}
        </li>
    );
}

export const UsageDetailsModal: React.FC<UsageDetailsModalProps> = ({
    showUsageDetails,
    setShowUsageDetails,
    msg,
    streaming
}) => {
    const { t } = useLanguage();
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

    const toolCreditsTotal = resolveToolCreditsTotal(msg);
    const modelRoundCount = getModelRoundCount(msg.usage);
    const totalCredits = resolveMessageCredits(msg);
    const modelCredits =
        totalCredits !== undefined && toolCreditsTotal > 0
            ? Math.max(0, totalCredits - toolCreditsTotal)
            : totalCredits;

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
                            {t('usageDetails.title', 'Token usage')}
                        </h3>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-zinc-400">{t('usageDetails.thisMessage', 'This message')}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowUsageDetails(false)}
                        className="-mr-1 -mt-1 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60 dark:text-zinc-500 dark:hover:bg-zinc-700/50 dark:hover:text-zinc-300"
                        aria-label={t('usageDetails.closeAria', 'Close token details')}
                        title={t('common.close', 'Close')}
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
                                {t('usageDetails.calculating', 'Calculating cost and usage…')}
                            </span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {msg.tool_usage_charges && msg.tool_usage_charges.length > 0 ? (
                                <section aria-label="Tool charges">
                                    <SectionLabel>{t('usageDetails.toolsCharged', 'Tools charged')}</SectionLabel>
                                    <ul className="max-h-[12rem] space-y-1 overflow-y-auto rounded-xl bg-slate-50/80 p-1 dark:bg-zinc-900/50">
                                        {msg.tool_usage_charges.map((row, i) => (
                                            <ToolChargeRow key={`${row.tool}-${row.job_id ?? i}`} row={row} />
                                        ))}
                                    </ul>
                                </section>
                            ) : (
                                toolCreditsTotal > 0 && (
                                    <section aria-label="Tool usage">
                                        <SectionLabel>{t('usageDetails.toolUsage', 'Tool usage')}</SectionLabel>
                                        <CreditsAmount credits={toolCreditsTotal} />
                                    </section>
                                )
                            )}

                            {modelCredits !== undefined && toolCreditsTotal > 0 && (
                                <section aria-label="Model cost">
                                    <SectionLabel>{t('usageDetails.modelTokens', 'Model (tokens)')}</SectionLabel>
                                    <CreditsAmount credits={modelCredits} />
                                </section>
                            )}

                            {totalCredits !== undefined && (
                                <section aria-label="Total cost">
                                    <SectionLabel>{t('usageDetails.totalCost', 'Total cost')}</SectionLabel>
                                    <CreditsAmount credits={totalCredits} />
                                </section>
                            )}

                            {msg.usage && (
                                <details
                                    className="group rounded-xl border border-dashed border-slate-200/70 bg-slate-50/40 dark:border-zinc-700/60 dark:bg-zinc-900/30"
                                >
                                    <summary
                                        className="cursor-pointer list-none rounded-xl px-3 py-2 text-[10px] font-medium text-slate-400 transition hover:bg-slate-100/60 hover:text-slate-600 [&::-webkit-details-marker]:hidden dark:text-zinc-500 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-400"
                                    >
                                        Token breakdown
                                        <span className="ml-1.5 font-normal text-slate-400/90 dark:text-zinc-600">
                                            optional
                                        </span>
                                    </summary>
                                    <div className="space-y-2 border-t border-slate-200/60 px-1 pb-2 pt-2 dark:border-zinc-700/50">
                                        {modelRoundCount !== undefined && (
                                            <div className="rounded-lg bg-white/40 px-3 py-2 dark:bg-zinc-800/40">
                                                <div className="text-[10px] text-slate-500 dark:text-zinc-500">
                                                    Agent run
                                                </div>
                                                <div className="mt-0.5 text-xs font-medium tabular-nums text-slate-700 dark:text-zinc-300">
                                                    {modelRoundCount.toLocaleString()} model calls
                                                </div>
                                            </div>
                                        )}
                                        <div className="space-y-1 rounded-lg bg-white/40 p-1 dark:bg-zinc-800/40">
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
                                    </div>
                                </details>
                            )}

                            {!totalCredits && !msg.usage && (
                                <div className="flex items-start gap-2 rounded-xl bg-slate-50/80 px-3 py-3 text-[11px] text-slate-600 dark:bg-zinc-900/50 dark:text-zinc-400">
                                    <FiInfo className="mt-0.5 shrink-0 opacity-70" size={14} aria-hidden />
                                    <span>
                                        {t(
                                            'usageDetails.noUsageYet',
                                            'Usage and cost appear here after the assistant finishes responding.',
                                        )}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
};
