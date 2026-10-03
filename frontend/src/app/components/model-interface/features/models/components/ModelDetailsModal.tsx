import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiCheck, FiLayers, FiDollarSign, FiMaximize2, FiCalendar, FiAlertCircle } from 'react-icons/fi';
import { Model } from '@/app/components/model-interface/shared/types';
import {
    getModelAverageRequestPrice,
    getModelAverageRequestCredits,
    formatUSD,
    formatNGN,
    getModelDisplayName,
    getProvider,
    getProviderLabel,
    hasExtraToolingCapability,
} from '@/app/components/model-interface/shared/utils';
import {
    formatPricingAmount,
    formatPricingTierLabel,
    getPricingOverrides,
    getScalarPricingEntries,
    getTierPricingEntries,
    pricingLabel,
} from '../utils/modelPricingDisplay.utils';
import {
    computeModelRequiredBalance,
    getModelCreditBurnPercentage,
    getModelWalletLockShortHint,
    isModelPickLocked,
} from '../utils/modelWalletAffordance.utils';
import { ModelCreditBurnIndicator } from './ModelCreditBurnIndicator';
import { isConversationPickableModel } from '../utils/modelConversationEligibility.utils';

interface ModelDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    model: Model | null;
    onPickModel?: (model: Model) => void;
    wallet?: number | null;
    onAddCredits?: () => void;
}

function formatContextLength(n: number): string {
    if (!Number.isFinite(n) || n <= 0) return '—';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return String(n);
}

