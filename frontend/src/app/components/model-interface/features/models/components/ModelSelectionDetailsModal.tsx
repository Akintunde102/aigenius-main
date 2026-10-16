import React, { memo } from 'react';
import { AppModal, AppModalHeader, AppModalBody } from '@/app/components/modals/AppModal';
import { Model } from '@/app/components/model-interface/shared/types';
import { formatNGN, getModelDisplayName } from '@/app/components/model-interface/shared/utils';
import { useLanguage } from '@/lib/providers/LanguageProvider';
import {
    formatPricingAmount,
    formatPricingTierLabel,
    getPricingOverrides,
    getScalarPricingEntries,
    getTierPricingEntries,
    pricingLabel,
    resolveModelPricingTable,
} from '../utils/modelPricingDisplay.utils';

// Model Details Modal
type ModelSelectionDetailsModalProps = {
    model: Model;
    isOpen: boolean;
    onClose: () => void;
    averageCost: number;
};

const ModelSelectionDetailsModal = memo(function ModelDetailsModal({
    model,
    isOpen,
    onClose,
    averageCost,
}: ModelSelectionDetailsModalProps) {
    const { t } = useLanguage();
    if (!isOpen) return null;

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

    return (
        <AppModal
            open={isOpen}
            onClose={onClose}
            size="lg"
            elevated
            ariaLabelledBy="model-selection-details-title"
        >
            <AppModalHeader
                titleId="model-selection-details-title"
                title={getModelDisplayName(model)}
                subtitle={model.subtitle || t('modelDetails.specification', 'Model specifications & pricing')}
                onClose={onClose}
            />

            <AppModalBody className="space-y-3.5 !py-3 overflow-y-auto">
                {/* Basic Info */}
                {model.description && (
                    <p className="text-xs leading-relaxed" style={{ color: "var(--modal-muted-fg)" }}>
                        {model.description}
                    </p>
                )}

                {/* Modalities */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <p className="app-modal-field-label !mb-1.5">Input Modalities</p>
                        <div className="flex flex-wrap gap-1.5">
                            {(model.architecture?.input_modalities || []).map((mod, index) => (
                                <span
                                    key={index}
                                    className="rounded-md border px-2 py-0.5 text-[11px] font-medium"
                                    style={{
                                        background: "var(--surface-muted)",
                                        color: "var(--modal-fg)",
                                        borderColor: "var(--modal-border)",
                                    }}
                                >
                                    {mod}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="app-modal-field-label !mb-1.5">Output Modalities</p>
                        <div className="flex flex-wrap gap-1.5">
                            {(model.architecture?.output_modalities || []).map((mod, index) => (
                                <span
                                    key={index}
                                    className="rounded-md border px-2 py-0.5 text-[11px] font-medium"
                                    style={{
                                        background: "var(--surface-muted)",
                                        color: "var(--modal-fg)",
                                        borderColor: "var(--modal-border)",
                                    }}
                                >
                                    {mod}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Pricing */}
                {hasPricing && (
                    <div>
                        <p className="app-modal-field-label !mb-1.5">Pricing</p>
                        <div
                            className="rounded-lg border p-3"
                            style={{ background: "var(--modal-bg-muted)", borderColor: "var(--modal-border)" }}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                {scalarPricingEntries.map(([key, value]) => (
                                    <div key={key} className="flex justify-between items-center py-0.5">
                                        <span style={{ color: "var(--modal-muted-fg)" }}>{pricingLabel(key)}:</span>
                                        <span className="font-mono font-medium" style={{ color: "var(--modal-fg)" }}>
                                            {formatPricingAmount(key, value, { valuesAreCredits: pricingValuesAreCredits })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {pricingOverrides.map((tier, index) => (
                                <div
                                    key={`tier-${tier.min_prompt_tokens ?? index}`}
                                    className="mt-2.5 border-t pt-2"
                                    style={{ borderColor: "var(--modal-border)" }}
                                >
                                    <p className="text-[11px] font-medium mb-1.5" style={{ color: "var(--modal-muted-fg)" }}>
                                        {formatPricingTierLabel(tier.min_prompt_tokens)}
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                        {getTierPricingEntries(tier).map(([key, value]) => (
                                            <div key={key} className="flex justify-between items-center py-0.5">
                                                <span style={{ color: "var(--modal-muted-fg)" }}>{pricingLabel(key)}:</span>
                                                <span className="font-mono font-medium" style={{ color: "var(--modal-fg)" }}>
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

                {/* Average Cost */}
                {isFinite(averageCost) && averageCost > 0 && (
                    <div
                        className="rounded-lg border p-3 flex items-center justify-between"
                        style={{
                            background: "color-mix(in srgb, var(--chat-accent) 8%, var(--surface-muted))",
                            borderColor: "color-mix(in srgb, var(--chat-accent) 25%, var(--modal-border))",
                        }}
                    >
                        <div>
                            <p className="text-xs font-semibold" style={{ color: "var(--chat-accent)" }}>
                                Average Cost per Message
                            </p>
                            <p className="text-[11px]" style={{ color: "var(--modal-muted-fg)" }}>
                                Estimated token consumption per prompt
                            </p>
                        </div>
                        <div className="text-base font-bold tabular-nums" style={{ color: "var(--modal-fg)" }}>
                            {formatNGN(averageCost)}
                        </div>
                    </div>
                )}
            </AppModalBody>
        </AppModal>
    );
});

export default ModelSelectionDetailsModal;
