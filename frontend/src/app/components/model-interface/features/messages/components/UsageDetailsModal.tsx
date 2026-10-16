'use client';

import React from 'react';
import { AppModal, AppModalBody, AppModalHeader } from '@/app/components/modals/AppModal';
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
            className="min-w-0 rounded-lg p-2.5 border"
            style={{
                background: emphasize ? 'color-mix(in srgb, var(--chat-accent) 8%, var(--surface-muted))' : 'var(--surface-muted)',
                borderColor: emphasize ? 'color-mix(in srgb, var(--chat-accent) 25%, var(--modal-border))' : 'var(--modal-border)',
            }}
        >
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--modal-muted-fg)' }}>
                {label}
            </div>
            <div className="mt-0.5 text-xs font-semibold tabular-nums tracking-tight" style={{ color: 'var(--modal-fg)' }}>
                {value}
            </div>
        </div>
    );
}

function CreditsAmount({ credits }: { credits: number }) {
    return (
        <div
            className="rounded-lg border px-3 py-2"
            style={{ background: 'var(--surface-muted)', borderColor: 'var(--modal-border)' }}
        >
            <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--modal-fg)' }}>
                {formatCredits(credits, { compact: true })}
            </span>
        </div>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="app-modal-field-label !mb-1.5">{children}</p>
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
        <div className="mt-1.5 border-t pt-1.5" style={{ borderColor: 'var(--modal-border)' }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-[10px]">
                <span className="font-medium" style={{ color: 'var(--modal-fg)' }}>{label}</span>
                {typeof at === 'number' && Number.isFinite(at) && (
                    <span className="tabular-nums" style={{ color: 'var(--modal-muted-fg)' }} title={formatTime(at)}>
                        {formatTime(at)}
                    </span>
                )}
            </div>
            <div className="mt-0.5 text-[10px] tabular-nums" style={{ color: 'var(--modal-muted-fg)' }}>
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
        <li
            className="rounded-lg border px-3 py-2"
            style={{ background: 'var(--surface-muted)', borderColor: 'var(--modal-border)' }}
        >
            <div className="text-[11px] font-medium" style={{ color: 'var(--modal-fg)' }}>
                {row.display_name || row.tool}
                {statusText ? (
                    <span className="ml-1 font-normal opacity-75">
                        ({statusText})
                    </span>
                ) : null}
            </div>
            <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-2 text-[10px]">
                <span className="font-mono" style={{ color: 'var(--modal-muted-fg)' }}>
                    {row.tool}
                </span>
                <span className="tabular-nums font-medium" style={{ color: 'var(--modal-fg)' }}>
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
    const close = () => setShowUsageDetails(false);

    const toolCreditsTotal = resolveToolCreditsTotal(msg);
    const modelRoundCount = getModelRoundCount(msg.usage);
    const totalCredits = resolveMessageCredits(msg);
    const modelCredits =
        totalCredits !== undefined && toolCreditsTotal > 0
            ? Math.max(0, totalCredits - toolCreditsTotal)
            : totalCredits;

    return (
        <AppModal
            open={showUsageDetails}
            onClose={close}
            size="sm"
            className="z-[9999]"
            ariaLabelledBy="usage-details-title"
            panelClassName="flex max-h-[min(90vh,640px)] max-w-sm flex-col overflow-hidden"
        >
            <AppModalHeader
                titleId="usage-details-title"
                title={t('usageDetails.title', 'Token usage')}
                subtitle={t('usageDetails.thisMessage', 'This message')}
                onClose={close}
            />
            <AppModalBody className="min-h-0 flex-1 overflow-y-auto text-[12px] leading-snug !py-3">
                    {streaming ? (
                        <div className="flex items-center justify-center gap-2 py-6">
                            <div
                                className="h-4 w-4 animate-spin rounded-full border-2"
                                style={{ borderColor: 'var(--modal-border)', borderTopColor: 'var(--chat-accent)' }}
                                aria-hidden
                            />
                            <span className="text-xs" style={{ color: 'var(--modal-muted-fg)' }}>
                                {t('usageDetails.calculating', 'Calculating cost and usage…')}
                            </span>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {msg.tool_usage_charges && msg.tool_usage_charges.length > 0 ? (
                                <section aria-label="Tool charges">
                                    <SectionLabel>{t('usageDetails.toolsCharged', 'Tools charged')}</SectionLabel>
                                    <ul className="max-h-[12rem] space-y-1 overflow-y-auto rounded-lg border p-1" style={{ borderColor: 'var(--modal-border)', background: 'var(--modal-bg-muted)' }}>
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
                                    className="group rounded-lg border"
                                    style={{ borderColor: 'var(--modal-border)', background: 'var(--modal-bg-muted)' }}
                                >
                                    <summary
                                        className="cursor-pointer list-none rounded-lg px-3 py-1.5 text-[11px] font-medium transition hover:opacity-80 [&::-webkit-details-marker]:hidden"
                                        style={{ color: 'var(--modal-muted-fg)' }}
                                    >
                                        Token breakdown
                                        <span className="ml-1.5 opacity-60">
                                            (details)
                                        </span>
                                    </summary>
                                    <div className="space-y-1.5 border-t px-2 pb-2 pt-2" style={{ borderColor: 'var(--modal-border)' }}>
                                        {modelRoundCount !== undefined && (
                                            <div
                                                className="rounded-md p-2"
                                                style={{ background: 'var(--surface-muted)' }}
                                            >
                                                <div className="text-[10px]" style={{ color: 'var(--modal-muted-fg)' }}>
                                                    Agent run
                                                </div>
                                                <div className="mt-0.5 text-xs font-medium tabular-nums" style={{ color: 'var(--modal-fg)' }}>
                                                    {modelRoundCount.toLocaleString()} model calls
                                                </div>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <MetricStat
                                                label="Prompt"
                                                value={msg.usage.prompt_tokens?.toLocaleString() ?? '—'}
                                            />
                                            <MetricStat
                                                label="Completion"
                                                value={msg.usage.completion_tokens?.toLocaleString() ?? '—'}
                                            />
                                        </div>
                                        <MetricStat
                                            label="Total tokens"
                                            value={msg.usage.total_tokens?.toLocaleString() ?? '—'}
                                            emphasize
                                        />
                                    </div>
                                </details>
                            )}
                        </div>
                    )}
            </AppModalBody>
        </AppModal>
    );
};
