import React from 'react';
import { FiCheck, FiLayers, FiDollarSign, FiMaximize2, FiCalendar, FiAlertCircle } from 'react-icons/fi';
import { Model } from '@/app/components/model-interface/shared/types';
import {
    getModelAverageRequestCredits,
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
    resolveModelPricingTable,
} from '../utils/modelPricingDisplay.utils';
import {
    computeModelRequiredBalance,
    getModelCreditBurnPercentage,
    computeCreditsShortfall,
    isModelPickLocked,
} from '../utils/modelWalletAffordance.utils';
import { ModelCreditBurnIndicator } from './ModelCreditBurnIndicator';
import { isConversationPickableModel, isNonTextModel } from '../utils/modelConversationEligibility.utils';
import { useLanguage } from '@/lib/providers/LanguageProvider';
import {
    AppModal,
    AppModalHeader,
    AppModalBody,
    AppModalFooter,
} from '@/app/components/modals/AppModal';

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
    const { t } = useLanguage();

    if (!isOpen || !model) return null;

    const provider = getProvider(model.id);
    const providerLabel = getProviderLabel(provider) || provider;
    const isFree = provider === 'openrouter' && model.id?.split('/')[1]?.toLowerCase() === 'free';
    const avgCredits = getModelAverageRequestCredits(model);
    const showAvgCost = Number.isFinite(avgCredits) && avgCredits > 0;
    const isMediaModel = isNonTextModel(model);
    const averageUnit = model.averageUserSpendPerRequest?.averageUnit?.trim();
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
    const pricingTable = resolveModelPricingTable(
        model.pricing as Record<string, unknown> | undefined,
        model.pricing_credits as Record<string, unknown> | undefined,
    );
    const pricingValuesAreCredits = Boolean(
        model.pricing_credits && Object.keys(model.pricing_credits).length > 0,
    );
    const scalarPricingEntries = getScalarPricingEntries(pricingTable);
    const pricingOverrides = getPricingOverrides(model.pricing as Record<string, unknown> | undefined);
    const hasPricing = scalarPricingEntries.length > 0 || pricingOverrides.length > 0;
    const releaseDate = model?.created
        ? new Date(model.created * 1000).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
          })
        : null;

    return (
        <AppModal
            open={isOpen}
            onClose={onClose}
            size="lg"
            elevated
            ariaLabelledBy="model-details-title"
        >
            <AppModalHeader
                titleId="model-details-title"
                title={getModelDisplayName(model)}
                subtitle={model.id}
                onClose={onClose}
                trailing={
                    <div className="flex items-center gap-1.5 mr-1">
                        <span
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold"
                            style={{
                                background: isFree
                                    ? 'color-mix(in srgb, #10b981 12%, transparent)'
                                    : 'var(--surface-muted)',
                                color: isFree ? '#10b981' : 'var(--modal-fg)',
                                border: `1px solid ${isFree ? 'color-mix(in srgb, #10b981 30%, transparent)' : 'var(--modal-border)'}`,
                            }}
                        >
                            {isFree ? t('modelDetails.freeModel', 'Free Model') : providerLabel}
                        </span>
                        {supportsTools && (
                            <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium"
                                style={{
                                    background: 'color-mix(in srgb, var(--chat-accent) 8%, var(--surface-muted))',
                                    color: 'var(--modal-fg)',
                                    border: '1px solid var(--modal-border)',
                                }}
                            >
                                <FiLayers size={10} strokeWidth={2} />
                                {t('modelDetails.toolingReady', 'Tools')}
                            </span>
                        )}
                    </div>
                }
            />

            <AppModalBody className="space-y-3.5 !py-3 overflow-y-auto">
                {/* Metrics Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Cost Metric */}
                    <div
                        className="p-3 rounded-xl border flex flex-col justify-between"
                        style={{
                            background: 'var(--surface-muted)',
                            borderColor: 'var(--modal-border)',
                        }}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span
                                className="text-[10px] font-semibold uppercase tracking-wider"
                                style={{ color: 'var(--modal-muted-fg)' }}
                            >
                                {isMediaModel ? t('modelDetails.typicalCost', 'Typical cost') : t('modelDetails.estCostPerMsg', 'Est. Cost / Msg')}
                            </span>
                            <FiDollarSign size={12} style={{ color: 'var(--modal-muted-fg)' }} />
                        </div>
                        <div className="text-base font-bold tabular-nums" style={{ color: 'var(--modal-fg)' }}>
                            {showAvgCost
                                ? formatNGN(avgCredits, true)
                                : isFree
                                  ? t('modelPicker.freeLabel', 'Free')
                                  : '—'}
                            {showAvgCost && averageUnit ? (
                                <span className="ml-1 text-[11px] font-normal" style={{ color: 'var(--modal-muted-fg)' }}>
                                    / {averageUnit}
                                </span>
                            ) : null}
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--modal-muted-fg)' }}>
                            {isMediaModel
                                ? t('modelDetails.typicalSpendGeneration', 'Typical spend per generation')
                                : t('modelDetails.tokenInferenceEstimate', 'Estimated token inference')}
                        </div>
                    </div>

                    {/* Context Metric */}
                    <div
                        className="p-3 rounded-xl border flex flex-col justify-between"
                        style={{
                            background: 'var(--surface-muted)',
                            borderColor: 'var(--modal-border)',
                        }}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span
                                className="text-[10px] font-semibold uppercase tracking-wider"
                                style={{ color: 'var(--modal-muted-fg)' }}
                            >
                                {t('modelDetails.contextWindow', 'Context Window')}
                            </span>
                            <FiMaximize2 size={12} style={{ color: 'var(--modal-muted-fg)' }} />
                        </div>
                        <div className="text-base font-bold tabular-nums" style={{ color: 'var(--modal-fg)' }}>
                            {formatContextLength(model.context_length)} tokens
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--modal-muted-fg)' }}>
                            {t('modelDetails.maxInputOutputTokens', 'Max input + output tokens')}
                        </div>
                    </div>

                    {/* Release Metric */}
                    <div
                        className="p-3 rounded-xl border flex flex-col justify-between"
                        style={{
                            background: 'var(--surface-muted)',
                            borderColor: 'var(--modal-border)',
                        }}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span
                                className="text-[10px] font-semibold uppercase tracking-wider"
                                style={{ color: 'var(--modal-muted-fg)' }}
                            >
                                {t('modelDetails.releaseDate', 'Release Date')}
                            </span>
                            <FiCalendar size={12} style={{ color: 'var(--modal-muted-fg)' }} />
                        </div>
                        <div className="text-base font-semibold" style={{ color: 'var(--modal-fg)' }}>
                            {releaseDate ?? '—'}
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--modal-muted-fg)' }}>
                            {t('modelDetails.providerCatalogIndex', 'Provider catalog index')}
                        </div>
                    </div>
                </div>

                {/* Credit Burn / Wallet Affordance Warning */}
                {burnPercentage !== null && burnPercentage >= 40 && (
                    <div className="pt-0.5">
                        <ModelCreditBurnIndicator
                            burnPercentage={burnPercentage}
                            className="w-full"
                        />
                    </div>
                )}

                {/* Description */}
                {model.description && (
                    <div>
                        <p className="app-modal-field-label !mb-1.5">{t('modelDetails.aboutModel', 'About Model')}</p>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--modal-muted-fg)' }}>
                            {model.description}
                        </p>
                    </div>
                )}

                {/* Modalities */}
                {hasModalities && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <p className="app-modal-field-label !mb-1.5">{t('modelDetails.supportedInputs', 'Supported Inputs')}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {inputMods.length > 0 ? (
                                    inputMods.map((mod, i) => (
                                        <span
                                            key={i}
                                            className="px-2 py-0.5 rounded-md text-[11px] font-medium border"
                                            style={{
                                                background: 'var(--surface-muted)',
                                                borderColor: 'var(--modal-border)',
                                                color: 'var(--modal-fg)',
                                            }}
                                        >
                                            {mod}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs" style={{ color: 'var(--modal-muted-fg)' }}>Text only</span>
                                )}
                            </div>
                        </div>

                        <div>
                            <p className="app-modal-field-label !mb-1.5">{t('modelDetails.supportedOutputs', 'Supported Outputs')}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {outputMods.length > 0 ? (
                                    outputMods.map((mod, i) => (
                                        <span
                                            key={i}
                                            className="px-2 py-0.5 rounded-md text-[11px] font-medium border"
                                            style={{
                                                background: 'var(--surface-muted)',
                                                borderColor: 'var(--modal-border)',
                                                color: 'var(--modal-fg)',
                                            }}
                                        >
                                            {mod}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs" style={{ color: 'var(--modal-muted-fg)' }}>Text only</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Pricing Breakdown */}
                {hasPricing && (
                    <div>
                        <p className="app-modal-field-label !mb-1.5">
                            {pricingValuesAreCredits
                                ? t('modelDetails.pricingCreditsBreakdown', 'Pricing (Credits Breakdown)')
                                : t('modelDetails.pricingBaseRate', 'Pricing (Base Rate)')}
                        </p>
                        <div
                            className="rounded-lg border p-3"
                            style={{
                                background: 'var(--modal-bg-muted)',
                                borderColor: 'var(--modal-border)',
                            }}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                {scalarPricingEntries.map(([key, value]) => (
                                    <div key={key} className="flex justify-between items-center py-0.5">
                                        <span style={{ color: 'var(--modal-muted-fg)' }}>{pricingLabel(key)}:</span>
                                        <span className="font-mono font-medium" style={{ color: 'var(--modal-fg)' }}>
                                            {formatPricingAmount(key, value, { valuesAreCredits: pricingValuesAreCredits })}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {pricingOverrides.map((tier, index) => (
                                <div
                                    key={`tier-${tier.min_prompt_tokens ?? index}`}
                                    className="mt-2.5 border-t pt-2"
                                    style={{ borderColor: 'var(--modal-border)' }}
                                >
                                    <p className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--modal-muted-fg)' }}>
                                        {formatPricingTierLabel(tier.min_prompt_tokens)}
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                        {getTierPricingEntries(tier).map(([key, value]) => (
                                            <div key={key} className="flex justify-between items-center py-0.5">
                                                <span style={{ color: 'var(--modal-muted-fg)' }}>{pricingLabel(key)}:</span>
                                                <span className="font-mono font-medium" style={{ color: 'var(--modal-fg)' }}>
                                                    {formatPricingAmount(key, value, { valuesAreCredits: pricingValuesAreCredits })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </AppModalBody>

            <AppModalFooter className="justify-between !py-2.5">
                {/* Status / Balance Hint */}
                <div className="flex items-center gap-2 min-w-0">
                    {isWalletLocked ? (
                        <div className="flex items-center gap-1.5 text-xs text-amber-500">
                            <FiAlertCircle size={13} className="shrink-0" />
                            <span className="truncate">
                                {t('modelPicker.walletLockShort', 'Load {more} more credits to use', {
                                    more: computeCreditsShortfall(wallet, requiredBalance),
                                })}
                            </span>
                            {onAddCredits && (
                                <button
                                    type="button"
                                    onClick={onAddCredits}
                                    className="ml-1 underline font-semibold hover:opacity-85"
                                >
                                    {t('modelDetails.addCredits', 'Add Credits')}
                                </button>
                            )}
                        </div>
                    ) : !canPickForChat ? (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--modal-muted-fg)]">
                            <FiAlertCircle size={13} className="shrink-0 opacity-80" />
                            <span className="truncate">{t('modelDetails.catalogPreviewOnly', 'Catalog preview only')}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--modal-muted-fg)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>{t('modelDetails.readyForChat', 'Ready for chat')}</span>
                        </div>
                    )}
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-2 shrink-0 ml-auto">
                    <button
                        type="button"
                        onClick={onClose}
                        className="app-modal-btn-secondary !text-xs !py-1.5"
                    >
                        {t('common.close', 'Close')}
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
                            className="app-modal-btn-primary !text-xs !py-1.5"
                        >
                            <FiCheck size={13} strokeWidth={2.5} />
                            {t('modelDetails.useModel', 'Use Model')}
                        </button>
                    )}
                </div>
            </AppModalFooter>
        </AppModal>
    );
}

export default ModelDetailsModal;