export function ModelDetailsModal({
    isOpen,
    onClose,
    model,
    onPickModel,
    wallet = null,
    onAddCredits,
}: ModelDetailsModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !model) return null;
    if (!mounted) return null;

    const provider = getProvider(model.id);
    const providerLabel = getProviderLabel(provider) || provider;
    const isFree = provider === 'openrouter' && model.id?.split('/')[1]?.toLowerCase() === 'free';
    const avgCost = getModelAverageRequestPrice(model);
    const avgCredits = getModelAverageRequestCredits(model);
    const showAvgCost = Number.isFinite(avgCredits) && avgCredits > 0;
    const requiredBalance = computeModelRequiredBalance(model, avgCredits);
    const burnPercentage = getModelCreditBurnPercentage(model, wallet, avgCredits);
    const isWalletLocked = isModelPickLocked(wallet, requiredBalance, {
        modelId: model.id,
    });
    const canPickForChat = isConversationPickableModel(model);
    const supportsTools = hasExtraToolingCapability(model);
    const inputMods = model.architecture?.input_modalities ?? [];
    const outputMods = model.architecture?.output_modalities ?? [];
    const hasModalities = inputMods.length > 0 || outputMods.length > 0;
    const scalarPricingEntries = getScalarPricingEntries(model.pricing as Record<string, unknown> | undefined);
    const pricingOverrides = getPricingOverrides(model.pricing as Record<string, unknown> | undefined);
    const hasPricing = scalarPricingEntries.length > 0 || pricingOverrides.length > 0;
    const releaseDate = model?.created
        ? new Date(model.created * 1000).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
          })
        : null;

    const portalTarget =
        typeof document !== 'undefined'
            ? document.getElementById('modal-root') ?? document.body
            : null;
    if (!portalTarget) return null;

    return createPortal(
        (
            <div
                className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 md:p-6 backdrop-blur-sm transition-opacity duration-200"
                style={{ background: 'var(--modal-overlay)' }}
                onClick={onClose}
                role="dialog"
                aria-modal="true"
                aria-labelledby="model-details-title"
            >
                <div
                    className="relative flex flex-col w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-2xl border shadow-2xl transition-all"
                    style={{
                        background: 'var(--modal-bg)',
                        borderColor: 'var(--modal-border)',
                        color: 'var(--modal-fg)',
                        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--modal-border)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header Area */}
                    <div
                        className="flex-shrink-0 px-6 sm:px-7 pt-6 pb-4 border-b"
                        style={{ borderColor: 'var(--modal-border)' }}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span
                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                                        style={{
                                            background: isFree
                                                ? 'color-mix(in srgb, #10b981 12%, transparent)'
                                                : 'var(--surface-muted)',
                                            color: isFree ? '#10b981' : 'var(--modal-fg)',
                                            border: `1px solid ${isFree ? 'color-mix(in srgb, #10b981 30%, transparent)' : 'var(--modal-border)'}`,
                                        }}
                                    >
                                        {isFree ? 'Free Model' : providerLabel}
                                    </span>
                                    {supportsTools && (
                                        <span
                                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
                                            style={{
                                                background: 'color-mix(in srgb, var(--chat-accent) 8%, var(--surface-muted))',
                                                color: 'var(--modal-fg)',
                                                border: '1px solid var(--modal-border)',
                                            }}
                                        >
                                            <FiLayers size={11} strokeWidth={2} />
                                            Tooling Ready
                                        </span>
                                    )}
                                </div>

                                <h2
                                    id="model-details-title"
                                    className="text-xl sm:text-2xl font-bold tracking-tight mt-2.5 leading-snug truncate"
                                    style={{ color: 'var(--modal-fg)' }}
                                >
                                    {getModelDisplayName(model)}
                                </h2>

                                <p
                                    className="text-xs font-mono mt-1 opacity-75 truncate select-all"
                                    style={{ color: 'var(--modal-muted-fg)' }}
                                >
                                    {model.id}
                                </p>
                            </div>

                            <button
                                type="button"
                                className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
                                style={{ color: 'var(--modal-muted-fg)' }}
                                onClick={onClose}
                                title="Close details"
                                aria-label="Close"
                            >
                                <FiX size={18} strokeWidth={2} />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Body */}
                    <div className="overflow-y-auto flex-1 px-6 sm:px-7 py-5 space-y-6">
                        {/* Metrics Overview Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Cost Metric */}
                            <div
                                className="p-3.5 rounded-xl border flex flex-col justify-between"
                                style={{
                                    background: 'var(--surface-muted)',
                                    borderColor: 'var(--modal-border)',
                                }}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <span
                                        className="text-[11px] font-semibold uppercase tracking-wider"
                                        style={{ color: 'var(--sidebar-muted-fg)' }}
                                    >
                                        Est. Cost / Msg
                                    </span>
                                    <FiDollarSign size={13} style={{ color: 'var(--sidebar-muted-fg)' }} />
                                </div>
                                <div>
                                    <div
                                        className="text-base font-semibold tabular-nums leading-tight"
                                        style={{ color: 'var(--modal-fg)' }}
                                    >
                                        {showAvgCost ? formatNGN(avgCredits) : isFree ? 'Free' : '—'}
                                    </div>
                                    <div
                                        className="text-[11px] mt-0.5 truncate"
                                        style={{ color: 'var(--modal-muted-fg)' }}
                                    >
                                        {showAvgCost ? `${formatUSD(avgCost)} USD` : isFree ? '0 credits' : 'Standard rates'}
                                    </div>
                                    {!isWalletLocked && burnPercentage !== null && burnPercentage >= 60 ? (
                                        <div className="mt-1.5">
                                            <ModelCreditBurnIndicator
                                                burnPercentage={burnPercentage}
                                            />
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {/* Context Window Metric */}
                            <div
                                className="p-3.5 rounded-xl border flex flex-col justify-between"
                                style={{
                                    background: 'var(--surface-muted)',
                                    borderColor: 'var(--modal-border)',
                                }}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <span
                                        className="text-[11px] font-semibold uppercase tracking-wider"
                                        style={{ color: 'var(--sidebar-muted-fg)' }}
                                    >
                                        Context Window
                                    </span>
                                    <FiMaximize2 size={13} style={{ color: 'var(--sidebar-muted-fg)' }} />
                                </div>
                                <div>
                                    <div
                                        className="text-base font-semibold tabular-nums leading-tight"
                                        style={{ color: 'var(--modal-fg)' }}
                                    >
                                        {model.context_length > 0
                                            ? `${formatContextLength(model.context_length)} tokens`
                                            : 'Standard'}
                                    </div>
                                    <div
                                        className="text-[11px] mt-0.5 truncate"
                                        style={{ color: 'var(--modal-muted-fg)' }}
                                    >
                                        Max prompt + reply
                                    </div>
                                </div>
                            </div>

                            {/* Release / Provider Metric */}
                            <div
                                className="p-3.5 rounded-xl border flex flex-col justify-between"
                                style={{
                                    background: 'var(--surface-muted)',
                                    borderColor: 'var(--modal-border)',
                                }}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <span
                                        className="text-[11px] font-semibold uppercase tracking-wider"
                                        style={{ color: 'var(--sidebar-muted-fg)' }}
                                    >
                                        Release
                                    </span>
                                    <FiCalendar size={13} style={{ color: 'var(--sidebar-muted-fg)' }} />
                                </div>
                                <div>
                                    <div
                                        className="text-base font-semibold truncate leading-tight"
                                        style={{ color: 'var(--modal-fg)' }}
                                    >
                                        {releaseDate || providerLabel}
                                    </div>
                                    <div
                                        className="text-[11px] mt-0.5 truncate"
                                        style={{ color: 'var(--modal-muted-fg)' }}
                                    >
                                        {releaseDate ? `${providerLabel}` : 'Active catalog'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <span
                                className="block text-[11px] font-semibold uppercase tracking-widest mb-2"
                                style={{ color: 'var(--sidebar-muted-fg)' }}
                            >
                                About Model
                            </span>
                            <p
                                className="text-sm leading-relaxed whitespace-pre-line"
                                style={{ color: 'var(--modal-muted-fg)' }}
                            >
                                {model.description || 'No detailed description available for this model.'}
                            </p>
                        </div>

                        {/* Modalities / Capabilities */}
                        {hasModalities && (
                            <div>
                                <span
                                    className="block text-[11px] font-semibold uppercase tracking-widest mb-2.5"
                                    style={{ color: 'var(--sidebar-muted-fg)' }}
                                >
                                    Supported Modalities
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {inputMods.map((mod, i) => (
                                        <span
                                            key={`in-${i}`}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                                            style={{
                                                background: 'var(--surface-muted)',
                                                color: 'var(--modal-fg)',
                                                border: '1px solid var(--modal-border)',
                                            }}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            Input: {mod}
                                        </span>
                                    ))}
                                    {outputMods.map((mod, i) => (
                                        <span
                                            key={`out-${i}`}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                                            style={{
                                                background: 'var(--surface-muted)',
                                                color: 'var(--modal-fg)',
                                                border: '1px solid var(--modal-border)',
                                            }}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                                            Output: {mod}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Pricing Breakdown Table */}
                        {hasPricing && (
                            <div>
                                <span
                                    className="block text-[11px] font-semibold uppercase tracking-widest mb-2.5"
                                    style={{ color: 'var(--sidebar-muted-fg)' }}
                                >
                                    Detailed Pricing Rates
                                </span>
                                <div
                                    className="rounded-xl border overflow-hidden"
                                    style={{
                                        background: 'var(--modal-bg)',
                                        borderColor: 'var(--modal-border)',
                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                                    }}
                                >
                                    <div
                                        className="grid grid-cols-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider border-b"
                                        style={{
                                            background: 'var(--surface-muted)',
                                            borderColor: 'var(--modal-border)',
                                            color: 'var(--sidebar-muted-fg)',
                                        }}
                                    >
                                        <span>Item</span>
                                        <span className="text-right">Rate</span>
                                    </div>

                                    {scalarPricingEntries.map(([key, value], idx) => (
                                        <div
                                            key={key}
                                            className={`grid grid-cols-2 px-4 py-2.5 text-xs items-center ${
                                                idx !== 0 ? 'border-t' : ''
                                            }`}
                                            style={{ borderColor: 'var(--modal-border)' }}
                                        >
                                            <span
                                                className="font-medium truncate"
                                                style={{ color: 'var(--modal-fg)' }}
                                            >
                                                {pricingLabel(key)}
                                            </span>
                                            <span
                                                className="font-mono text-right tabular-nums font-medium"
                                                style={{ color: 'var(--modal-muted-fg)' }}
                                            >
                                                {formatPricingAmount(key, value)}
                                            </span>
                                        </div>
                                    ))}

                                    {pricingOverrides.map((tier, index) => (
                                        <div
                                            key={`tier-${tier.min_prompt_tokens ?? index}`}
                                            className="border-t"
                                            style={{ borderColor: 'var(--modal-border)' }}
                                        >
                                            <div
                                                className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider"
                                                style={{
                                                    background: 'color-mix(in srgb, var(--surface-muted) 60%, transparent)',
                                                    color: 'var(--sidebar-muted-fg)',
                                                }}
                                            >
                                                {formatPricingTierLabel(tier.min_prompt_tokens)}
                                            </div>
                                            {getTierPricingEntries(tier).map(([key, value]) => (
                                                <div
                                                    key={key}
                                                    className="grid grid-cols-2 px-4 py-2.5 text-xs items-center border-t"
                                                    style={{ borderColor: 'var(--modal-border)' }}
                                                >
                                                    <span
                                                        className="font-medium truncate pl-2"
                                                        style={{ color: 'var(--modal-fg)' }}
                                                    >
                                                        {pricingLabel(key)}
                                                    </span>
                                                    <span
                                                        className="font-mono text-right tabular-nums font-medium"
                                                        style={{ color: 'var(--modal-muted-fg)' }}
                                                    >
                                                        {formatPricingAmount(key, value)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Bar Footer */}
                    <div
                        className="flex-shrink-0 px-6 sm:px-7 py-3.5 border-t flex flex-wrap items-center justify-between gap-3"
                        style={{
                            borderColor: 'var(--modal-border)',
                            background: 'var(--modal-bg-muted)',
                        }}
                    >
                        {/* Status / Balance Hint */}
                        <div className="flex items-center gap-2 min-w-0">
                            {isWalletLocked ? (
                                <div className="flex items-center gap-1.5 text-xs text-amber-500">
                                    <FiAlertCircle size={14} className="shrink-0" />
                                    <span className="truncate">
                                        {getModelWalletLockShortHint(requiredBalance, wallet)}
                                    </span>
                                    {onAddCredits && (
                                        <button
                                            type="button"
                                            onClick={onAddCredits}
                                            className="ml-1 underline font-semibold hover:opacity-85"
                                        >
                                            Add Credits
                                        </button>
                                    )}
                                </div>
                            ) : !canPickForChat ? (
                                <div className="flex items-center gap-1.5 text-xs text-[var(--modal-muted-fg)]">
                                    <FiAlertCircle size={14} className="shrink-0 opacity-80" />
                                    <span>Catalog preview only — not available for text chat</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-xs text-[var(--modal-muted-fg)]">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                    <span>Ready for active chat session</span>
                                </div>
                            )}
                        </div>

                        {/* Buttons */}
                        <div className="flex items-center gap-2.5 shrink-0 ml-auto">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                                style={{ color: 'var(--modal-muted-fg)' }}
                            >
                                Close
                            </button>

                            {onPickModel && canPickForChat && (
                                <button
                                    type="button"
                                    disabled={isWalletLocked}
                                    onClick={() => {
                                        if (isWalletLocked) {
                                            onAddCredits?.();
                                            return;
                                        }
                                        onPickModel(model);
                                    }}
                                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 shadow-sm"
                                    style={{
                                        background: 'var(--chat-accent)',
                                        color: 'var(--chat-canvas-bg)',
                                    }}
                                >
                                    <FiCheck size={14} strokeWidth={2.5} />
                                    Use Model
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        ) as any,
        portalTarget,
    );
}

export default ModelDetailsModal;